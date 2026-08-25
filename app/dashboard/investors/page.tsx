import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRupees } from "@/lib/utils/format";
import DownloadCsvButton from "@/components/DownloadCsvButton";
import WhatsAppLinkButton from "@/components/WhatsAppLinkButton";
import DeactivateInvestorButton from "./DeactivateInvestorButton";
import ManageLoginButton from "./ManageLoginButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type InvestmentRow = {
  id: string;
  investment_code: string;
  principal_amount: string;
  status: string;
};

type InvestorRow = {
  id: string;
  full_name: string;
  investor_code: string;
  mobile: string | null;
  email: string | null;
  status: string;
  investments: InvestmentRow[];
};

export default async function InvestorsPage() {
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

  // Nested select pulls each investor's investments in one round trip via
  // the investor_id foreign key. RLS on both tables already scopes this
  // to the caller's own company.
  const { data: investors, error } = await supabase
    .from("investors")
    .select(
      "id, full_name, investor_code, mobile, email, status, investments(id, investment_code, principal_amount, status)"
    )
    .order("full_name")
    .returns<InvestorRow[]>();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-ink-900">
            Investors
          </p>
          <p className="text-sm text-ink-500">
            {investors?.length ?? 0} total
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadCsvButton
            filename="investors"
            rows={(investors ?? []).map((inv) => {
              const activeInvestments = inv.investments.filter((i) => i.status === "active");
              const totalInvested = activeInvestments.reduce(
                (sum, i) => sum + parseFloat(i.principal_amount),
                0
              );
              return {
                Name: inv.full_name,
                Code: inv.investor_code,
                Mobile: inv.mobile ?? "",
                Email: inv.email ?? "",
                Status: inv.status,
                "Active Investments": activeInvestments.length,
                "Total Invested (INR)": totalInvested,
              };
            })}
          />
          <Link
            href="/dashboard/investors/new"
            className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-card"
          >
            + Add Investor
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load investors: {error.message}
        </div>
      )}

      {!error && (!investors || investors.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          No investors yet. Tap{" "}
          <span className="font-semibold text-brand-700">Add Investor</span>{" "}
          to onboard your first one.
        </div>
      )}

      <div className="space-y-3">
        {investors?.map((inv) => {
          const activeInvestments = inv.investments.filter(
            (i) => i.status === "active"
          );
          const totalInvested = activeInvestments.reduce(
            (sum, i) => sum + parseFloat(i.principal_amount),
            0
          );

          return (
            <div
              key={inv.id}
              className="rounded-xl2 border border-surface-border bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-ink-900">
                    {inv.full_name}
                  </p>
                  <p className="text-xs text-ink-500">{inv.investor_code}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    inv.status === "active"
                      ? "bg-positive-50 text-positive-700"
                      : "bg-surface-bg text-ink-500"
                  }`}
                >
                  {inv.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-500">
                {inv.mobile && <span>📱 {inv.mobile}</span>}
                {inv.email && <span>✉️ {inv.email}</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <WhatsAppLinkButton
                  mobile={inv.mobile}
                  message={`Hi ${inv.full_name}, this is Sodhara Investments reaching out regarding your investment(s). Let us know if you have any questions.`}
                />
                <Link
                  href={`/dashboard/investors/${inv.id}/edit`}
                  className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-700"
                >
                  Edit
                </Link>
                <ManageLoginButton investorId={inv.id} fullName={inv.full_name} />
                <DeactivateInvestorButton
                  investorId={inv.id}
                  status={inv.status}
                  fullName={inv.full_name}
                />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3">
                <p className="text-xs text-ink-500">
                  {activeInvestments.length} active investment
                  {activeInvestments.length === 1 ? "" : "s"}
                </p>
                <p className="text-sm font-bold text-brand-700">
                  {formatRupees(totalInvested)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
