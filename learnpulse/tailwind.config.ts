import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "system-ui"],
      },
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-text)",
        accent: {
          DEFAULT: "var(--color-accent)",
          muted: "var(--color-accent-muted)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
        },
        app: {
          muted: "var(--color-text-muted)",
        },
        info: "var(--color-info)",
        danger: "var(--color-danger)",
        highlight: "var(--color-highlight)",
      },
      fontSize: {
        "display-sm": ["2.25rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        display: ["2.75rem", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
      },
    },
  },
  plugins: [],
};
export default config;
