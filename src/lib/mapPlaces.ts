// Harita için ortak tipler ve OSM (Overpass) -> MapPlace dönüştürme mantığı.
// Hem /api/map-places (sunucu) hem de /harita (istemci) tarafından kullanılır.

export type PlaceCategory =
  | "landmark"
  | "park"
  | "business"
  | "bus"
  | "atm"
  | "service"
  | "education";
export type PlaceKind =
  | "school"
  | "books"
  | "municipality"
  | "public"
  | "health"
  | "fuel"
  | "charging"
  | "parking"
  | "toilet"
  | "post"
  | "cafe"
  | "restaurant"
  | "market"
  | "mall"
  | "shop"
  | "hotel"
  | "pharmacy"
  | "ziraat"
  | "garanti"
  | "isbank"
  | "vakifbank"
  | "bank"
  | "atm"
  | "bus"
  | "taxi"
  | "park"
  | "sport"
  | "worship"
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
  const amenities =
    "atm|bank|bus_station|taxi|cafe|restaurant|fast_food|food_court|ice_cream|bar|pub|marketplace|fuel|charging_station|toilets|pharmacy|hospital|clinic|doctors|dentist|veterinary|school|kindergarten|university|college|library|place_of_worship|community_centre|cinema|theatre|arts_centre|post_office|townhall|courthouse|police|fire_station";
  return (
    `[out:json][timeout:30];(` +
    `nwr["amenity"~"^(${amenities})$"]${a};` +
    `nwr["amenity"="parking"]["access"!~"^(private|customers|permit|no)$"]${a};` +
    `nwr["office"="government"]${a};` +
    `nwr["shop"]${a};` +
    `nwr["tourism"~"^(museum|attraction|hotel|guest_house|hostel|apartment)$"]${a};` +
    `nwr["leisure"~"^(park|garden|playground|pitch|stadium|sports_centre|fitness_centre|swimming_pool)$"]${a};` +
    `nwr["historic"]${a};` +
    `node["highway"="bus_stop"]${a};` +
    `);out center 6000;`
  );
}

/** Adı olmasa da haritada kalması anlamlı olan türler */
const KEEP_UNNAMED = new Set([
  "atm",
  "bus_station",
  "fuel",
  "parking",
  "toilets",
  "charging_station",
  "taxi",
]);

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
    tags.tourism ??
    tags.leisure ??
    tags.historic ??
    tags.highway ??
    (tags.office ? "government" : "Biga");
  const fee =
    tags.fee === "yes" ? " · Ücretli" : tags.fee === "no" ? " · Ücretsiz" : "";
  const detail = humanize(detailRaw) + (isFeeType(tags.amenity) ? fee : "");
  const name = rawName ?? humanize(detailRaw);
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

function isFeeType(amenity?: string) {
  return amenity === "parking" || amenity === "toilets";
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
  const amenity = tags.amenity ?? "";
  if (amenity === "atm" || amenity === "bank") return "atm";
  if (amenity === "bus_station" || amenity === "taxi" || tags.highway === "bus_stop")
    return "bus";
  if (
    ["school", "kindergarten", "university", "college", "library"].includes(
      amenity,
    )
  )
    return "education";
  if (
    [
      "parking",
      "toilets",
      "fuel",
      "charging_station",
      "pharmacy",
      "hospital",
      "clinic",
      "doctors",
      "dentist",
      "veterinary",
      "post_office",
      "townhall",
      "courthouse",
      "police",
      "fire_station",
    ].includes(amenity) ||
    tags.office === "government"
  )
    return "service";
  if (
    tags.leisure &&
    tags.leisure !== "fitness_centre" &&
    tags.leisure !== "swimming_pool"
  )
    return "park";
  if (
    tags.historic ||
    ["museum", "attraction"].includes(tags.tourism ?? "") ||
    ["place_of_worship", "community_centre", "cinema", "theatre", "arts_centre"].includes(
      amenity,
    )
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
  if (amenity === "parking") return "parking";
  if (amenity === "toilets") return "toilet";
  if (amenity === "post_office") return "post";
  if (amenity === "taxi") return "taxi";
  if (amenity === "charging_station") return "charging";
  if (amenity === "fuel") return "fuel";
  if (amenity === "pharmacy") return "pharmacy";
  if (["hospital", "clinic", "doctors", "dentist", "veterinary"].includes(amenity))
    return "health";
  if (["police", "fire_station", "courthouse"].includes(amenity)) return "public";
  if (
    amenity === "townhall" ||
    tags.office === "government" ||
    /belediye/.test(text)
  )
    return "municipality";
  if (["school", "kindergarten", "university", "college"].includes(amenity))
    return "school";
  if (amenity === "library" || tags.shop === "books" || tags.shop === "stationery")
    return "books";
  if (amenity === "cafe" || amenity === "ice_cream") return "cafe";
  if (["restaurant", "fast_food", "food_court", "bar", "pub"].includes(amenity))
    return "restaurant";
  if (amenity === "marketplace") return "market";
  if (amenity === "place_of_worship") return "worship";
  if (["community_centre", "cinema", "theatre", "arts_centre"].includes(amenity))
    return "culture";
  if (tags.historic || ["museum", "attraction"].includes(tags.tourism ?? ""))
    return "culture";
  if (["hotel", "guest_house", "hostel", "apartment"].includes(tags.tourism ?? ""))
    return "hotel";
  if (amenity === "bus_station" || tags.highway === "bus_stop") return "bus";
  if (
    ["pitch", "stadium", "sports_centre", "fitness_centre", "swimming_pool"].includes(
      tags.leisure ?? "",
    )
  )
    return "sport";
  if (tags.leisure) return "park";
  if (["mall", "department_store"].includes(tags.shop ?? "")) return "mall";
  if (
    [
      "supermarket",
      "convenience",
      "greengrocer",
      "bakery",
      "butcher",
      "kiosk",
      "pastry",
      "deli",
    ].includes(tags.shop ?? "")
  )
    return "market";
  if (tags.shop) return "shop";
  return "business";
}

/** Düşük sayı = daha önemli; uzaklaştıkça yalnızca önemli yerler çizilir. */
export function kindTier(kind: PlaceKind): 1 | 2 | 3 {
  switch (kind) {
    case "school":
    case "municipality":
    case "public":
    case "health":
    case "culture":
    case "mall":
    case "books":
    case "ziraat":
    case "garanti":
    case "isbank":
    case "vakifbank":
    case "bank":
      return 1;
    case "business":
    case "shop":
    case "hotel":
    case "worship":
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
    park: "Park & spor alanı",
    business: "İşletme",
    bus: "Ulaşım & durak",
    atm: "Banka & ATM",
    service: "Hizmet & kamu",
    education: "Eğitim",
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
  parking: "Otopark",
  toilets: "Tuvalet",
  charging_station: "Şarj istasyonu",
  taxi: "Taksi durağı",
  doctors: "Doktor",
  dentist: "Diş hekimi",
  veterinary: "Veteriner",
  kindergarten: "Anaokulu",
  courthouse: "Adliye",
  police: "Polis",
  fire_station: "İtfaiye",
  cinema: "Sinema",
  theatre: "Tiyatro",
  arts_centre: "Sanat merkezi",
  marketplace: "Pazar yeri",
  food_court: "Yemek katı",
  ice_cream: "Dondurmacı",
  bar: "Bar",
  pub: "Pub",
  department_store: "Mağaza",
  pastry: "Pastane",
  deli: "Şarküteri",
  pitch: "Spor sahası",
  stadium: "Stadyum",
  sports_centre: "Spor merkezi",
  fitness_centre: "Spor salonu",
  swimming_pool: "Yüzme havuzu",
  hotel: "Otel",
  guest_house: "Pansiyon",
  hostel: "Hostel",
  apartment: "Apart",
};

export function humanize(value: string) {
  return (
    TRANSLATIONS[value] ??
    value
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("tr"))
  );
}
