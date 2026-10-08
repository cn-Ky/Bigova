import {
  faArrowUpRightFromSquare,
  faBook,
  faBriefcase,
  faBookOpen,
  faBus,
  faCalendarWeek,
  faCircleInfo,
  faCompass,
  faGamepad,
  faGear,
  faLandmark,
  faMapLocationDot,
  faNewspaper,
  faPoll,
  faScrewdriverWrench,
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
    href: "/harita",
    l: "Biga Haritası",
    i: faMapLocationDot,
    hint: "Biga'da keşfet",
  },
  {
    href: "/kitap-pazari",
    l: "Kitap pazarı",
    i: faBook,
    hint: "İkinci el kitaplar",
  },
  {
    href: "/is-ilanlari",
    l: "İş İlanları",
    i: faBriefcase,
    hint: "İş, staj ve ek gelir",
  },
  {
    href: "/ustalar",
    l: "Usta Bul",
    i: faScrewdriverWrench,
    hint: "Tesisatçı, elektrikçi, mobilyacı",
  },
  {
    href: "/arkadaslar",
    l: "Arkadaşlar",
    i: faUserGroup,
    hint: "Arkadaş ve sohbetler",
  },
  {
    href: "/dergi",
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
    href: "/bigocuk",
    l: "Bigocuk",
    i: faGamepad,
    hint: "Oyunlar, Bigcoin ve avatar",
  },
  {
    href: "/hakkimizda",
    l: "Hakkımızda",
    i: faCircleInfo,
    hint: "Bigova ve ekibi",
  },
  {
    href: "/ataturk",
    l: "Atatürk Köşesi",
    i: faLandmark,
    hint: "Cumhuriyetin metinleri ve mirası",
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
