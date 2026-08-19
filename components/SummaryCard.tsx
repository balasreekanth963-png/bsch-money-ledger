type Tone = "brand" | "positive" | "warning" | "danger" | "neutral";

type SummaryCardProps = {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
};

const toneStyles: Record<Tone, { bg: string; text: string; dot: string }> = {
  brand: { bg: "bg-brand-50", text: "text-brand-700", dot: "bg-brand-500" },
  positive: { bg: "bg-positive-50", text: "text-positive-700", dot: "bg-positive-500" },
  warning: { bg: "bg-warning-50", text: "text-warning-700", dot: "bg-warning-500" },
  danger: { bg: "bg-danger-50", text: "text-danger-700", dot: "bg-danger-500" },
  neutral: { bg: "bg-surface-bg", text: "text-ink-700", dot: "bg-ink-500" },
};

/**
 * A single dashboard metric card, e.g. "Money Given — ₹50,000".
 * Kept visually consistent so the dashboard reads as one system,
 * not a grid of randomly colored widgets.
 */
export default function SummaryCard({
  label,
  value,
  tone = "neutral",
  hint,
}: SummaryCardProps) {
  const t = toneStyles[tone];

  return (
    <div className="rounded-xl2 border border-surface-border bg-surface-card p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${t.dot}`} />
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
      </div>
      <p className={`mt-2 text-2xl font-extrabold tracking-tight ${t.text}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </div>
  );
}
