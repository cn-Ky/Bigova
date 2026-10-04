import {
    faHandshake,
    faHeart,
    faLightbulb,
    faPeopleGroup,
    faScaleBalanced,
    faSchool,
    faShieldHalved,
    faStar,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import LegalNotice from "@/components/LegalNotice";

const sections = [
  {
    id: "comu",
    title: "ÇOMÜ'de öğrenci yaşamı",
    icon: faSchool,
    art: "campus",
    text: "Çanakkale Onsekiz Mart Üniversitesi'nin Biga'daki öğrenci yaşamını; kampüs, fakülte ve meslek yüksekokulu çevresindeki günlük ihtiyaçlarla birlikte ele alıyoruz. Bigova, öğrencilerin yerel bilgiye ve birbirlerinin katkılarına daha kolay ulaşması için tasarlanıyor.",
    note: "Biga İİBF, 1994–1995 eğitim-öğretim yılında İktisat ve İşletme bölümleriyle faaliyete başladı. Güncel bölüm ve akademik bilgiler için üniversitenin resmî kaynakları esas alınmalıdır.",
  },
  {
    id: "misyon",
    title: "Misyonumuz",
    icon: faHeart,
    art: "mission",
    text: "Biga'da öğrenci olmayı kolaylaştıran güvenilir ve erişilebilir bir dijital alan kurmak. Yerel işletme ve ulaşım bilgisini, ders materyallerini ve öğrenci topluluğunun katkılarını tek yerde buluşturmak.",
    note: "Öğrenci katkısı, doğrulanabilir bilgi ve topluluk yararı temel önceliklerimiz.",
  },
  {
    id: "vizyon",
    title: "Vizyonumuz",
    icon: faStar,
    art: "vision",
    text: "Öğrencilerin ihtiyaçlarıyla şekillenen, Biga'da başlayıp üniversite yaşamının farklı alanlarına yayılan sürdürülebilir bir öğrenci platformu olmak.",
    note: "Gelişim yönümüz; şeffaflık, kapsayıcılık ve devamlı öğrenme.",
  },
  {
    id: "ekip",
    title: "Geliştirici ekibi",
    icon: faPeopleGroup,
    art: "team",
    text: "Bigova; ürün, yazılım, tasarım ve içerik çalışmalarını öğrenci ihtiyaçlarından yola çıkarak yürüten bir öğrenci girişimidir. Ekip, gerçek geri bildirimlerle ürünü adım adım geliştirir.",
    note: "Ekip üyelerinin adları, görevleri ve özgeçmişleri onaylandıkça bu bölümde yayımlanacaktır.",
  },
  {
    id: "topluluk",
    title: "Öğrenci kulübümüz",
    icon: faHandshake,
    art: "community",
    text: "Bigova öğrenci topluluğu; kampüste paylaşımı, dayanışmayı ve birlikte üretmeyi desteklemeyi amaçlar. Buluşmalar, etkinlikler ve öğrenci katkıları platformun topluluk tarafını oluşturur.",
    note: "Kulübün resmî adı, danışman bilgisi ve kuruluş ayrıntıları doğrulanmış bilgilerle güncellenecektir.",
  },
];

function AboutArt({ kind }: { kind: string }) {
  const base = {
    viewBox: "0 0 180 140",
    className: "h-28 w-36 text-sea sm:h-32 sm:w-40",
    fill: "none",
    "aria-hidden": true as const,
  };
  if (kind === "campus")
    return (
      <svg {...base}>
        <path
          d="M20 108h140M36 108V58l54-34 54 34v50"
          fill="currentColor"
          fillOpacity=".13"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M27 61h126M68 108V78q0-8 8-8h28q8 0 8 8v30M48 72h10m64 0h10M90 24V12"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path d="M90 12 111 19l-21 7" fill="currentColor" />
      </svg>
    );
  if (kind === "mission")
    return (
      <svg {...base}>
        <path
          d="M90 118S28 81 28 48c0-25 32-33 62-4 30-29 62-21 62 4 0 33-62 70-62 70z"
          fill="currentColor"
          fillOpacity=".14"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          d="m58 67 20 20 44-48"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "vision")
    return (
      <svg {...base}>
        <path
          d="m90 15 18 39 43 6-32 30 8 43-37-21-37 21 8-43-32-30 43-6z"
          fill="currentColor"
          fillOpacity=".14"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <circle cx="90" cy="76" r="17" fill="currentColor" fillOpacity=".26" />
      </svg>
    );
  if (kind === "team")
    return (
      <svg {...base}>
        <circle
          cx="67"
          cy="49"
          r="19"
          fill="currentColor"
          fillOpacity=".2"
          stroke="currentColor"
          strokeWidth="4"
        />
        <circle
          cx="119"
          cy="54"
          r="16"
          fill="currentColor"
          fillOpacity=".14"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          d="M29 119c3-27 15-42 38-42s36 15 39 42m-4-1c3-20 12-31 28-31 14 0 22 10 25 31"
          fill="currentColor"
          fillOpacity=".12"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M75 49h26m-13-13v26"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg {...base}>
      <path
        d="M90 114s-57-29-57-64c0-28 35-37 57-7 22-30 57-21 57 7 0 35-57 64-57 64z"
        fill="currentColor"
        fillOpacity=".13"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        d="M55 73h21l11 12 20-27 13 15h10"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="90" cy="34" r="5" fill="currentColor" />
    </svg>
  );
}

export default function Hakkimizda() {
  return (
    <main className="pb-12">
      <header className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-br from-sea to-sea2 px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] text-white shadow-lg sm:px-8">
        <div className="relative z-10 max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[.12em] text-sun">
            Bigova · Biga
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">
            Birlikte daha kolay bir öğrenci yaşamı
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
            Nereden çıktığımızı, neye inandığımızı ve bu topluluğu nasıl
            büyütmek istediğimizi keşfet.
          </p>
          <a
            href="#yasal"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white"
          >
            <FontAwesomeIcon icon={faShieldHalved} /> Yasal bilgilendirme
          </a>
        </div>
        <div className="pointer-events-none absolute -bottom-8 right-3 opacity-30 sm:right-12">
          <AboutArt kind="campus" />
        </div>
      </header>

      <div className="px-5 sm:px-8">
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={`grid items-center gap-4 border-b border-ink/10 py-7 md:grid-cols-[minmax(0,1fr)_180px] ${index % 2 ? "md:[&>div]:order-2" : ""}`}
          >
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-sea">
                <FontAwesomeIcon icon={section.icon} />
                <span>0{index + 1} / 05</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-extrabold">
                {section.title}
              </h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-ink/75">
                {section.text}
              </p>
              <p className="mt-3 border-l-2 border-tide pl-3 text-sm leading-relaxed text-ink/60">
                {section.note}
              </p>
            </div>
            <div
              className="flex justify-center rounded-[18px] bg-card/70 py-2"
              aria-hidden="true"
            >
              <AboutArt kind={section.art} />
            </div>
          </section>
        ))}

        <section
          className="grid gap-3 border-b border-ink/10 py-6 sm:grid-cols-2"
          aria-label="Resmî okul kaynakları"
        >
          <a
            href="https://biibf.comu.edu.tr/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 text-sm font-bold shadow-sm"
          >
            <span>ÇOMÜ Biga İİBF resmî sitesi</span>
            <span className="text-sea">Aç ↗</span>
          </a>
          <a
            href="https://bigamyo.comu.edu.tr/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-3 rounded-xl bg-card p-4 text-sm font-bold shadow-sm"
          >
            <span>ÇOMÜ Biga MYO resmî sitesi</span>
            <span className="text-sea">Aç ↗</span>
          </a>
        </section>

        <section
          className="border-b border-ink/10 py-8"
          aria-labelledby="charter-title"
        >
          <div className="flex flex-wrap items-center gap-2">
            <FontAwesomeIcon icon={faScaleBalanced} className="text-sea" />
            <span className="rounded-full bg-sun/30 px-3 py-1 text-xs font-bold text-deep">
              Çalışma esasları · taslak
            </span>
          </div>
          <h2
            id="charter-title"
            className="mt-3 font-display text-2xl font-extrabold"
          >
            Topluluk tüzüğü
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/70">
            Aşağıdaki ilkeler yayıma hazır çalışma taslağıdır; kulüp yönetimi ve
            danışman onayı sonrası resmî metinle güncellenmelidir.
          </p>
          <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
            {[
              [
                "Amaç ve ilkeler",
                "Öğrenci yararını gözetmek; doğru bilgi, eşit katılım, nezaket ve dayanışma ilkeleriyle çalışmak.",
              ],
              [
                "Katılım",
                "Etkinlik ve katkı çağrıları öğrencilere açık, erişilebilir ve ayrımcılıktan uzak biçimde duyurulur.",
              ],
              [
                "Çalışma ve kararlar",
                "Faaliyetler dönem planıyla yürütülür; öneriler kayıt altına alınır ve toplulukla paylaşılır.",
              ],
              [
                "İçerik ve sorumluluk",
                "Paylaşılan ders, etkinlik ve işletme bilgileri doğrulanabilir olmalı; kişisel veriler izinsiz yayımlanmamalıdır.",
              ],
              [
                "Güncelleme",
                "Bu taslak, yetkili kulüp organları ve danışman onayıyla resmî tüzük metnine dönüştürülür.",
              ],
            ].map(([title, content]) => (
              <details key={title} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold">
                  <span>{title}</span>
                  <span className="text-sea transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/70">
                  {content}
                </p>
              </details>
            ))}
          </div>
        </section>

        <LegalNotice />

        <section className="mt-7 grid gap-4 rounded-[20px] bg-coral/15 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-7">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.1em] text-coral">
              Teşekkürler
            </p>
            <h2 className="mt-1 font-display text-xl font-extrabold">
              Bu yol birlikte mümkün
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/75">
              Fikir aşamasından bugüne rehberliğiyle yanımızda olan danışman
              hocamıza; emeğini, bilgisini ve desteğini paylaşan öğretim
              elemanlarına, öğrencilere ve tüm destekçilerimize teşekkür ederiz.
            </p>
          </div>
          <FontAwesomeIcon
            icon={faLightbulb}
            className="hidden text-4xl text-coral sm:block"
          />
        </section>
      </div>
    </main>
  );
}
