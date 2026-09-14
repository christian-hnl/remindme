import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#07090E",
        card: "#11141D",
        "card-hover": "#161B26",
        elevated: "#1A1F2C",
        "elevated-hover": "#212738",
        border: "rgba(255, 255, 255, 0.07)",
        "border-glow": "rgba(99, 102, 241, 0.35)",
        "sub-border": "rgba(255, 255, 255, 0.05)",
        muted: "#64748B",
        "muted-dark": "#475569",
        main: "#F8FAFC",
        accent: {
          blue: {
            DEFAULT: "#6366F1",
            deep: "#4F46E5",
            glow: "rgba(99, 102, 241, 0.25)",
          },
          mint: {
            DEFAULT: "#10B981",
            deep: "#059669",
            glow: "rgba(16, 185, 129, 0.25)",
          },
          iris: {
            DEFAULT: "#8B5CF6",
            deep: "#7C3AED",
            glow: "rgba(139, 92, 246, 0.25)",
          },
          amber: {
            DEFAULT: "#F59E0B",
            deep: "#D97706",
            glow: "rgba(245, 158, 11, 0.25)",
          },
        },
      },
      borderRadius: {
        "bento-sm": "16px",
        "bento-md": "20px",
        bento: "24px",
        "bento-lg": "28px",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "SF Pro Display", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["var(--font-geist-mono)", "SF Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        bento: "0 4px 24px -1px rgba(0, 0, 0, 0.45)",
        "bento-glow": "0 0 35px -5px rgba(99, 102, 241, 0.20)",
        "mint-glow": "0 0 35px -5px rgba(16, 185, 129, 0.25)",
        "amber-glow": "0 0 35px -5px rgba(245, 158, 11, 0.25)",
        floating: "0 12px 40px rgba(0, 0, 0, 0.65)",
      },
      animation: {
        "pulse-subtle": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
