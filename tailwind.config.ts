import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { sea: "#0b3d5c", foam: "#e8f4f8", olive: "#7a9a3b", sun: "#f2a541", clay: "#c8553d" },
    fontFamily: { display: ["Georgia", "serif"] } } },
  plugins: [],
} satisfies Config;
