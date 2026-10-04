"use client";
import {
  CONTROLLER,
  LEGAL_DOCS,
  LEGAL_UPDATED,
  LEGAL_VERSION,
  type Block,
} from "@/lib/legalContent";
import { faScaleBalanced, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Fragment, useEffect, useState } from "react";

/** {{alan}} biçimindeki yer tutucuları CONTROLLER değeriyle değiştirir; boşsa rozet gösterir. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\{\{\w+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{(\w+)\}\}$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const value = (CONTROLLER as Record<string, string>)[m[1]];
        return value ? (
          <b key={i} className="font-bold text-ink">{value}</b>
        ) : (
          <span key={i} className="whitespace-nowrap rounded-full bg-sun/30 px-2 py-0.5 text-xs font-bold text-deep">
            Onay sonrası eklenecek
          </span>
        );
      })}
    </>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-ink/75">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h":
            return <h4 key={i} className="pt-3 font-display text-base font-extrabold text-ink">{b.text}</h4>;
          case "p":
            return <p key={i}><Rich text={b.text} /></p>;
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-tide">
                {b.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-sea">
                {b.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}
              </ol>
            );
          case "note":
            return (
              <p key={i} className="border-l-2 border-tide pl-3 text-ink/65"><Rich text={b.text} /></p>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl ring-1 ring-ink/10">
                <table className="w-full min-w-[34rem] border-collapse text-left text-[13px]">
                  <thead className="bg-foam text-ink">
                    <tr>
                      {b.head.map((h) => <th key={h} scope="col" className="px-3 py-2 font-extrabold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {b.rows.map((row, r) => (
                      <tr key={r} className="align-top">
                        {row.map((cell, c) => (
                          <td key={c} className={`px-3 py-2 ${c === 0 ? "font-bold text-ink" : ""}`}><Rich text={cell} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}

export default function LegalNotice() {
  const [open, setOpen] = useState<string | null>(null);

  // #aydinlatma gibi bir bağlantıyla gelinirse ilgili bölümü aç ve oraya kaydır
  useEffect(() => {
    const sync = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!LEGAL_DOCS.some((d) => `yasal-${d.id}` === id)) return;
      setOpen(id.replace(/^yasal-/, ""));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section id="yasal" className="scroll-mt-4 border-b border-ink/10 py-8" aria-labelledby="legal-title">
      <div className="flex flex-wrap items-center gap-2">
        <FontAwesomeIcon icon={faShieldHalved} className="text-sea" />
        <span className="rounded-full bg-sun/30 px-3 py-1 text-xs font-bold text-deep">{LEGAL_VERSION}</span>
        <span className="text-xs text-ink/55">Son güncelleme: {LEGAL_UPDATED}</span>
      </div>
      <h2 id="legal-title" className="mt-3 font-display text-2xl font-extrabold">Yasal bilgilendirme</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/70">
        Bigova'yı kullanırken hangi verilerin işlendiğini, hangi mevzuata dayandığımızı ve haklarınızın neler olduğunu burada
        açıkça anlatıyoruz. Başlıklara dokunarak ilgili metni açabilirsiniz.
      </p>

      <nav aria-label="Yasal metinler" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {LEGAL_DOCS.map((d) => (
          <a
            key={d.id}
            href={`#yasal-${d.id}`}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${open === d.id ? "bg-sea text-white" : "bg-card text-ink"}`}
          >
            {d.title.split(" ve ")[0]}
          </a>
        ))}
      </nav>

      <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">
        {LEGAL_DOCS.map((d, i) => (
          <details
            key={d.id}
            id={`yasal-${d.id}`}
            open={open === d.id}
            onToggle={(e) => {
              const isOpen = (e.currentTarget as HTMLDetailsElement).open;
              setOpen((cur) => (isOpen ? d.id : cur === d.id ? null : cur));
            }}
            className="group scroll-mt-4 py-4"
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-xs font-bold text-sea">
                  <FontAwesomeIcon icon={faScaleBalanced} />
                  {String(i + 1).padStart(2, "0")} / {String(LEGAL_DOCS.length).padStart(2, "0")}
                </span>
                <span className="mt-1 block font-bold">{d.title}</span>
                <span className="mt-0.5 block text-sm font-normal text-ink/60">{d.summary}</span>
              </span>
              <span className="mt-1 shrink-0 text-xl text-sea transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 max-w-3xl rounded-lg bg-foam px-3 py-2 text-xs font-bold text-ink/65">Dayanak: {d.law}</p>
            <Blocks blocks={d.blocks} />
          </details>
        ))}
      </div>

      <p className="mt-4 max-w-3xl border-l-2 border-tide pl-3 text-sm leading-relaxed text-ink/60">
        Bu metinler bilgilendirme amaçlıdır ve hukuki danışmanlık yerine geçmez. Haklarınızı kullanmak veya soru sormak için
        yukarıdaki iletişim bilgilerini kullanabilirsiniz.
      </p>
    </section>
  );
}
