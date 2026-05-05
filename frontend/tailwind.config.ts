import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        panel: "#f8faf7",
        line: "#d9e1dc",
        good: "#157f5b",
        bad: "#b42318",
        warn: "#b7791f"
      }
    }
  },
  plugins: []
} satisfies Config;
