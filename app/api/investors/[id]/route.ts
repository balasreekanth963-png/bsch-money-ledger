import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

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
  const fullName = (body?.fullName ?? "").trim();
  const mobile = (body?.mobile ?? "").trim() || null;
  const email = (body?.email ?? "").trim() || null;
  const address = (body?.address ?? "").trim() || null;

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }

  // Confirm this investor actually belongs to the caller's own company
  // before touching it.
  const { data: existing } = await supabase
    .from("investors")
    .select("id")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { error: "Investor not found in your company." },
      { status: 404 }
    );
  }

  const { error: updateErr } = await supabase
    .from("investors")
    .update({ full_name: fullName, mobile, email, address })
    .eq("id", params.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
