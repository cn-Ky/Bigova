import { faCompass, faStore, faBus, faBookOpen, faGear } from "@fortawesome/free-solid-svg-icons";
export const tabs = [
  { href: "/", l: "Keşfet", i: faCompass }, { href: "/isletmeler", l: "İşletmeler", i: faStore },
  { href: "/yakinda/ulasim", l: "Ulaşım", i: faBus }, { href: "/yakinda/notlar", l: "Notlar", i: faBookOpen },
  { href: "/ayarlar", l: "Ayarlar", i: faGear },
];
export const isOn = (p: string, h: string) => (h === "/" ? p === "/" : p.startsWith(h));
