import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || profile.role !== "INVESTOR") {
    return NextResponse.json(
      { error: "Only investors can request withdrawals." },
      { status: 403 }
    );
  }

  const { data: investor } = await supabase
    .from("investors")
    .select("id")
    .eq("profile_id", profile.id)
    .single();

  if (!investor) {
    return NextResponse.json(
      { error: "Investor profile not found." },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  const investmentId = body?.investmentId as string | undefined;
  const requestedAmount = Number(body?.requestedAmount);

  if (!investmentId || !requestedAmount || requestedAmount <= 0) {
    return NextResponse.json(
      { error: "Investment and a positive amount are required." },
      { status: 400 }
    );
  }

  const { data: investment } = await supabase
    .from("investments")
    .select("id, investor_id, company_id, withdrawal_eligibility_date")
    .eq("id", investmentId)
    .single();

  if (!investment || investment.investor_id !== investor.id) {
    return NextResponse.json({ error: "Investment not found." }, { status: 404 });
  }

  const today = new Date().toISOString().slice(0, 10);

  // Enforce the configured eligibility date server-side — the frontend
  // also hides the button before this date, but that's only a UX nicety,
  // not the actual enforcement.
  if (investment.withdrawal_eligibility_date > today) {
    return NextResponse.json(
      {
        error: `Not eligible for withdrawal until ${investment.withdrawal_eligibility_date}.`,
      },
      { status: 400 }
    );
  }

  const { data: outstanding } = await supabase.rpc(
    "calculate_outstanding_principal",
    { p_investment_id: investmentId }
  );

  if (outstanding !== null && requestedAmount > Number(outstanding) + 0.01) {
    return NextResponse.json(
      {
        error: `Cannot request more than the outstanding principal of ₹${Number(
          outstanding
        ).toFixed(2)}.`,
      },
      { status: 400 }
    );
  }

  const { data: existingPending } = await supabase
    .from("withdrawal_requests")
    .select("id")
    .eq("investment_id", investmentId)
    .in("status", ["REQUESTED", "UNDER_REVIEW"]);

  if (existingPending && existingPending.length > 0) {
    return NextResponse.json(
      {
        error:
          "You already have a pending withdrawal request for this investment.",
      },
      { status: 400 }
    );
  }

  const { data: record, error: insertErr } = await supabase
    .from("withdrawal_requests")
    .insert({
      company_id: investment.company_id,
      investor_id: investor.id,
      investment_id: investmentId,
      requested_amount: requestedAmount,
      requested_date: today,
      eligible_date: investment.withdrawal_eligibility_date,
      status: "REQUESTED",
    })
    .select("id")
    .single();

  if (insertErr || !record) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Could not submit request." },
      { status: 400 }
    );
  }

  return NextResponse.json({ id: record.id });
}
