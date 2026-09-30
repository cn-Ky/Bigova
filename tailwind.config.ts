import type { Config } from "tailwindcss";
const c = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { sea: c("sea"), sea2: c("sea2"), deep: c("deep"), foam: c("foam"), card: c("card"), ink: c("ink"), tide: c("tide"), sun: c("sun"), coral: c("coral"), sky: c("sky") },
    fontFamily: { display: ["var(--f-display)", "sans-serif"], body: ["var(--f-body)", "sans-serif"] },
  } },
  plugins: [],
} satisfies Config;
