import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role) || !profile.company_id) {
    return NextResponse.json(
      { error: "You're not authorized to credit interest." },
      { status: 403 }
    );
  }

  const periodId = params.id;

  // Fetch the period joined through to the investment, so we can confirm
  // it actually belongs to the caller's own company (RLS would also
  // catch this on the update below, but checking explicitly here lets
  // us return a clear error instead of a silent "0 rows updated").
  const { data: period, error: periodErr } = await supabase
    .from("investment_interest_periods")
    .select(
      "id, investment_id, expected_interest, credited_interest, status, investments(id, investor_id, company_id)"
    )
    .eq("id", periodId)
    .single();

  if (periodErr || !period) {
    return NextResponse.json({ error: "Interest period not found." }, { status: 404 });
  }

  const investment = Array.isArray(period.investments)
    ? period.investments[0]
    : period.investments;

  if (!investment || investment.company_id !== profile.company_id) {
    return NextResponse.json(
      { error: "That interest period does not belong to your company." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const expected = parseFloat(period.expected_interest);
  const alreadyCredited = parseFloat(period.credited_interest);
  const remaining = Math.max(expected - alreadyCredited, 0);

  // Default to crediting the full remaining amount; allow an explicit
  // partial amount if the admin ever needs it, but never let it push
  // credited_interest past what's actually expected for this period.
  const requestedAmount =
    body?.amount !== undefined && body?.amount !== null
      ? Number(body.amount)
      : remaining;

  if (!requestedAmount || requestedAmount <= 0) {
    return NextResponse.json({ error: "Nothing to credit." }, { status: 400 });
  }
  if (requestedAmount > remaining + 0.01) {
    return NextResponse.json(
      { error: `Cannot credit more than the remaining ₹${remaining.toFixed(2)}.` },
      { status: 400 }
    );
  }

  const newCredited = Math.round((alreadyCredited + requestedAmount) * 100) / 100;
  const newStatus = newCredited >= expected ? "CREDITED" : "PARTIALLY_CREDITED";
  const today = new Date().toISOString().slice(0, 10);

  const { error: updateErr } = await supabase
    .from("investment_interest_periods")
    .update({
      credited_interest: newCredited,
      status: newStatus,
      credited_date: today,
    })
    .eq("id", periodId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // Investor-facing ledger entry — this is what shows up in their
  // transaction history as "Interest Credited".
  await supabase.from("investment_transactions").insert({
    company_id: profile.company_id,
    investment_id: investment.id,
    investor_id: investment.investor_id,
    transaction_type: "INTEREST_CREDITED",
    amount: requestedAmount,
    transaction_date: today,
    notes: `Interest credited for period ${periodId}`,
    created_by: profile.id,
  });

  // Audit trail for this financial change, per the "never silently
  // overwrite" requirement — old vs new state, who did it, when.
  await supabase.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_profile_id: profile.id,
    action: "CREDIT_INTEREST",
    table_name: "investment_interest_periods",
    record_id: periodId,
    old_data: { credited_interest: alreadyCredited, status: period.status },
    new_data: { credited_interest: newCredited, status: newStatus },
  });

  // Notification data trail (prep only — nothing is actually sent yet).
  // A future WhatsApp/SMS worker reads PENDING rows from here.
  await supabase.from("notifications").insert({
    company_id: profile.company_id,
    investor_id: investment.investor_id,
    investment_id: investment.id,
    interest_period_id: periodId,
    notification_type: "INTEREST_CREDITED",
    message: `Interest of ₹${requestedAmount.toFixed(2)} was credited to your investment.`,
    metadata: { amount: requestedAmount, credited_date: today },
  });

  return NextResponse.json({ credited_interest: newCredited, status: newStatus });
}
