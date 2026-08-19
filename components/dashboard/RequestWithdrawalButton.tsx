"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupees } from "@/lib/utils/format";

export default function RequestWithdrawalButton({
  investmentId,
  outstandingPrincipal,
}: {
  investmentId: string;
  outstandingPrincipal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(outstandingPrincipal));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    setError(null);

    const requestedAmount = Number(amount);
    if (!requestedAmount || requestedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investmentId, requestedAmount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not submit request.");
        return;
      }
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <p className="mt-3 rounded-lg bg-positive-50 px-3 py-2 text-xs font-medium text-positive-700">
        Withdrawal request submitted. Your admin will review it — pressing
        this button doesn&apos;t release the money automatically.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 w-full rounded-xl border border-brand-200 bg-brand-50 py-2.5 text-sm font-bold text-brand-700 transition active:scale-[0.99]"
      >
        Request Withdrawal
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-surface-border bg-white p-3">
      <label className="block text-xs font-semibold text-ink-700">
        Amount to withdraw (₹)
      </label>
      <input
        type="number"
        min="1"
        max={outstandingPrincipal}
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-surface-border bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-brand-500"
      />
      <p className="mt-1 text-[11px] text-ink-500">
        Max: {formatRupees(outstandingPrincipal)}
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 rounded-lg bg-brand-gradient py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={loading}
          className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
