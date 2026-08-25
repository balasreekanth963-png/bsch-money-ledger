import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditInvestmentForm from "./EditInvestmentForm";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

export default async function EditInvestmentPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: investment } = await supabase
    .from("investments")
    .select(
      "id, investment_code, principal_amount, interest_rate, interest_frequency, start_date, maturity_date, status, notes, investors(full_name, investor_code)"
    )
    .eq("id", params.id)
    .eq("company_id", profile.company_id)
    .maybeSingle();

  if (!investment) {
    notFound();
  }

  if (investment.status !== "active") {
    return (
      <div>
        <div className="mb-5">
          <p className="text-xl font-extrabold tracking-tight text-ink-900">
            Edit Investment
          </p>
          <p className="text-sm text-ink-500">{investment.investment_code}</p>
        </div>
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          This investment is <strong>{investment.status}</strong> and can no
          longer be edited — only active investments can be edited, so
          interest history stays consistent.
        </div>
      </div>
    );
  }

  // Work out the current tenure in whole years (rounded) from start →
  // maturity, so the years dropdown pre-selects sensibly for investments
  // created before this feature existed.
  const start = new Date(`${investment.start_date}T00:00:00Z`);
  const maturity = new Date(`${investment.maturity_date}T00:00:00Z`);
  const approxMonths = Math.round(
    (maturity.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  const approxYears = Math.min(10, Math.max(1, Math.round(approxMonths / 12) || 1));

  const investorObj = Array.isArray(investment.investors)
    ? investment.investors[0]
    : investment.investors;

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Edit Investment
        </p>
        <p className="text-sm text-ink-500">
          {investment.investment_code} ·{" "}
          {investorObj?.full_name ?? "Unknown investor"}
        </p>
      </div>
      <EditInvestmentForm
        investmentId={investment.id}
        principalAmount={investment.principal_amount}
        interestRate={investment.interest_rate}
        interestFrequency={investment.interest_frequency}
        startDate={investment.start_date}
        tenureYears={String(approxYears)}
        notes={investment.notes ?? ""}
      />
    </div>
  );
}
