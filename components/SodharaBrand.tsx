type SodharaBrandProps = {
  size?: "sm" | "md" | "lg";
  withSubtitle?: boolean;
  variant?: "light" | "dark";
};

const sizeMap = {
  sm: { mark: "h-9 w-9 text-sm", title: "text-base", subtitle: "text-[11px]" },
  md: { mark: "h-12 w-12 text-lg", title: "text-xl", subtitle: "text-xs" },
  lg: { mark: "h-16 w-16 text-2xl", title: "text-2xl", subtitle: "text-sm" },
};

/**
 * SODHARA INVESTMENTS brand mark — the primary, client-facing identity.
 * Used on the login screen and dashboard header. BSCH appears only in
 * the footer via BSCHFooter, per the branding rule: Sodhara is the
 * product, BSCH is "Powered by" underneath it.
 */
export default function SodharaBrand({
  size = "md",
  withSubtitle = false,
  variant = "dark",
}: SodharaBrandProps) {
  const s = sizeMap[size];
  const isLight = variant === "light";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${s.mark} flex shrink-0 items-center justify-center rounded-xl2 font-extrabold tracking-tight shadow-card ${
          isLight ? "bg-white text-brand-700" : "bg-brand-gradient text-white"
        }`}
      >
        SI
      </div>
      <div className="leading-tight">
        <p
          className={`${s.title} font-extrabold tracking-tight ${
            isLight ? "text-white" : "text-ink-900"
          }`}
        >
          SODHARA INVESTMENTS
        </p>
        {withSubtitle && (
          <p
            className={`${s.subtitle} font-medium ${
              isLight ? "text-brand-100" : "text-ink-500"
            }`}
          >
            Your Trusted Wealth Growth Partner
          </p>
        )}
      </div>
    </div>
  );
}
