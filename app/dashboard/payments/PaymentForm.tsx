"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Option = {
  sourceType: "money_given" | "money_taken";
  id: string;
  label: string;
};

export default function PaymentForm({ options }: { options: Option[] }) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState("");
  const [transactionType, setTransactionType] = useState<"repayment" | "interest_payment">(
    "repayment"
  );
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setSuccess(null);

    const selected = options.find((o) => `${o.sourceType}:${o.id}` === selectedKey);
    if (!selected || !amount || Number(amount) <= 0 || !transactionDate) {
      setError("Select an entity, a positive amount, and a date.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: selected.sourceType,
          sourceId: selected.id,
          transactionType,
          amount: Number(amount),
          transactionDate,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not record this payment.");
        return;
      }
      setSuccess("Payment recorded.");
      setAmount("");
      setNotes("");
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
        Against
      </label>
      <select
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      >
        <option value="">Select an entry</option>
        {options.map((o) => (
          <option key={`${o.sourceType}:${o.id}`} value={`${o.sourceType}:${o.id}`}>
            {o.label}
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="mt-1.5 text-xs text-ink-500">
          No active Money Given/Taken entries yet.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink-700">Type</label>
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as typeof transactionType)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          >
            <option value="repayment">Repayment (reduces balance)</option>
            <option value="interest_payment">Interest Payment</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink-700">Amount (₹)</label>
          <input
            type="number"
            min="1"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
          />
        </div>
      </div>

      <label className="mt-4 block text-sm font-semibold text-ink-700">Date</label>
      <input
        type="date"
        value={transactionDate}
        onChange={(e) => setTransactionDate(e.target.value)}
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
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 w-full rounded-xl bg-brand-gradient py-3.5 text-base font-bold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? "Saving..." : "Record Payment"}
      </button>
    </form>
  );
}
