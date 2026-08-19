import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRupees, formatDate } from "@/lib/utils/format";
import WithdrawalActions from "./WithdrawalActions";
import DownloadCsvButton from "@/components/DownloadCsvButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-warning-50 text-warning-700",
  UNDER_REVIEW: "bg-brand-50 text-brand-700",
  APPROVED: "bg-positive-50 text-positive-700",
  REJECTED: "bg-danger-50 text-danger-700",
  PAID: "bg-surface-bg text-ink-700",
  CANCELLED: "bg-surface-bg text-ink-400",
};

type WithdrawalRow = {
  id: string;
  requested_amount: string;
  requested_date: string;
  eligible_date: string;
  status: string;
  paid_date: string | null;
  investments: { investment_code: string } | null;
  investors: { full_name: string; investor_code: string } | null;
};

export default async function WithdrawalsPage() {
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

  const { data: requests, error } = await supabase
    .from("withdrawal_requests")
    .select(
      "id, requested_amount, requested_date, eligible_date, status, paid_date, investments(investment_code), investors(full_name, investor_code)"
    )
    .order("requested_date", { ascending: false })
    .returns<WithdrawalRow[]>();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-ink-900">
            Withdrawal Requests
          </p>
          <p className="text-sm text-ink-500">
            Review, approve, and mark requests as paid.
          </p>
        </div>
        <DownloadCsvButton
          filename="withdrawal-requests"
          rows={(requests ?? []).map((r) => ({
            Investor: r.investors?.full_name ?? "",
            "Investor Code": r.investors?.investor_code ?? "",
            "Investment Code": r.investments?.investment_code ?? "",
            "Requested Amount (INR)": r.requested_amount,
            "Requested Date": r.requested_date,
            "Eligible Date": r.eligible_date,
            Status: r.status,
            "Paid Date": r.paid_date ?? "",
          }))}
        />
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load withdrawal requests: {error.message}
        </div>
      )}

      {!error && (!requests || requests.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          No withdrawal requests yet.
        </div>
      )}

      <div className="space-y-3">
        {requests?.map((r) => (
          <div
            key={r.id}
            className="rounded-xl2 border border-surface-border bg-white p-4 shadow-card"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base font-bold text-ink-900">
                  {r.investors?.full_name ?? "Unknown investor"}
                </p>
                <p className="text-xs text-ink-500">
                  {r.investments?.investment_code} · {r.investors?.investor_code}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  STATUS_STYLES[r.status] ?? STATUS_STYLES.PAID
                }`}
              >
                {r.status.replace("_", " ")}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 border-t border-surface-border pt-3">
              <div>
                <p className="text-[10px] font-semibold uppercase text-ink-400">
                  Requested
                </p>
                <p className="text-sm font-bold text-ink-900">
                  {formatRupees(r.requested_amount)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-ink-400">
                  Requested On
                </p>
                <p className="text-sm font-bold text-ink-900">
                  {formatDate(r.requested_date)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-ink-400">
                  Eligible From
                </p>
                <p className="text-sm font-bold text-ink-900">
                  {formatDate(r.eligible_date)}
                </p>
              </div>
            </div>

            {r.paid_date && (
              <p className="mt-2 text-xs text-ink-500">
                Paid on {formatDate(r.paid_date)}
              </p>
            )}

            <div className="mt-3">
              <WithdrawalActions requestId={r.id} status={r.status} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
