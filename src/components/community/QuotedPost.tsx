"use client";
import UserAvatar from "@/components/bigocuk/UserAvatar";
import type { AvatarConfig } from "@/lib/bigocuk/items";
import { timeAgo, useImageUrls } from "@/lib/community";
import Link from "next/link";

/** Alıntılanan gönderinin gömülü, tıklanabilir kartı. */
export default function QuotedPost({
  id,
  authorName,
  body,
  images,
  community,
  at,
  avatar,
  unavailable = false,
  asLink = true,
}: {
  id: string | null;
  authorName?: string | null;
  body?: string | null;
  images?: string[] | null;
  community?: string | null;
  at?: string | null;
  avatar?: AvatarConfig;
  unavailable?: boolean;
  /** false: önizleme (alıntı penceresi) — tıklanınca gitmez. */
  asLink?: boolean;
}) {
  const first = images?.[0];
  const urls = useImageUrls(first ? [first] : []);
  if (unavailable || !id)
    return (
      <div className="mt-3 rounded-[18px] bg-foam px-3.5 py-3 text-sm text-ink/60 ring-1 ring-ink/10">Bu gönderi kullanılamıyor.</div>
    );
  const cls = "mt-3 block overflow-hidden rounded-[18px] ring-1 ring-ink/10 transition-colors";
  const inner = (
    <>
      <div className="px-3.5 pt-3">
        <div className="flex items-center gap-2 text-xs">
          <UserAvatar name={authorName ?? ""} avatar={avatar} size={22} />
          <b className="truncate text-sm font-extrabold">{authorName || "Öğrenci"}</b>
          <span className="shrink-0 text-ink/55">
            {community ? `${community} · ` : ""}
            {at ? timeAgo(at) : ""}
          </span>
        </div>
        {body && <p className="mt-1.5 line-clamp-4 whitespace-pre-wrap break-words text-[14px] leading-snug">{body}</p>}
      </div>
      {first &&
        (urls[first] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urls[first]} alt="Alıntılanan gönderinin fotoğrafı" loading="lazy" className="mt-2 max-h-48 w-full object-cover" />
        ) : (
          <span className="shimmer mt-2 block h-32" />
        ))}
      <div className="h-3" />
    </>
  );
  return asLink ? (
    <Link href={`/topluluk/gonderi/${id}`} onClick={(e) => e.stopPropagation()} className={`${cls} hover:bg-foam/70`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

