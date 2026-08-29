"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MANAGER_ROLES = ["COMPANY_ADMIN", "PLATFORM_ADMIN"];

const BASE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/investors", label: "Investors" },
  { href: "/dashboard/investments", label: "Investments" },
  { href: "/dashboard/interest", label: "Interest" },
  { href: "/dashboard/withdrawals", label: "Withdrawals" },
  { href: "/dashboard/payments", label: "Payments" },
  { href: "/dashboard/notifications", label: "Notifications" },
  { href: "/dashboard/reports", label: "Reports" },
  { href: "/dashboard/audit", label: "Audit Log" },
];

const TEAM_NAV_ITEM = { href: "/dashboard/team", label: "Team" };

/**
 * Horizontal nav shown only on desktop (md+), where BottomNav is hidden.
 * Without this, routes like /dashboard/investors had no visible entry
 * point at all outside mobile — this fixes that gap.
 *
 * "Team" is only added for Company/Platform Admins — the same
 * restriction /dashboard/team and the More page already enforce — so
 * Staff and investors aren't shown a link that just bounces them back.
 */
export default function DesktopNav({ role }: { role: string | null }) {
  const pathname = usePathname();
  const navItems =
    role && MANAGER_ROLES.includes(role)
      ? [...BASE_NAV_ITEMS, TEAM_NAV_ITEM]
      : BASE_NAV_ITEMS;

  return (
    <nav className="hidden border-t border-white/15 md:block">
      <div className="mx-auto flex max-w-4xl gap-1 px-4">
        {navItems.map(({ href, label }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "border-white text-white"
                  : "border-transparent text-brand-100 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
