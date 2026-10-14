// Elle eklenen harita noktaları. OpenStreetMap'te eksik olan ATM, işletme veya önemli bina
// buraya yazılır; /api/map-places bunları OSM verisiyle birleştirir (aynı adlı OSM noktasının yerini alır).
//
// Koordinatı bulmak için: Google Maps / OpenStreetMap'te noktaya sağ tıkla → ilk satırdaki "40.2287, 27.2431".
// Not: Mümkünse noktayı OpenStreetMap'e de ekle (openstreetmap.org → Düzenle); herkes için kalıcı fayda sağlar.
import type { MapPlace, PlaceKind } from "./mapPlaces";
import { classify, kindFromBusinessCategory } from "./mapPlaces";

type CustomInput = {
  name: string;
  lat: number;
  lon: number;
  /** Harita simgesi/rengi. Verilmezse `type` metninden tahmin edilir. */
  kind?: PlaceKind;
  /** Kullanıcıya görünen tür, örn. "ATM", "Kafe", "Eczane" */
  type: string;
  hours?: string;
  phone?: string;
  address?: string;
  website?: string;
};

function custom(input: CustomInput, index: number): MapPlace {
  const kind = input.kind ?? kindFromBusinessCategory(input.type);
  const isAtm = ["atm", "bank", "ziraat", "garanti", "isbank", "vakifbank", "halkbank", "akbank", "yapikredi", "denizbank", "qnb"].includes(kind);
  return {
    id: `custom-${index}`,
    name: input.name,
    category: isAtm ? "atm" : classify({}),
    kind,
    detail: input.type,
    lat: input.lat,
    lon: input.lon,
    routeEligible: true,
    source: "bigova",
    hours: input.hours,
    phone: input.phone,
    address: input.address,
    website: input.website,
  };
}

const INPUT: CustomInput[] = [
  // Örnek (silip kendi noktalarını ekle):
  // { name: "Ziraat Bankası ATM", kind: "ziraat", type: "ATM", lat: 40.2291, lon: 27.2433, address: "Cumhuriyet Cd." },
];

export const CUSTOM_PLACES: MapPlace[] = INPUT.map(custom);
