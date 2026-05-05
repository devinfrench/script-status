import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#e7edf6",
        panel: "#1f2838",
        surface: "#2a3446",
        muted: "#344158",
        line: "#46546d",
        brand: "#91bdf4",
        good: "#67c99a",
        bad: "#f08a7e",
        warn: "#e2b45f"
      }
    }
  },
  plugins: []
} satisfies Config;
