import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MoneyLedgerForm from "@/components/dashboard/MoneyLedgerForm";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export default async function NewMoneyTakenPage() {
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
          Money Taken
        </p>
        <p className="text-sm text-ink-500">
          Record money Sodhara Investments has borrowed from someone. This
          is admin-only — investors never see this.
        </p>
      </div>
      <MoneyLedgerForm apiPath="/api/money-taken" submitLabel="Record Money Taken" />
    </div>
  );
}
