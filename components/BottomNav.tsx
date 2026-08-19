"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/dashboard/investors", label: "Investors", icon: PeopleIcon },
  { href: "/dashboard/payments", label: "Payments", icon: PaymentIcon },
  { href: "/dashboard/reports", label: "Reports", icon: ReportIcon },
  { href: "/dashboard/more", label: "More", icon: MoreIcon },
];

/**
 * Fixed bottom navigation for mobile. Desktop shows a normal top
 * header instead (see DashboardShell), this bar is hidden at md+.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-surface-border bg-white/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-brand-700" : "text-ink-500"
                }`}
              >
                <Icon active={active} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8}>
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" strokeLinecap="round" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.6.3 4.5 2.6 4.5 5.3" strokeLinecap="round" />
    </svg>
  );
}

function PaymentIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" strokeLinecap="round" />
    </svg>
  );
}

function ReportIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8}>
      <path d="M4 20V10" strokeLinecap="round" />
      <path d="M10 20V4" strokeLinecap="round" />
      <path d="M16 20v-7" strokeLinecap="round" />
      <path d="M2 20h20" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.4 : 1.8}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
