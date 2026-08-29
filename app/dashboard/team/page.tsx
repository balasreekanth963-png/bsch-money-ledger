import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManageTeamLoginButton from "./ManageTeamLoginButton";

// Narrower than the usual ADMIN_ROLES set used elsewhere: viewing/managing
// teammates' logins is itself a privilege-escalation-sensitive screen, so
// plain STAFF cannot even see this page.
const MANAGER_ROLES = ["COMPANY_ADMIN", "PLATFORM_ADMIN"];
const TEAM_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];

const ROLE_LABELS: Record<string, string> = {
  COMPANY_ADMIN: "Company Admin",
  STAFF: "Staff",
  PLATFORM_ADMIN: "Platform Admin",
};

type TeamMember = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
};

export default async function TeamPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile || !MANAGER_ROLES.includes(profile.role) || !profile.company_id) {
    redirect("/dashboard");
  }

  const { data: team, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("company_id", profile.company_id)
    .in("role", TEAM_ROLES)
    .order("full_name")
    .returns<TeamMember[]>();

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">Team</p>
        <p className="text-sm text-ink-500">
          Admin &amp; staff accounts — reset a colleague&apos;s password if
          they&apos;re ever locked out.
        </p>
      </div>

      {error && (
        <div className="rounded-xl2 border border-dashed border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          Could not load the team: {error.message}
        </div>
      )}

      {!error && (!team || team.length === 0) && (
        <div className="rounded-xl2 border border-dashed border-surface-border bg-white p-4 text-sm text-ink-500">
          No other team members yet.
        </div>
      )}

      <div className="space-y-3">
        {team?.map((member) => {
          const isSelf = member.id === profile.id;
          const isProtected = member.role === "PLATFORM_ADMIN" && profile.role !== "PLATFORM_ADMIN";

          return (
            <div
              key={member.id}
              className="rounded-xl2 border border-surface-border bg-white p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-ink-900">
                    {member.full_name}
                    {isSelf && <span className="ml-2 text-xs font-medium text-ink-500">(you)</span>}
                  </p>
                  {member.email && <p className="text-xs text-ink-500">{member.email}</p>}
                </div>
                <span className="rounded-full bg-surface-bg px-2.5 py-1 text-[11px] font-semibold text-ink-700">
                  {ROLE_LABELS[member.role] ?? member.role}
                </span>
              </div>

              <div className="mt-3 border-t border-surface-border pt-3">
                {isSelf ? (
                  <p className="text-xs text-ink-500">
                    Use your normal account settings to change your own password.
                  </p>
                ) : isProtected ? (
                  <p className="text-xs text-ink-500">
                    Only a Platform Admin can manage this account&apos;s login.
                  </p>
                ) : (
                  <ManageTeamLoginButton profileId={member.id} fullName={member.full_name} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
