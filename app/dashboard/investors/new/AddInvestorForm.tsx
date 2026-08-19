"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

type SuccessResult = {
  investorId: string;
  investorCode: string;
  email: string;
  tempPassword: string;
};

export default function AddInvestorForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SuccessResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (!fullName.trim() || !email.trim()) {
      setError("Full name and email are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
          address: address.trim(),
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
          Investor added — {result.investorCode}
        </p>
        <p className="mt-3 text-sm text-ink-700">
          Share these login details with them directly (not shown again after
          you leave this page):
        </p>
        <div className="mt-3 rounded-xl border border-surface-border bg-surface-bg p-4 font-mono text-sm">
          <p>Email: {result.email}</p>
          <p>Temporary password: {result.tempPassword}</p>
        </div>
        <p className="mt-3 text-xs text-ink-500">
          They should sign in and can reset their password from the login
          screen&apos;s &quot;Forgot Password&quot; link.
        </p>
        <div className="mt-5 flex gap-3">
          <Link
            href="/dashboard/investments/new"
            className="rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-card"
          >
            Add Their First Investment
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl border border-surface-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-700"
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
        Full Name
      </label>
      <input
        type="text"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Ravi Kumar"
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Email
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="investor@example.com"
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
        Address <span className="font-normal text-ink-500">(optional)</span>
      </label>
      <textarea
        value={address}
        onChange={(e) => setAddress(e.target.value)}
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
        {loading ? "Creating..." : "Create Investor"}
      </button>
    </form>
  );
}
