import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = ["COMPANY_ADMIN", "STAFF", "PLATFORM_ADMIN"];
const MANAGER_ROLES = ["COMPANY_ADMIN", "PLATFORM_ADMIN"];

const BASE_LINKS = [
  { href: "/dashboard/investments", label: "Investments", desc: "Every investment, all details" },
  { href: "/dashboard/interest", label: "Interest Crediting", desc: "Credit interest owed to investors" },
  { href: "/dashboard/withdrawals", label: "Withdrawal Requests", desc: "Review, approve, mark paid" },
  { href: "/dashboard/notifications", label: "Notifications", desc: "Event log — not yet sent anywhere" },
  { href: "/dashboard/audit", label: "Audit Log", desc: "Who changed what, and when" },
];

const TEAM_LINK = {
  href: "/dashboard/team",
  label: "Team",
  desc: "Admin & staff logins — reset a colleague's password",
};

export default async function MorePage() {
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

  const links = MANAGER_ROLES.includes(profile.role)
    ? [...BASE_LINKS, TEAM_LINK]
    : BASE_LINKS;

  return (
    <div>
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-tight text-ink-900">More</p>
        <p className="text-sm text-ink-500">Everything else, in one place.</p>
      </div>

      <div className="space-y-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center justify-between rounded-xl2 border border-surface-border bg-white p-4 shadow-card transition active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-bold text-ink-900">{l.label}</p>
              <p className="text-xs text-ink-500">{l.desc}</p>
            </div>
            <span className="text-ink-400">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
