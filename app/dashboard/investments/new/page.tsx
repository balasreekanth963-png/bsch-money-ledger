import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewInvestmentForm from "./NewInvestmentForm";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export default async function NewInvestmentPage() {
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

  // RLS on `investors` already scopes this to the caller's own company.
  const { data: investors } = await supabase
    .from("investors")
    .select("id, full_name, investor_code")
    .eq("status", "active")
    .order("full_name");

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          New Investment
        </p>
        <p className="text-sm text-ink-500">
          Interest periods are generated automatically based on the
          frequency you choose.
        </p>
      </div>
      <NewInvestmentForm investors={investors ?? []} />
    </div>
  );
}
