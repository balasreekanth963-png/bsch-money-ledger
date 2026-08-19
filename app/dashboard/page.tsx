import { createClient } from "@/lib/supabase/server";
import AdminDashboardView, {
  type CompanyDashboardTotals,
} from "@/components/dashboard/AdminDashboardView";
import InvestorDashboardView, {
  type InvestorInvestmentSummary,
} from "@/components/dashboard/InvestorDashboardView";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Middleware already redirects unauthenticated requests to /login,
    // this is just a defensive fallback so the page never renders blank.
    return null;
  }

  // Every logged-in user has exactly one `profiles` row, which carries
  // the role that decides which dashboard they see. A user can exist in
  // Supabase Auth without a profile yet (e.g. signed up but not linked
  // by an admin/seed script) — handle that honestly rather than crashing.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
        Your account isn&apos;t linked to Sodhara Investments yet. Please contact
        your administrator to be added as an admin or investor.
      </div>
    );
  }

  const displayName = profile.full_name || user.email?.split("@")[0] || "there";

  if (profile.role === "INVESTOR") {
    const { data: investments } = await supabase
      .from("investor_investment_summary")
      .select("*")
      .order("start_date", { ascending: false });

    return (
      <InvestorDashboardView
        displayName={displayName}
        investments={(investments as InvestorInvestmentSummary[]) ?? []}
      />
    );
  }

  // COMPANY_ADMIN, STAFF, or PLATFORM_ADMIN all see the company view.
  // RLS on the underlying tables means a company admin's query naturally
  // returns only their own company's row.
  const { data: totals } = await supabase
    .from("company_dashboard_totals")
    .select("*")
    .maybeSingle();

  return (
    <AdminDashboardView
      displayName={displayName}
      totals={totals as CompanyDashboardTotals | null}
    />
  );
}
