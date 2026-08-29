"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoginInfo = {
  hasAuthAccount: boolean;
  email?: string | null;
  accountStatus?: "Active" | "Disabled";
  lastSignInAt?: string | null;
  mustChangePassword?: boolean;
  warning?: string;
};

type RevealedPassword = {
  value: string;
  context: string;
};

function formatLastSignIn(iso: string | null | undefined): string {
  if (!iso) return "Never signed in";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ManageLoginModal({
  apiBasePath,
  fullName,
  allowCreateAccount = true,
  onClose,
}: {
  /** e.g. "/api/investors/abc123" or "/api/profiles/abc123" — the modal appends "/manage-login" itself. */
  apiBasePath: string;
  fullName: string;
  /** Team members always already have an auth account; investors may not. */
  allowCreateAccount?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const endpoint = `${apiBasePath}/manage-login`;
  const [info, setInfo] = useState<LoginInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<RevealedPassword | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  async function loadInfo() {
    setLoadError(null);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.error ?? "Could not load login information.");
        return;
      }
      setInfo(data);
    } catch {
      setLoadError("Network error while loading login information.");
    }
  }

  useEffect(() => {
    loadInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function runAction(action: string, context: string) {
    if (actionLoading) return;
    setActionError(null);
    setActionMessage(null);
    setActionLoading(action);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error ?? "Action failed.");
        return;
      }
      if (data.tempPassword) {
        setRevealed({ value: data.tempPassword, context });
        setCopied(false);
      }
      if (data.message) {
        setActionMessage(data.message);
      }
      await loadInfo();
      router.refresh();
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
      setConfirmingReset(false);
    }
  }

  async function handleCopy() {
    if (!revealed) return;
    try {
      await navigator.clipboard.writeText(revealed.value);
      setCopied(true);
    } catch {
      setActionError("Could not copy automatically — please select and copy manually.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 md:items-center md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Manage login for ${fullName}`}
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-surface-border bg-white p-5 shadow-card-lg md:rounded-xl2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-ink-900">Login Access</p>
            <p className="text-sm text-ink-500">{fullName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-ink-500"
          >
            ×
          </button>
        </div>

        {loadError && (
          <div className="mt-4 rounded-xl border border-dashed border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">
            {loadError}
          </div>
        )}

        {!loadError && !info && (
          <div className="mt-4 text-sm text-ink-500">Loading…</div>
        )}

        {info && !info.hasAuthAccount && (
          <div className="mt-4">
            {info.warning && (
              <p className="mb-3 rounded-lg bg-warning-50 px-3 py-2 text-xs text-warning-700">
                {info.warning}
              </p>
            )}
            <div className="rounded-xl border border-dashed border-surface-border bg-surface-bg p-4 text-center">
              <p className="text-sm font-semibold text-ink-700">
                Login account not created
              </p>
              {info.email && (
                <p className="mt-1 text-xs text-ink-500">{info.email}</p>
              )}
              {allowCreateAccount ? (
                <button
                  onClick={() => runAction("create_login_account", "New login account")}
                  disabled={actionLoading !== null}
                  className="mt-3 w-full rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {actionLoading === "create_login_account" ? "Creating..." : "Create Login Account"}
                </button>
              ) : (
                <p className="mt-2 text-xs text-ink-500">
                  This team member needs to sign up for an account first.
                </p>
              )}
            </div>
          </div>
        )}

        {info && info.hasAuthAccount && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-surface-border bg-surface-bg p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">Email</span>
                <span className="font-semibold text-ink-900">{info.email}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-500">Account Status</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    info.accountStatus === "Active"
                      ? "bg-positive-50 text-positive-700"
                      : "bg-danger-50 text-danger-700"
                  }`}
                >
                  {info.accountStatus}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-500">Last Login</span>
                <span className="font-semibold text-ink-900">
                  {formatLastSignIn(info.lastSignInAt)}
                </span>
              </div>
              {info.mustChangePassword && (
                <p className="mt-2 rounded-lg bg-warning-50 px-2.5 py-1.5 text-xs font-medium text-warning-700">
                  Password change is pending — they&apos;ll be prompted at next sign-in.
                </p>
              )}
              {info.accountStatus === "Disabled" && allowCreateAccount && (
                <p className="mt-2 text-xs text-ink-500">
                  This login is disabled because the investor is deactivated.
                  Use Reactivate on the investor card to re-enable it.
                </p>
              )}
            </div>

            {revealed && (
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-3.5">
                <p className="text-xs font-semibold text-brand-700">{revealed.context}</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-sm font-bold tracking-wide text-ink-900">
                    {revealed.value}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded-lg bg-brand-gradient px-3 py-2 text-xs font-bold text-white"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-danger-700">
                  Save this temporary password now. It will not be shown again.
                </p>
              </div>
            )}

            {actionMessage && (
              <p className="rounded-lg bg-positive-50 px-3 py-2 text-sm font-medium text-positive-700">
                {actionMessage}
              </p>
            )}
            {actionError && (
              <p className="rounded-lg bg-danger-50 px-3 py-2 text-sm font-medium text-danger-700">
                {actionError}
              </p>
            )}

            <div className="space-y-2">
              <button
                onClick={() => runAction("generate_temp_password", "New temporary password")}
                disabled={actionLoading !== null}
                className="w-full rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {actionLoading === "generate_temp_password" ? "Generating..." : "Generate Temporary Password"}
              </button>

              {!confirmingReset ? (
                <button
                  onClick={() => setConfirmingReset(true)}
                  disabled={actionLoading !== null}
                  className="w-full rounded-xl border border-danger-200 py-3 text-sm font-bold text-danger-700 disabled:opacity-60"
                >
                  Reset Password
                </button>
              ) : (
                <div className="rounded-xl border border-danger-200 bg-danger-50 p-3">
                  <p className="text-xs font-medium text-danger-700">
                    This immediately invalidates their current password. Continue?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => runAction("reset_password", "New password (reset)")}
                      disabled={actionLoading !== null}
                      className="flex-1 rounded-lg bg-danger-700 py-2 text-xs font-bold text-white disabled:opacity-60"
                    >
                      {actionLoading === "reset_password" ? "Working..." : "Yes, reset it"}
                    </button>
                    <button
                      onClick={() => setConfirmingReset(false)}
                      disabled={actionLoading !== null}
                      className="rounded-lg border border-surface-border px-3 py-2 text-xs font-semibold text-ink-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => runAction("force_password_change", "")}
                disabled={actionLoading !== null || info.mustChangePassword}
                className="w-full rounded-xl border border-surface-border py-3 text-sm font-semibold text-ink-700 disabled:opacity-60"
              >
                {info.mustChangePassword
                  ? "Password Change Already Pending"
                  : actionLoading === "force_password_change"
                  ? "Working..."
                  : "Force Password Change"}
              </button>

              <button
                onClick={() => runAction("send_recovery_email", "")}
                disabled={actionLoading !== null}
                className="w-full rounded-xl border border-surface-border py-3 text-sm font-semibold text-ink-700 disabled:opacity-60"
              >
                {actionLoading === "send_recovery_email" ? "Sending..." : "Send Password Recovery Email"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
