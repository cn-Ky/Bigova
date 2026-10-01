import {
    faArrowUpRightFromSquare,
    faBook,
    faBookOpen,
    faBus,
    faCalendarWeek,
    faCircleInfo,
    faCompass,
    faGear,
    faNewspaper,
    faPoll,
    faStore,
    faUserGroup,
} from "@fortawesome/free-solid-svg-icons";
export const tabs = [
  { href: "/", l: "Keşfet", i: faCompass, hint: "Ana sayfa" },
  {
    href: "/isletmeler",
    l: "İşletmeler",
    i: faStore,
    hint: "Fiyat • saat • tuvalet",
  },
  { href: "/ulasim", l: "Ulaşım", i: faBus, hint: "Otobüs ve servis" },
  { href: "/notlar", l: "Notlar", i: faBookOpen, hint: "Ders notu, PDF" },
  { href: "/ayarlar", l: "Ayarlar", i: faGear, hint: "Tema ve hesap" },
];
export const sideTabs = [
  ...tabs.slice(0, 4),
  {
    href: "/kitap-pazari",
    l: "Kitap pazarı",
    i: faBook,
    hint: "İkinci el kitaplar",
  },
  {
    href: "/arkadaslar",
    l: "Arkadaşlar",
    i: faUserGroup,
    hint: "Arkadaş ve sohbetler",
  },
  {
    href: "/yakinda/dergi",
    l: "Dergi",
    i: faNewspaper,
    hint: "Okulun dergisi",
  },
  {
    href: "/ders-programi",
    l: "Ders Programı",
    i: faCalendarWeek,
    hint: "Bölüm ve sınıf çizelgeleri",
  },
  {
    href: "/anketler",
    l: "Anketler",
    i: faPoll,
    hint: "Haftalık öğrenci anketi",
  },
  {
    href: "/hakkimizda",
    l: "Hakkımızda",
    i: faCircleInfo,
    hint: "Bigova ve ekibi",
  },
  {
    href: "https://ubys.comu.edu.tr/",
    l: "ÜBYS",
    i: faArrowUpRightFromSquare,
    hint: "ÇOMÜ öğrenci bilgi sistemi",
    external: true,
  },
];
export type SideTab = (typeof sideTabs)[number] & { external?: boolean };
export const settingsTab = tabs[4];
export const isOn = (p: string, h: string) =>
  h === "/" ? p === "/" : p.startsWith(h);
