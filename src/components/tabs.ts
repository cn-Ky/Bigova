import { faCompass, faStore, faBus, faBookOpen, faGear } from "@fortawesome/free-solid-svg-icons";
export const tabs = [
  { href: "/", l: "Keşfet", i: faCompass, hint: "Ana sayfa" },
  { href: "/isletmeler", l: "İşletmeler", i: faStore, hint: "Fiyat • saat • tuvalet" },
  { href: "/ulasim", l: "Ulaşım", i: faBus, hint: "Otobüs ve servis" },
  { href: "/notlar", l: "Notlar", i: faBookOpen, hint: "Ders notu, PDF" },
  { href: "/ayarlar", l: "Ayarlar", i: faGear, hint: "Tema ve hesap" },
];
export const isOn = (p: string, h: string) => (h === "/" ? p === "/" : p.startsWith(h));
