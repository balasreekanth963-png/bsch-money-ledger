import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addMonthsUTC } from "@/lib/utils/dates";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

/**
 * Edits an existing investment's terms (amount, rate, frequency, start
 * date, tenure, notes). Only allowed while status is "active" — editing a
 * matured/closed investment could silently disagree with interest periods
 * that were already generated and credited against the old terms.
 *
 * Note: this does NOT regenerate `investment_interest_periods` rows.
 * Those are created automatically when the investment is first inserted
 * (via a database trigger/function that lives in Supabase, not in this
 * repo). If you change principal, rate, frequency, start date, or tenure
 * on an investment that already has interest periods, review/adjust those
 * periods manually under Dashboard → Interest so payouts stay correct.
 */
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
    .select("role, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role) || !profile.company_id) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const principalAmount = Number(body?.principalAmount);
  const interestRate =
    body?.interestRate !== undefined && body?.interestRate !== ""
      ? Number(body.interestRate)
      : undefined;
  const interestFrequency = body?.interestFrequency as string | undefined;
  const startDate = body?.startDate as string | undefined;
  const periodMonths = Number(body?.periodMonths);
  const notes = (body?.notes ?? "").trim() || null;

  if (
    !principalAmount ||
    principalAmount <= 0 ||
    !startDate ||
    !periodMonths ||
    periodMonths <= 0 ||
    !interestFrequency
  ) {
    return NextResponse.json(
      {
        error:
          "A positive amount, start date, tenure, and credit frequency are all required.",
      },
      { status: 400 }
    );
  }

  // Confirm this investment belongs to the caller's own company, and is
  // still active, before touching it.
  const { data: existing } = await supabase
    .from("investments")
    .select("id, status")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Investment not found in your company." },
      { status: 404 }
    );
  }

  if (existing.status !== "active") {
    return NextResponse.json(
      {
        error: `This investment is "${existing.status}" and can no longer be edited. Only active investments can be edited.`,
      },
      { status: 400 }
    );
  }

  const maturityDate = addMonthsUTC(startDate, periodMonths);

  const { error: updateErr } = await supabase
    .from("investments")
    .update({
      principal_amount: principalAmount,
      ...(interestRate !== undefined ? { interest_rate: interestRate } : {}),
      interest_frequency: interestFrequency,
      start_date: startDate,
      maturity_date: maturityDate,
      withdrawal_eligibility_date: maturityDate,
      notes,
    })
    .eq("id", params.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, maturityDate });
}
