import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called right after the browser successfully calls
 * `supabase.auth.updateUser({ password })` on its own session. This route
 * never sees or touches the password itself — it only clears the
 * must_change_password flag for the CALLER's own profile, identified by
 * their own session (never a body-supplied id, so there's no way to clear
 * someone else's flag).
 *
 * Uses the service-role client for the write because there is no RLS
 * "update own row" policy assumed here; identity is instead verified via
 * the caller's own session through the normal client first.
 */
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
    .select("id, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server misconfigured." },
      { status: 500 }
    );
  }

  const { error } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin.from("audit_logs").insert({
    company_id: profile.company_id,
    actor_profile_id: profile.id,
    action: "PASSWORD_CHANGED",
    table_name: "profiles",
    record_id: profile.id,
    old_data: null,
    new_data: { event: "PASSWORD_CHANGED" },
  });

  return NextResponse.json({ ok: true });
}
