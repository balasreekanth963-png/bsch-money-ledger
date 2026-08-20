"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloseInvestmentButtons({
  investmentId,
  status,
}: {
  investmentId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"matured" | "closed" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "active") return null;

  async function handleClose(target: "matured" | "closed") {
    if (loading) return;
    setError(null);
    setLoading(target);
    try {
      const res = await fetch(`/api/investments/${investmentId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not close this investment.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mt-3 border-t border-surface-border pt-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleClose("matured")}
          disabled={loading !== null}
          className="rounded-lg bg-brand-gradient px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {loading === "matured" ? "Working..." : "Mark Matured (tenure completed)"}
        </button>
        <button
          onClick={() => handleClose("closed")}
          disabled={loading !== null}
          className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-700 disabled:opacity-60"
        >
          {loading === "closed" ? "Working..." : "Close Early"}
        </button>
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-ink-400">
        This only changes status — history, transactions, and reports stay intact.
      </p>
    </div>
  );
}
