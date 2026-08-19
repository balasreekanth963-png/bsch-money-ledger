import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCode } from "@/lib/utils/codes";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

function addMonthsUTC(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
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

  if (
    !profile ||
    !ADMIN_ROLES.includes(profile.role) ||
    !profile.company_id
  ) {
    return NextResponse.json(
      { error: "You're not authorized to create investments." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const investorId = body?.investorId as string | undefined;
  const principalAmount = Number(body?.principalAmount);
  const interestRate =
    body?.interestRate !== undefined && body?.interestRate !== ""
      ? Number(body.interestRate)
      : 14;
  const interestFrequency = body?.interestFrequency || "monthly";
  const startDate = body?.startDate as string | undefined;
  const periodMonths = Number(body?.periodMonths);
  const notes = (body?.notes ?? "").trim() || null;
  const withdrawalEligibilityDateOverride = (
    body?.withdrawalEligibilityDate ?? ""
  ).trim();

  if (
    !investorId ||
    !principalAmount ||
    principalAmount <= 0 ||
    !startDate ||
    !periodMonths ||
    periodMonths <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Investor, a positive investment amount, start date, and period (in months) are all required.",
      },
      { status: 400 }
    );
  }

  // Defense in depth: the dropdown only ever shows same-company investors,
  // but a crafted request could pass any investorId. Confirm ownership
  // server-side before creating a financial record against them.
  const { data: investorRow } = await supabase
    .from("investors")
    .select("id")
    .eq("id", investorId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!investorRow) {
    return NextResponse.json(
      { error: "That investor was not found in your company." },
      { status: 403 }
    );
  }

  const maturityDate = addMonthsUTC(startDate, periodMonths);
  const withdrawalEligibilityDate =
    withdrawalEligibilityDateOverride || maturityDate;
  const investmentCode = generateCode("INVMT");

  const { data: investment, error: investmentErr } = await supabase
    .from("investments")
    .insert({
      company_id: profile.company_id,
      investor_id: investorId,
      investment_code: investmentCode,
      principal_amount: principalAmount,
      interest_rate: interestRate,
      interest_frequency: interestFrequency,
      start_date: startDate,
      maturity_date: maturityDate,
      withdrawal_eligibility_date: withdrawalEligibilityDate,
      notes,
    })
    .select("id, investment_code")
    .single();

  if (investmentErr || !investment) {
    return NextResponse.json(
      { error: investmentErr?.message ?? "Could not create the investment." },
      { status: 400 }
    );
  }

  // Record the initial deposit in the investor-facing ledger. Not fatal
  // to the investment itself if this fails — surface it as a warning
  // rather than rolling back a real financial record the admin can see.
  const { error: txnErr } = await supabase.from("investment_transactions").insert({
    company_id: profile.company_id,
    investment_id: investment.id,
    investor_id: investorId,
    transaction_type: "INVESTMENT_RECEIVED",
    amount: principalAmount,
    transaction_date: startDate,
    notes: "Initial investment",
    created_by: profile.id,
  });

  if (txnErr) {
    return NextResponse.json({
      investmentId: investment.id,
      investmentCode: investment.investment_code,
      warning: `Investment created, but the transaction record failed: ${txnErr.message}`,
    });
  }

  return NextResponse.json({
    investmentId: investment.id,
    investmentCode: investment.investment_code,
  });
}
