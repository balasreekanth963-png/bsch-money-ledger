import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];
const ALLOWED_TARGET_STATUSES = ["matured", "closed"] as const;

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
  const targetStatus = body?.status as (typeof ALLOWED_TARGET_STATUSES)[number] | undefined;

  if (!targetStatus || !ALLOWED_TARGET_STATUSES.includes(targetStatus)) {
    return NextResponse.json(
      { error: "status must be 'matured' or 'closed'." },
      { status: 400 }
    );
  }

  // Confirm this investment belongs to the caller's own company and is
  // actually still active — closing something already closed, or that
  // isn't yours, is rejected rather than silently allowed.
  const { data: investment } = await supabase
    .from("investments")
    .select("id, status, company_id")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!investment) {
    return NextResponse.json(
      { error: "Investment not found in your company." },
      { status: 404 }
    );
  }

  if (investment.status !== "active") {
    return NextResponse.json(
      { error: `Cannot close an investment that is already '${investment.status}'.` },
      { status: 400 }
    );
  }

  const { error: updateErr } = await supabase
    .from("investments")
    .update({ status: targetStatus })
    .eq("id", investment.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  // Nothing is deleted — this is purely a status change, so every past
  // transaction, interest period, and report entry stays intact.
  await supabase.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_profile_id: profile.id,
    action: "CLOSE_INVESTMENT",
    table_name: "investments",
    record_id: investment.id,
    old_data: { status: "active" },
    new_data: { status: targetStatus },
  });

  return NextResponse.json({ status: targetStatus });
}
