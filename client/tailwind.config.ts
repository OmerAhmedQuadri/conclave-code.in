import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        // code.in brand
        ink: "#1A1A1A",
        gold: {
          DEFAULT: "#D4A843",
          muted: "#A88534",
        },
        cream: {
          DEFAULT: "#F5F5F0",
          70: "#B5B5AE",
          40: "#6B6B68",
        },
        card: "#222222",
        border: "#2D2D2D",
        // shadcn semantic tokens (mapped to brand)
        background: "#1A1A1A",
        foreground: "#F5F5F0",
        primary: { DEFAULT: "#D4A843", foreground: "#1A1A1A" },
        muted: { DEFAULT: "#222222", foreground: "#B5B5AE" },
        destructive: { DEFAULT: "#E04848", foreground: "#F5F5F0" },
        ring: "#D4A843",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
