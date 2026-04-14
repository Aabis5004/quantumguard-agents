/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#0B0F1A", soft: "#0F1524", elev: "#141B2D" },
        line: { DEFAULT: "#1F2937", strong: "#374151" },
        ink: { DEFAULT: "#E5E7EB", muted: "#9CA3AF", dim: "#6B7280" },
        brand: { 1: "#06B6D4", 2: "#8B5CF6", 3: "#EC4899" },
        ok: "#10B981",
        warn: "#F59E0B",
        bad: "#EF4444",
        // legacy aliases (so old classes don't break)
        "arc-bg": "#0B0F1A",
        "arc-card": "#141B2D",
        "arc-border": "#1F2937",
        "arc-accent": "#06B6D4",
        "arc-accent2": "#8B5CF6",
        "arc-quantum": "#EC4899",
        "arc-success": "#10B981",
        "arc-warning": "#F59E0B",
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: "0 4px 20px -4px rgba(0,0,0,0.4)",
        glow: "0 0 40px -10px rgba(139,92,246,0.4)",
      },
    },
  },
  plugins: [],
};
