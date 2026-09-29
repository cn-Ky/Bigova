/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        sea: "#0F3D4C",      // ana renk: Marmara/Ege denizi
        foam: "#F1F6F5",     // arka plan
        sun: "#F5B82E",      // vurgu (tek nokta)
        ink: "#12262B",
        mute: "#6B7F84",
        line: "#DCE6E5",
      },
    },
  },
  plugins: [],
};
