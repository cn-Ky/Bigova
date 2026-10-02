"use client";

import {
    faArrowUpRightFromSquare,
    faChevronLeft,
    faChevronRight,
    faMagnifyingGlass,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Collection = "portre" | "mucadele" | "halk" | "egitim";

type AlbumPhoto = {
  file: string;
  title: string;
  caption: string;
  year: string;
  collection: Collection;
  frame: "portrait" | "landscape" | "square";
};

const photos: AlbumPhoto[] = [
  {
    file: "1922 Atatürk Autochrome.jpg",
    title: "Renkli bir tarih",
    caption: "Otomatik renkli fotoğraf tekniğiyle erken bir portre.",
    year: "1922",
    collection: "portre",
    frame: "portrait",
  },
  {
    file: "Atatürk, Ankara, 5 Ocak 1922.png",
    title: "Ankara’da",
    caption: "Millî Mücadele yıllarında Ankara’dan bir kare.",
    year: "1922",
    collection: "mucadele",
    frame: "landscape",
  },
  {
    file: "Atatürk at Kocatepe.jpg",
    title: "Kocatepe’de",
    caption: "Büyük Taarruz sırasında Kocatepe, 26 Ağustos.",
    year: "1922",
    collection: "mucadele",
    frame: "portrait",
  },
  {
    file: "Atatürk in Kocatepe before the start of the Great Offensive, August 30, 1922.jpg",
    title: "Büyük Taarruz",
    caption: "Taarruz öncesinde Kocatepe’de çekilen fotoğraf.",
    year: "1922",
    collection: "mucadele",
    frame: "portrait",
  },
  {
    file: "Atatürk in Izmir, 1922.jpg",
    title: "İzmir’de",
    caption: "Kurtuluşun ardından İzmir’den bir an.",
    year: "1922",
    collection: "halk",
    frame: "portrait",
  },
  {
    file: "Atatürk, Afyon, 23 Mart 1923 (2).jpg",
    title: "Afyon’da",
    caption: "Mustafa Kemal Paşa, Afyon istasyonunda.",
    year: "1923",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk Edremit'te (1923).jpg",
    title: "Edremit yolu",
    caption: "1923’te Edremit’te çekilmiş bir fotoğraf.",
    year: "1923",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk Konya'da (1923).jpg",
    title: "Konya’da",
    caption: "Cumhuriyet’in ilk yıllarındaki yurt gezilerinden.",
    year: "1923",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk ve Latife hanım.png",
    title: "Latife Hanım ile",
    caption: "Mustafa Kemal Paşa ve Latife Hanım, 1923.",
    year: "1923",
    collection: "portre",
    frame: "portrait",
  },
  {
    file: "Atatürk in 1925.jpg",
    title: "Cumhuriyet’in ilk yılları",
    caption: "1925 tarihli portre fotoğrafı.",
    year: "1925",
    collection: "portre",
    frame: "portrait",
  },
  {
    file: "Atatürk Kastamonu 1925.jpg",
    title: "Kastamonu’da",
    caption: "Şapka Devrimi döneminde Kastamonu gezisi.",
    year: "1925",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk 23 Eylül 1925'te Reşit Paşa Gemisi'nde.jpg",
    title: "Reşit Paşa vapurunda",
    caption: "Mudanya açıklarında bir yolculuk anı.",
    year: "1925",
    collection: "halk",
    frame: "portrait",
  },
  {
    file: "Atatürk in white tie.jpg",
    title: "Resmî portre",
    caption: "Silindir şapkası ve frakıyla Atatürk.",
    year: "1925",
    collection: "portre",
    frame: "portrait",
  },
  {
    file: "Atatürk Samsun Lisesi'nde ders dinlerken.jpg",
    title: "Samsun Lisesi’nde",
    caption: "Bir lise dersini öğrencilerle birlikte dinlerken.",
    year: "1930",
    collection: "egitim",
    frame: "landscape",
  },
  {
    file: "Atatürk Samsun'da coğrafya dersinde.jpg",
    title: "Coğrafya dersi",
    caption: "Samsun’da sınıf ziyaretinden bir kare.",
    year: "1930",
    collection: "egitim",
    frame: "landscape",
  },
  {
    file: "Atatürk Sivas'ta öğrencilerle (20 Kasım 1930).png",
    title: "Sivas’ta öğrencilerle",
    caption: "20 Kasım’da Sivas’ta öğrencilerle buluşma.",
    year: "1930",
    collection: "egitim",
    frame: "landscape",
  },
  {
    file: "Atatürk Edirne'de bir kadının derdini dinlerken (25 Aralık 1930).jpg",
    title: "Edirne’de bir sohbet",
    caption: "Bir yurttaşını dinlerken, Edirne gezisi.",
    year: "1930",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk drinking Turkish coffee, 1930.jpg",
    title: "Kahve molası",
    caption: "Gündelik yaşamdan sakin bir an.",
    year: "1930",
    collection: "portre",
    frame: "portrait",
  },
  {
    file: "Atatürk çocuklarla.jpg",
    title: "Çocuklarla",
    caption: "Atatürk’ün çocuklarla bir arada olduğu 1930’lardan bir kare.",
    year: "1930’lar",
    collection: "halk",
    frame: "portrait",
  },
  {
    file: "Atatürk in Ertuğrul Yatch, 1937.jpg",
    title: "Ertuğrul Yatı’nda",
    caption: "Ertuğrul yatında bir seyahat anı.",
    year: "1937",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk Sivas Lisesi'nde Geometri dersi verirken (13 Kasım 1937).jpg",
    title: "Geometri dersi",
    caption: "Sivas Lisesi’nde geometri dersini anlatırken.",
    year: "1937",
    collection: "egitim",
    frame: "landscape",
  },
  {
    file: "Atatürk Pertek Halkevi'nde (1937).jpg",
    title: "Pertek Halkevi’nde",
    caption: "Tunceli gezisinde Halkevi ziyareti.",
    year: "1937",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk ve Büyük Utku Anıtı.jpg",
    title: "Büyük Utku Anıtı",
    caption: "Afyon’daki Büyük Utku Anıtı önünde.",
    year: "1937",
    collection: "mucadele",
    frame: "portrait",
  },
  {
    file: "Atatürk and Celal Bayar in Afyon, 1937.jpg",
    title: "Afyon’da bir ziyaret",
    caption: "Celal Bayar ile Afyon gezisinden.",
    year: "1937",
    collection: "halk",
    frame: "landscape",
  },
  {
    file: "Atatürk Trakya Manevralarında (17-20 Ağustos 1937).jpg",
    title: "Trakya Manevraları",
    caption: "Trakya Manevraları sırasında, 17–20 Ağustos.",
    year: "1937",
    collection: "mucadele",
    frame: "landscape",
  },
];

const collections: { id: "all" | Collection; label: string }[] = [
  { id: "all", label: "Tüm kareler" },
  { id: "portre", label: "Portreler" },
  { id: "mucadele", label: "Mücadele" },
  { id: "halk", label: "Halk ve geziler" },
  { id: "egitim", label: "Eğitim" },
];

function fileUrl(filename: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=960`;
}

function filePage(filename: string) {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(filename).replaceAll("%20", "_")}`;
}

export default function AtaturkAlbum() {
  const [collection, setCollection] =
    useState<(typeof collections)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const visiblePhotos = photos.filter((photo) => {
    const matchesCollection =
      collection === "all" || photo.collection === collection;
    const searchText =
      `${photo.title} ${photo.caption} ${photo.year}`.toLocaleLowerCase("tr");
    return (
      matchesCollection &&
      searchText.includes(query.trim().toLocaleLowerCase("tr"))
    );
  });

  const selectedPhoto = selected === null ? null : visiblePhotos[selected];

  useEffect(() => {
    if (selectedPhoto === null) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight") {
        setSelected((index) =>
          index === null ? null : (index + 1) % visiblePhotos.length,
        );
      }
      if (event.key === "ArrowLeft") {
        setSelected((index) =>
          index === null
            ? null
            : (index - 1 + visiblePhotos.length) % visiblePhotos.length,
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto, visiblePhotos.length]);

  return (
    <section className="atat-album" id="fotoğraf-albümü">
      <header className="atat-album-heading">
        <div>
          <p className="atat-album-eyebrow">FOTOĞRAF ARŞİVİ · 1922–1937</p>
          <h2>Bir ömrün izleri</h2>
          <p>
            Arşivlerden seçilen 25 kare; yıllar, yolculuklar ve insanlarla
            birlikte.
          </p>
        </div>
        <span className="atat-album-total" aria-live="polite">
          {visiblePhotos.length.toString().padStart(2, "0")} / 25 FOTOĞRAF
        </span>
      </header>

      <div className="atat-album-tools">
        <div
          className="atat-album-filters"
          role="group"
          aria-label="Albümü kategoriye göre filtrele"
        >
          {collections.map((item) => (
            <button
              key={item.id}
              type="button"
              className={collection === item.id ? "is-active" : ""}
              aria-pressed={collection === item.id}
              onClick={() => {
                setCollection(item.id);
                setSelected(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="atat-album-search">
          <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
          <span className="sr-only">Fotoğraflarda ara</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(null);
            }}
            placeholder="Yıl veya konu ara"
          />
        </label>
      </div>

      <div className="atat-gallery-grid" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {visiblePhotos.map((photo, index) => (
            <motion.button
              key={photo.file}
              type="button"
              className={`atat-gallery-card atat-gallery-card--${photo.frame}`}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{
                duration: 0.35,
                delay: Math.min(index * 0.018, 0.2),
              }}
              onClick={() => setSelected(index)}
              aria-label={`${photo.title}, ${photo.year}. Büyük görüntüyü aç`}
            >
              <img
                src={fileUrl(photo.file)}
                alt=""
                loading={index > 5 ? "lazy" : "eager"}
              />
              <span className="atat-gallery-shade" />
              <span className="atat-gallery-caption">
                <span>{photo.year}</span>
                <strong>{photo.title}</strong>
              </span>
              <span className="atat-gallery-open" aria-hidden="true">
                ↗
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
        {visiblePhotos.length === 0 && (
          <p className="atat-gallery-empty">
            Bu aramayla eşleşen bir fotoğraf yok.
          </p>
        )}
      </div>

      <p className="atat-album-note">
        Fotoğraflar Wikimedia Commons arşivinden seçilmiştir. Her görselin
        kaynak ve kullanım bilgisi, büyük görünümde dosya sayfasına bağlanır.
      </p>

      <AnimatePresence>
        {selectedPhoto && selected !== null && (
          <motion.div
            className="atat-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedPhoto.title} fotoğrafı`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="atat-lightbox-panel"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="atat-lightbox-close"
                aria-label="Fotoğrafı kapat"
                onClick={() => setSelected(null)}
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
              <button
                type="button"
                className="atat-lightbox-arrow atat-lightbox-arrow--left"
                aria-label="Önceki fotoğraf"
                onClick={() =>
                  setSelected(
                    (selected - 1 + visiblePhotos.length) %
                      visiblePhotos.length,
                  )
                }
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <img
                className="atat-lightbox-image"
                src={fileUrl(selectedPhoto.file)}
                alt={selectedPhoto.title}
              />
              <button
                type="button"
                className="atat-lightbox-arrow atat-lightbox-arrow--right"
                aria-label="Sonraki fotoğraf"
                onClick={() =>
                  setSelected((selected + 1) % visiblePhotos.length)
                }
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
              <div className="atat-lightbox-info">
                <div>
                  <p>
                    {selectedPhoto.year} <span>·</span> {selected + 1} /{" "}
                    {visiblePhotos.length}
                  </p>
                  <h3>{selectedPhoto.title}</h3>
                  <span>{selectedPhoto.caption}</span>
                </div>
                <a
                  href={filePage(selectedPhoto.file)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Kaynak ve lisans{" "}
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
