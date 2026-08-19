"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SodharaBrand from "@/components/SodharaBrand";
import BSCHFooter from "@/components/BSCHFooter";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    if (loading) return; // prevent duplicate submits
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError("Please enter your email/mobile and password.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError("Incorrect email or password. Please try again.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Enter your email above first, then tap 'Forgot Password'.");
      return;
    }
    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/login` }
    );
    setLoading(false);

    if (resetError) {
      setError("Unable to send reset email. Please try again.");
      return;
    }
    setNotice("Password reset link sent. Please check your email.");
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Brand hero */}
      <div className="bg-brand-gradient px-6 pb-10 pt-12 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center">
          <SodharaBrand size="lg" variant="light" withSubtitle />
        </div>
      </div>

      {/* Login card */}
      <div className="flex flex-1 flex-col px-5">
        <form
          onSubmit={handleSignIn}
          className="-mt-8 rounded-xl2 border border-surface-border bg-surface-card p-5 shadow-card-lg"
          noValidate
        >
          <h2 className="text-lg font-bold text-ink-900">Sign In</h2>
          <p className="mt-1 text-sm text-ink-500">
            Enter your details to access your ledger.
          </p>

          <label className="mt-5 block text-sm font-semibold text-ink-700">
            Email / Mobile
          </label>
          <input
            type="text"
            inputMode="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-base text-ink-900 outline-none focus:border-brand-500"
          />

          <label className="mt-4 block text-sm font-semibold text-ink-700">
            Password
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="mt-1.5 w-full rounded-xl border border-surface-border bg-white px-4 py-3.5 text-base text-ink-900 outline-none focus:border-brand-500"
          />

          {error && (
            <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="mt-3 rounded-lg bg-positive-50 px-3 py-2 text-sm font-medium text-positive-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand-gradient py-3.5 text-base font-bold text-white shadow-card transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Signing In..." : "SIGN IN"}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="mt-4 w-full text-center text-sm font-semibold text-brand-700 disabled:opacity-60"
          >
            Forgot Password
          </button>
        </form>

        <div className="flex-1" />
      </div>

      <BSCHFooter />
    </div>
  );
}
