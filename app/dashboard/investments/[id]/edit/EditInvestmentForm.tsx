"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TENURE_YEARS = Array.from({ length: 10 }, (_, i) => String(i + 1)); // "1".."10"

export default function EditInvestmentForm({
  investmentId,
  principalAmount,
  interestRate,
  interestFrequency,
  startDate,
  tenureYears,
  notes,
}: {
  investmentId: string;
  principalAmount: string;
  interestRate: string;
  interestFrequency: string;
  startDate: string;
  tenureYears: string;
  notes: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(principalAmount);
  const [rate, setRate] = useState(interestRate);
  const [frequency, setFrequency] = useState<"monthly" | "quarterly" | "yearly">(
    (interestFrequency as "monthly" | "quarterly" | "yearly") || "monthly"
  );
  const [start, setStart] = useState(startDate);
  const [years, setYears] = useState(tenureYears);
  const [notesValue, setNotesValue] = useState(notes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!amount || Number(amount) <= 0 || !start || !years) {
      setError("A positive amount, start date, and tenure are all required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/investments/${investmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principalAmount: Number(amount),
          interestRate: Number(rate),
          interestFrequency: frequency,
          startDate: start,
          periodMonths: Number(years) * 12,
          notes: notesValue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save changes.");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card"
      noValidate
    >
      <label className="block text-sm font-semibold text-ink-700">
        Principal Amount (₹)
      </label>
      <input
        type="number"
        min="1"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
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
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Credit Frequency
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as typeof frequency)}
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
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Investment Tenure (Years)
          </label>
          <select
            value={years}
            onChange={(e) => setYears(e.target.value)}
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
        Maturity and withdrawal eligibility recalculate to Start Date + Tenure.
      </p>

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Notes <span className="font-normal text-ink-500">(optional)</span>
      </label>
      <textarea
        value={notesValue}
        onChange={(e) => setNotesValue(e.target.value)}
        rows={2}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <div className="mt-3 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
        Note: this updates the investment&apos;s terms, but does not
        regenerate interest periods already created. If you change the
        amount, rate, frequency, start date, or tenure on an investment that
        already has interest history, review it under{" "}
        <Link href="/dashboard/interest" className="font-semibold underline">
          Dashboard → Interest
        </Link>{" "}
        afterward.
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 rounded-lg bg-positive-50 px-3 py-2 text-sm font-medium text-positive-700">
          Saved.{" "}
          <Link href="/dashboard/investments" className="font-semibold underline">
            Back to Investments
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-gradient py-3.5 text-base font-bold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
