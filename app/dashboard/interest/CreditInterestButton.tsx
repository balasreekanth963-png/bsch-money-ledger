"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupees } from "@/lib/utils/format";

export default function CreditInterestButton({
  periodId,
  remainingAmount,
}: {
  periodId: string;
  remainingAmount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredit() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/interest-periods/${periodId}/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // no amount -> API credits the full remaining balance
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not credit this period.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCredit}
        disabled={loading}
        className="w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
      >
        {loading
          ? "Crediting..."
          : `Mark ${formatRupees(remainingAmount)} as Credited`}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
