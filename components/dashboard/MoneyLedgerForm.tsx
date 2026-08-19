"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function MoneyLedgerForm({
  apiPath,
  submitLabel,
}: {
  apiPath: "/api/money-given" | "/api/money-taken";
  submitLabel: string;
}) {
  const [personName, setPersonName] = useState("");
  const [mobile, setMobile] = useState("");
  const [amount, setAmount] = useState("");
  const [interestRate, setInterestRate] = useState("0");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(null);

    if (!personName.trim() || !amount || Number(amount) <= 0 || !startDate) {
      setError("Person's name, a positive amount, and start date are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personName: personName.trim(),
          mobile: mobile.trim(),
          amount: Number(amount),
          interestRate: Number(interestRate),
          startDate,
          dueDate: dueDate.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess("Saved successfully.");
      setPersonName("");
      setMobile("");
      setAmount("");
      setInterestRate("0");
      setDueDate("");
      setNotes("");
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
        Person&apos;s Name
      </label>
      <input
        type="text"
        value={personName}
        onChange={(e) => setPersonName(e.target.value)}
        placeholder="Full name"
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Mobile <span className="font-normal text-ink-500">(optional)</span>
      </label>
      <input
        type="tel"
        value={mobile}
        onChange={(e) => setMobile(e.target.value)}
        placeholder="9876543210"
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Amount (₹)
      </label>
      <input
        type="number"
        min="1"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 50000"
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink-700">
            Interest Rate (%)
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
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Due Date <span className="font-normal text-ink-500">(optional)</span>
      </label>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

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
      {success && (
        <p className="mt-4 rounded-lg bg-positive-50 px-3 py-2 text-sm font-medium text-positive-700">
          {success}{" "}
          <Link href="/dashboard" className="font-semibold underline">
            Back to Dashboard
          </Link>
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-gradient py-3.5 text-base font-bold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
