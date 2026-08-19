import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

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

  if (!profile || !ADMIN_ROLES.includes(profile.role) || !profile.company_id) {
    return NextResponse.json(
      { error: "You're not authorized to record this." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const personName = (body?.personName ?? "").trim();
  const mobile = (body?.mobile ?? "").trim() || null;
  const amount = Number(body?.amount);
  const interestRate =
    body?.interestRate !== undefined && body?.interestRate !== ""
      ? Number(body.interestRate)
      : 0;
  const startDate = body?.startDate as string | undefined;
  const dueDate = (body?.dueDate ?? "").trim() || null;
  const notes = (body?.notes ?? "").trim() || null;

  if (!personName || !amount || amount <= 0 || !startDate) {
    return NextResponse.json(
      { error: "Person's name, a positive amount, and start date are required." },
      { status: 400 }
    );
  }

  const { data: record, error: insertErr } = await supabase
    .from("money_given")
    .insert({
      company_id: profile.company_id,
      person_name: personName,
      mobile,
      amount,
      interest_rate: interestRate,
      start_date: startDate,
      due_date: dueDate,
      notes,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insertErr || !record) {
    return NextResponse.json(
      { error: insertErr?.message ?? "Could not save this record." },
      { status: 400 }
    );
  }

  // Log the initial disbursement in the internal ledger so it shows up
  // in the same history as future repayments/interest against it.
  const { error: txnErr } = await supabase.from("internal_transactions").insert({
    company_id: profile.company_id,
    source_type: "money_given",
    source_id: record.id,
    transaction_type: "disbursement",
    amount,
    transaction_date: startDate,
    notes: "Initial amount given",
    created_by: profile.id,
  });

  if (txnErr) {
    return NextResponse.json({
      id: record.id,
      warning: `Record saved, but the ledger entry failed: ${txnErr.message}`,
    });
  }

  return NextResponse.json({ id: record.id });
}
