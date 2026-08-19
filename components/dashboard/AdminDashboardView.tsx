import SummaryCard from "@/components/SummaryCard";
import QuickActionButton from "@/components/QuickActionButton";
import { formatRupees } from "@/lib/utils/format";

export type CompanyDashboardTotals = {
  company_id: string;
  company_name: string;
  total_investors: number;
  total_investments_received: string;
  total_money_given: string;
  total_money_taken: string;
  interest_payable: string;
  interest_credited: string;
  interest_pending: string;
  principal_outstanding: string;
  upcoming_maturities_30d: number;
  pending_withdrawal_requests: number;
  overdue_interest_periods: number;
  todays_transactions: number;
};

type Props = {
  displayName: string;
  totals: CompanyDashboardTotals | null;
};

export default function AdminDashboardView({ displayName, totals }: Props) {
  // A brand-new company has no totals row's numbers to show as anything
  // but zero — same honest-empty-state principle as Phase 1.
  const t: CompanyDashboardTotals = totals ?? {
    company_id: "",
    company_name: "",
    total_investors: 0,
    total_investments_received: "0",
    total_money_given: "0",
    total_money_taken: "0",
    interest_payable: "0",
    interest_credited: "0",
    interest_pending: "0",
    principal_outstanding: "0",
    upcoming_maturities_30d: 0,
    pending_withdrawal_requests: 0,
    overdue_interest_periods: 0,
    todays_transactions: 0,
  };

  const hasInvestors = t.total_investors > 0;

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Welcome, {displayName} 👋
        </p>
        <p className="text-sm text-ink-500">Here&apos;s Sodhara Investments at a glance.</p>
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        <QuickActionButton href="/dashboard/investors/new" label="Add Investor" emphasis="primary" icon={<PlusPersonIcon />} />
        <QuickActionButton href="/dashboard/investments/new" label="New Investment" icon={<ArrowUpIcon />} />
        <QuickActionButton href="/dashboard/money-given/new" label="Money Given" icon={<ArrowUpIcon />} />
        <QuickActionButton href="/dashboard/money-taken/new" label="Money Taken" icon={<ArrowDownIcon />} />
        <QuickActionButton href="/dashboard/withdrawals" label="Withdrawals" icon={<InboxIcon />} />
        <QuickActionButton href="/dashboard/reports" label="Reports" icon={<ChartIcon />} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryCard label="Total Investments" value={formatRupees(t.total_investments_received)} tone="brand" />
        <SummaryCard label="Total Investors" value={String(t.total_investors)} tone="neutral" />
        <SummaryCard label="Money Given" value={formatRupees(t.total_money_given)} tone="neutral" />
        <SummaryCard label="Money Taken" value={formatRupees(t.total_money_taken)} tone="neutral" />
        <SummaryCard label="Interest Payable" value={formatRupees(t.interest_payable)} tone="warning" />
        <SummaryCard label="Interest Credited" value={formatRupees(t.interest_credited)} tone="positive" />
        <SummaryCard label="Interest Pending" value={formatRupees(t.interest_pending)} tone="warning" />
        <SummaryCard label="Principal Outstanding" value={formatRupees(t.principal_outstanding)} tone="brand" />
        <SummaryCard label="Upcoming Maturities" value={String(t.upcoming_maturities_30d)} hint="next 30 days" tone="brand" />
        <SummaryCard label="Withdrawal Requests" value={String(t.pending_withdrawal_requests)} hint="pending review" tone="warning" />
        <SummaryCard label="Overdue Interest" value={String(t.overdue_interest_periods)} tone="danger" />
        <SummaryCard label="Today's Transactions" value={String(t.todays_transactions)} tone="positive" />
      </div>

      {!hasInvestors && (
        <div className="mt-6 rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          No investors yet. Tap <span className="font-semibold text-brand-700">Add Investor</span> to
          onboard your first investor — figures above will update automatically.
        </div>
      )}
    </div>
  );
}

function PlusPersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" strokeLinecap="round" />
      <path d="M19 8v6M16 11h6" strokeLinecap="round" />
    </svg>
  );
}
function ArrowUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 19V5M6 11l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function InboxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h4l2 3h6l2-3h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 5h14l2 7v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7l2-7Z" strokeLinejoin="round" />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 20V10M10 20V4M16 20v-7M2 20h20" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
