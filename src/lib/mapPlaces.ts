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
  | "halkbank"
  | "akbank"
  | "yapikredi"
  | "denizbank"
  | "qnb"
  | "bank"
  | "atm"
  | "bus"
  | "taxi"
  | "park"
  | "sport"
  | "worship"
  | "culture"
  | "water"
  | "office"
  | "beauty"
  | "auto"
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

/** Biga şehir merkezi ve çevresi (mahalleler, sanayi, kampüs dahil): [güney, batı, kuzey, doğu] */
export const BIGA_BBOX: [number, number, number, number] = [
  40.15, 27.13, 40.31, 27.36,
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
    "atm|bank|bureau_de_change|bus_station|taxi|cafe|restaurant|fast_food|food_court|ice_cream|bar|pub|biergarten|nightclub|internet_cafe|marketplace|fuel|charging_station|car_wash|car_rental|driving_school|toilets|drinking_water|pharmacy|hospital|clinic|doctors|dentist|veterinary|school|kindergarten|university|college|language_school|music_school|library|place_of_worship|community_centre|social_centre|events_venue|conference_centre|cinema|theatre|arts_centre|post_office|townhall|courthouse|police|fire_station|public_building|social_facility|coworking_space";
  const buildings =
    "public|government|civic|mosque|church|chapel|hospital|school|university|college|kindergarten|train_station|stadium|dormitory|hotel|sports_hall|museum|library|cathedral|synagogue|temple|shrine";
  return (
    `[out:json][timeout:50];(` +
    `nwr["amenity"~"^(${amenities})$"]${a};` +
    `nwr["amenity"="parking"]["access"!~"^(private|customers|permit|no)$"]${a};` +
    // "atm=yes" etiketi: banka şubesi/market/akaryakıt gibi yerlerde ATM'yi gösterir.
    `nwr["atm"="yes"]${a};` +
    `nwr["office"]${a};` +
    `nwr["shop"]${a};` +
    `nwr["craft"]${a};` +
    `nwr["healthcare"]${a};` +
    `nwr["tourism"~"^(museum|attraction|gallery|viewpoint|picnic_site|artwork|hotel|guest_house|hostel|apartment|motel|camp_site)$"]${a};` +
    `nwr["leisure"~"^(park|garden|playground|pitch|stadium|sports_centre|sports_hall|fitness_centre|swimming_pool|dog_park|picnic_table|marina|track)$"]${a};` +
    `nwr["historic"]${a};` +
    `nwr["man_made"~"^(tower|water_tower|lighthouse|clock|obelisk)$"]${a};` +
    `nwr["natural"~"^(beach|peak|spring|cave_entrance)$"]["name"]${a};` +
    `nwr["building"~"^(${buildings})$"]["name"]${a};` +
    `nwr["public_transport"~"^(station|platform)$"]${a};` +
    `node["highway"="bus_stop"]${a};` +
    `);out center 25000;`
  );
}

/** Adı olmasa da haritada kalması anlamlı olan amenity türleri (ATM, durak, akaryakıt, WC…) */
const KEEP_UNNAMED = new Set([
  "atm",
  "bus_station",
  "fuel",
  "parking",
  "toilets",
  "charging_station",
  "taxi",
  "drinking_water",
]);

const LODGING = new Set(["hotel", "guest_house", "hostel", "apartment", "motel", "camp_site"]);
const BANK_AMENITIES = new Set(["atm", "bank", "bureau_de_change"]);

/** Bir OSM öğesini haritadaki yer(ler)e çevirir. `atm=yes` olan yerlerde ayrıca ATM noktası üretir. */
export function elementToPlaces(element: OverpassElement): MapPlace[] {
  const main = elementToPlace(element);
  const tags = element.tags ?? {};
  const out: MapPlace[] = main ? [main] : [];
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  // Banka şubesinin kendisi zaten "Banka & ATM"; market/akaryakıt gibi ev sahibi yerler için ATM ekle.
  if (tags.atm === "yes" && !BANK_AMENITIES.has(tags.amenity ?? "") && typeof lat === "number" && typeof lon === "number") {
    const host = tags["name:tr"] ?? tags.name ?? tags.brand ?? tags.operator;
    const atm = elementToPlace({
      id: element.id,
      type: `${element.type}-atm`,
      lat,
      lon,
      tags: {
        amenity: "atm",
        name: host ? `${host} ATM` : "ATM",
        operator: tags["atm:operator"] ?? tags.operator ?? "",
        brand: tags["atm:brand"] ?? "",
      },
    });
    if (atm) out.push(atm);
  }
  return out;
}

export function elementToPlace(element: OverpassElement): MapPlace | null {
  const tags = element.tags ?? {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const rawName = tags["name:tr"] ?? tags.name ?? tags.brand ?? tags.operator;
  const isStop =
    tags.highway === "bus_stop" ||
    Boolean(
      tags.public_transport && (tags.bus === "yes" || tags.public_transport === "station"),
    );
  // Adsız ama anlamlı olanlar: ATM/durak/akaryakıt… ile tüm işletme türleri (market, kuaför, ofis…).
  const unnamedOk =
    isStop ||
    KEEP_UNNAMED.has(tags.amenity ?? "") ||
    Boolean(
      tags.shop ||
        tags.office ||
        tags.craft ||
        tags.healthcare ||
        (tags.amenity && tags.amenity !== "place_of_worship") ||
        LODGING.has(tags.tourism ?? "") ||
        (tags.amenity === "place_of_worship" && tags.religion),
    );
  if (!rawName && !unnamedOk) return null;

  const category = classify(tags);
  const kind = classifyKind(tags);
  const mosque = tags.religion === "muslim" || tags.building === "mosque";
  const church = tags.religion === "christian" || tags.building === "church";
  const detailRaw =
    (tags.amenity === "place_of_worship" || tags.building === "mosque" || tags.building === "church") &&
    (mosque || church)
      ? mosque
        ? "mosque"
        : "church"
      : (tags.amenity ??
        tags.shop ??
        tags.craft ??
        tags.healthcare ??
        tags.office ??
        tags.tourism ??
        tags.leisure ??
        tags.historic ??
        tags.natural ??
        tags.man_made ??
        tags.building ??
        tags.highway ??
        tags.public_transport ??
        "Biga");
  const fee =
    tags.fee === "yes" ? " · Ücretli" : tags.fee === "no" ? " · Ücretsiz" : "";
  const operator =
    tags.amenity === "atm" && tags.operator && tags.operator !== rawName
      ? ` · ${tags.operator}`
      : "";
  const detail = humanize(detailRaw) + operator + (isFeeType(tags.amenity) ? fee : "");
  let name = rawName ?? humanize(detailRaw);
  // "Ziraat Bankası" adlı ATM'yi "Ziraat Bankası ATM" yap: aramada ve listede ayırt edilsin.
  if (tags.amenity === "atm" && rawName && !/atm/i.test(rawName)) name = `${rawName} ATM`;
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

const LANDMARK_BUILDINGS = ["mosque", "church", "chapel", "cathedral", "synagogue", "temple", "shrine", "museum"];
const EDU_BUILDINGS = ["school", "university", "college", "kindergarten", "dormitory", "library"];
const SERVICE_BUILDINGS = ["public", "government", "civic", "hospital", "train_station"];

export function classify(tags: Record<string, string>): PlaceCategory {
  const amenity = tags.amenity ?? "";
  const building = tags.building ?? "";
  if (BANK_AMENITIES.has(amenity)) return "atm";
  if (
    amenity === "bus_station" ||
    amenity === "taxi" ||
    tags.highway === "bus_stop" ||
    (tags.public_transport && !amenity)
  )
    return "bus";
  if (
    [
      "school",
      "kindergarten",
      "university",
      "college",
      "library",
      "language_school",
      "music_school",
    ].includes(amenity) ||
    (!amenity && EDU_BUILDINGS.includes(building))
  )
    return "education";
  if (
    [
      "parking",
      "toilets",
      "drinking_water",
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
      "public_building",
      "social_facility",
    ].includes(amenity) ||
    tags.office === "government" ||
    (tags.healthcare && !tags.shop) ||
    (!amenity && SERVICE_BUILDINGS.includes(building))
  )
    return "service";
  if (
    tags.natural ||
    (tags.leisure &&
      tags.leisure !== "fitness_centre" &&
      tags.leisure !== "swimming_pool")
  )
    return "park";
  if (
    tags.historic ||
    tags.man_made ||
    ["museum", "attraction", "gallery", "viewpoint", "artwork", "picnic_site"].includes(
      tags.tourism ?? "",
    ) ||
    [
      "place_of_worship",
      "community_centre",
      "social_centre",
      "events_venue",
      "conference_centre",
      "cinema",
      "theatre",
      "arts_centre",
    ].includes(amenity) ||
    (!amenity && LANDMARK_BUILDINGS.includes(building))
  )
    return "landmark";
  return "business";
}

const BANK_BRANDS: [RegExp, PlaceKind][] = [
  [/ziraat/, "ziraat"],
  [/garanti/, "garanti"],
  [/iş bank|isbank|işbank|is bank|i̇ş bank/, "isbank"],
  [/vak[ıi]fbank|vak[ıi]f bank/, "vakifbank"],
  [/halkbank|halk bank/, "halkbank"],
  [/akbank/, "akbank"],
  [/yap[ıi] ?(ve )?kredi|yapikredi/, "yapikredi"],
  [/denizbank|deniz bank/, "denizbank"],
  [/qnb|finansbank/, "qnb"],
];

export function classifyKind(tags: Record<string, string>): PlaceKind {
  const text =
    `${tags.brand ?? ""} ${tags.operator ?? ""} ${tags.name ?? ""}`.toLocaleLowerCase(
      "tr",
    );
  const amenity = tags.amenity ?? "";
  const building = tags.building ?? "";
  const shop = tags.shop ?? "";
  if (amenity === "bank" || amenity === "atm" || amenity === "bureau_de_change") {
    for (const [pattern, kind] of BANK_BRANDS) if (pattern.test(text)) return kind;
    return amenity === "atm" ? "atm" : "bank";
  }
  if (amenity === "parking") return "parking";
  if (amenity === "toilets") return "toilet";
  if (amenity === "drinking_water") return "water";
  if (amenity === "post_office") return "post";
  if (amenity === "taxi") return "taxi";
  if (amenity === "charging_station") return "charging";
  if (amenity === "fuel") return "fuel";
  if (amenity === "pharmacy") return "pharmacy";
  if (
    ["hospital", "clinic", "doctors", "dentist", "veterinary"].includes(amenity) ||
    building === "hospital" ||
    (tags.healthcare && !shop)
  )
    return "health";
  if (["police", "fire_station", "courthouse", "public_building", "social_facility"].includes(amenity))
    return "public";
  if (
    amenity === "townhall" ||
    tags.office === "government" ||
    /belediye/.test(text) ||
    building === "government"
  )
    return "municipality";
  if (building === "public" || building === "civic" || building === "train_station") return "public";
  if (
    ["school", "kindergarten", "university", "college", "language_school", "music_school"].includes(
      amenity,
    ) ||
    (!amenity && ["school", "university", "college", "kindergarten", "dormitory"].includes(building))
  )
    return "school";
  if (amenity === "library" || building === "library" || shop === "books" || shop === "stationery")
    return "books";
  if (amenity === "cafe" || amenity === "ice_cream" || amenity === "internet_cafe") return "cafe";
  if (
    ["restaurant", "fast_food", "food_court", "bar", "pub", "biergarten", "nightclub"].includes(amenity)
  )
    return "restaurant";
  if (amenity === "marketplace") return "market";
  if (
    amenity === "place_of_worship" ||
    ["mosque", "church", "chapel", "cathedral", "synagogue", "temple", "shrine"].includes(building)
  )
    return "worship";
  if (
    ["community_centre", "social_centre", "events_venue", "conference_centre", "cinema", "theatre", "arts_centre"].includes(
      amenity,
    ) ||
    building === "museum"
  )
    return "culture";
  if (
    tags.historic ||
    tags.man_made ||
    ["museum", "attraction", "gallery", "viewpoint", "artwork"].includes(tags.tourism ?? "")
  )
    return "culture";
  if (LODGING.has(tags.tourism ?? "") || building === "hotel") return "hotel";
  if (amenity === "bus_station" || tags.highway === "bus_stop" || tags.public_transport)
    return "bus";
  if (
    ["pitch", "stadium", "sports_centre", "sports_hall", "fitness_centre", "swimming_pool", "track"].includes(
      tags.leisure ?? "",
    ) ||
    building === "stadium" ||
    building === "sports_hall" ||
    shop === "sports"
  )
    return "sport";
  if (tags.leisure || tags.natural || tags.tourism === "picnic_site") return "park";
  if (["car_wash", "car_rental", "driving_school"].includes(amenity)) return "auto";
  if (["mall", "department_store"].includes(shop)) return "mall";
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
      "general",
      "variety_store",
      "wholesale",
      "beverages",
      "confectionery",
      "seafood",
      "dairy",
      "farm",
      "frozen_food",
      "health_food",
      "nuts",
      "spices",
      "tea",
      "coffee",
    ].includes(shop)
  )
    return "market";
  if (["hairdresser", "beauty", "cosmetics", "massage", "tattoo", "barber", "perfumery"].includes(shop))
    return "beauty";
  if (["car", "car_repair", "car_parts", "tyres", "motorcycle", "motorcycle_repair", "bicycle"].includes(shop))
    return "auto";
  if (tags.craft === "car_repair") return "auto";
  if (shop) return "shop";
  if (tags.office || amenity === "coworking_space") return "office";
  return "business";
}

/** Düşük sayı = daha önemli. Üst üste binen noktalarda çizim sırasını belirler. */
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
    case "halkbank":
    case "akbank":
    case "yapikredi":
    case "denizbank":
    case "qnb":
    case "bank":
    case "atm":
      return 1;
    case "business":
    case "shop":
    case "hotel":
    case "worship":
    case "office":
    case "beauty":
    case "auto":
      return 3;
    default:
      return 2;
  }
}

/** Aynı yerin birden fazla OSM kaydını (nokta + bina + ATM) tek noktada toplar. */
export function dedupePlaces(places: MapPlace[]): MapPlace[] {
  const normName = (value: string) =>
    value
      .toLocaleLowerCase("tr")
      .replace(/\b(şubesi|şube|a\.ş\.?|ltd\.?|şti\.?)\b/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  const CELL = 0.0006; // ≈ 65 m
  const cellOf = (lat: number, lon: number) =>
    [Math.floor(lat / CELL), Math.floor(lon / CELL)] as const;
  const meters = (a: MapPlace, b: MapPlace) => {
    const dy = (a.lat - b.lat) * 111_320;
    const dx = (a.lon - b.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
    return Math.hypot(dx, dy);
  };

  const grid = new Map<string, MapPlace[]>();
  const kept: MapPlace[] = [];
  for (const place of places) {
    const [cy, cx] = cellOf(place.lat, place.lon);
    const key = normName(place.name);
    const isBankLike = place.category === "atm";
    let twin: MapPlace | undefined;
    search: for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const other of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
          const d = meters(place, other);
          const sameName = key !== "" && normName(other.name) === key;
          // Aynı ad + aynı kategori ≤ 80 m, banka/ATM ise aynı marka ≤ 20 m aynı yer sayılır.
          if (
            (sameName && other.category === place.category && d <= 80) ||
            (isBankLike && other.category === "atm" && other.kind === place.kind && d <= 20)
          ) {
            twin = other;
            break search;
          }
        }
      }
    }
    if (twin) {
      twin.hours ??= place.hours;
      twin.phone ??= place.phone;
      twin.website ??= place.website;
      twin.address ??= place.address;
      twin.routeEligible ||= place.routeEligible;
      const twinIsAtm = /^ATM/.test(twin.detail);
      const placeIsAtm = /^ATM/.test(place.detail);
      if (twinIsAtm && !placeIsAtm) {
        // Önce ATM düğümü gelmişse şube adını/ayrıntısını öne al.
        twin.name = place.name;
        twin.detail = `${place.detail} · ATM`;
      } else if (placeIsAtm && !twinIsAtm && !/ATM/.test(twin.detail)) {
        twin.detail += " · ATM";
      }
      continue;
    }
    kept.push(place);
    const cell = `${cy}:${cx}`;
    const bucket = grid.get(cell);
    if (bucket) bucket.push(place);
    else grid.set(cell, [place]);
  }
  return kept;
}

/** Bigova veritabanındaki işletme kategorisini harita türüne çevirir. */
export function kindFromBusinessCategory(category: string): PlaceKind {
  const c = category.toLocaleLowerCase("tr");
  if (/kafe|cafe|kahve|pastane|tatl[ıi]|dondurma/.test(c)) return "cafe";
  if (/restoran|lokanta|yemek|kebap|d[öo]ner|fast|burger|pizza|kumpir|tost|b[üu]fe/.test(c))
    return "restaurant";
  if (/market|bakkal|manav|f[ıi]r[ıi]n|kasap|şarküteri|tekel/.test(c)) return "market";
  if (/eczane/.test(c)) return "pharmacy";
  if (/akaryak[ıi]t|benzin/.test(c)) return "fuel";
  if (/kuaf[öo]r|berber|g[üu]zellik/.test(c)) return "beauty";
  if (/oto|lastik|tamir|yedek par[çc]a/.test(c)) return "auto";
  if (/kitap|k[ıi]rtasiye/.test(c)) return "books";
  if (/otel|pansiyon|yurt/.test(c)) return "hotel";
  if (/spor|gym|fitness/.test(c)) return "sport";
  if (/ofis|avukat|emlak|sigorta|muhasebe/.test(c)) return "office";
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
  bureau_de_change: "Döviz bürosu",
  biergarten: "Bira bahçesi",
  nightclub: "Gece kulübü",
  internet_cafe: "İnternet kafe",
  car_wash: "Oto yıkama",
  car_rental: "Araç kiralama",
  driving_school: "Sürücü kursu",
  drinking_water: "İçme suyu",
  language_school: "Dil kursu",
  music_school: "Müzik okulu",
  social_centre: "Sosyal tesis",
  events_venue: "Etkinlik mekânı",
  conference_centre: "Kongre merkezi",
  public_building: "Kamu binası",
  social_facility: "Sosyal hizmet",
  coworking_space: "Ortak çalışma alanı",
  mosque: "Cami",
  church: "Kilise",
  chapel: "Şapel",
  cathedral: "Katedral",
  synagogue: "Sinagog",
  temple: "Tapınak",
  shrine: "Ziyaretgâh",
  dormitory: "Öğrenci yurdu",
  civic: "Kamu binası",
  public: "Kamu binası",
  train_station: "Tren istasyonu",
  sports_hall: "Spor salonu",
  gallery: "Galeri",
  viewpoint: "Manzara noktası",
  picnic_site: "Piknik alanı",
  artwork: "Sanat eseri",
  motel: "Motel",
  camp_site: "Kamp alanı",
  dog_park: "Köpek parkı",
  marina: "Marina",
  track: "Koşu pisti",
  tower: "Kule",
  water_tower: "Su kulesi",
  lighthouse: "Deniz feneri",
  clock: "Saat kulesi",
  obelisk: "Dikilitaş",
  beach: "Plaj",
  peak: "Tepe",
  spring: "Kaynak",
  cave_entrance: "Mağara",
  platform: "Durak",
  station: "İstasyon",
  insurance: "Sigorta",
  lawyer: "Avukat",
  estate_agent: "Emlak",
  accountant: "Muhasebe",
  company: "Şirket",
  notary: "Noter",
  telecommunication: "Telekom",
  travel_agent: "Seyahat acentesi",
  employment_agency: "İş bürosu",
  tax_advisor: "Mali müşavir",
  architect: "Mimar",
  association: "Dernek",
  ngo: "STK",
  political_party: "Siyasi parti",
  educational_institution: "Eğitim kurumu",
  financial: "Finans",
  beauty: "Güzellik salonu",
  cosmetics: "Kozmetik",
  jewelry: "Kuyumcu",
  furniture: "Mobilya",
  hardware: "Nalbur",
  doityourself: "Yapı market",
  car: "Oto galeri",
  car_repair: "Oto tamir",
  car_parts: "Yedek parça",
  tyres: "Lastikçi",
  bicycle: "Bisiklet",
  optician: "Optik",
  florist: "Çiçekçi",
  gift: "Hediyelik",
  toys: "Oyuncakçı",
  sports: "Spor mağazası",
  computer: "Bilgisayar",
  copyshop: "Fotokopi",
  laundry: "Çamaşırhane",
  dry_cleaning: "Kuru temizleme",
  tailor: "Terzi",
  pet: "Evcil hayvan",
  variety_store: "Çok amaçlı mağaza",
  general: "Genel mağaza",
  wholesale: "Toptan",
  fabric: "Kumaşçı",
  haberdashery: "Tuhafiye",
  barber: "Berber",
  confectionery: "Şekerci",
  carpenter: "Marangoz",
  electrician: "Elektrikçi",
  plumber: "Tesisatçı",
  shoemaker: "Ayakkabı tamircisi",
  physiotherapist: "Fizyoterapist",
  laboratory: "Laboratuvar",
};

export function humanize(value: string) {
  return (
    TRANSLATIONS[value] ??
    value
      .replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toLocaleUpperCase("tr"))
  );
}
