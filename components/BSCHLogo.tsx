type BSCHLogoProps = {
  size?: "sm" | "md" | "lg";
  withTagline?: boolean;
  variant?: "light" | "dark";
};

const sizeMap = {
  sm: { mark: "h-9 w-9 text-sm", title: "text-base", tagline: "text-[11px]" },
  md: { mark: "h-12 w-12 text-lg", title: "text-xl", tagline: "text-xs" },
  lg: { mark: "h-16 w-16 text-2xl", title: "text-3xl", tagline: "text-sm" },
};

/**
 * BSCH text-based brand mark, used on the login screen, header, and
 * anywhere the BSCH identity needs to be visually strong.
 * "variant=light" is for use on dark/brand-gradient backgrounds.
 */
export default function BSCHLogo({
  size = "md",
  withTagline = false,
  variant = "dark",
}: BSCHLogoProps) {
  const s = sizeMap[size];
  const isLight = variant === "light";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${s.mark} flex shrink-0 items-center justify-center rounded-xl2 font-extrabold tracking-tight shadow-card ${
          isLight
            ? "bg-white text-brand-700"
            : "bg-brand-gradient text-white"
        }`}
      >
        BS
      </div>
      <div className="leading-tight">
        <p
          className={`${s.title} font-extrabold tracking-tight ${
            isLight ? "text-white" : "text-ink-900"
          }`}
        >
          BSCH
        </p>
        {withTagline && (
          <p
            className={`${s.tagline} font-medium ${
              isLight ? "text-brand-100" : "text-ink-500"
            }`}
          >
            Bala Sir Career Hub Consultancy
          </p>
        )}
      </div>
    </div>
  );
}
