import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DownloadCsvButton from "@/components/DownloadCsvButton";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

const ACTION_STYLES: Record<string, string> = {
  CREDIT_INTEREST: "bg-positive-50 text-positive-700",
  WITHDRAWAL_PAID: "bg-brand-50 text-brand-700",
};

type AuditRow = {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  profiles: { full_name: string } | null;
};

export default async function AuditLogPage() {
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

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select(
      "id, action, table_name, record_id, old_data, new_data, created_at, profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AuditRow[]>();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xl font-extrabold tracking-tight text-ink-900">
            Audit Log
          </p>
          <p className="text-sm text-ink-500">
            Every logged financial change — who, when, and what changed.
            Nothing here can be edited or deleted.
          </p>
        </div>
        <DownloadCsvButton
          filename="audit-log"
          rows={(logs ?? []).map((l) => ({
            Date: l.created_at,
            Actor: l.profiles?.full_name ?? "System",
            Action: l.action,
            Table: l.table_name,
            "Record ID": l.record_id ?? "",
            "Old Value": JSON.stringify(l.old_data ?? {}),
            "New Value": JSON.stringify(l.new_data ?? {}),
          }))}
        />
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load the audit log: {error.message}
        </div>
      )}

      {!error && (!logs || logs.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          Nothing logged yet. Crediting interest or paying out a
          withdrawal will show up here.
        </div>
      )}

      <div className="space-y-2">
        {logs?.map((l) => (
          <div
            key={l.id}
            className="rounded-xl border border-surface-border bg-white p-3 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ACTION_STYLES[l.action] ?? "bg-surface-bg text-ink-700"
                  }`}
                >
                  {l.action.replace(/_/g, " ")}
                </span>
                <p className="text-xs text-ink-500">
                  by {l.profiles?.full_name ?? "System"} · {l.table_name}
                </p>
              </div>
              <p className="text-[11px] text-ink-500">
                {new Intl.DateTimeFormat("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(l.created_at))}
              </p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-danger-50 p-2">
                <p className="text-[10px] font-semibold uppercase text-danger-700">
                  Before
                </p>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-ink-700">
                  {JSON.stringify(l.old_data, null, 0)}
                </pre>
              </div>
              <div className="rounded-lg bg-positive-50 p-2">
                <p className="text-[10px] font-semibold uppercase text-positive-700">
                  After
                </p>
                <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] text-ink-700">
                  {JSON.stringify(l.new_data, null, 0)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
