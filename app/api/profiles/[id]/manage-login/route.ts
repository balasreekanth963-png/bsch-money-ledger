import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/utils/codes";

// Only these two roles may manage another admin/staff member's login.
// Plain STAFF cannot reach this route at all — resetting a colleague's
// (or a COMPANY_ADMIN's) password is a privilege-escalation risk, so it's
// deliberately narrower than the investor-management ADMIN_ROLES set.
const MANAGER_ROLES = ["COMPANY_ADMIN", "PLATFORM_ADMIN"];

// Roles this route is allowed to target at all. Investors are managed
// through /api/investors/[id]/manage-login instead — this keeps the two
// flows (and their audit trails) clearly separated.
const TEAM_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type AuditAction =
  | "TEMP_PASSWORD_GENERATED"
  | "PASSWORD_RESET"
  | "FORCE_PASSWORD_CHANGE_SET"
  | "PASSWORD_RECOVERY_EMAIL_SENT";

async function requireManager() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !MANAGER_ROLES.includes(profile.role) || !profile.company_id) {
    return {
      error: NextResponse.json(
        { error: "Only a Company Admin can manage another team member's login." },
        { status: 403 }
      ),
    };
  }

  return { supabase, profile };
}

/**
 * Loads the target team member, scoped to the caller's own company, and
 * enforces the privilege hierarchy: a COMPANY_ADMIN cannot manage a
 * PLATFORM_ADMIN's login. Also blocks targeting your own account through
 * this route — forgetting your own current password means you can't be
 * signed in to use it anyway, and self-service here would be confusing
 * to audit.
 */
async function loadTarget(
  supabase: ReturnType<typeof createClient>,
  callerProfileId: string,
  callerRole: string,
  companyId: string,
  targetProfileId: string
) {
  if (targetProfileId === callerProfileId) {
    return { error: "You can't manage your own login from here." };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name, email, auth_user_id, must_change_password")
    .eq("id", targetProfileId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!target) {
    return { error: "Team member not found in your company." };
  }

  if (!TEAM_ROLES.includes(target.role)) {
    return { error: "Investors are managed from the Investors page instead." };
  }

  if (target.role === "PLATFORM_ADMIN" && callerRole !== "PLATFORM_ADMIN") {
    return { error: "Only a Platform Admin can manage another Platform Admin's login." };
  }

  return { target };
}

async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  actorProfileId: string,
  action: AuditAction,
  recordId: string
) {
  await supabase.from("audit_logs").insert({
    company_id: companyId,
    actor_profile_id: actorProfileId,
    action,
    table_name: "profiles",
    record_id: recordId,
    old_data: null,
    new_data: { event: action },
  });
}

// ---------------------------------------------------------------------------
// GET — same shape as the investor version: email, account status, last
// sign-in, pending-change flag.
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;

  const found = await loadTarget(supabase, profile.id, profile.role, profile.company_id, params.id);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: 400 });
  }
  const { target } = found;

  if (!target.auth_user_id) {
    return NextResponse.json({ hasAuthAccount: false, email: target.email });
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

  const { data: authUser, error: getUserErr } = await admin.auth.admin.getUserById(target.auth_user_id);

  if (getUserErr || !authUser?.user) {
    return NextResponse.json({
      hasAuthAccount: false,
      email: target.email,
      warning: "This team member's login reference is broken — the linked Auth account no longer exists.",
    });
  }

  const bannedUntil = authUser.user.banned_until;
  const isDisabled = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();

  return NextResponse.json({
    hasAuthAccount: true,
    email: authUser.user.email,
    accountStatus: isDisabled ? "Disabled" : "Active",
    lastSignInAt: authUser.user.last_sign_in_at ?? null,
    mustChangePassword: !!target.must_change_password,
  });
}

// ---------------------------------------------------------------------------
// POST — generate/reset temp password, force a change, or send recovery.
// No "create_login_account" here — every admin/staff profile already has
// an Auth account by construction (they signed themselves up or were
// seeded directly), unlike investors who can predate that flow.
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireManager();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;

  const body = await request.json().catch(() => null);
  const action = body?.action as
    | "generate_temp_password"
    | "reset_password"
    | "force_password_change"
    | "send_recovery_email"
    | undefined;

  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  const found = await loadTarget(supabase, profile.id, profile.role, profile.company_id, params.id);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: 400 });
  }
  const { target } = found;

  if (!target.auth_user_id) {
    return NextResponse.json(
      { error: "This team member has no login account. They need to sign up first." },
      { status: 400 }
    );
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

  if (action === "generate_temp_password" || action === "reset_password") {
    const tempPassword = generateTempPassword();
    const { error: pwErr } = await admin.auth.admin.updateUserById(target.auth_user_id, {
      password: tempPassword,
    });

    if (pwErr) {
      return NextResponse.json({ error: pwErr.message }, { status: 400 });
    }

    const { error: flagErr } = await supabase
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", target.id);

    if (flagErr) {
      return NextResponse.json({ error: flagErr.message }, { status: 400 });
    }

    await writeAudit(
      supabase,
      profile.company_id,
      profile.id,
      action === "generate_temp_password" ? "TEMP_PASSWORD_GENERATED" : "PASSWORD_RESET",
      target.id
    );

    return NextResponse.json({
      ok: true,
      tempPassword,
      warning: "Save this temporary password now. It will not be shown again.",
    });
  }

  if (action === "force_password_change") {
    const { error: flagErr } = await supabase
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", target.id);

    if (flagErr) {
      return NextResponse.json({ error: flagErr.message }, { status: 400 });
    }

    await writeAudit(supabase, profile.company_id, profile.id, "FORCE_PASSWORD_CHANGE_SET", target.id);

    return NextResponse.json({
      ok: true,
      message: "This team member will be asked to set a new password the next time they sign in.",
    });
  }

  if (action === "send_recovery_email") {
    if (!target.email) {
      return NextResponse.json({ error: "This team member has no email on file." }, { status: 400 });
    }

    const { error: recoveryErr } = await supabase.auth.resetPasswordForEmail(target.email, {
      redirectTo: undefined,
    });

    if (recoveryErr) {
      return NextResponse.json({ error: "Could not send the recovery email. Please try again." }, { status: 400 });
    }

    await writeAudit(supabase, profile.company_id, profile.id, "PASSWORD_RECOVERY_EMAIL_SENT", target.id);

    return NextResponse.json({ ok: true, message: "Password recovery email sent successfully." });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
