"use client";
import { supabaseBrowser } from "@/lib/supabase/client";
import { useUser } from "@/lib/useUser";
import {
    faChartSimple,
    faCheck,
    faCircleCheck,
    faPlus,
    faVoteYea,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useCallback, useEffect, useMemo, useState } from "react";

type Poll = {
  id: string;
  week_start: string;
  week_end: string;
  question: string;
  options: string[];
  demo?: boolean;
};
const samplePolls = [
  {
    question: "Bu dönem Bigova'da hangi etkinliği görmek istersin?",
    options: [
      "Kariyer söyleşisi",
      "Kampüs buluşması",
      "Film akşamı",
      "Kulüp tanıtım günü",
    ],
  },
  {
    question: "Kampüste öğrenciler için en önemli iyileştirme hangisi?",
    options: [
      "Daha çok çalışma alanı",
      "Ulaşım saatleri",
      "Uygun fiyatlı yemek",
      "Etkinlik çeşitliliği",
    ],
  },
  {
    question: "Ders aralarında en çok nerede vakit geçiriyorsun?",
    options: ["Kütüphane", "Kafe", "Fakülte ortak alanı", "Açık hava"],
  },
  {
    question: "Bigova'ya ilk hangi özelliği eklersin?",
    options: [
      "Ders notu",
      "Etkinlik takvimi",
      "Ulaşım bildirimi",
      "İkinci el pazarı",
    ],
  },
];
const localWeekStart = () => {
  const date = new Date();
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const localWeekEnd = (start: string) => {
  const date = new Date(`${start}T12:00:00`);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
};
const samplePollForWeek = (start: string) => {
  const weeks = Math.floor(
    (Date.parse(`${start}T12:00:00Z`) - Date.parse("2026-09-28T12:00:00Z")) /
      (7 * 86400000),
  );
  return samplePolls[
    ((weeks % samplePolls.length) + samplePolls.length) % samplePolls.length
  ];
};

export default function Anketler() {
  const { user } = useUser();
  const sb = useMemo(() => supabaseBrowser(), []);
  const weekStart = localWeekStart();
  const sample = samplePollForWeek(weekStart);
  const [poll, setPoll] = useState<Poll>({
    id: `demo-${weekStart}`,
    week_start: weekStart,
    week_end: localWeekEnd(weekStart),
    ...sample,
    demo: true,
  });
  const [counts, setCounts] = useState<number[]>(sample.options.map(() => 0));
  const [selected, setSelected] = useState<number | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isAdmin = user?.app_metadata?.role === "admin";

  const load = useCallback(async () => {
    const { data } = await sb
      .from("weekly_polls")
      .select("id,week_start,week_end,question,options")
      .eq("week_start", weekStart)
      .maybeSingle();
    if (!data) {
      const currentSample = samplePollForWeek(weekStart);
      const demo: Poll = {
        id: `demo-${weekStart}`,
        week_start: weekStart,
        week_end: localWeekEnd(weekStart),
        ...currentSample,
        demo: true,
      };
      setPoll(demo);
      setCounts(currentSample.options.map(() => 0));
      try {
        const stored = JSON.parse(
          localStorage.getItem(`bigova-demo-poll-${weekStart}`) || "null",
        );
        if (stored) {
          setSelected(stored.choice);
          setCounts(stored.counts);
        } else setSelected(null);
      } catch {
        setSelected(null);
      }
      return;
    }
    const livePoll = { ...data, options: data.options as string[] } as Poll;
    setPoll(livePoll);
    const [{ data: results }, { data: ownVote }] = await Promise.all([
      sb.rpc("get_weekly_poll_results", { p_poll_id: livePoll.id }),
      user
        ? sb.rpc("get_my_weekly_poll_vote", { p_poll_id: livePoll.id })
        : Promise.resolve({ data: null }),
    ]);
    const nextCounts = livePoll.options.map((_, index) =>
      Number(
        results?.find(
          (result: { option_index: number; vote_count: number | string }) =>
            result.option_index === index,
        )?.vote_count ?? 0,
      ),
    );
    setCounts(nextCounts);
    setSelected(ownVote ?? null);
  }, [sb, user, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  async function vote() {
    if (choice === null || selected !== null) return;
    setBusy(true);
    setMessage("");
    const nextCounts = counts.map(
      (count, index) => count + (index === choice ? 1 : 0),
    );
    if (poll.demo) {
      setCounts(nextCounts);
      setSelected(choice);
      try {
        localStorage.setItem(
          `bigova-demo-poll-${weekStart}`,
          JSON.stringify({ choice, counts: nextCounts }),
        );
      } catch {}
      setMessage("Oyun bu tarayıcıda, bu hafta için kaydedildi.");
      setBusy(false);
      return;
    }
    if (!user) {
      setMessage(
        "Yayımlanmış haftalık oya katılmak için doğrulanmış öğrenci hesabıyla giriş yapmalısın.",
      );
      setBusy(false);
      return;
    }
    const { error } = await sb
      .from("poll_votes")
      .insert({ poll_id: poll.id, option_index: choice });
    setBusy(false);
    if (error)
      setMessage(
        error.code === "23505"
          ? "Bu hafta zaten oy kullandın."
          : "Oyun kaydedilemedi.",
      );
    else {
      setMessage("Oyun kaydedildi. Bu hafta yeniden oy kullanamazsın.");
      await load();
    }
  }

  async function publishPoll(e: React.FormEvent) {
    e.preventDefault();
    const options = optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
    if (!question.trim() || options.length < 2 || options.length > 8)
      return setMessage("Soru ve 2–8 seçenek gerekli.");
    setBusy(true);
    setMessage("");
    const { error } = await sb
      .from("weekly_polls")
      .insert({
        week_start: weekStart,
        week_end: localWeekEnd(weekStart),
        question: question.trim(),
        options,
      });
    setBusy(false);
    if (error)
      setMessage(
        "Anket yayımlanamadı. Yönetici rolünü ve anket tabloları migration'ını kontrol et.",
      );
    else {
      setQuestion("");
      setOptionsText("");
      setMessage("Bu haftanın anketi yayımlandı.");
      await load();
    }
  }

  const total = counts.reduce((sum, value) => sum + value, 0);
  return (
    <main className="pb-10">
      <header className="rounded-b-[24px] bg-sea px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-lg">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15">
            <FontAwesomeIcon icon={faVoteYea} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              Haftanın anketi
            </h1>
            <p className="text-sm text-white/75">
              Her hafta yeni soru · kişi başı bir oy
            </p>
          </div>
        </div>
      </header>
      <section className="px-5 pt-5">
        <div className="rounded-[20px] bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-tide/20 px-3 py-1 text-xs font-bold text-sea">
              {poll.demo ? "Demo anket" : "Bu haftanın anketi"}
            </span>
            <span className="text-xs text-ink/55">
              {new Date(`${poll.week_start}T12:00:00`).toLocaleDateString(
                "tr-TR",
                { day: "numeric", month: "short" },
              )}{" "}
              –{" "}
              {new Date(`${poll.week_end}T12:00:00`).toLocaleDateString(
                "tr-TR",
                { day: "numeric", month: "short" },
              )}
            </span>
          </div>
          <h2 className="mt-4 font-display text-xl font-extrabold">
            {poll.question}
          </h2>
          <div className="mt-4 grid gap-2">
            {poll.options.map((option, index) => {
              const percent = total
                ? Math.round((counts[index] / total) * 100)
                : 0;
              return (
                <button
                  key={`${poll.id}-${index}`}
                  disabled={selected !== null}
                  onClick={() => setChoice(index)}
                  aria-pressed={choice === index || selected === index}
                  className={`relative flex min-h-12 items-center justify-between overflow-hidden rounded-xl border px-4 py-3 text-left text-sm font-bold ${choice === index || selected === index ? "border-sea bg-sea/5 text-ink" : "border-ink/10 bg-foam text-ink"}`}
                >
                  {selected !== null && (
                    <span
                      className="absolute inset-y-0 left-0 bg-tide/20 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  )}
                  <span className="relative z-10">{option}</span>
                  <span className="relative z-10 flex items-center gap-2 text-xs text-ink/60">
                    {selected !== null && `${percent}% · ${counts[index]}`}{" "}
                    {(choice === index || selected === index) && (
                      <FontAwesomeIcon icon={faCheck} className="text-sea" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {selected === null && (
            <button
              onClick={vote}
              disabled={choice === null || busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-sea px-4 py-3 font-bold text-white disabled:opacity-45"
            >
              <FontAwesomeIcon icon={faCircleCheck} />{" "}
              {busy ? "Kaydediliyor…" : "Oyumu gönder"}
            </button>
          )}
          {selected !== null && (
            <p className="mt-4 text-sm font-bold text-sea">
              <FontAwesomeIcon icon={faChartSimple} className="mr-2" />
              {message || `Toplam ${total} oy`}
            </p>
          )}
          {poll.demo && (
            <p className="mt-3 text-xs leading-relaxed text-ink/55">
              Demo oyları yalnızca bu tarayıcıda sayılır; yayımlanan gerçek
              anketlerde her öğrenci hesabı haftada bir oy kullanabilir.
            </p>
          )}
        </div>
        {message && selected === null && (
          <p role="status" className="mt-3 text-sm font-bold text-coral">
            {message}
          </p>
        )}
        {isAdmin && poll.demo && (
          <form
            onSubmit={publishPoll}
            className="mt-6 grid gap-3 border-t border-ink/10 pt-5"
          >
            <h2 className="font-display text-lg font-extrabold">
              <FontAwesomeIcon icon={faPlus} className="mr-2" />
              Yeni haftalık anket yayımla
            </h2>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={240}
              placeholder="Anket sorusu"
              className="rounded-xl bg-card p-3 outline-none focus:ring-2 focus:ring-tide"
            />
            <textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              rows={4}
              placeholder={"Her seçeneği yeni satıra yaz\n2–8 seçenek"}
              className="rounded-xl bg-card p-3 outline-none focus:ring-2 focus:ring-tide"
            />
            <button
              disabled={busy}
              className="rounded-xl bg-sea px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              Bu hafta için yayımla
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
