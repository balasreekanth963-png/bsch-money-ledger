import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddInvestorForm from "./AddInvestorForm";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export default async function NewInvestorPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Add Investor
        </p>
        <p className="text-sm text-ink-500">
          Creates a login for them and an investor profile under Sodhara
          Investments.
        </p>
      </div>
      <AddInvestorForm />
    </div>
  );
}
