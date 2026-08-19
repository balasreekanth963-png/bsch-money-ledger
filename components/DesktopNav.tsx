"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
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

/**
 * Horizontal nav shown only on desktop (md+), where BottomNav is hidden.
 * Without this, routes like /dashboard/investors had no visible entry
 * point at all outside mobile — this fixes that gap.
 */
export default function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden border-t border-white/15 md:block">
      <div className="mx-auto flex max-w-4xl gap-1 px-4">
        {NAV_ITEMS.map(({ href, label }) => {
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
