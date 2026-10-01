export const MOBILE_NAV_KEY = "bigova-mobile-nav";
export const DESKTOP_NAV_KEY = "bigova-desktop-nav";

export const MOBILE_NAVS = [
  { id: "bottom", name: "Alt menü", detail: "Ekranın altında ikonlu gezinti" },
  { id: "drawer", name: "Hamburger", detail: "Üst köşeden açılan menü" },
  { id: "top", name: "Üst şerit", detail: "Yatay kaydırılabilir üst menü" },
] as const;

export const DESKTOP_NAVS = [
  { id: "sidebar", name: "Sol menü", detail: "Geniş, etiketli yan menü" },
  { id: "top", name: "Üst menü", detail: "Yatay, etiketli gezinti" },
  { id: "rail", name: "Kompakt ray", detail: "Dar, ikon odaklı yan menü" },
] as const;

export function applyNavigationLayout(mobile: string, desktop: string) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.mobileNav = mobile;
  document.documentElement.dataset.desktopNav = desktop;
}
