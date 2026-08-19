import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRupees, formatDate } from "@/lib/utils/format";
import DownloadCsvButton from "@/components/DownloadCsvButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type InvestmentTxnRow = {
  id: string;
  transaction_type: string;
  amount: string;
  transaction_date: string;
  notes: string | null;
  investments: { investment_code: string } | null;
  investors: { full_name: string } | null;
};

type InternalTxnRow = {
  id: string;
  source_type: string;
  transaction_type: string;
  amount: string;
  transaction_date: string;
  notes: string | null;
};

const INVESTMENT_TXN_LABELS: Record<string, string> = {
  INVESTMENT_RECEIVED: "Investment Received",
  INTEREST_ACCRUED: "Interest Accrued",
  INTEREST_CREDITED: "Interest Credited",
  PRINCIPAL_WITHDRAWAL: "Principal Withdrawn",
  INTEREST_WITHDRAWAL: "Interest Withdrawn",
  ADJUSTMENT: "Adjustment",
  REVERSAL: "Reversal",
};

const INVESTMENT_TXN_STYLES: Record<string, string> = {
  INVESTMENT_RECEIVED: "bg-brand-50 text-brand-700",
  INTEREST_ACCRUED: "bg-warning-50 text-warning-700",
  INTEREST_CREDITED: "bg-positive-50 text-positive-700",
  PRINCIPAL_WITHDRAWAL: "bg-danger-50 text-danger-700",
  INTEREST_WITHDRAWAL: "bg-danger-50 text-danger-700",
  ADJUSTMENT: "bg-surface-bg text-ink-700",
  REVERSAL: "bg-surface-bg text-ink-700",
};

export default async function ReportsPage() {
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

  const [{ data: investmentTxns, error: investmentTxnErr }, { data: internalTxns, error: internalTxnErr }] =
    await Promise.all([
      supabase
        .from("investment_transactions")
        .select(
          "id, transaction_type, amount, transaction_date, notes, investments(investment_code), investors(full_name)"
        )
        .order("transaction_date", { ascending: false })
        .limit(100)
        .returns<InvestmentTxnRow[]>(),
      supabase
        .from("internal_transactions")
        .select("id, source_type, transaction_type, amount, transaction_date, notes")
        .order("transaction_date", { ascending: false })
        .limit(100)
        .returns<InternalTxnRow[]>(),
    ]);

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Reports
        </p>
        <p className="text-sm text-ink-500">
          Full transaction history, most recent first.
        </p>
      </div>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink-900">
            Investor Transactions
          </p>
          <DownloadCsvButton
            filename="investor-transactions"
            label="Download CSV"
            rows={(investmentTxns ?? []).map((t) => ({
              Date: t.transaction_date,
              Type: INVESTMENT_TXN_LABELS[t.transaction_type] ?? t.transaction_type,
              Investor: t.investors?.full_name ?? "",
              "Investment Code": t.investments?.investment_code ?? "",
              "Amount (INR)": t.amount,
              Notes: t.notes ?? "",
            }))}
          />
        </div>

        {investmentTxnErr && (
          <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
            Could not load: {investmentTxnErr.message}
          </div>
        )}

        {!investmentTxnErr && (!investmentTxns || investmentTxns.length === 0) && (
          <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
            No investor transactions yet.
          </div>
        )}

        <div className="space-y-2">
          {investmentTxns?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-surface-border bg-white p-3 shadow-card"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      INVESTMENT_TXN_STYLES[t.transaction_type] ?? "bg-surface-bg text-ink-700"
                    }`}
                  >
                    {INVESTMENT_TXN_LABELS[t.transaction_type] ?? t.transaction_type}
                  </span>
                  <p className="text-xs text-ink-500">
                    {t.investors?.full_name ?? "Unknown"} · {t.investments?.investment_code}
                  </p>
                </div>
                {t.notes && <p className="mt-1 text-xs italic text-ink-400">{t.notes}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink-900">{formatRupees(t.amount)}</p>
                <p className="text-[11px] text-ink-500">{formatDate(t.transaction_date)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink-900">
            Internal Ledger (Money Given / Taken)
          </p>
          <DownloadCsvButton
            filename="internal-ledger"
            label="Download CSV"
            rows={(internalTxns ?? []).map((t) => ({
              Date: t.transaction_date,
              Source: t.source_type === "money_given" ? "Money Given" : "Money Taken",
              Type: t.transaction_type,
              "Amount (INR)": t.amount,
              Notes: t.notes ?? "",
            }))}
          />
        </div>

        {internalTxnErr && (
          <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
            Could not load: {internalTxnErr.message}
          </div>
        )}

        {!internalTxnErr && (!internalTxns || internalTxns.length === 0) && (
          <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
            No internal transactions yet.
          </div>
        )}

        <div className="space-y-2">
          {internalTxns?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-xl border border-surface-border bg-white p-3 shadow-card"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      t.source_type === "money_given"
                        ? "bg-brand-50 text-brand-700"
                        : "bg-warning-50 text-warning-700"
                    }`}
                  >
                    {t.source_type === "money_given" ? "Money Given" : "Money Taken"}
                  </span>
                  <p className="text-xs text-ink-500">{t.transaction_type}</p>
                </div>
                {t.notes && <p className="mt-1 text-xs italic text-ink-400">{t.notes}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink-900">{formatRupees(t.amount)}</p>
                <p className="text-[11px] text-ink-500">{formatDate(t.transaction_date)}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
