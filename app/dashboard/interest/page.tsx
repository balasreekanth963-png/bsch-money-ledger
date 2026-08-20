import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatRupees, formatDate } from "@/lib/utils/format";
import CreditInterestButton from "./CreditInterestButton";
import DownloadCsvButton from "@/components/DownloadCsvButton";
import WhatsAppLinkButton from "@/components/WhatsAppLinkButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type PeriodRow = {
  id: string;
  period_start: string;
  period_end: string;
  expected_interest: string;
  credited_interest: string;
  remaining_interest: string;
  status: string;
  credited_date: string | null;
  investments: {
    investment_code: string;
    investors: { full_name: string; mobile: string | null } | null;
  } | null;
};

export default async function InterestPage() {
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

  // Only periods still owing something, AND that have actually started —
  // without this second check, every future period (generated upfront for
  // the whole investment term) would be creditable on day one, which
  // defeats the accrued-vs-credited distinction the schedule exists for.
  const today = new Date().toISOString().slice(0, 10);
  const { data: periods, error } = await supabase
    .from("investment_interest_periods")
    .select(
      "id, period_start, period_end, expected_interest, credited_interest, remaining_interest, status, credited_date, investments(investment_code, investors(full_name, mobile))"
    )
    .neq("status", "CREDITED")
    .lte("period_start", today)
    .order("period_end", { ascending: true })
    .returns<PeriodRow[]>();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-ink-900">
            Interest Crediting
          </p>
          <p className="text-sm text-ink-500">
            Periods still owing interest, oldest first. Overdue ones are
            highlighted.
          </p>
        </div>
        <DownloadCsvButton
          filename="interest-periods"
          rows={(periods ?? []).map((p) => ({
            Investor: p.investments?.investors?.full_name ?? "",
            "Investment Code": p.investments?.investment_code ?? "",
            "Period Start": p.period_start,
            "Period End": p.period_end,
            "Expected (INR)": p.expected_interest,
            "Credited (INR)": p.credited_interest,
            "Remaining (INR)": p.remaining_interest,
            Status: p.status,
          }))}
        />
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load interest periods: {error.message}
        </div>
      )}

      {!error && (!periods || periods.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          Nothing pending — every interest period is fully credited.
        </div>
      )}

      <div className="space-y-3">
        {periods?.map((p) => {
          const overdue = p.period_end < today;
          return (
            <div
              key={p.id}
              className={`rounded-xl2 border p-4 shadow-card ${
                overdue
                  ? "border-danger-200 bg-danger-50"
                  : "border-surface-border bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-ink-900">
                    {p.investments?.investors?.full_name ?? "Unknown investor"}
                  </p>
                  <p className="text-xs text-ink-500">
                    {p.investments?.investment_code} ·{" "}
                    {formatDate(p.period_start)} – {formatDate(p.period_end)}
                    {overdue && (
                      <span className="ml-1.5 font-semibold text-danger-700">
                        Overdue
                      </span>
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-semibold text-warning-700">
                  {p.status.replace("_", " ")}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-surface-border pt-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ink-400">
                    Expected
                  </p>
                  <p className="text-sm font-bold text-ink-900">
                    {formatRupees(p.expected_interest)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ink-400">
                    Credited
                  </p>
                  <p className="text-sm font-bold text-positive-700">
                    {formatRupees(p.credited_interest)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-ink-400">
                    Remaining
                  </p>
                  <p className="text-sm font-bold text-warning-700">
                    {formatRupees(p.remaining_interest)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <CreditInterestButton
                  periodId={p.id}
                  remainingAmount={parseFloat(p.remaining_interest)}
                />
                <WhatsAppLinkButton
                  mobile={p.investments?.investors?.mobile}
                  message={`Hi ${
                    p.investments?.investors?.full_name ?? "there"
                  }, a reminder that ₹${p.remaining_interest} interest is due for period ending ${formatDate(
                    p.period_end
                  )} on your investment ${p.investments?.investment_code ?? ""}.`}
                  label="Remind"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
