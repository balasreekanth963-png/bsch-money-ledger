import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCode, generateTempPassword } from "@/lib/utils/codes";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Confirm the caller is actually an admin BEFORE touching the
  // service-role client. This check runs through the normal RLS-scoped
  // client, so it can't be bypassed by a crafted request.
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
      { error: "You're not authorized to add investors." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const fullName = (body?.fullName ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const mobile = (body?.mobile ?? "").trim() || null;
  const address = (body?.address ?? "").trim() || null;

  if (!fullName || !email) {
    return NextResponse.json(
      { error: "Full name and email are required." },
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

  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createErr || !created?.user) {
    return NextResponse.json(
      {
        error:
          createErr?.message ??
          "Could not create a login for this investor (they may already have an account).",
      },
      { status: 400 }
    );
  }

  const { data: newProfile, error: profileErr } = await supabase
    .from("profiles")
    .insert({
      auth_user_id: created.user.id,
      company_id: profile.company_id,
      role: "INVESTOR",
      full_name: fullName,
      mobile,
      email,
    })
    .select("id")
    .single();

  if (profileErr || !newProfile) {
    // Don't leave an orphaned login behind if the profile step failed.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: profileErr?.message ?? "Could not save the investor's profile." },
      { status: 400 }
    );
  }

  const investorCode = generateCode("INV");

  const { data: investor, error: investorErr } = await supabase
    .from("investors")
    .insert({
      company_id: profile.company_id,
      profile_id: newProfile.id,
      investor_code: investorCode,
      full_name: fullName,
      mobile,
      email,
      address,
    })
    .select("id, investor_code")
    .single();

  if (investorErr || !investor) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json(
      { error: investorErr?.message ?? "Could not save the investor record." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    investorId: investor.id,
    investorCode: investor.investor_code,
    email,
    tempPassword,
  });
}
