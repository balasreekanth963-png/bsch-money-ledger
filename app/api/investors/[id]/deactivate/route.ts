import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

// ~100 years — Supabase's ban_duration has no "forever" literal, so this
// is the practical equivalent of a permanent login block. Reactivating
// sets ban_duration back to "none", which lifts it immediately.
const PERMANENT_BAN = "876000h";

/**
 * Deactivates or reactivates an investor.
 *
 * Deactivate:
 *   - investors.status -> 'inactive' (they disappear from the "active
 *     investor" dropdown used when creating new investments, and are
 *     visually flagged in the investors list)
 *   - their Supabase Auth login is banned, so they can no longer sign in
 *
 * Nothing is deleted. All investment/transaction history, and the
 * investor record itself, stay exactly as they are — safe for
 * accounting/audit. Reactivate at any time to restore login access.
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
  const action = body?.action as "deactivate" | "reactivate" | undefined;

  if (action !== "deactivate" && action !== "reactivate") {
    return NextResponse.json(
      { error: 'action must be "deactivate" or "reactivate".' },
      { status: 400 }
    );
  }

  // Confirm this investor belongs to the caller's own company, and get
  // their linked auth user via profiles.
  const { data: investor } = await supabase
    .from("investors")
    .select("id, profile_id, full_name")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!investor) {
    return NextResponse.json(
      { error: "Investor not found in your company." },
      { status: 404 }
    );
  }

  const { data: investorProfile } = await supabase
    .from("profiles")
    .select("auth_user_id")
    .eq("id", investor.profile_id)
    .maybeSingle();

  const newStatus = action === "deactivate" ? "inactive" : "active";

  const { error: statusErr } = await supabase
    .from("investors")
    .update({ status: newStatus })
    .eq("id", params.id);

  if (statusErr) {
    return NextResponse.json({ error: statusErr.message }, { status: 400 });
  }

  // Ban/unban their login. If we can't resolve their auth user for some
  // reason, don't fail the whole request — the record is already archived,
  // which is the more important half; surface it as a warning instead.
  if (investorProfile?.auth_user_id) {
    let admin;
    try {
      admin = createAdminClient();
    } catch (e) {
      return NextResponse.json({
        ok: true,
        status: newStatus,
        warning:
          "Status updated, but could not reach the auth server to change login access: " +
          (e instanceof Error ? e.message : "unknown error"),
      });
    }

    const { error: banErr } = await admin.auth.admin.updateUserById(
      investorProfile.auth_user_id,
      { ban_duration: action === "deactivate" ? PERMANENT_BAN : "none" }
    );

    if (banErr) {
      return NextResponse.json({
        ok: true,
        status: newStatus,
        warning: `Status updated, but login access change failed: ${banErr.message}`,
      });
    }
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
