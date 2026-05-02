import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6366f1",
          hover: "#4f46e5",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#a855f7",
          hover: "#9333ea",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
        background: "#0f172a",
        foreground: "#f8fafc",
        card: {
          DEFAULT: "#1e293b",
          foreground: "#f8fafc",
          border: "rgba(255, 255, 255, 0.1)",
        },
        muted: {
          DEFAULT: "#334155",
          foreground: "#94a3b8",
        },
        border: "#334155",
        input: "#1e293b",
      },
      borderRadius: {
        lg: "0.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
