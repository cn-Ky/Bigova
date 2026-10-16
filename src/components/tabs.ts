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
  faMonument,
  faNewspaper,
  faPeopleGroup,
  faScrewdriverWrench,
  faStopwatch,
  faStore,
  faTowerBroadcast,
  faUtensils,
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
    href: "/haberler",
    l: "Biga Gündemi",
    i: faTowerBroadcast,
    hint: "Biga'dan haberler ve duyurular",
  },
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
    hint: "Arkadaş ekle, mesajlaş",
  },
  {
    href: "/topluluk",
    l: "Topluluk",
    i: faPeopleGroup,
    hint: "Gönderi, soru-cevap ve forum",
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
    href: "/pomodoro",
    l: "Pomodoro",
    i: faStopwatch,
    hint: "Odaklan, mola ver, hedefe ulaş",
  },
  {
    href: "/bigocuk",
    l: "Bigocuk",
    i: faGamepad,
    hint: "Oyunlar, anketler, Bigcoin ve avatar",
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
    href: "/kultur",
    l: "Kültür Ajandası",
    i: faMonument,
    hint: "Özel günler, tatiller ve sınav takvimi",
  },
  {
    href: "/yemekhane",
    l: "Yemekhane",
    i: faUtensils,
    hint: "KYK yurtları ve Ağaköy yemekhanesi menüleri",
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
