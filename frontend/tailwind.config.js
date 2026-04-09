/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        arc: {
          dark: "#0a0a0f",
          card: "#13131a",
          border: "#26262e",
          accent: "#00d4ff",
          accent2: "#7c3aed",
          quantum: "#a855f7",
          danger: "#ef4444",
          warning: "#f59e0b",
          success: "#10b981",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
}
