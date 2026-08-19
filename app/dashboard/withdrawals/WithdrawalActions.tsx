"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "under_review" | "approve" | "reject" | "mark_paid";

const NEXT_ACTIONS: Record<string, { action: Action; label: string; style: string }[]> = {
  REQUESTED: [
    { action: "under_review", label: "Start Review", style: "bg-brand-gradient text-white" },
    { action: "approve", label: "Approve", style: "bg-positive-600 text-white" },
    { action: "reject", label: "Reject", style: "border border-danger-200 text-danger-700" },
  ],
  UNDER_REVIEW: [
    { action: "approve", label: "Approve", style: "bg-positive-600 text-white" },
    { action: "reject", label: "Reject", style: "border border-danger-200 text-danger-700" },
  ],
  APPROVED: [
    { action: "mark_paid", label: "Mark Paid", style: "bg-brand-gradient text-white" },
  ],
};

export default function WithdrawalActions({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = NEXT_ACTIONS[status] ?? [];
  if (actions.length === 0) return null;

  async function handleAction(action: Action) {
    if (loading) return;
    setError(null);
    setLoading(action);
    try {
      const res = await fetch(`/api/withdrawals/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update this request.");
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
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ action, label, style }) => (
          <button
            key={action}
            onClick={() => handleAction(action)}
            disabled={loading !== null}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition active:scale-[0.98] disabled:opacity-60 ${style}`}
          >
            {loading === action ? "Working..." : label}
          </button>
        ))}
      </div>
      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
