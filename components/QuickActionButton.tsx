import Link from "next/link";
import type { ReactNode } from "react";

type QuickActionButtonProps = {
  href: string;
  label: string;
  icon: ReactNode;
  emphasis?: "primary" | "secondary";
};

export default function QuickActionButton({
  href,
  label,
  icon,
  emphasis = "secondary",
}: QuickActionButtonProps) {
  const isPrimary = emphasis === "primary";

  return (
    <Link
      href={href}
      className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl2 border px-3 py-3 text-center shadow-card transition active:scale-[0.98] ${
        isPrimary
          ? "border-transparent bg-brand-gradient text-white"
          : "border-surface-border bg-white text-ink-900"
      }`}
    >
      <span className={isPrimary ? "text-white" : "text-brand-700"}>{icon}</span>
      <span className="text-[13px] font-semibold leading-tight">{label}</span>
    </Link>
  );
}
