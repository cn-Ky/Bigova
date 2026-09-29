export type CategoryKey =
  | "yemek" | "kafe" | "market" | "teknoloji" | "eczane" | "banka"
  | "spor" | "kirtasiye" | "camasirhane" | "konaklama" | "eglence";

export const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: "yemek", label: "Yemek", icon: "restaurant-outline" },
  { key: "kafe", label: "Kafe", icon: "cafe-outline" },
  { key: "market", label: "Market", icon: "cart-outline" },
  { key: "teknoloji", label: "Teknoloji", icon: "laptop-outline" },
  { key: "eczane", label: "Eczane", icon: "medkit-outline" },
  { key: "banka", label: "Banka", icon: "card-outline" },
  { key: "spor", label: "Spor", icon: "barbell-outline" },
  { key: "kirtasiye", label: "Kırtasiye", icon: "pencil-outline" },
  { key: "camasirhane", label: "Çamaşırhane", icon: "shirt-outline" },
  { key: "konaklama", label: "Konaklama", icon: "bed-outline" },
  { key: "eglence", label: "Eğlence", icon: "game-controller-outline" },
];

export interface NoteItem {
  id: string;
  title: string;
  course: string;
  department: string;
  year: string;
  type: "Ders notu" | "PDF" | "Çıkmış soru";
  author: string;
}
