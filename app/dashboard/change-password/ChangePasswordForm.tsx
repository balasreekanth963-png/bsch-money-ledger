"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function passwordStrength(pw: string): { label: string; className: string; score: number } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", className: "bg-danger-500 w-1/4", score };
  if (score <= 2) return { label: "Fair", className: "bg-warning-500 w-2/4", score };
  if (score <= 3) return { label: "Good", className: "bg-brand-500 w-3/4", score };
  return { label: "Strong", className: "bg-positive-500 w-full", score };
}

export default function ChangePasswordForm() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = passwordStrength(newPassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // Step 1: set the new password directly via Supabase Auth, using
      // the investor's own active session (they're already signed in with
      // the temporary password). No server route ever sees this value.
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        setError(updateErr.message || "Could not set your new password. Please try again.");
        return;
      }

      // Step 2: clear the must_change_password flag so the gate lets them
      // through from now on. This route never receives the password.
      const res = await fetch("/api/account/complete-password-change", {
        method: "POST",
      });

      if (!res.ok) {
        setError("Password was updated, but we couldn't finish setup. Please try signing in again.");
        return;
      }

      router.push("/dashboard");
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
      className="rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card-lg"
      noValidate
    >
      <label className="block text-sm font-semibold text-ink-700">
        New Password
      </label>
      <input
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      {newPassword.length > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-bg">
            <div className={`h-full rounded-full transition-all ${strength.className}`} />
          </div>
          <p className="mt-1 text-xs text-ink-500">Strength: {strength.label}</p>
        </div>
      )}

      <label className="mt-4 block text-sm font-semibold text-ink-700">
        Confirm New Password
      </label>
      <input
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-base text-ink-900 outline-none focus:border-brand-500"
      />

      <p className="mt-3 text-xs text-ink-500">
        Must be at least 8 characters. Mix upper/lowercase letters, numbers,
        and symbols for a stronger password.
      </p>

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
        {loading ? "Saving..." : "Set New Password"}
      </button>
    </form>
  );
}
