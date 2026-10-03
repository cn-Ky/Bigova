import { faPersonWalking, type IconDefinition } from "@fortawesome/free-solid-svg-icons";

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
];
