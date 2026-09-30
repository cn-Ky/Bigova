export const THEMES = [
  { id: "sabah", name: "Ege sabahı", dark: false, foam: "#F3F8FA", card: "#FFFFFF", sea: "#0E3A5B", sun: "#FFB84D", tide: "#2CC4B5", ink: "#0E3A5B" },
  { id: "gece", name: "Gece mavisi", dark: true, foam: "#0F1B26", card: "#182A39", sea: "#2F7FB8", sun: "#FFC766", tide: "#3DD6C4", ink: "#E6F1F7" },
  { id: "komur", name: "Kömür (siyah)", dark: true, foam: "#000000", card: "#141414", sea: "#C2410C", sun: "#FACC15", tide: "#22D3EE", ink: "#F2F2F2" },
  { id: "gunbatimi", name: "Gün batımı", dark: false, foam: "#FFF4EA", card: "#FFFFFF", sea: "#D9486B", sun: "#FFB347", tide: "#2FB59B", ink: "#4A1E2E" },
  { id: "orman", name: "Orman", dark: false, foam: "#EEF5EC", card: "#FFFFFF", sea: "#2E7D4F", sun: "#E9C46A", tide: "#2CC4B5", ink: "#173A2A" },
  { id: "lavanta", name: "Lavanta", dark: false, foam: "#F4F0FB", card: "#FFFFFF", sea: "#6B4FD1", sun: "#FFC857", tide: "#35C5C0", ink: "#2B1B4D" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_KEY = "bigova-theme";
export function applyTheme(id: string) {
  const t = THEMES.find((x) => x.id === id) ?? THEMES[0];
  document.documentElement.dataset.theme = t.id;
  try { localStorage.setItem(THEME_KEY, t.id); } catch {}
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.sea);
}
