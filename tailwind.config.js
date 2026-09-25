/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  safelist: [
    {
      pattern:
        /^bg-(primary|secondary|success|warning|danger|info|neutral|purple|pink|gradient-blue|gradient-blue,|gradient-purple|gradient-sunset|gradient-emerald)$/,
    },
    // Dynamic grid columns (5-12) for builder layout support
    {
      pattern: /^grid-cols-(1|2|3|4|5|6|7|8|9|10|11|12)$/,
    },
    {
      pattern: /^col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/,
      variants: ["md", "lg"],
    },
    "data-[state=open]:animate-in",
    "data-[state=closed]:animate-out",
    "data-[state=open]:fade-in-0",
    "data-[state=closed]:fade-out-0",
    "data-[state=open]:zoom-in-95",
    "data-[state=closed]:zoom-out-95",
    "data-[state=open]:slide-in-from-left-1/2",
    "data-[state=open]:slide-in-from-top-[48%]",
    "data-[state=closed]:slide-out-to-left-1/2",
    "data-[state=closed]:slide-out-to-top-[48%]",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "hsl(var(--primary-50) / <alpha-value>)",
          100: "hsl(var(--primary-100) / <alpha-value>)",
          200: "hsl(var(--primary-200) / <alpha-value>)",
          300: "hsl(var(--primary-300) / <alpha-value>)",
          400: "hsl(var(--primary-400) / <alpha-value>)",
          500: "hsl(var(--primary-500) / <alpha-value>)",
          600: "hsl(var(--primary-600) / <alpha-value>)",
          700: "hsl(var(--primary-700) / <alpha-value>)",
          800: "hsl(var(--primary-800) / <alpha-value>)",
          900: "hsl(var(--primary-900) / <alpha-value>)",
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        neutral: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0a0a0a",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ['"Geist Sans"', "system-ui", "sans-serif"],
        display: ['"Geist Sans"', "sans-serif"],
        mono: ['"Geist Mono"', "monospace"],
      },
      boxShadow: {
        soft: "0 2px 15px rgba(0, 0, 0, 0.08)",
        medium: "0 4px 20px rgba(0, 0, 0, 0.12)",
        strong: "0 10px 40px rgba(0, 0, 0, 0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out both",
        "slide-in": "slideIn 0.4s ease-out both",
        "slide-up": "slideUp 0.4s ease-out both",
        "scale-in": "scaleIn 0.3s ease-out both",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "orbit-cw": "orbitCw 3s linear infinite",
        "orbit-ccw": "orbitCcw 4s linear infinite",
        "core-pulse": "corePulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite",
        "fade-text": "fadeText 1.5s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },
        slideIn: {
          "0%": {
            transform: "translateX(-20px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateX(0)",
            opacity: "1",
          },
        },
        slideUp: {
          "0%": {
            transform: "translateY(20px)",
            opacity: "0",
          },
          "100%": {
            transform: "translateY(0)",
            opacity: "1",
          },
        },
        scaleIn: {
          "0%": {
            transform: "scale(0.9)",
            opacity: "0",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        pulseSoft: {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.7",
          },
        },
        orbitCw: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        orbitCcw: {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        corePulse: {
          "0%, 100%": {
            transform: "scale(0.9)",
            opacity: "0.8",
            boxShadow: "0 0 15px currentColor",
          },
          "50%": {
            transform: "scale(1.1)",
            opacity: "1",
            boxShadow: "0 0 30px currentColor",
          },
        },
        fadeText: {
          "0%": { opacity: "1" },
          "100%": { opacity: "0.4" },
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
