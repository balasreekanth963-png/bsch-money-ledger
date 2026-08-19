import SummaryCard from "@/components/SummaryCard";
import RequestWithdrawalButton from "@/components/dashboard/RequestWithdrawalButton";
import { formatRupees, formatDate } from "@/lib/utils/format";

export type InvestorInvestmentSummary = {
  investment_id: string;
  investor_id: string;
  company_id: string;
  investment_code: string;
  principal_amount: string;
  interest_rate: string;
  interest_frequency: string;
  start_date: string;
  maturity_date: string;
  withdrawal_eligibility_date: string;
  status: string;
  interest_credited: string;
  interest_accrued: string;
  interest_pending: string;
  principal_outstanding: string;
  maturity_amount: string;
  withdrawal_eligible: boolean;
};

type Props = {
  displayName: string;
  investments: InvestorInvestmentSummary[];
};

export default function InvestorDashboardView({ displayName, investments }: Props) {
  const hasInvestments = investments.length > 0;

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Welcome, {displayName} 👋
        </p>
        <p className="text-sm text-ink-500">Here&apos;s your investment at a glance.</p>
      </div>

      {!hasInvestments && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          No investments on your account yet. Once your admin records your investment, it
          will appear here automatically.
        </div>
      )}

      <div className="flex flex-col gap-5">
        {investments.map((inv) => (
          <div
            key={inv.investment_id}
            className="rounded-xl2 border border-surface-border bg-surface-card p-4 shadow-card"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink-900">{inv.investment_code}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  inv.status === "active"
                    ? "bg-positive-50 text-positive-700"
                    : "bg-surface-bg text-ink-500"
                }`}
              >
                {inv.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <SummaryCard label="Invested" value={formatRupees(inv.principal_amount)} tone="brand" />
              <SummaryCard label="Rate" value={`${inv.interest_rate}% p.a.`} tone="neutral" />
              <SummaryCard label="Interest Credited" value={formatRupees(inv.interest_credited)} tone="positive" />
              <SummaryCard label="Interest Pending" value={formatRupees(inv.interest_pending)} tone="warning" />
              <SummaryCard label="Current Value" value={formatRupees(inv.maturity_amount)} hint="at maturity" tone="brand" />
              <SummaryCard
                label="Withdrawal"
                value={inv.withdrawal_eligible ? "Eligible" : "Not Yet"}
                tone={inv.withdrawal_eligible ? "positive" : "neutral"}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-surface-border pt-3 text-xs text-ink-500 sm:grid-cols-3">
              <p>Start: <span className="font-semibold text-ink-700">{formatDate(inv.start_date)}</span></p>
              <p>Maturity: <span className="font-semibold text-ink-700">{formatDate(inv.maturity_date)}</span></p>
              <p>Eligible From: <span className="font-semibold text-ink-700">{formatDate(inv.withdrawal_eligibility_date)}</span></p>
            </div>

            {inv.withdrawal_eligible && inv.status === "active" && (
              <RequestWithdrawalButton
                investmentId={inv.investment_id}
                outstandingPrincipal={parseFloat(inv.principal_outstanding)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
