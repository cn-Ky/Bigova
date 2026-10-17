"use client";
import { splitLinks } from "@/lib/chatUtils";
import { HASHTAG_RE } from "@/lib/community";
import Link from "next/link";

/** Düz metni gösterir: yalnızca http/https bağlantıları ve #etiketler tıklanabilir. */
export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {splitLinks(text).map((p, i) =>
        p.href ? (
          <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="font-bold text-sea underline decoration-tide decoration-2 underline-offset-2">
            {p.text}
          </a>
        ) : (
          <Tags key={i} text={p.text} />
        ),
      )}
    </p>
  );
}

/** Metindeki #etiketleri, akışta o etiketi arayan bağlantıya çevirir. */
function Tags({ text }: { text: string }) {
  return (
    <>
      {text.split(HASHTAG_RE).map((part, i) =>
        i % 2 === 1 ? (
          <Link key={i} href={`/bigola/kesfet?q=${encodeURIComponent(part)}`} className="font-bold text-sea hover:underline">
            {part}
          </Link>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
