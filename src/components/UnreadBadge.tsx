"use client";
import { useUnread } from "@/components/NotificationProvider";

/** Okunmamış mesaj sayısı rozeti. friendId verilirse yalnızca o sohbetin sayısı. */
export default function UnreadBadge({ friendId, className = "" }: { friendId?: string; className?: string }) {
  const { total, byFriend } = useUnread();
  const n = friendId ? (byFriend[friendId] ?? 0) : total;
  if (n <= 0) return null;
  return (
    <span className={`unread-badge ${className}`} role="status" aria-label={`${n} okunmamış mesaj`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}
