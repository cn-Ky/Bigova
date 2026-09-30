import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { sea: "#0E3A5B", deep: "#072638", foam: "#F3F8FA", tide: "#2CC4B5", sun: "#FFB84D", coral: "#FF6B57", sky: "#BFE6F2" },
    fontFamily: { display: ["var(--f-display)", "sans-serif"], body: ["var(--f-body)", "sans-serif"] },
  } },
  plugins: [],
} satisfies Config;
