/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tesla-inspired Graphite & Obsidian aesthetic with soft pastel red
        tesla: {
          bg: "#0d0e12",
          surface: "#181a20",
          surfaceElevated: "#22242c",
          surfaceHighlight: "#2b2d37",
          border: "#282a33",
          borderSubtle: "#1f2128",
          text: "#f4f4f6",
          muted: "#9496a1",
          faint: "#5c5e69",
          red: "#d86c6c", // Soft pastel red (terracotta / coral-rose)
          redHover: "#c55a5a",
          redSoft: "rgba(216, 108, 108, 0.14)",
          redGlow: "rgba(216, 108, 108, 0.25)",
        },
        google: {
          red: "#d86c6c",
          redHover: "#c55a5a",
          redSoft: "rgba(216, 108, 108, 0.14)",
          redDark: "#f28b82",
          blue: "#4a9eff",
          blueSoft: "rgba(74, 158, 255, 0.15)",
          green: "#34c759",
          greenSoft: "rgba(52, 199, 89, 0.15)",
          yellow: "#ff9f0a",
          yellowSoft: "rgba(255, 159, 10, 0.15)",
          bg: "#12141a",
          surface: "#181a20",
          border: "#282a33",
          borderSubtle: "#1f2128",
          text: "#f4f4f6",
          muted: "#9496a1",
          faint: "#5c5e69",
        },
      },
      borderRadius: {
        "google": "8px",
        "google-lg": "16px",
        "google-xl": "24px",
        "google-full": "9999px",
      },
      boxShadow: {
        "google": "0 2px 8px -1px rgba(0,0,0,0.4), 0 1px 3px 0 rgba(0,0,0,0.3)",
        "google-md": "0 4px 16px -2px rgba(0,0,0,0.5), 0 2px 6px -1px rgba(0,0,0,0.3)",
        "google-lg": "0 10px 32px -4px rgba(0,0,0,0.6), 0 4px 12px -2px rgba(0,0,0,0.4)",
        "tesla": "0 8px 32px 0 rgba(0, 0, 0, 0.5)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "Google Sans", "Roboto", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        display: ["var(--font-display)", "Google Sans", "sans-serif"],
        mono: ["var(--font-mono)", "Roboto Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
