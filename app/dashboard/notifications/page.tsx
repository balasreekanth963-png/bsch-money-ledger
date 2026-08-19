import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RunReminderScanButton from "./RunReminderScanButton";
import DownloadCsvButton from "@/components/DownloadCsvButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

const TYPE_LABELS: Record<string, string> = {
  INTEREST_CREDITED: "Interest Credited",
  INTEREST_PENDING: "Interest Pending",
  MATURITY_REMINDER: "Maturity Reminder",
  WITHDRAWAL_STATUS: "Withdrawal Status",
};

const TYPE_STYLES: Record<string, string> = {
  INTEREST_CREDITED: "bg-positive-50 text-positive-700",
  INTEREST_PENDING: "bg-warning-50 text-warning-700",
  MATURITY_REMINDER: "bg-brand-50 text-brand-700",
  WITHDRAWAL_STATUS: "bg-surface-bg text-ink-700",
};

type NotificationRow = {
  id: string;
  notification_type: string;
  channel: string;
  status: string;
  message: string;
  created_at: string;
  investors: { full_name: string } | null;
};

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, notification_type, channel, status, message, created_at, investors(full_name)")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<NotificationRow[]>();

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">
          Notifications
        </p>
        <p className="text-sm text-ink-500">
          This is a data trail only — nothing here has actually been sent
          via WhatsApp, SMS, or email yet. Interest-credited and
          withdrawal-status events log automatically; maturity and
          overdue-interest reminders need a manual scan for now (or a
          scheduled job later).
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <RunReminderScanButton />
        <DownloadCsvButton
          filename="notifications"
          rows={(notifications ?? []).map((n) => ({
            Date: n.created_at,
            Type: TYPE_LABELS[n.notification_type] ?? n.notification_type,
            Investor: n.investors?.full_name ?? "",
            Channel: n.channel,
            Status: n.status,
            Message: n.message,
          }))}
        />
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load notifications: {error.message}
        </div>
      )}

      {!error && (!notifications || notifications.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          Nothing logged yet. Credit some interest, change a withdrawal
          status, or run the reminder scan above.
        </div>
      )}

      <div className="space-y-2">
        {notifications?.map((n) => (
          <div
            key={n.id}
            className="rounded-xl border border-surface-border bg-white p-3 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    TYPE_STYLES[n.notification_type] ?? "bg-surface-bg text-ink-700"
                  }`}
                >
                  {TYPE_LABELS[n.notification_type] ?? n.notification_type}
                </span>
                <span className="rounded-full bg-surface-bg px-2 py-0.5 text-[10px] font-semibold text-ink-500">
                  {n.status}
                </span>
              </div>
              <p className="text-[11px] text-ink-500">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(n.created_at))}
              </p>
            </div>
            <p className="mt-2 text-sm text-ink-900">{n.message}</p>
            {n.investors?.full_name && (
              <p className="mt-1 text-xs text-ink-500">For: {n.investors.full_name}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
