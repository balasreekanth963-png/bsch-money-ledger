import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditInvestorForm from "./EditInvestorForm";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export default async function EditInvestorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: investor } = await supabase
    .from("investors")
    .select("id, full_name, investor_code, mobile, email, address")
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!investor) {
    notFound();
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Edit Investor
        </p>
        <p className="text-sm text-ink-500">{investor.investor_code}</p>
      </div>
      <EditInvestorForm investor={investor} />
    </div>
  );
}
