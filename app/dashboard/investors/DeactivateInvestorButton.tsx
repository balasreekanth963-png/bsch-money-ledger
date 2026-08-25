"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeactivateInvestorButton({
  investorId,
  status,
  fullName,
}: {
  investorId: string;
  status: string;
  fullName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const isActive = status === "active";
  const action = isActive ? "deactivate" : "reactivate";

  async function handleClick() {
    if (loading) return;

    // Deactivating disables their login — ask once before doing it.
    if (isActive && !confirming) {
      setConfirming(true);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/investors/${investorId}/deactivate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this investor.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-danger-700">
          Deactivate {fullName}? Their login will be disabled immediately.
        </span>
        <button
          onClick={handleClick}
          disabled={loading}
          className="rounded-lg bg-danger-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {loading ? "Working..." : "Yes, deactivate"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          isActive
            ? "rounded-lg border border-danger-200 px-3 py-2 text-xs font-semibold text-danger-700 disabled:opacity-60"
            : "rounded-lg border border-positive-100 px-3 py-2 text-xs font-semibold text-positive-700 disabled:opacity-60"
        }
      >
        {loading ? "Working..." : isActive ? "Deactivate" : "Reactivate"}
      </button>
      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
