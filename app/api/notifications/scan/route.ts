import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  // Both functions run as the caller's own RLS-scoped session, so this
  // only ever touches the admin's own company — same trust model as
  // every other write in this project.
  const [{ data: maturityCount, error: maturityErr }, { data: pendingCount, error: pendingErr }] =
    await Promise.all([
      supabase.rpc("generate_maturity_reminders", { p_days_ahead: 30 }),
      supabase.rpc("generate_interest_pending_reminders"),
    ]);

  if (maturityErr || pendingErr) {
    return NextResponse.json(
      { error: maturityErr?.message ?? pendingErr?.message ?? "Scan failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    maturityReminders: maturityCount ?? 0,
    interestPendingReminders: pendingCount ?? 0,
  });
}
