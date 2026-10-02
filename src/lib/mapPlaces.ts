// Harita için ortak tipler ve OSM (Overpass) -> MapPlace dönüştürme mantığı.
// Hem /api/map-places (sunucu) hem de /harita (istemci) tarafından kullanılır.

export type PlaceCategory = "landmark" | "park" | "business" | "bus" | "atm";
export type PlaceKind =
  | "school"
  | "municipality"
  | "health"
  | "fuel"
  | "cafe"
  | "restaurant"
  | "market"
  | "pharmacy"
  | "ziraat"
  | "garanti"
  | "isbank"
  | "vakifbank"
  | "bank"
  | "atm"
  | "bus"
  | "park"
  | "culture"
  | "business";

export type MapPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  kind: PlaceKind;
  detail: string;
  lat: number;
  lon: number;
  /** Rota seçicide listelensin mi (adı olan yerler) */
  routeEligible: boolean;
  source: "osm" | "bigova";
  hours?: string;
  phone?: string;
  website?: string;
  address?: string;
  price?: string;
  toilet?: boolean;
};

export type OverpassElement = {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Biga şehir merkezi ve çevresi: [güney, batı, kuzey, doğu] */
export const BIGA_BBOX: [number, number, number, number] = [
  40.17, 27.17, 40.29, 27.32,
];
export const BIGA_CENTER: [number, number] = [40.2287, 27.2431];

export const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export function buildOverpassQuery() {
  const [s, w, n, e] = BIGA_BBOX;
  const a = `(${s},${w},${n},${e})`;
  return (
    `[out:json][timeout:25];(` +
    `nwr["amenity"~"^(atm|bank|bus_station|cafe|restaurant|fast_food|fuel|pharmacy|hospital|clinic|school|university|college|library|place_of_worship|community_centre|post_office|townhall)$"]${a};` +
    `nwr["office"="government"]${a};` +
    `nwr["shop"]${a};` +
    `nwr["leisure"~"^(park|garden|playground)$"]${a};` +
    `nwr["historic"]${a};` +
    `nwr["tourism"~"^(museum|attraction)$"]${a};` +
    `node["highway"="bus_stop"]${a};` +
    `);out center 2500;`
  );
}

/** Adı olmasa da haritada kalması anlamlı olan türler */
const KEEP_UNNAMED = new Set(["atm", "bus_station", "fuel"]);

export function elementToPlace(element: OverpassElement): MapPlace | null {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const rawName = tags["name:tr"] ?? tags.name ?? tags.brand ?? tags.operator;
  const isStop = tags.highway === "bus_stop";
  if (!rawName && !isStop && !KEEP_UNNAMED.has(tags.amenity ?? "")) return null;

  const category = classify(tags);
  const kind = classifyKind(tags);
  const detailRaw =
    tags.amenity ??
    tags.shop ??
    tags.leisure ??
    tags.historic ??
    tags.tourism ??
    tags.highway ??
    (tags.office ? "government" : "Biga");
  const detail = humanize(detailRaw);
  const name = rawName ?? detail;
  const address = [tags["addr:street"], tags["addr:housenumber"]]
    .filter(Boolean)
    .join(" ");

  return {
    id: `osm-${element.type}-${element.id}`,
    name,
    category,
    kind,
    detail,
    lat,
    lon,
    routeEligible: Boolean(rawName),
    source: "osm",
    hours: tags.opening_hours,
    phone: tags.phone ?? tags["contact:phone"],
    website: safeUrl(tags.website ?? tags["contact:website"]),
    address: address || undefined,
  };
}

function safeUrl(value?: string) {
  if (!value) return undefined;
  const url = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

export function classify(tags: Record<string, string>): PlaceCategory {
  if (tags.amenity === "atm" || tags.amenity === "bank") return "atm";
  if (tags.amenity === "bus_station" || tags.highway === "bus_stop")
    return "bus";
  if (tags.leisure) return "park";
  if (
    tags.historic ||
    tags.tourism ||
    tags.office === "government" ||
    [
      "school",
      "university",
      "college",
      "library",
      "place_of_worship",
      "community_centre",
      "townhall",
      "hospital",
      "clinic",
      "post_office",
    ].includes(tags.amenity ?? "")
  )
    return "landmark";
  return "business";
}

export function classifyKind(tags: Record<string, string>): PlaceKind {
  const text =
    `${tags.brand ?? ""} ${tags.operator ?? ""} ${tags.name ?? ""}`.toLocaleLowerCase(
      "tr",
    );
  const amenity = tags.amenity ?? "";
  if (amenity === "bank" || amenity === "atm") {
    if (/ziraat/.test(text)) return "ziraat";
    if (/garanti/.test(text)) return "garanti";
    if (/iş bank|isbank|işbank|is bank/.test(text)) return "isbank";
    if (/vak[ıi]fbank/.test(text)) return "vakifbank";
    return amenity === "atm" ? "atm" : "bank";
  }
  if (
    amenity === "townhall" ||
    tags.office === "government" ||
    /belediye/.test(text)
  )
    return "municipality";
  if (["school", "university", "college"].includes(amenity)) return "school";
  if (["hospital", "clinic"].includes(amenity)) return "health";
  if (amenity === "fuel") return "fuel";
  if (amenity === "cafe") return "cafe";
  if (["restaurant", "fast_food", "food_court"].includes(amenity))
    return "restaurant";
  if (amenity === "pharmacy") return "pharmacy";
  if (
    ["community_centre", "library", "place_of_worship"].includes(amenity) ||
    tags.historic ||
    tags.tourism
  )
    return "culture";
  if (amenity === "bus_station" || tags.highway === "bus_stop") return "bus";
  if (tags.leisure) return "park";
  if (
    [
      "supermarket",
      "convenience",
      "greengrocer",
      "bakery",
      "butcher",
      "kiosk",
      "mall",
      "department_store",
    ].includes(tags.shop ?? "")
  )
    return "market";
  return "business";
}

/** Rozet/rota listesinde daha önemli yerler düşük sayı alır. */
export function kindTier(kind: PlaceKind): 1 | 2 | 3 {
  switch (kind) {
    case "school":
    case "municipality":
    case "health":
    case "culture":
    case "ziraat":
    case "garanti":
    case "isbank":
    case "vakifbank":
    case "bank":
      return 1;
    case "business":
      return 3;
    default:
      return 2;
  }
}

/** Bigova veritabanındaki işletme kategorisini harita türüne çevirir. */
export function kindFromBusinessCategory(category: string): PlaceKind {
  const c = category.toLocaleLowerCase("tr");
  if (/kafe|cafe|kahve|pastane|tatl[ıi]/.test(c)) return "cafe";
  if (/restoran|lokanta|yemek|kebap|d[öo]ner|fast|burger|pizza|kumpir/.test(c))
    return "restaurant";
  if (/market|bakkal|manav|fırın|firin|kasap/.test(c)) return "market";
  if (/eczane/.test(c)) return "pharmacy";
  if (/akaryak[ıi]t|benzin/.test(c)) return "fuel";
  return "business";
}

export function categoryName(category: PlaceCategory) {
  return {
    landmark: "Kültür & önemli yer",
    park: "Park & açık alan",
    business: "İşletme",
    bus: "Otobüs durağı",
    atm: "Banka & ATM",
  }[category];
}

const TRANSLATIONS: Record<string, string> = {
  atm: "ATM",
  bank: "Banka",
  bus_station: "Otogar",
  bus_stop: "Otobüs durağı",
  cafe: "Kafe",
  restaurant: "Restoran",
  fast_food: "Hızlı yemek",
  fuel: "Akaryakıt",
  pharmacy: "Eczane",
  hospital: "Hastane",
  clinic: "Klinik",
  school: "Okul",
  university: "Üniversite",
  college: "Yüksekokul",
  library: "Kütüphane",
  place_of_worship: "İbadethane",
  community_centre: "Kültür merkezi",
  post_office: "Postane",
  townhall: "Belediye",
  government: "Kamu kurumu",
  supermarket: "Süpermarket",
  convenience: "Market",
  greengrocer: "Manav",
  bakery: "Fırın",
  butcher: "Kasap",
  clothes: "Giyim mağazası",
  shoes: "Ayakkabı mağazası",
  hairdresser: "Kuaför",
  mobile_phone: "Telefon mağazası",
  electronics: "Elektronik",
  books: "Kitapçı",
  stationery: "Kırtasiye",
  kiosk: "Büfe",
  mall: "AVM",
  park: "Park",
  garden: "Bahçe",
  playground: "Oyun alanı",
  museum: "Müze",
  attraction: "Gezi noktası",
  monument: "Anıt",
  memorial: "Anıt",
  archaeological_site: "Arkeolojik alan",
  ruins: "Kalıntı",
  yes: "Tarihî yapı",
};

export function humanize(value: string) {
  return (
    TRANSLATIONS[value] ??
    value
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("tr"))
  );
}
