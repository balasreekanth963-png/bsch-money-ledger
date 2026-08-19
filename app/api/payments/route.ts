import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];
const SOURCE_TYPES = ["money_given", "money_taken"] as const;
const TXN_TYPES = ["repayment", "interest_payment"] as const;

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
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const sourceType = body?.sourceType as (typeof SOURCE_TYPES)[number] | undefined;
  const sourceId = body?.sourceId as string | undefined;
  const transactionType = body?.transactionType as (typeof TXN_TYPES)[number] | undefined;
  const amount = Number(body?.amount);
  const transactionDate = body?.transactionDate as string | undefined;
  const notes = (body?.notes ?? "").trim() || null;

  if (
    !sourceType ||
    !SOURCE_TYPES.includes(sourceType) ||
    !sourceId ||
    !transactionType ||
    !TXN_TYPES.includes(transactionType) ||
    !amount ||
    amount <= 0 ||
    !transactionDate
  ) {
    return NextResponse.json(
      { error: "A valid entity, payment type, positive amount, and date are required." },
      { status: 400 }
    );
  }

  // Confirm the source record actually belongs to the caller's own company
  // before logging money against it — same defense-in-depth pattern as
  // the investments API.
  const table = sourceType === "money_given" ? "money_given" : "money_taken";
  const { data: sourceRow } = await supabase
    .from(table)
    .select("id")
    .eq("id", sourceId)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!sourceRow) {
    return NextResponse.json(
      { error: "That record was not found in your company." },
      { status: 403 }
    );
  }

  const { error: insertErr } = await supabase.from("internal_transactions").insert({
    company_id: profile.company_id,
    source_type: sourceType,
    source_id: sourceId,
    transaction_type: transactionType,
    amount,
    transaction_date: transactionDate,
    notes,
    created_by: profile.id,
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
