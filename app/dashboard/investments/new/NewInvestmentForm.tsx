"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type InvestorOption = {
  id: string;
  full_name: string;
  investor_code: string;
};

type SuccessResult = {
  investmentId: string;
  investmentCode: string;
  warning?: string;
};

const TENURE_YEARS = Array.from({ length: 10 }, (_, i) => String(i + 1)); // "1".."10"

export default function NewInvestmentForm({
  investors,
}: {
  investors: InvestorOption[];
}) {
  const [investorId, setInvestorId] = useState("");
  const [principalAmount, setPrincipalAmount] = useState("");
  const [interestRate, setInterestRate] = useState("14");
  const [interestFrequency, setInterestFrequency] = useState<
    "monthly" | "quarterly" | "yearly"
  >("monthly");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [tenureYears, setTenureYears] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (
      !investorId ||
      !principalAmount ||
      Number(principalAmount) <= 0 ||
      !startDate ||
      !tenureYears
    ) {
      setError(
        "Investor, a positive investment amount, start date, and tenure are all required."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/investments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          investorId,
          principalAmount: Number(principalAmount),
          interestRate: Number(interestRate),
          interestFrequency,
          startDate,
          periodMonths: Number(tenureYears) * 12,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setResult(data as SuccessResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card">
        <p className="text-sm font-bold text-positive-700">
          Investment created — {result.investmentCode}
        </p>
        {result.warning && (
          <p className="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-sm font-medium text-warning-700">
            {result.warning}
          </p>
        )}
        <p className="mt-3 text-sm text-ink-700">
          Interest periods have been generated automatically. The investor
          will see this the next time they log in.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/dashboard/investments/new"
            className="rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-700"
          >
            Add Another Investment
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-card"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card"
      noValidate
    >
      <label className="block text-sm font-semibold text-ink-700">
        Investor
      </label>
      <select
        value={investorId}
        onChange={(e) => setInvestorId(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      >
        <option value="">Select an investor</option>
        {investors.map((inv) => (
          <option key={inv.id} value={inv.id}>
            {inv.full_name} ({inv.investor_code})
          </option>
        ))}
      </select>
      {investors.length === 0 && (
        <p className="mt-1.5 text-xs text-ink-500">
          No investors yet.{" "}
          <Link
            href="/dashboard/investors/new"
            className="font-semibold text-brand-700"
          >
            Add one first
          </Link>
          .
        </p>
      )}

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Principal Amount (₹)
      </label>
      <input
        type="number"
        min="1"
        step="0.01"
        value={principalAmount}
        onChange={(e) => setPrincipalAmount(e.target.value)}
        placeholder="e.g. 100000"
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Interest Rate (% p.a.)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Credit Frequency
          </label>
          <select
            value={interestFrequency}
            onChange={(e) =>
              setInterestFrequency(
                e.target.value as typeof interestFrequency
              )
            }
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Investment Tenure (Years)
          </label>
          <select
            value={tenureYears}
            onChange={(e) => setTenureYears(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          >
            {TENURE_YEARS.map((y) => (
              <option key={y} value={y}>
                {y} {y === "1" ? "year" : "years"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="mt-1.5 text-xs text-ink-500">
        Maturity and withdrawal eligibility default to Start Date + Tenure.
      </p>

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Notes <span className="font-normal text-ink-500">(optional)</span>
      </label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      {error && (
        <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-gradient py-3.5 text-base font-bold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Creating..." : "Create Investment"}
      </button>
    </form>
  );
}
