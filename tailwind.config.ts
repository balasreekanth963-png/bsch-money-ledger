import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // BSCH brand color system
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#b8cffe",
          300: "#8babfb",
          400: "#5a80f5",
          500: "#3459e8",
          600: "#243fc9",
          700: "#1f34a2", // primary deep professional blue
          800: "#1c2f80",
          900: "#1a2a5e",
        },
        positive: {
          50: "#ecfdf3",
          100: "#d1fadf",
          500: "#12b76a",
          600: "#079455",
          700: "#067a48",
        },
        warning: {
          50: "#fffaeb",
          100: "#fef0c7",
          500: "#f79009",
          600: "#dc6803",
          700: "#b54708",
        },
        danger: {
          50: "#fef3f2",
          100: "#fee4e2",
          500: "#f04438",
          600: "#d92d20",
          700: "#b42318",
        },
        surface: {
          bg: "#f6f8fc",
          card: "#ffffff",
          border: "#e6eaf2",
        },
        ink: {
          900: "#101828",
          700: "#344054",
          500: "#667085",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 1px 3px rgba(16, 24, 40, 0.10)",
        "card-lg": "0 4px 8px rgba(16, 24, 40, 0.06), 0 8px 16px rgba(16, 24, 40, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #1f34a2 0%, #3459e8 55%, #5a80f5 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
