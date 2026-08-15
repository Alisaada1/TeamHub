/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Concept B — Ochre & Midnight
        // Copper/bronze (ochre) designed for both light & dark mode readability
        primary: {
          DEFAULT: "#7A4A1A",
          50: "#F5EDE5",
          100: "#EDE0D5",
          200: "#DBC8B8",
          300: "#C4A88F",
          400: "#AD8A6A",
          500: "#7A4A1A",
          600: "#6B3F16",
          700: "#5C3412",
          800: "#4A290E",
          900: "#3A1F0B",
        },
        // Petrol/navy (midnight) — corporate counterbalance to warm copper
        secondary: {
          DEFAULT: "#143542",
          50: "#EBF0F2",
          100: "#D7E0E5",
          200: "#B0C3CB",
          300: "#89A5B1",
          400: "#628797",
          500: "#143542",
          600: "#112D38",
          700: "#0E252F",
          800: "#0B1D25",
          900: "#08161B",
        },
        accent: {
          DEFAULT: "#F2F0EC",
          50: "#FDFCFB",
          100: "#FAF9F6",
          200: "#F5F2EE",
          300: "#F2F0EC",
          400: "#E8E0D8",
          500: "#D0C4B8",
          600: "#A39484",
          700: "#7D6E5C",
          800: "#564A3E",
          900: "#2F2821",
        },
        // Status colors — semantic, unchanged
        status: {
          pending: "#F59E0B",
          inProgress: "#3B82F6",
          completed: "#10B981",
          delayed: "#EF4444",
        },
        // Priority colors — semantic, unchanged
        priority: {
          low: "#9CA3AF",
          medium: "#3B82F6",
          high: "#F97316",
          urgent: "#EF4444",
        },
        // Theme tokens — 3-tier surface stacking
        // Light: rich warm taupe canvas + soft cloud white elevated surfaces
        // Dark: deep blue-black abyss + blue-grey charcoal surfaces
        bg: {
          light: "#EBE5DF",
          dark: "#111418",
        },
        surface: {
          light: "#F9F9F8",
          dark: "#1E2328",
        },
        text: {
          primary: {
            light: "#2A221C",
            dark: "#EDE8E0",
          },
          muted: {
            light: "#6B5C50",
            dark: "#9CA3A8",
          },
        },
        border: {
          light: "#E0D5CB",
          dark: "#2A3548",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        arabic: [
          "Cairo",
          "Tajawal",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
