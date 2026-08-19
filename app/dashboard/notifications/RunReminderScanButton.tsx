"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunReminderScanButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScan() {
    if (loading) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Scan failed.");
        return;
      }
      setResult(
        `Logged ${data.maturityReminders} maturity reminder(s) and ${data.interestPendingReminders} overdue-interest reminder(s).`
      );
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
        onClick={handleScan}
        disabled={loading}
        className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-card transition active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? "Scanning..." : "Run Reminder Scan"}
      </button>
      {result && (
        <p className="mt-2 rounded-lg bg-positive-50 px-3 py-2 text-xs font-medium text-positive-700">
          {result}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-lg bg-danger-50 px-3 py-2 text-xs font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
