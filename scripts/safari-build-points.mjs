#!/usr/bin/env node
/**
 * Biga Safari: OpenStreetMap'ten "yürünebilir nokta" üretici.
 *
 * Hayvanlar yalnızca bu noktalarda çıkar (supabase/safari_upgrade.sql > safari_points).
 * Betik Biga ilçesinin TAMAMINI (Biga, Karabiga, Ağaköy, köyler…) tarar:
 *   + sokaklar, yaya yolları, patikalar (ana yollar hariç)
 *   + parklar, meydanlar, plajlar, kampüs, anıtlar (merkez noktası)
 *   + her köy / mahalle merkezi (en az birkaç nokta garantisi)
 *   - askerî alan, sanayi, taş ocağı, çöplük, mezarlık, havaalanı, su, çiftlik, özel/yasaklı yollar
 *
 * Kullanım (Node 18+, internet gerekir):
 *   node scripts/safari-build-points.mjs                       # SQL dosyaları üretir
 *   node scripts/safari-build-points.mjs --upload              # üretir ve doğrudan Supabase'e yükler
 *     (upload için ortam: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY  — anahtarı ASLA commit'leme)
 *
 * Seçenekler:
 *   --area Biga            ilçe adı (OSM admin_level=6)        --province Çanakkale
 *   --bbox s,w,n,e         ilçe sınırı yerine dikdörtgen alan (sınır bulunamazsa)
 *   --out supabase/safari_points     çıktı klasörü
 *   --spacing 70           yol boyunca nokta aralığı (m)        --gap 45   iki nokta arası en az mesafe (m)
 *   --chunk 3000           SQL dosyası başına nokta sayısı
 *   --require "Biga,Karabiga,Ağaköy"  bu bölgelerde yeterli nokta var mı denetle   --strict  eksikse hata ver
 *   --fixture <klasör>     ağ yerine kayıtlı Overpass yanıtlarını kullan (test için)
 *   --endpoint <url>       tek bir Overpass sunucusu kullan     --print-queries  sorguları yazdır ve çık
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/* ───────────────────────── Seçenekler ───────────────────────── */
function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const k = argv[i].slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) o[k] = true;
    else (o[k] = next), i++;
  }
  return o;
}
const A = parseArgs(process.argv.slice(2));
const num = (v, d) => (Number.isFinite(Number(v)) && v !== true && v !== undefined ? Number(v) : d);
const opt = {
  area: typeof A.area === "string" ? A.area : "Biga",
  province: typeof A.province === "string" ? A.province : "Çanakkale",
  bbox: typeof A.bbox === "string" ? A.bbox.split(",").map(Number) : null,
  out: typeof A.out === "string" ? A.out : "supabase/safari_points",
  spacing: num(A.spacing, 70),
  gap: num(A.gap, 45),
  chunk: Math.max(200, num(A.chunk, 3000)),
  require: (typeof A.require === "string" ? A.require : "Biga,Karabiga,Ağaköy").split(",").map((s) => s.trim()).filter(Boolean),
  fixture: typeof A.fixture === "string" ? A.fixture : null,
  endpoint: typeof A.endpoint === "string" ? A.endpoint : null,
  upload: !!A.upload,
  strict: !!A.strict,
  printQueries: !!A["print-queries"],
};
if (opt.bbox && (opt.bbox.length !== 4 || opt.bbox.some((n) => !Number.isFinite(n)))) {
  console.error("--bbox biçimi: güney,batı,kuzey,doğu (ör. 40.17,27.17,40.45,27.40)");
  process.exit(1);
}

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ───────────────────────── Overpass sorguları ───────────────────────── */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// ilçe sınırı (admin_level=6) içindeki her şey; sınır bulunamazsa --bbox kullan
const scope = opt.bbox
  ? { setup: "", f: `(${opt.bbox.join(",")})` }
  : {
      setup:
        `area["boundary"="administrative"]["admin_level"="4"]["name"="${opt.province}"]->.il;\n` +
        `rel(area.il)["boundary"="administrative"]["admin_level"="6"]["name"="${opt.area}"];\n` +
        `map_to_area->.scope;\n`,
      f: "(area.scope)",
    };
const head = `[out:json][timeout:300][maxsize:1073741824];\n${scope.setup}`;

// Yürünebilir yollar. Otoyol/devlet yolu/il yolu (primary, secondary…) bilerek YOK; özel, yasak, tünel, yaya geçidi yok.
const WALK_HIGHWAYS = "residential|living_street|pedestrian|footway|path|cycleway|unclassified|tertiary|service";
const QUERIES = {
  ways:
    head +
    `way${scope.f}["highway"~"^(${WALK_HIGHWAYS})$"]` +
    `["access"!~"^(private|no)$"]["foot"!~"^(no|private)$"]` +
    `["service"!~"^(driveway|parking_aisle|drive-through|private|emergency_access)$"]` +
    `["footway"!="crossing"]["tunnel"!~"^(yes|culvert|building_passage)$"]["area"!="yes"];\n` +
    `out geom;`,
  pois:
    head +
    `(\n` +
    `  nwr${scope.f}["leisure"~"^(park|garden|playground|common|dog_park|recreation_ground)$"];\n` +
    `  nwr${scope.f}["place"="square"];\n` +
    `  nwr${scope.f}["natural"="beach"];\n` +
    `  nwr${scope.f}["tourism"~"^(attraction|viewpoint|picnic_site|museum)$"];\n` +
    `  nwr${scope.f}["amenity"~"^(university|college|marketplace|townhall)$"];\n` +
    `  nwr${scope.f}["historic"~"^(monument|memorial|castle|archaeological_site|ruins)$"];\n` +
    `);\nout center;`,
  exclude:
    head +
    `(\n` +
    `  way${scope.f}["landuse"~"^(military|industrial|quarry|landfill|cemetery|railway|construction|farmyard|reservoir)$"];\n` +
    `  way${scope.f}["military"];\n` +
    `  way${scope.f}["amenity"="grave_yard"];\n` +
    `  way${scope.f}["aeroway"];\n` +
    `  way${scope.f}["natural"~"^(water|wetland)$"];\n` +
    `);\nout geom;`,
  places: head + `node${scope.f}["place"~"^(city|town|village|hamlet|suburb)$"]["name"];\nout;`,
};

if (opt.printQueries) {
  for (const [k, q] of Object.entries(QUERIES)) log(`── ${k} ──\n${q}\n`);
  process.exit(0);
}

async function overpass(name) {
  if (opt.fixture) {
    const file = join(opt.fixture, `${name}.json`);
    if (!existsSync(file)) throw new Error(`Fixture bulunamadı: ${file}`);
    const j = JSON.parse(readFileSync(file, "utf8"));
    return Array.isArray(j) ? j : (j.elements ?? []);
  }
  const query = QUERIES[name];
  let last;
  for (const ep of opt.endpoint ? [opt.endpoint] : ENDPOINTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        log(`  ${name}: ${new URL(ep).host} (deneme ${attempt + 1})…`);
        const res = await fetch(ep, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Bigova-Safari-points/1.0" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(330_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (j.remark && /error|timed out|out of memory/i.test(j.remark) && !(j.elements ?? []).length) throw new Error(j.remark);
        return j.elements ?? [];
      } catch (e) {
        last = e;
        log(`    olmadı: ${e.message}`);
        await sleep(3000 * (attempt + 1));
      }
    }
  }
  throw new Error(`Overpass'e ulaşılamadı (${name}): ${last?.message}`);
}

/* ───────────────────────── Geometri ───────────────────────── */
const LAT0 = 40.2; // Biga enlemi: bu bölgede düzlem yaklaşımı yeterince doğru
const MX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const MY = 110540;
const xy = (lat, lon) => [lon * MX, lat * MY];
const dist = (a, b) => Math.hypot((a.lon - b.lon) * MX, (a.lat - b.lat) * MY);

/** Çizgi boyunca `spacing` metrede bir nokta; kısa yollara bir orta nokta. */
function sampleLine(geom, spacing) {
  const out = [];
  let total = 0;
  for (let i = 1; i < geom.length; i++) total += dist(geom[i - 1], geom[i]);
  if (total < 3) return out;
  if (total < spacing) {
    let half = total / 2, acc = 0;
    for (let i = 1; i < geom.length; i++) {
      const L = dist(geom[i - 1], geom[i]);
      if (half <= acc + L) {
        const t = L ? (half - acc) / L : 0;
        out.push({ lat: geom[i - 1].lat + (geom[i].lat - geom[i - 1].lat) * t, lon: geom[i - 1].lon + (geom[i].lon - geom[i - 1].lon) * t });
        break;
      }
      acc += L;
    }
    return out;
  }
  let next = spacing / 2, acc = 0;
  for (let i = 1; i < geom.length; i++) {
    const L = dist(geom[i - 1], geom[i]);
    while (L > 0 && next <= acc + L) {
      const t = (next - acc) / L;
      out.push({ lat: geom[i - 1].lat + (geom[i].lat - geom[i - 1].lat) * t, lon: geom[i - 1].lon + (geom[i].lon - geom[i - 1].lon) * t });
      next += spacing;
    }
    acc += L;
  }
  return out;
}

function makePolygon(geom) {
  if (!geom || geom.length < 4) return null;
  const f = geom[0], l = geom[geom.length - 1];
  if (f.lat !== l.lat || f.lon !== l.lon) return null; // yalnızca kapalı alanlar
  const pts = geom.map((g) => xy(g.lat, g.lon));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
  return { pts, x0, y0, x1, y1 };
}
function inPoly(poly, x, y) {
  if (x < poly.x0 || x > poly.x1 || y < poly.y0 || y > poly.y1) return false;
  let inside = false;
  const p = poly.pts;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Türkçe karakterleri sadeleştir (Ağaköy ≈ agakoy) */
const fold = (s) =>
  String(s ?? "")
    .replace(/İ/g, "i").replace(/I/g, "i")
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* ───────────────────────── Ana akış ───────────────────────── */
async function main() {
  // Uzun OSM indirmesinden ÖNCE: yükleme isteniyorsa anahtarlar hazır mı?
  if (opt.upload && !((process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error("--upload için SUPABASE_URL (ya da NEXT_PUBLIC_SUPABASE_URL) ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri gerekli.");
    process.exit(1);
  }
  log(`Biga Safari nokta üretici · ${opt.bbox ? `alan: ${opt.bbox.join(",")}` : `${opt.province} / ${opt.area} ilçesi`}`);
  log("OSM verisi alınıyor (birkaç dakika sürebilir)…");
  const ways = await overpass("ways");
  const pois = await overpass("pois");
  const excl = await overpass("exclude");
  const places = (await overpass("places")).filter((e) => e.type === "node" || e.lat !== undefined);
  log(`  yol: ${ways.length} · özel yer: ${pois.length} · dışlanan alan: ${excl.length} · yerleşim: ${places.length}`);
  if (!ways.length) {
    console.error(
      "\nHiç yol bulunamadı. İlçe sınırı adı eşleşmemiş olabilir. Şunu dene:\n" +
        `  --area "<OSM'deki ilçe adı>"  ya da  --bbox güney,batı,kuzey,doğu`,
    );
    process.exit(1);
  }

  // dışlanan alanlar
  const polys = excl.map((e) => makePolygon(e.geometry)).filter(Boolean);
  const excluded = (lat, lon) => {
    const [x, y] = xy(lat, lon);
    return polys.some((p) => inPoly(p, x, y));
  };

  // aday noktalar
  const cands = [];
  for (const w of ways) {
    if (w.type !== "way" || !Array.isArray(w.geometry) || w.geometry.length < 2) continue;
    const hw = w.tags?.highway ?? "";
    const kind = /^(pedestrian|footway|path|cycleway|living_street)$/.test(hw) ? "walk" : "street";
    for (const p of sampleLine(w.geometry, opt.spacing)) cands.push({ lat: p.lat, lon: p.lon, kind });
  }
  for (const e of pois) {
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    const t = e.tags ?? {};
    const kind = t.natural === "beach" ? "beach" : t.leisure ? "park" : "poi";
    cands.push({ lat, lon, kind });
  }
  const before = cands.length;
  const kept = cands.filter((c) => !excluded(c.lat, c.lon));
  log(`  aday nokta: ${before} · dışlanan alanlarda elenen: ${before - kept.length}`);

  // seyrelt: park/plaj/özel yer > yaya yolu > sokak
  const rank = { park: 0, beach: 0, poi: 0, place: 0, walk: 1, street: 2 };
  kept.sort((a, b) => rank[a.kind] - rank[b.kind]);
  const grid = new Map();
  const cell = opt.gap;
  const gk = (i, j) => `${i},${j}`;
  const clash = (x, y) => {
    const i = Math.floor(x / cell), j = Math.floor(y / cell);
    for (let di = -1; di <= 1; di++)
      for (let dj = -1; dj <= 1; dj++) for (const o of grid.get(gk(i + di, j + dj)) ?? []) if (Math.hypot(o[0] - x, o[1] - y) < opt.gap) return true;
    return false;
  };
  const add = (c) => {
    const [x, y] = xy(c.lat, c.lon);
    const k = gk(Math.floor(x / cell), Math.floor(y / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push([x, y]);
    points.push(c);
  };
  const points = [];
  for (const c of kept) {
    const [x, y] = xy(c.lat, c.lon);
    if (!clash(x, y)) add(c);
  }

  // her yerleşim merkezinde en az birkaç nokta olsun (küçük köylerde yol verisi eksik olabilir)
  const pl = places.map((p) => ({ name: p.tags?.name, type: p.tags?.place, lat: p.lat, lon: p.lon })).filter((p) => p.name && Number.isFinite(p.lat));
  let added = 0;
  for (const p of pl) {
    if (excluded(p.lat, p.lon)) continue;
    let near = 0;
    for (const q of points) if (Math.abs(q.lat - p.lat) < 0.003 && Math.abs(q.lon - p.lon) < 0.004 && dist(q, p) < 250) near++;
    if (near < 2) (add({ lat: p.lat, lon: p.lon, kind: "place" }), added++);
  }
  if (added) log(`  yol verisi az olan ${added} yerleşimin merkezine nokta eklendi`);

  // bölge adı: en yakın yerleşim (5 km içinde)
  for (const c of points) {
    let best = null, bd = 5000;
    for (const p of pl) {
      if (Math.abs(p.lat - c.lat) > 0.06 || Math.abs(p.lon - c.lon) > 0.08) continue;
      const d = dist(c, p);
      if (d < bd) (bd = d), (best = p);
    }
    c.zone = best ? best.name : null;
  }

  // sırala (SQL dosyaları bölge bölge yüklensin) ve yaz
  points.sort((a, b) => Math.floor(a.lat / 0.0025) - Math.floor(b.lat / 0.0025) || Math.floor(a.lon / 0.0033) - Math.floor(b.lon / 0.0033) || a.lat - b.lat);
  const rows = points.map((p) => [Number(p.lat.toFixed(6)), Number(p.lon.toFixed(6)), p.kind, p.zone ?? ""]);

  /* rapor */
  const byKind = {}, byZone = {};
  for (const p of points) {
    byKind[p.kind] = (byKind[p.kind] ?? 0) + 1;
    const z = p.zone ?? "(bölgesiz)";
    byZone[z] = (byZone[z] ?? 0) + 1;
  }
  log(`\nToplam ${points.length} yürünebilir nokta · türler: ${Object.entries(byKind).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  const zones = Object.entries(byZone).sort((a, b) => b[1] - a[1]);
  log(`Bölgeler (${zones.length}): ` + zones.slice(0, 25).map(([z, n]) => `${z} ${n}`).join(" · ") + (zones.length > 25 ? " …" : ""));

  let warn = 0;
  for (const need of opt.require) {
    const n = zones.filter(([z]) => fold(z) === fold(need)).reduce((s, [, c]) => s + c, 0);
    if (n < 15) {
      warn++;
      const close = zones.filter(([z]) => fold(z).includes(fold(need)) || fold(need).includes(fold(z))).map(([z]) => z);
      console.warn(`UYARI: "${need}" bölgesinde yalnızca ${n} nokta var.${close.length ? ` Benzer adlar: ${close.join(", ")}` : " OSM'de bu adla bir yerleşim bulunamadı; --bbox ile alanı genişletmeyi dene."}`);
    } else log(`OK  ${need}: ${n} nokta`);
  }
  if (points.length < 300) (warn++, console.warn(`UYARI: toplam nokta sayısı çok az (${points.length}). Alan/ilçe adını kontrol et.`));

  /* SQL dosyaları */
  mkdirSync(opt.out, { recursive: true });
  for (const f of readdirSync(opt.out)) if (/^\d{3}_.*\.sql$/.test(f)) rmSync(join(opt.out, f));
  const esc = (s) => s.replace(/'/g, "''");
  const files = [];
  const put = (name, body) => (writeFileSync(join(opt.out, name), body, "utf8"), files.push(name));
  put("000_reset.sql", "-- Önceki noktaları siler (oyuncu verisine dokunmaz).\nselect public.safari_reset_points();\n");
  const nChunks = Math.ceil(rows.length / opt.chunk);
  for (let i = 0; i < nChunks; i++) {
    const part = rows.slice(i * opt.chunk, (i + 1) * opt.chunk);
    put(`${String(i + 1).padStart(3, "0")}_points.sql`, `-- ${part.length} nokta (${i + 1}/${nChunks})\nselect public.safari_load_points('${esc(JSON.stringify(part))}'::jsonb);\n`);
  }
  put("999_finish.sql", "-- En son çalıştır: hücre indeksini kurar.\nselect public.safari_reindex();\n");
  log(`\n${files.length} SQL dosyası yazıldı: ${opt.out}/ (000_reset → 001… → 999_finish sırasıyla çalıştır)`);

  /* doğrudan yükleme */
  if (opt.upload) {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("Yükleme için SUPABASE_URL (ya da NEXT_PUBLIC_SUPABASE_URL) ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri gerekli.");
      process.exit(1);
    }
    const rpc = async (fn, body) => {
      const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify(body ?? {}),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`${fn}: HTTP ${res.status} ${txt.slice(0, 300)}`);
      return txt ? JSON.parse(txt) : null;
    };
    log("Supabase'e yükleniyor…");
    await rpc("safari_reset_points");
    for (let i = 0; i < nChunks; i++) {
      await rpc("safari_load_points", { p: rows.slice(i * opt.chunk, (i + 1) * opt.chunk) });
      log(`  ${Math.min((i + 1) * opt.chunk, rows.length)}/${rows.length}`);
    }
    log("İndeks kuruluyor:", JSON.stringify(await rpc("safari_reindex")));
  } else {
    log("Yüklemek için: SQL dosyalarını Supabase SQL Editor'de sırayla çalıştır, ya da --upload ile tekrar çalıştır.");
  }
  if (warn && opt.strict) process.exit(2);
}

main().catch((e) => {
  console.error("\nHata:", e.message);
  process.exit(1);
});
