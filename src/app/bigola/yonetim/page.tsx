"use client";
import { BigolaSubPage } from "@/components/community/BigolaLayout";
import { BackHeader, NeedLogin, Notice, Skeleton } from "@/components/community/CommunityHeader";
import { REPORT_REASONS, errText, rpc, timeAgo, type AdminReport } from "@/lib/community";
import { useUser } from "@/lib/useUser";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { EmptyState, SPRING } from "@/components/community/ui";

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;
const typeLabel = { post: "Gönderi", comment: "Yorum", message: "Forum mesajı" } as const;

/** Yalnızca uygulama yöneticileri: şikâyet kuyruğu. İçeriği kaldır ya da şikâyetleri reddet. */
export default function Yonetim() {
  const { user } = useUser();
  const [list, setList] = useState<AdminReport[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(async () => {
    try { setList((await rpc<AdminReport[]>("community_admin_reports")) ?? []); setErr(""); } catch (e) { setErr(errText(e)); setList([]); }
  }, []);
  useEffect(() => { if (user) void load(); }, [user, load]);
  const resolve = async (r: AdminReport, action: "remove" | "dismiss") => {
    if (action === "remove" && !window.confirm("İçerik kalıcı olarak kaldırılsın mı?")) return;
    setBusy(r.target_id);
    try { await rpc("community_admin_resolve", { p_type: r.target_type, p_id: r.target_id, p_action: action }); await load(); } catch (e) { setErr(errText(e)); } finally { setBusy(""); }
  };
  if (user === undefined) return <main className="p-5"><Skeleton n={2} /></main>;
  if (!user) return <NeedLogin what="Bu sayfayı görmek" />;
  return (
    <BigolaSubPage header={<BackHeader title="Şikâyet kuyruğu" subtitle="Yönetici" fallback="/bigola" />}>
        {err && <Notice text={err} />}
        {list === null ? <Skeleton /> : list.length === 0 && !err ? (
          <EmptyState><p className="text-sm text-ink/70">Bekleyen şikâyet yok. 🎉</p></EmptyState>
        ) : (
          <ul className="grid gap-3">
            <AnimatePresence initial={false}>
            {list.map((r) => (
              <motion.li key={`${r.target_type}-${r.target_id}`} layout="position" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={SPRING} className="rounded-[24px] bg-card p-4 shadow-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-sky px-2.5 py-1 font-extrabold text-deep">{typeLabel[r.target_type]}</span>
                  <span className="rounded-full bg-coral/30 px-2.5 py-1 font-extrabold">{r.report_count} şikâyet</span>
                  {r.hidden && <span className="rounded-full bg-sun px-2.5 py-1 font-extrabold text-deep">Gizlendi</span>}
                  <span className="text-ink/55">{r.place} · {timeAgo(r.first_at)}</span>
                </p>
                <p className="mt-2 text-xs font-bold text-ink/65">Yazan: {r.author_name || "Öğrenci"} · Nedenler: {r.reasons.map(reasonLabel).join(", ")}</p>
                <p className="mt-2 whitespace-pre-wrap break-words rounded-xl bg-foam p-3 text-sm">{r.preview || "(metin yok)"}</p>
                {r.note && <p className="mt-2 text-xs text-ink/65">Not: {r.note}</p>}
                <div className="mt-3 flex gap-2">
                  <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={busy === r.target_id} onClick={() => resolve(r, "remove")} className="rounded-full bg-coral px-4 py-2 text-sm font-bold text-deep disabled:opacity-60">Kaldır</motion.button>
                  <motion.button whileTap={{ scale: 0.92 }} type="button" disabled={busy === r.target_id} onClick={() => resolve(r, "dismiss")} className="rounded-full bg-foam px-4 py-2 text-sm font-bold transition-colors hover:bg-tide/20 disabled:opacity-60">Şikâyetleri reddet</motion.button>
                </div>
              </motion.li>
            ))}
            </AnimatePresence>
          </ul>
        )}
    </BigolaSubPage>
  );
}
