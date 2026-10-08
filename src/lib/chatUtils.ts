/** Sohbet ekranı için saf yardımcılar (gün ayracı, mesaj gruplama, bağlantı ayrıştırma). */

export type ChatMessage = {
  id: string;
  from_id: string;
  to_id: string;
  body: string;
  created_at: string;
  /** Yalnızca bu cihazdaki gönderilmemiş/gönderilemeyen mesajlarda dolu */
  status?: "pending" | "failed";
};

export type TimelineItem =
  | { type: "day"; key: string; label: string }
  | {
      type: "msg";
      key: string;
      message: ChatMessage;
      mine: boolean;
      /** Aynı kişinin ardışık mesaj grubunda ilk / son mesaj */
      first: boolean;
      last: boolean;
    };

/** Aynı kişiden bu süre içinde gelen mesajlar tek grupta toplanır. */
const GROUP_GAP_MS = 5 * 60 * 1000;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000,
  );
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Dün";
  return d.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: diff < 7 ? "long" : undefined,
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export const fullStamp = (iso: string) =>
  new Date(iso).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });

/** Mesajları gün ayraçları ve gruplama bilgisiyle düz bir zaman çizelgesine çevirir. */
export function buildTimeline(messages: ChatMessage[], selfId: string): TimelineItem[] {
  const out: TimelineItem[] = [];
  let prev: ChatMessage | null = null;
  messages.forEach((m, i) => {
    const d = new Date(m.created_at);
    const newDay = !prev || dayKey(new Date(prev.created_at)) !== dayKey(d);
    if (newDay) out.push({ type: "day", key: `day-${dayKey(d)}`, label: dayLabel(m.created_at) });
    const next = messages[i + 1];
    const joinsPrev =
      !!prev &&
      !newDay &&
      prev.from_id === m.from_id &&
      d.getTime() - new Date(prev.created_at).getTime() < GROUP_GAP_MS;
    const joinsNext =
      !!next &&
      next.from_id === m.from_id &&
      dayKey(new Date(next.created_at)) === dayKey(d) &&
      new Date(next.created_at).getTime() - d.getTime() < GROUP_GAP_MS;
    out.push({
      type: "msg",
      key: m.id,
      message: m,
      mine: m.from_id === selfId,
      first: !joinsPrev,
      last: !joinsNext,
    });
    prev = m;
  });
  return out;
}

/** Metni düz parça / http(s) bağlantısı parçalarına böler (yalnızca http ve https). */
export function splitLinks(text: string): { text: string; href?: string }[] {
  const re = /(https?:\/\/[^\s<>]+[^\s<>.,;:!?)"'])/g;
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    parts.push({ text: m[0], href: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
