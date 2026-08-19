import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRupees, formatDate } from "@/lib/utils/format";
import DownloadCsvButton from "@/components/DownloadCsvButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type InvestmentBase = {
  id: string;
  investment_code: string;
  principal_amount: string;
  interest_rate: string;
  interest_frequency: string;
  start_date: string;
  maturity_date: string;
  withdrawal_eligibility_date: string;
  status: string;
  created_at: string;
  notes: string | null;
  investors: { full_name: string; investor_code: string } | null;
};

type InvestmentSummary = {
  investment_id: string;
  interest_credited: string;
  interest_accrued: string;
  interest_pending: string;
  principal_outstanding: string;
  maturity_amount: string;
  withdrawal_eligible: boolean;
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-positive-50 text-positive-700",
  matured: "bg-brand-50 text-brand-700",
  closed: "bg-surface-bg text-ink-500",
  cancelled: "bg-danger-50 text-danger-700",
};

export default async function InvestmentsPage() {
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

  const [{ data: investments, error }, { data: summaries }] = await Promise.all([
    supabase
      .from("investments")
      .select(
        "id, investment_code, principal_amount, interest_rate, interest_frequency, start_date, maturity_date, withdrawal_eligibility_date, status, created_at, notes, investors(full_name, investor_code)"
      )
      .order("start_date", { ascending: false })
      .returns<InvestmentBase[]>(),
    supabase
      .from("investor_investment_summary")
      .select(
        "investment_id, interest_credited, interest_accrued, interest_pending, principal_outstanding, maturity_amount, withdrawal_eligible"
      )
      .returns<InvestmentSummary[]>(),
  ]);

  const summaryByInvestmentId = new Map(
    (summaries ?? []).map((s) => [s.investment_id, s])
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-ink-900">
            Investments
          </p>
          <p className="text-sm text-ink-500">
            {investments?.length ?? 0} total
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadCsvButton
            filename="investments"
            rows={(investments ?? []).map((inv) => {
              const s = summaryByInvestmentId.get(inv.id);
              return {
                "Investment Code": inv.investment_code,
                Investor: inv.investors?.full_name ?? "",
                "Investor Code": inv.investors?.investor_code ?? "",
                "Principal (INR)": inv.principal_amount,
                "Interest Rate (%)": inv.interest_rate,
                Frequency: inv.interest_frequency,
                "Start Date": inv.start_date,
                "Maturity Date": inv.maturity_date,
                "Withdrawal Eligible": inv.withdrawal_eligibility_date,
                Status: inv.status,
                "Interest Credited (INR)": s?.interest_credited ?? "0",
                "Interest Pending (INR)": s?.interest_pending ?? "0",
                "Maturity Amount (INR)": s?.maturity_amount ?? "",
              };
            })}
          />
          <Link
            href="/dashboard/investments/new"
            className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-card"
          >
            + New Investment
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load investments: {error.message}
        </div>
      )}

      {!error && (!investments || investments.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          No investments yet.
        </div>
      )}

      <div className="space-y-3">
        {investments?.map((inv) => {
          const summary = summaryByInvestmentId.get(inv.id);
          return (
            <div
              key={inv.id}
              className="rounded-xl2 border border-surface-border bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-ink-900">
                    {inv.investors?.full_name ?? "Unknown investor"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {inv.investment_code} · {inv.investors?.investor_code}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    STATUS_STYLES[inv.status] ?? STATUS_STYLES.closed
                  }`}
                >
                  {inv.status}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-surface-border pt-3 sm:grid-cols-3">
                <Field label="Principal" value={formatRupees(inv.principal_amount)} />
                <Field label="Interest Rate" value={`${inv.interest_rate}% p.a.`} />
                <Field
                  label="Credited Every"
                  value={
                    inv.interest_frequency.charAt(0).toUpperCase() +
                    inv.interest_frequency.slice(1)
                  }
                />
                <Field label="Invested On" value={formatDate(inv.start_date)} />
                <Field label="Maturity Date" value={formatDate(inv.maturity_date)} />
                <Field
                  label="Withdrawal Eligible"
                  value={formatDate(inv.withdrawal_eligibility_date)}
                />
                {summary && (
                  <>
                    <Field
                      label="Interest Credited"
                      value={formatRupees(summary.interest_credited)}
                      tone="positive"
                    />
                    <Field
                      label="Interest Pending"
                      value={formatRupees(summary.interest_pending)}
                      tone="warning"
                    />
                    <Field
                      label="Maturity Amount"
                      value={formatRupees(summary.maturity_amount)}
                      tone="brand"
                    />
                  </>
                )}
              </div>

              <p className="mt-3 text-[11px] text-ink-400">
                Added to the system on{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(inv.created_at))}
              </p>

              {inv.notes && (
                <p className="mt-2 text-xs italic text-ink-500">
                  &quot;{inv.notes}&quot;
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "warning" | "brand";
}) {
  const toneClass =
    tone === "positive"
      ? "text-positive-700"
      : tone === "warning"
      ? "text-warning-700"
      : tone === "brand"
      ? "text-brand-700"
      : "text-ink-900";
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </p>
      <p className={`text-sm font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
