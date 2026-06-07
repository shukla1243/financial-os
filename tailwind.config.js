module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a14",
        surface: "#12121f",
        card: "#1a1a2e",
        border: "#1e1e35",
        purple: { DEFAULT: "#7c3aed", light: "#a78bfa", dark: "#5b21b6" },
        cyan: { DEFAULT: "#06b6d4", light: "#67e8f9", dark: "#0891b2" },
        pink: { DEFAULT: "#f472b6", light: "#fbcfe8", dark: "#db2777" },
        gold: { DEFAULT: "#fbbf24", light: "#fde68a", dark: "#d97706" },
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        orbitron: ["Orbitron", "monospace"],
        inter: ["Inter", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "slide-up": "slideUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        slideUp: { "0%": { transform: "translateY(20px)", opacity: 0 }, "100%": { transform: "translateY(0)", opacity: 1 } },
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
      },
    },
  },
  plugins: [],
}
