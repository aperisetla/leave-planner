import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
      },
      // Leave type color palette
      leave: {
        pto: "#3b82f6",       // blue
        sick: "#f59e0b",      // amber
        holiday: "#10b981",   // emerald
        personal: "#8b5cf6",  // violet
        other: "#6b7280",     // gray
      },
    },
  },
  plugins: [],
};

export default config;
