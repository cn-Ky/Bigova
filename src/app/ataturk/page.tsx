import Link from "next/link";
import AtaturkAlbum from "./AtaturkAlbum";

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
          {image.credit}
        </a>
      </figcaption>
    </figure>
  );
}

export default function AtaturkPage() {
  return (
    <main className="atat-page">
      <header className="atat-hero">
        <div className="atat-hero-copy">
          <p className="atat-eyebrow">BIGOVA · CUMHURİYETİN BELLEĞİ</p>
          <h1>Atatürk Köşesi</h1>
          <p className="atat-intro">
            Bir milletin hafızasında yaşayan sözler, değerler ve bağımsızlık
            fikri. Metinlere, tarihî bağlamlarıyla birlikte yakından bak.
          </p>
          <a className="atat-hero-link" href="#genclige-hitabe">
            Metinleri keşfet <span aria-hidden="true">↓</span>
          </a>
          <p className="atat-hero-credit">
            <a href={images.portrait.href} target="_blank" rel="noreferrer">
              {images.portrait.credit}
            </a>
          </p>
        </div>
        <div className="atat-hero-photo">
          <img src={images.portrait.src} alt={images.portrait.alt} />
        </div>
        <span className="atat-hero-mark" aria-hidden="true">
          1881 — 1938
        </span>
      </header>

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
      </nav>

      <AtaturkAlbum />

      <section
        className="atat-reading atat-reading--hitabe"
        id="genclige-hitabe"
      >
        <div className="atat-section-heading">
          <span>01 / EMANET</span>
          <h2>Gençliğe Hitabe</h2>
          <p>Nutuk’un son bölümünden, gençliğe bırakılan tarihî çağrı.</p>
        </div>
        <div className="atat-hitabe-text">
          {hitabe.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
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
      </section>

      <section className="atat-reading atat-reading--split" id="andimiz">
        <div className="atat-section-heading">
          <span>02 / BİRLİKTE</span>
          <h2>Andımız</h2>
          <p>Bir dönemin okul törenlerinde okunan öğrenci andı.</p>
          <ArchiveImage image={images.andimiz} />
        </div>
        <div className="atat-andimiz-text">
          {andimiz.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="atat-context-note">
            Andımız, Atatürk’ün metni değildir. Eğitimci ve siyasetçi Dr. Reşit
            Galip tarafından yazılmış; Atatürk döneminde, 1933’te okullarda
            okunmaya başlanmıştır.
          </p>
        </div>
      </section>

      <section
        className="atat-reading atat-reading--split atat-reading--nutuk"
        id="nutuk"
      >
        <div className="atat-section-heading">
          <span>03 / TARİH</span>
          <h2>Nutuk’tan</h2>
          <p>
            1919’dan 1927’ye uzanan bir dönemin tanıklığı ve değerlendirmesi.
          </p>
          <ArchiveImage image={images.nutuk} />
        </div>
        <div className="atat-quotes">
          {nutukQuotes.map((quote, index) => (
            <blockquote key={quote}>
              <span>0{index + 1}</span>
              <p>“{quote}”</p>
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

      <section
        className="atat-reading atat-reading--split atat-reading--anthem"
        id="istiklal-marsi"
      >
        <div className="atat-section-heading">
          <span>04 / İSTİKLÂL</span>
          <h2>İstiklâl Marşı</h2>
          <p>Mehmet Âkif Ersoy’un kaleminden, milletin ortak sesi.</p>
          <ArchiveImage image={images.anthem} />
          <p className="atat-context-note">
            Marşın sözleri Mehmet Âkif Ersoy’a, bestesi Osman Zeki Üngör’e
            aittir. 12 Mart 1921’de Türkiye Büyük Millet Meclisi tarafından
            millî marş olarak kabul edilmiştir.
          </p>
        </div>
        <div className="atat-anthem-text">
          {anthem.map((stanza, index) => (
            <p key={index}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {stanza.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          ))}
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
        </div>
      </section>

      <footer className="atat-footer">
        <p>Geçmişin sözü, geleceğin sorumluluğu.</p>
        <a
          href="https://commons.wikimedia.org/wiki/File:Ataturk_imza_01_tam35blog.png"
          target="_blank"
          rel="noreferrer"
        >
          İmza görseli: Kemalogretmen · CC0 · Wikimedia Commons
        </a>
        <Link href="/">
          Bigova’ya dön <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </main>
  );
}
