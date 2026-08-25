import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/utils/codes";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type AuditAction =
  | "LOGIN_ACCOUNT_CREATED"
  | "TEMP_PASSWORD_GENERATED"
  | "PASSWORD_RESET"
  | "FORCE_PASSWORD_CHANGE_SET"
  | "PASSWORD_RECOVERY_EMAIL_SENT";

/**
 * Confirms the caller is a signed-in admin of some company, and returns
 * their profile + a plain (non-admin, RLS-scoped) Supabase client to use
 * for everything that ISN'T a privileged Auth operation.
 */
async function requireAdmin() {
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

  if (!profile || !ADMIN_ROLES.includes(profile.role) || !profile.company_id) {
    return {
      error: NextResponse.json({ error: "You're not authorized to manage investor logins." }, { status: 403 }),
    };
  }

  return { supabase, profile };
}

/**
 * Loads the investor + their linked profile, scoped to the caller's own
 * company so no admin can ever touch another company's investor.
 */
async function loadInvestor(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  investorId: string
) {
  const { data: investor } = await supabase
    .from("investors")
    .select("id, full_name, email, profile_id")
    .eq("id", investorId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!investor) return null;

  const { data: linkedProfile } = await supabase
    .from("profiles")
    .select("id, auth_user_id, must_change_password")
    .eq("id", investor.profile_id)
    .maybeSingle();

  return { investor, linkedProfile };
}

async function writeAudit(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  actorProfileId: string,
  action: AuditAction,
  recordId: string
) {
  // Deliberately minimal new_data — never the password, never anything
  // that could reconstruct it. Just "this thing happened".
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
// GET — status for the Manage Login panel: email, whether a login account
// exists, whether it's currently disabled, last sign-in time, and whether
// a password change is pending.
// ---------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;

  const found = await loadInvestor(supabase, profile.company_id, params.id);
  if (!found) {
    return NextResponse.json({ error: "Investor not found in your company." }, { status: 404 });
  }
  const { investor, linkedProfile } = found;

  if (!linkedProfile?.auth_user_id) {
    return NextResponse.json({
      hasAuthAccount: false,
      email: investor.email,
    });
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

  const { data: authUser, error: getUserErr } = await admin.auth.admin.getUserById(
    linkedProfile.auth_user_id
  );

  if (getUserErr || !authUser?.user) {
    // Profile points at an auth user that Supabase Auth doesn't actually
    // have (e.g. manually deleted from the Auth dashboard). Be honest
    // about it rather than pretending everything's fine.
    return NextResponse.json({
      hasAuthAccount: false,
      email: investor.email,
      warning: "This investor's login reference is broken — the linked Auth account no longer exists.",
    });
  }

  const bannedUntil = authUser.user.banned_until;
  const isDisabled = !!bannedUntil && new Date(bannedUntil).getTime() > Date.now();

  return NextResponse.json({
    hasAuthAccount: true,
    email: authUser.user.email,
    accountStatus: isDisabled ? "Disabled" : "Active",
    lastSignInAt: authUser.user.last_sign_in_at ?? null,
    mustChangePassword: !!linkedProfile.must_change_password,
  });
}

// ---------------------------------------------------------------------------
// POST — perform one login-management action.
// ---------------------------------------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { supabase, profile } = auth;

  const body = await request.json().catch(() => null);
  const action = body?.action as
    | "create_login_account"
    | "generate_temp_password"
    | "reset_password"
    | "force_password_change"
    | "send_recovery_email"
    | undefined;

  if (!action) {
    return NextResponse.json({ error: "Missing action." }, { status: 400 });
  }

  const found = await loadInvestor(supabase, profile.company_id, params.id);
  if (!found) {
    return NextResponse.json({ error: "Investor not found in your company." }, { status: 404 });
  }
  const { investor, linkedProfile } = found;

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server misconfigured." },
      { status: 500 }
    );
  }

  // ---- create_login_account: only valid when there is NO auth account ----
  if (action === "create_login_account") {
    if (linkedProfile?.auth_user_id) {
      return NextResponse.json({ error: "This investor already has a login account." }, { status: 400 });
    }
    if (!investor.email) {
      return NextResponse.json({ error: "This investor has no email on file — add one first under Edit." }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: investor.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: investor.full_name },
    });

    if (createErr || !created?.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Could not create a login for this investor." },
        { status: 400 }
      );
    }

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ auth_user_id: created.user.id, must_change_password: true })
      .eq("id", investor.profile_id);

    if (profileErr) {
      await admin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    await writeAudit(supabase, profile.company_id, profile.id, "LOGIN_ACCOUNT_CREATED", investor.profile_id);

    return NextResponse.json({
      ok: true,
      tempPassword,
      warning: "Save this temporary password now. It will not be shown again.",
    });
  }

  // ---- everything below requires an existing auth account ----
  if (!linkedProfile?.auth_user_id) {
    return NextResponse.json(
      { error: 'This investor has no login account yet. Use "Create Login Account" first.' },
      { status: 400 }
    );
  }

  if (action === "generate_temp_password" || action === "reset_password") {
    const tempPassword = generateTempPassword();
    const { error: pwErr } = await admin.auth.admin.updateUserById(linkedProfile.auth_user_id, {
      password: tempPassword,
    });

    if (pwErr) {
      return NextResponse.json({ error: pwErr.message }, { status: 400 });
    }

    const { error: flagErr } = await supabase
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", investor.profile_id);

    if (flagErr) {
      return NextResponse.json({ error: flagErr.message }, { status: 400 });
    }

    await writeAudit(
      supabase,
      profile.company_id,
      profile.id,
      action === "generate_temp_password" ? "TEMP_PASSWORD_GENERATED" : "PASSWORD_RESET",
      investor.profile_id
    );

    // Setting a brand-new password on the Auth user immediately
    // invalidates the old one — Supabase doesn't keep the previous
    // password valid alongside it.
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
      .eq("id", investor.profile_id);

    if (flagErr) {
      return NextResponse.json({ error: flagErr.message }, { status: 400 });
    }

    await writeAudit(supabase, profile.company_id, profile.id, "FORCE_PASSWORD_CHANGE_SET", investor.profile_id);

    return NextResponse.json({
      ok: true,
      message: "This investor will be asked to set a new password the next time they sign in.",
    });
  }

  if (action === "send_recovery_email") {
    if (!investor.email) {
      return NextResponse.json({ error: "This investor has no email on file." }, { status: 400 });
    }

    // resetPasswordForEmail doesn't need elevated privileges — it's the
    // same call the public "Forgot Password" link on /login uses.
    const { error: recoveryErr } = await supabase.auth.resetPasswordForEmail(investor.email, {
      redirectTo: undefined,
    });

    if (recoveryErr) {
      return NextResponse.json({ error: "Could not send the recovery email. Please try again." }, { status: 400 });
    }

    await writeAudit(supabase, profile.company_id, profile.id, "PASSWORD_RECOVERY_EMAIL_SENT", investor.profile_id);

    return NextResponse.json({ ok: true, message: "Password recovery email sent successfully." });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
