"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { DailyPlan, Heatmap } from "@/components/Dashboard";
import { Card, ProgressBar } from "@/components/ui";
import { useStats, useVocab } from "@/lib/data";
import { loadSrs, newPerDay, type SrsStore } from "@/lib/srs";
import { getStreak } from "@/lib/storage";
import { getDailyActivity } from "@/lib/activity";
import { loadSeen, useStars } from "@/lib/stars";
import { GRAMMAR } from "@/lib/grammar";

const greetings = ["おはよう！", "こんにちは！", "がんばって！", "今日も一緒に！"];

export default function Home() {
  const { level } = useLevel();
  const vocab = useVocab(level);
  const stats = useStats();
  const [srs, setSrs] = useState<SrsStore>({});
  const [streak, setStreak] = useState(0);
  const [greet, setGreet] = useState(greetings[1]);
  const [now, setNow] = useState(0);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const stars = useStars();
  const [activityReview, setActivityReview] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setSrs(loadSrs());
      setStreak(getStreak());
      setSeen(loadSeen());
    };
    window.addEventListener("nihongo:synced", refresh);
    setNow(Date.now());
    refresh();
    setActivityReview(getDailyActivity().review);
    const h = new Date().getHours();
    setGreet(h < 11 ? greetings[0] : greetings[1]);
    return () => window.removeEventListener("nihongo:synced", refresh);
  }, []);

  // "Đã học" = đã xem trong flashcard hoặc đã ôn bằng chế độ ngắt quãng
  const learned = vocab?.filter((v) => seen.has(v.id) || (srs[v.id]?.reps ?? 0) > 0).length ?? 0;
  const starredCount = vocab?.filter((v) => stars.has(v.id)).length ?? 0;
  const total = vocab?.length ?? stats?.vocab[level] ?? 0;
  const newPerDayValue = now ? newPerDay() : 10;
  const newSeenToday = activityReview;

  return (
    <div className="flex flex-col gap-6">
      {/* Lời chào */}
      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-ink md:px-8">
        <span className="jp pointer-events-none absolute -right-4 -top-8 select-none text-[9rem] font-bold leading-none opacity-10">
          学
        </span>
        <p className="jp text-sm opacity-80">{greet}</p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">Hôm nay học gì nào?</h1>
        <p className="mt-2 max-w-md text-sm opacity-85">
          Trình độ hiện tại <b>{level.toUpperCase()}</b>
          · Đã học {learned}/{total} từ{starredCount ? ` · ${starredCount} từ có sao` : ""}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/vocab/study" className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:opacity-90">
            Học flashcard →
          </Link>
          {starredCount > 0 && (
            <Link href="/vocab/study?starred=1" className="rounded-xl bg-warn px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              ★ Ôn {starredCount} từ có sao
            </Link>
          )}
          <Link href="/chat" className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
            Luyện nói với AI
          </Link>
        </div>
      </section>

      <DailyPlan flashcardTarget={Math.max(10, newPerDayValue)} />

      {/* Thống kê */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Chuỗi ngày học", value: streak, unit: "ngày", tone: "text-accent" },
          { label: "Đã học", value: learned, unit: `/ ${total} từ`, tone: "text-primary" },
          { label: "Từ có sao", value: starredCount, unit: "từ", tone: "text-warn" },
          { label: "Hôm nay", value: newSeenToday, unit: "thẻ", tone: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className="mt-1">
              <span className={`text-2xl font-bold ${s.tone}`}>{s.value}</span>{" "}
              <span className="text-xs text-muted">{s.unit}</span>
            </p>
          </Card>
        ))}
      </section>

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Tiến độ từ vựng {level.toUpperCase()}</span>
          <span className="text-muted">{total ? Math.round((learned / total) * 100) : 0}%</span>
        </div>
        <ProgressBar value={learned} max={total} />
      </Card>

      <Heatmap />

      {/* Module học */}
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/vocab", icon: "語", title: "Từ vựng", desc: `${stats?.vocab[level] ?? "…"} từ · flashcard & ôn tập ngắt quãng`, color: "bg-primary-soft text-primary" },
          { href: "/kanji", icon: "字", title: "Kanji", desc: `${stats?.kanji[level] ?? "…"} chữ · âm Hán Việt, thứ tự nét`, color: "bg-accent-soft text-accent" },
          { href: "/grammar", icon: "文", title: "Ngữ pháp", desc: GRAMMAR[level] ? `${GRAMMAR[level].length} mẫu câu · bài tập trắc nghiệm` : "Đang bổ sung cho cấp này", color: "bg-success-soft text-success" },
          { href: "/chat", icon: "話", title: "Hội thoại AI", desc: "Nói chuyện bằng giọng nói, AI sửa lỗi", color: "bg-warn-soft text-warn" },
          { href: "/listen", icon: "聴", title: "Nghe & Nói", desc: "Shadowing và chép chính tả, chấm điểm", color: "bg-primary-soft text-primary" },
          { href: "/mistakes", icon: "帳", title: "Sổ lỗi sai", desc: "Ôn lại câu sai trong bài tập và khi chat", color: "bg-accent-soft text-accent" },
        ].map((m) => (
          <Link key={m.href} href={m.href} className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className={`jp flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${m.color}`}>{m.icon}</span>
            <span className="min-w-0">
              <span className="block font-semibold">{m.title}</span>
              <span className="block text-sm text-muted">{m.desc}</span>
            </span>
            <span className="ml-auto text-muted transition group-hover:translate-x-1 group-hover:text-ink">→</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
