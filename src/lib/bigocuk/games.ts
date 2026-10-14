import { faBinoculars, faPersonWalking, faPoll, faStopwatch, type IconDefinition } from "@fortawesome/free-solid-svg-icons";

/**
 * Bigocuk oyun kataloğu. Yeni oyun eklemek için bu diziye bir kayıt eklemek yeterli;
 * ana sayfadaki liste otomatik güncellenir.
 */
export type Game = {
  id: string;
  title: string;
  blurb: string;
  reward: string; // kartta gösterilen kazanç bilgisi
  href: string;
  icon: IconDefinition;
  tone: string; // Tailwind sınıfları (tema renkleri)
};

export const GAMES: Game[] = [
  {
    id: "yuruyus",
    title: "Yürüyüş",
    blurb: "Telefonunla yürü, adımların Bigcoin'e dönüşsün.",
    reward: "50 adım = 1 Bigcoin",
    href: "/bigocuk/yuruyus",
    icon: faPersonWalking,
    tone: "bg-sun text-deep",
  },
  {
    id: "pomodoro",
    title: "Pomodoro",
    blurb: "Odaklan, ders çalış, Bigcoin kazan.",
    reward: "5 dk odak = 1 Bigcoin",
    href: "/pomodoro",
    icon: faStopwatch,
    tone: "bg-tide text-deep",
  },
  {
    id: "safari",
    title: "Biga Safari",
    blurb: "Biga'da dolaş, kameranı aç, efsanevi hayvanları yakala.",
    reward: "Yakaladıkça 1–25 Bigcoin",
    href: "/bigocuk/safari",
    icon: faBinoculars,
    tone: "bg-coral text-white",
  },
  {
    id: "anketler",
    title: "Anketler",
    blurb: "Haftalık öğrenci anketlerini doldur, sonuçları yüzde olarak gör.",
    reward: "Her anket = 1 Bigcoin",
    href: "/bigocuk/anketler",
    icon: faPoll,
    tone: "bg-sky text-deep",
  },
];
