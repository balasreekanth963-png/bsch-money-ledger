import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];
const ALLOWED_ACTIONS = ["under_review", "approve", "reject", "mark_paid"] as const;
type Action = (typeof ALLOWED_ACTIONS)[number];

export async function PATCH(
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
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as Action | undefined;
  if (!action || !ALLOWED_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const { data: reqRow } = await supabase
    .from("withdrawal_requests")
    .select(
      "id, company_id, investment_id, investor_id, requested_amount, status, investors(full_name, email)"
    )
    .eq("id", params.id)
    .single();

  if (!reqRow || reqRow.company_id !== profile.company_id) {
    return NextResponse.json(
      { error: "Withdrawal request not found." },
      { status: 404 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const updates: Record<string, unknown> = {
    reviewed_by: profile.id,
    reviewed_at: new Date().toISOString(),
  };

  if (action === "under_review") {
    if (reqRow.status !== "REQUESTED") {
      return NextResponse.json(
        { error: "Only new requests can be moved to review." },
        { status: 400 }
      );
    }
    updates.status = "UNDER_REVIEW";
  } else if (action === "approve") {
    if (!["REQUESTED", "UNDER_REVIEW"].includes(reqRow.status)) {
      return NextResponse.json(
        { error: "Only pending requests can be approved." },
        { status: 400 }
      );
    }
    updates.status = "APPROVED";
  } else if (action === "reject") {
    if (!["REQUESTED", "UNDER_REVIEW"].includes(reqRow.status)) {
      return NextResponse.json(
        { error: "Only pending requests can be rejected." },
        { status: 400 }
      );
    }
    updates.status = "REJECTED";
  } else if (action === "mark_paid") {
    if (reqRow.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved requests can be marked paid." },
        { status: 400 }
      );
    }
    updates.status = "PAID";
    updates.paid_date = today;
  }

  const { error: updateErr } = await supabase
    .from("withdrawal_requests")
    .update(updates)
    .eq("id", params.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  if (action === "mark_paid") {
    // Log the actual money movement so calculate_outstanding_principal()
    // reflects it automatically — same pattern as interest crediting.
    const { error: txnErr } = await supabase
      .from("investment_transactions")
      .insert({
        company_id: reqRow.company_id,
        investment_id: reqRow.investment_id,
        investor_id: reqRow.investor_id,
        transaction_type: "PRINCIPAL_WITHDRAWAL",
        amount: reqRow.requested_amount,
        transaction_date: today,
        notes: `Withdrawal request ${reqRow.id} paid out`,
        created_by: profile.id,
      });

    if (txnErr) {
      return NextResponse.json({
        status: updates.status,
        warning: `Marked paid, but the ledger entry failed: ${txnErr.message}`,
      });
    }

    await supabase.from("audit_logs").insert({
      company_id: reqRow.company_id,
      actor_profile_id: profile.id,
      action: "WITHDRAWAL_PAID",
      table_name: "withdrawal_requests",
      record_id: reqRow.id,
      old_data: { status: reqRow.status },
      new_data: { status: "PAID", amount: reqRow.requested_amount },
    });
  }

  // Notification data trail (prep only for other channels — email below
  // is real, not just a log entry) for every status transition, not
  // just the final payout.
  await supabase.from("notifications").insert({
    company_id: reqRow.company_id,
    investor_id: reqRow.investor_id,
    investment_id: reqRow.investment_id,
    notification_type: "WITHDRAWAL_STATUS",
    message: `Your withdrawal request for ₹${Number(reqRow.requested_amount).toFixed(
      2
    )} is now ${String(updates.status)}.`,
    metadata: { previous_status: reqRow.status, new_status: updates.status },
  });

  const investorInfo = Array.isArray(reqRow.investors) ? reqRow.investors[0] : reqRow.investors;
  const recipients = [investorInfo?.email, user.email].filter(
    (e): e is string => Boolean(e)
  );
  if (recipients.length > 0) {
    const { sendEmail } = await import("@/lib/email/resend");
    await sendEmail({
      to: recipients,
      subject: `Withdrawal Request Update — ₹${Number(reqRow.requested_amount).toFixed(2)}`,
      html: `
        <p>Hi ${investorInfo?.full_name ?? "there"},</p>
        <p>Your withdrawal request for <strong>₹${Number(reqRow.requested_amount).toFixed(
          2
        )}</strong> is now <strong>${String(updates.status)}</strong>.</p>
        <p>— Sodhara Investments</p>
      `,
    });
  }

  return NextResponse.json({ status: updates.status });
}
