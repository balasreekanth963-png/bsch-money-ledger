import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PaymentForm from "./PaymentForm";
import { formatRupees, formatDate } from "@/lib/utils/format";
import DownloadCsvButton from "@/components/DownloadCsvButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

type LedgerRow = {
  id: string;
  person_name: string;
  amount: string;
  interest_rate: string;
  start_date: string;
  due_date: string | null;
};

export default async function PaymentsPage() {
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

  const [{ data: given }, { data: taken }, { data: repayments }] = await Promise.all([
    supabase
      .from("money_given")
      .select("id, person_name, amount, interest_rate, start_date, due_date")
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .returns<LedgerRow[]>(),
    supabase
      .from("money_taken")
      .select("id, person_name, amount, interest_rate, start_date, due_date")
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .returns<LedgerRow[]>(),
    supabase
      .from("internal_transactions")
      .select("source_id, transaction_type, amount")
      .eq("transaction_type", "repayment"),
  ]);

  const repaidBySource = new Map<string, number>();
  for (const r of repayments ?? []) {
    repaidBySource.set(
      r.source_id,
      (repaidBySource.get(r.source_id) ?? 0) + parseFloat(r.amount)
    );
  }

  const options = [
    ...(given ?? []).map((g) => ({
      sourceType: "money_given" as const,
      id: g.id,
      label: `${g.person_name} (given, outstanding ${formatRupees(
        parseFloat(g.amount) - (repaidBySource.get(g.id) ?? 0)
      )})`,
    })),
    ...(taken ?? []).map((t) => ({
      sourceType: "money_taken" as const,
      id: t.id,
      label: `${t.person_name} (taken, outstanding ${formatRupees(
        parseFloat(t.amount) - (repaidBySource.get(t.id) ?? 0)
      )})`,
    })),
  ];

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Payments
        </p>
        <p className="text-sm text-ink-500">
          Record a repayment or interest payment against Money Given / Taken.
        </p>
      </div>

      <PaymentForm options={options} />

      <div className="mt-8 space-y-5">
        <LedgerSection title="Money Given (Active)" rows={given ?? []} repaidBySource={repaidBySource} />
        <LedgerSection title="Money Taken (Active)" rows={taken ?? []} repaidBySource={repaidBySource} />
      </div>
    </div>
  );
}

function LedgerSection({
  title,
  rows,
  repaidBySource,
}: {
  title: string;
  rows: LedgerRow[];
  repaidBySource: Map<string, number>;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-ink-900">{title}</p>
        <DownloadCsvButton
          filename={title.toLowerCase().replace(/\s+/g, "-")}
          rows={rows.map((r) => {
            const outstanding = parseFloat(r.amount) - (repaidBySource.get(r.id) ?? 0);
            return {
              Person: r.person_name,
              "Original Amount (INR)": r.amount,
              "Outstanding (INR)": outstanding,
              "Interest Rate (%)": r.interest_rate,
              "Start Date": r.start_date,
              "Due Date": r.due_date ?? "",
            };
          })}
        />
      </div>
      {rows.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          None yet.
        </div>
      )}
      <div className="space-y-2">
        {rows.map((r) => {
          const outstanding = parseFloat(r.amount) - (repaidBySource.get(r.id) ?? 0);
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-surface-border bg-white p-3 shadow-card"
            >
              <div>
                <p className="text-sm font-bold text-ink-900">{r.person_name}</p>
                <p className="text-xs text-ink-500">
                  {r.interest_rate}% · Since {formatDate(r.start_date)}
                  {r.due_date && ` · Due ${formatDate(r.due_date)}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink-900">{formatRupees(outstanding)}</p>
                <p className="text-[11px] text-ink-500">of {formatRupees(r.amount)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
