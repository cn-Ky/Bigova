import Link from "next/link";
import AtaturkAlbum from "./AtaturkAlbum";
import MarsFloat, { MarsHeroButton } from "./MarsPlayer";
import { Tx } from "./Turk";
import "./ataturk.css";

const images = {
  portrait: {
    src: "https://upload.wikimedia.org/wikipedia/commons/d/d1/Atat%C3%BCrk_in_white_tie.jpg",
    alt: "Mustafa Kemal Atatürk, 1925 tarihli portresi",
    credit:
      "Fotoğraf: bilinmeyen fotoğrafçı, 1925 · Wikimedia Commons, kamu malı",
    href: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_in_white_tie.jpg",
  },
  andimiz: {
    src: "https://upload.wikimedia.org/wikipedia/commons/8/8b/And%C4%B1m%C4%B1z-1.jpg",
    alt: "Bir okulda sergilenen Andımız panosu",
    credit: "Fotoğraf: YALIN BALTA · CC BY-SA 4.0",
    href: "https://commons.wikimedia.org/wiki/File:And%C4%B1m%C4%B1z-1.jpg",
  },
  nutuk: {
    src: "https://upload.wikimedia.org/wikipedia/commons/5/54/Atat%C3%BCrk_at_Kocatepe.jpg",
    alt: "Atatürk, Büyük Taarruz sırasında Kocatepe'de",
    credit: "Fotoğraf: Türk Silahlı Kuvvetleri · Wikimedia Commons, kamu malı",
    href: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_at_Kocatepe.jpg",
  },
  anthem: {
    src: "https://upload.wikimedia.org/wikipedia/commons/4/4c/Atat%C3%BCrk_with_Turkish_flag.jpg",
    alt: "Türk bayrağı önünde Atatürk portresi",
    credit: "Fotoğraf: Segafredo18 · CC BY-SA 3.0",
    href: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_with_Turkish_flag.jpg",
  },
};

const hitabe = [
  "Ey Türk gençliği! Birinci vazifen, Türk istiklâlini, Türk Cumhuriyetini, ilelebet muhafaza ve müdafaa etmektir.",
  "Mevcudiyetinin ve istikbalinin yegâne temeli budur. Bu temel, senin en kıymetli hazinendir. İstikbalde dahi, seni bu hazineden mahrum etmek isteyecek, dahilî ve haricî bedhahların olacaktır. Bir gün, istiklâl ve Cumhuriyeti müdafaa mecburiyetine düşersen, vazifeye atılmak için, içinde bulunacağın vaziyetin imkân ve şeraitini düşünmeyeceksin! Bu imkân ve şerait, çok namüsait bir mahiyette tezahür edebilir. İstiklâl ve Cumhuriyetine kastedecek düşmanlar, bütün dünyada emsali görülmemiş bir galibiyetin mümessili olabilirler. Cebren ve hile ile aziz vatanın, bütün kaleleri zapt edilmiş, bütün tersanelerine girilmiş, bütün orduları dağıtılmış ve memleketin her köşesi bilfiil işgal edilmiş olabilir. Bütün bu şeraitten daha elîm ve daha vahim olmak üzere, memleketin dahilinde iktidara sahip olanlar gaflet ve dalâlet ve hattâ hıyanet içinde bulunabilirler. Hattâ bu iktidar sahipleri şahsî menfaatlerini, müstevlilerin siyasî emelleriyle tevhit edebilirler. Millet, fakr ü zaruret içinde harap ve bîtap düşmüş olabilir.",
  "Ey Türk istikbalinin evlâdı! İşte, bu ahval ve şerait içinde dahi vazifen; Türk istiklâl ve Cumhuriyetini kurtarmaktır! Muhtaç olduğun kudret, damarlarındaki asil kanda mevcuttur!",
];

const andimiz = [
  "Türküm, doğruyum, çalışkanım.",
  "İlkem; küçüklerimi korumak, büyüklerimi saymak, yurdumu, milletimi özümden çok sevmektir.",
  "Ülküm; yükselmek, ileri gitmektir.",
  "Ey büyük Atatürk!",
  "Açtığın yolda, gösterdiğin hedefe durmadan yürüyeceğime ant içerim.",
  "Varlığım Türk varlığına armağan olsun.",
  "Ne mutlu Türküm diyene!",
];
// Büyük puntoyla öne çıkarılan satırlar (dizindeki sıra)
const andimizKey = new Set([0, 3, 6]);

const nutukQuotes = [
  "Milletin istiklâlini yine milletin azim ve kararı kurtaracaktır.",
  "Manda ve himaye kabul olunamaz.",
  "Hâkimiyet, bilâ kayd ü şart milletindir.",
];

const anthem = [
  [
    "Korkma, sönmez bu şafaklarda yüzen al sancak;",
    "Sönmeden yurdumun üstünde tüten en son ocak.",
    "O benim milletimin yıldızıdır, parlayacak;",
    "O benimdir, o benim milletimindir ancak.",
  ],
  [
    "Çatma, kurban olayım, çehreni ey nazlı hilâl!",
    "Kahraman ırkıma bir gül; ne bu şiddet, bu celâl?",
    "Sana olmaz dökülen kanlarımız sonra helâl,",
    "Hakkıdır, Hakk’a tapan, milletimin istiklâl.",
  ],
  [
    "Ben ezelden beridir hür yaşadım, hür yaşarım.",
    "Hangi çılgın bana zincir vuracakmış? Şaşarım!",
    "Kükremiş sel gibiyim; bendimi çiğner, aşarım;",
    "Yırtarım dağları, enginlere sığmam, taşarım.",
  ],
  [
    "Garb’ın âfâkını sarmışsa çelik zırhlı duvar,",
    "Benim iman dolu göğsüm gibi serhaddim var.",
    "Ulusun, korkma! Nasıl böyle bir imanı boğar,",
    "‘Medeniyet!’ dediğin tek dişi kalmış canavar?",
  ],
  [
    "Arkadaş! Yurduma alçakları uğratma sakın;",
    "Siper et gövdeni, dursun bu hayâsızca akın.",
    "Doğacaktır sana va’dettiği günler Hakk’ın...",
    "Kim bilir, belki yarın... belki yarından da yakın.",
  ],
  [
    "Bastığın yerleri ‘toprak!’ diyerek geçme, tanı!",
    "Düşün altındaki binlerce kefensiz yatanı.",
    "Sen şehit oğlusun, incitme, yazıktır atanı;",
    "Verme, dünyaları alsan da, bu cennet vatanı.",
  ],
  [
    "Kim bu cennet vatanın uğruna olmaz ki feda?",
    "Şüheda fışkıracak toprağı sıksan, şüheda!",
    "Cânı, cânânı, bütün varımı alsın da Hudâ,",
    "Etmesin tek vatanımdan beni dünyada cüda.",
  ],
  [
    "Ruhumun senden, İlâhî, şudur ancak emeli:",
    "Değmesin ma’bedimin göğsüne nâ-mahrem eli.",
    "Bu ezanlar -ki şehadetleri dinin temeli-",
    "Ebedî yurdumun üstünde benim inlemeli.",
  ],
  [
    "O zaman vecd ile bin secde eder -varsa- taşım;",
    "Her cerîhamdan, İlâhî, boşanıp kanlı yaşım,",
    "Fışkırır rûh-i mücerred gibi yerden na’şım;",
    "O zaman yükselerek arşa değer belki başım.",
  ],
  [
    "Dalgalan sen de şafaklar gibi ey şanlı hilâl!",
    "Olsun artık dökülen kanlarımın hepsi helâl.",
    "Ebediyen sana yok, ırkıma yok izmihlâl:",
    "Hakkıdır, hür yaşamış bayrağımın hürriyet;",
    "Hakkıdır, Hakk’a tapan milletimin istiklâl!",
  ],
];

// Zafer çizgisi: bağımsızlığa giden yolun dönüm noktaları
const milestones = [
  {
    date: "19 Mayıs 1919",
    title: "Samsun",
    text: "Mustafa Kemal Samsun’a çıkar; Millî Mücadele başlar.",
  },
  {
    date: "23 Nisan 1920",
    title: "Meclis",
    text: "Türkiye Büyük Millet Meclisi Ankara’da açılır.",
  },
  {
    date: "30 Ağustos 1922",
    title: "Başkomutan",
    text: "Başkomutan Meydan Muharebesi kazanılır; düşman ordusu yenilir.",
  },
  {
    date: "29 Ekim 1923",
    title: "Cumhuriyet",
    text: "Cumhuriyet ilân edilir; Atatürk ilk Cumhurbaşkanı seçilir.",
  },
  {
    date: "10 Kasım 1938",
    title: "09.05",
    text: "Atatürk, Dolmabahçe Sarayı’nda yaşama veda eder. Saygıyla.",
  },
];

const ticker = [
  "Hâkimiyet, bilâ kayd ü şart milletindir",
  "Ne mutlu Türküm diyene",
  "Manda ve himaye kabul olunamaz",
  "Yurtta sulh, cihanda sulh",
];

// Altı Ok: Cumhuriyet’in temel ilkeleri
const arrows = [
  {
    name: "Cumhuriyetçilik",
    text: "Egemenlik kayıtsız şartsız millete aittir. Devleti millet yönetir.",
  },
  {
    name: "Milliyetçilik",
    text: "Türk milletinin birliğini, bağımsızlığını ve onurunu her şeyin üstünde tutmak.",
  },
  {
    name: "Halkçılık",
    text: "Ayrıcalığı değil eşitliği esas almak; milletin bütününü gözetmek.",
  },
  {
    name: "Devletçilik",
    text: "Kalkınmanın yükünü gerektiğinde devletin omuzlaması.",
  },
  {
    name: "Laiklik",
    text: "Din ve devlet işlerinin ayrılması; vicdan ve inanç özgürlüğü.",
  },
  {
    name: "İnkılapçılık",
    text: "Çağdaşlaşmanın önündeki engelleri kaldırmak, kazanılan yenilikleri korumak.",
  },
];

/* ───────── Küçük SVG yardımcıları ───────── */

// Beş köşeli yıldız: bir ucu sağa (hilâlin açıklığına) bakar
function starPath(cx: number, cy: number, R: number) {
  const r = R * 0.382;
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k * Math.PI) / 5;
    const rad = k % 2 ? r : R;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

function Hilal({ id, className }: { id: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 140"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={id}>
          <rect width="200" height="140" fill="#fff" />
          <circle cx="86" cy="70" r="48" fill="#000" />
        </mask>
      </defs>
      <circle cx="70" cy="70" r="60" fill="currentColor" mask={`url(#${id})`} />
      <path d={starPath(138, 70, 25)} fill="currentColor" />
    </svg>
  );
}

// Altı Ok amblemi için ışınsal ok (merkezden dışa bakar)
function Arrow({ turn = 0 }: { turn?: number }) {
  return (
    <svg viewBox="0 0 140 140" aria-hidden="true" focusable="false">
      <g
        transform={`rotate(${turn} 70 70)`}
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M70 44V20" strokeWidth="5" />
        <path d="M70 3 81 24H59Z" strokeWidth="2" />
        <path
          d="M70 44 65 51M70 44 75 51M70 38 65 45M70 38 75 45"
          strokeWidth="3"
          fill="none"
        />
      </g>
    </svg>
  );
}

// Kart simgesi: tek, uzun ok (yükseliş yönünde)
function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 140 140"
      aria-hidden="true"
      focusable="false"
    >
      <g
        transform="rotate(45 70 70)"
        fill="currentColor"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M70 122V38" strokeWidth="7" />
        <path d="M70 6 90 42H50Z" strokeWidth="3" />
        <path
          d="M70 122 58 136M70 122 82 136M70 104 58 118M70 104 82 118"
          strokeWidth="6"
          fill="none"
        />
      </g>
    </svg>
  );
}

function ArchiveImage({
  image,
}: {
  image: (typeof images)[keyof typeof images];
}) {
  return (
    <figure className="archive-image">
      <a href={image.href} target="_blank" rel="noreferrer">
        <img src={image.src} alt={image.alt} loading="lazy" />
      </a>
      <figcaption>
        <a href={image.href} target="_blank" rel="noreferrer">
          <Tx>{image.credit}</Tx>
        </a>
      </figcaption>
    </figure>
  );
}

function SectionHead({
  num,
  kicker,
  title,
  lede,
}: {
  num: string;
  kicker: string;
  title: string;
  lede: string;
}) {
  return (
    <header className="atat-head">
      <span className="atat-bignum" aria-hidden="true">
        {num}
      </span>
      <p className="atat-kicker">
        {num} / {kicker}
      </p>
      <h2>
        <Tx>{title}</Tx>
      </h2>
      <p className="atat-lede">
        <Tx>{lede}</Tx>
      </p>
    </header>
  );
}

export default function AtaturkPage() {
  return (
    <main className="atat">
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Oswald:wght@500;600;700&display=swap"
      />

      {/* ═════════ KAPAK ═════════ */}
      <header className="atat-hero">
        <Hilal id="atat-hilal-hero" className="atat-hero-flag" />
        <div className="atat-hero-copy">
          <p className="atat-eyebrow">
            <i aria-hidden="true" /> BIGOVA · CUMHURİYET NÖBETTE
          </p>
          <h1>
            <span>ATATÜRK</span>
            <span className="atat-h1-out">KÖŞESİ</span>
          </h1>
          <p className="atat-oath">
            <Tx>Ne mutlu Türküm diyene!</Tx>
          </p>
          <p className="atat-intro">
            <Tx>
              Bu köşe bir vitrin değil, bir nöbet yeridir. Bağımsızlığın,
              Cumhuriyet’in ve Türk milletinin iradesinin metinleri; olduğu gibi,
              dosdoğru burada durur.
            </Tx>
          </p>
          <div className="atat-actions">
            <a className="atat-btn atat-btn--solid" href="#genclige-hitabe">
              Metinlere geç <span aria-hidden="true">↓</span>
            </a>
            <MarsHeroButton />
          </div>
        </div>

        <figure className="atat-portrait">
          <img src={images.portrait.src} alt={images.portrait.alt} />
          <span className="atat-portrait-years" aria-hidden="true">
            1881 — 1938
          </span>
          <figcaption>
            <strong>GAZİ MUSTAFA KEMAL</strong>
            <span>Başkomutan · Cumhurbaşkanı</span>
            <a href={images.portrait.href} target="_blank" rel="noreferrer">
              {images.portrait.credit}
            </a>
          </figcaption>
        </figure>
      </header>

      {/* ═════════ ŞERİT ═════════ */}
      <div className="atat-ticker" aria-label="Atatürk’ten sözler">
        <div className="atat-ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1}>
              {ticker.map((t) => (
                <li key={t}>
                  <span>
                    <Tx>{t}</Tx>
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      {/* ═════════ ZAFER ÇİZGİSİ ═════════ */}
      <section className="atat-timeline" aria-label="Zafer çizgisi">
        <ol>
          {milestones.map((m) => (
            <li key={m.date}>
              <time>{m.date}</time>
              <strong>{m.title}</strong>
              <p>
                <Tx>{m.text}</Tx>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <nav className="atat-index" aria-label="Atatürk Köşesi içerikleri">
        <a href="#fotoğraf-albümü">
          <span>00</span> Fotoğraf Albümü
        </a>
        <a href="#genclige-hitabe">
          <span>01</span> Gençliğe Hitabe
        </a>
        <a href="#andimiz">
          <span>02</span> Andımız
        </a>
        <a href="#nutuk">
          <span>03</span> Nutuk’tan
        </a>
        <a href="#istiklal-marsi">
          <span>04</span> İstiklâl Marşı
        </a>
        <a href="#alti-ok">
          <span>05</span> Altı Ok
        </a>
      </nav>

      <AtaturkAlbum />

      {/* ═════════ 01 · GENÇLİĞE HİTABE ═════════ */}
      <section className="atat-section atat-hitabe" id="genclige-hitabe">
        <SectionHead
          num="01"
          kicker="EMANET"
          title="Gençliğe Hitabe"
          lede="Nutuk’un son bölümünden, gençliğe bırakılan tarihî çağrı."
        />
        <article className="atat-paper">
          <p className="atat-paper-stamp">NUTUK · 1927</p>
          <p className="atat-hitabe-lead">
            <Tx>{hitabe[0]}</Tx>
          </p>
          <p className="atat-hitabe-body">
            <Tx>{hitabe[1]}</Tx>
          </p>
          <p className="atat-hitabe-call">
            <Tx>{hitabe[2]}</Tx>
          </p>
          <Hilal id="atat-hilal-seal" className="atat-seal" />
          <p className="atat-source">
            Mustafa Kemal Atatürk, <cite>Nutuk</cite>, 1927. Metni{" "}
            <a
              href="https://tr.wikisource.org/wiki/Gen%C3%A7li%C4%9Fe_Hitabe"
              target="_blank"
              rel="noreferrer"
            >
              Vikikaynak’ta oku
            </a>
          </p>
        </article>
      </section>

      {/* ═════════ 02 · ANDIMIZ ═════════ */}
      <section className="atat-section atat-split" id="andimiz">
        <div className="atat-side">
          <SectionHead
            num="02"
            kicker="BİRLİKTE"
            title="Andımız"
            lede="Bir dönemin okul törenlerinde okunan öğrenci andı."
          />
          <ArchiveImage image={images.andimiz} />
        </div>
        <div className="atat-andimiz">
          {andimiz.map((line, i) => (
            <p
              key={line}
              className={`${andimizKey.has(i) ? "is-key" : ""}${i === andimiz.length - 1 ? " is-last" : ""}`}
            >
              <span className="no" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="txt">
                <Tx>{line}</Tx>
              </span>
            </p>
          ))}
          <p className="atat-note">
            Andımız, Atatürk’ün metni değildir. Eğitimci ve siyasetçi Dr. Reşit
            Galip tarafından yazılmış; Atatürk döneminde, 1933’te okullarda
            okunmaya başlanmıştır.
          </p>
        </div>
      </section>

      {/* ═════════ 03 · NUTUK ═════════ */}
      <section className="atat-section atat-split atat-nutuk" id="nutuk">
        <div className="atat-side">
          <SectionHead
            num="03"
            kicker="TARİH"
            title="Nutuk’tan"
            lede="1919’dan 1927’ye uzanan bir dönemin tanıklığı ve değerlendirmesi."
          />
          <ArchiveImage image={images.nutuk} />
        </div>
        <div className="atat-quotes">
          {nutukQuotes.map((quote, index) => (
            <blockquote key={quote}>
              <span aria-hidden="true">0{index + 1}</span>
              <p>
                <Tx>{`“${quote}”`}</Tx>
              </p>
            </blockquote>
          ))}
          <p className="atat-source">
            Mustafa Kemal Atatürk, <cite>Nutuk</cite>, 1927. Metin ve baskı
            farklılıkları için{" "}
            <a
              href="https://tr.wikisource.org/wiki/Nutuk"
              target="_blank"
              rel="noreferrer"
            >
              Vikikaynak nüshasına göz at
            </a>
            .
          </p>
        </div>
      </section>

      {/* ═════════ 04 · İSTİKLÂL MARŞI ═════════ */}
      <section className="atat-section atat-anthem" id="istiklal-marsi">
        <div className="atat-anthem-top">
          <SectionHead
            num="04"
            kicker="İSTİKLÂL"
            title="İstiklâl Marşı"
            lede="Mehmet Âkif Ersoy’un kaleminden, milletin ortak sesi."
          />
          <div>
            <ArchiveImage image={images.anthem} />
            <p className="atat-note">
              <Tx>
                Marşın sözleri Mehmet Âkif Ersoy’a, bestesi Osman Zeki Üngör’e
                aittir. 12 Mart 1921’de Türkiye Büyük Millet Meclisi tarafından
                millî marş olarak kabul edilmiştir.
              </Tx>
            </p>
          </div>
        </div>
        <div className="atat-stanzas">
          {anthem.map((stanza, index) => (
            <p key={index}>
              <span className="atat-stanza-no">
                {String(index + 1).padStart(2, "0")}
              </span>
              {stanza.map((line) => (
                <span key={line} className="atat-line">
                  <Tx>{line}</Tx>
                </span>
              ))}
            </p>
          ))}
        </div>
        <p className="atat-source">
          Tam metni ayrıca{" "}
          <a
            href="https://tr.wikisource.org/wiki/%C4%B0stikl%C3%A2l_Mar%C5%9F%C4%B1"
            target="_blank"
            rel="noreferrer"
          >
            Vikikaynak’ta oku
          </a>
          .
        </p>
      </section>

      {/* ═════════ 05 · ALTI OK ═════════ */}
      <section className="atat-section atat-arrows" id="alti-ok">
        <SectionHead
          num="05"
          kicker="İLKELER"
          title="Altı Ok"
          lede="Cumhuriyet’in dayandığı altı temel ilke."
        />
        <div className="atat-arrows-grid">
          <div className="atat-arrows-emblem" aria-hidden="true">
            {arrows.map((_, i) => (
              <Arrow key={i} turn={i * 60} />
            ))}
            <svg viewBox="0 0 140 140" focusable="false">
              <circle
                cx="70"
                cy="70"
                r="11"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
          </div>
          <ul>
            {arrows.map((a) => (
              <li key={a.name}>
                <ArrowIcon className="atat-arrow-ico" />
                <h3>{a.name}</h3>
                <p>
                  <Tx>{a.text}</Tx>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═════════ ALT BİLGİ ═════════ */}
      <footer className="atat-footer">
        <img
          className="atat-signature"
          src="https://upload.wikimedia.org/wikipedia/commons/8/8e/Ataturk_imza_01_tam35blog.png"
          alt="Mustafa Kemal Atatürk imzası"
          loading="lazy"
        />
        <p className="atat-footer-line">Geçmişin sözü, geleceğin sorumluluğu.</p>
        <Link className="atat-btn atat-btn--solid" href="/">
          Bigova’ya dön <span aria-hidden="true">↗</span>
        </Link>
        <p className="atat-footer-credit">
          <a
            href="https://commons.wikimedia.org/wiki/File:Ataturk_imza_01_tam35blog.png"
            target="_blank"
            rel="noreferrer"
          >
            İmza görseli: Kemalogretmen · CC0 · Wikimedia Commons
          </a>
          <br />
          Arka plan marşı, tarayıcıda üretilen özgün bir bestedir; telif hakkı
          içermez.
        </p>
      </footer>

      <MarsFloat />
    </main>
  );
}
