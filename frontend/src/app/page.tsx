"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { Card, ProgressBar } from "@/components/ui";
import { useStats, useVocab } from "@/lib/data";
import { getDaily, loadSrs, newPerDay, statusOf, type SrsStore } from "@/lib/srs";
import { getStreak } from "@/lib/storage";
import { GRAMMAR } from "@/lib/grammar";

const greetings = ["おはよう！", "こんにちは！", "がんばって！", "今日も一緒に！"];

export default function Home() {
  const { level } = useLevel();
  const vocab = useVocab(level);
  const stats = useStats();
  const [srs, setSrs] = useState<SrsStore>({});
  const [streak, setStreak] = useState(0);
  const [daily, setDaily] = useState({ newCount: 0, reviews: 0 });
  const [greet, setGreet] = useState(greetings[1]);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setSrs(loadSrs());
      setStreak(getStreak());
    };
    window.addEventListener("nihongo:synced", refresh);
    setNow(Date.now());
    refresh();
    setDaily(getDaily());
    const h = new Date().getHours();
    setGreet(h < 11 ? greetings[0] : greetings[1]);
    return () => window.removeEventListener("nihongo:synced", refresh);
  }, []);

  const levelCards = vocab?.map((v) => srs[v.id]) ?? [];
  const learned = levelCards.filter((c) => c && c.reps > 0).length;
  const mastered = levelCards.filter((c) => statusOf(c) === "mastered").length;
  const due = now ? levelCards.filter((c) => c && c.due <= now).length : 0;
  const newLeft = now ? Math.max(0, newPerDay() - daily.newCount) : 0;
  const total = vocab?.length ?? stats?.vocab[level] ?? 0;

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
          {due > 0 ? ` · ${due} từ cần ôn tập` : ""} · {newLeft} từ mới còn lại hôm nay
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/vocab/study" className="rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-primary shadow-sm transition hover:opacity-90">
            {due > 0 ? `Ôn tập ${due} từ` : "Học từ mới"} →
          </Link>
          <Link href="/chat" className="rounded-xl border border-white/30 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
            Luyện nói với AI
          </Link>
        </div>
      </section>

      {/* Thống kê */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Chuỗi ngày học", value: streak, unit: "ngày", tone: "text-accent" },
          { label: "Đã học", value: learned, unit: `/ ${total} từ`, tone: "text-primary" },
          { label: "Thành thạo", value: mastered, unit: "từ", tone: "text-success" },
          { label: "Ôn hôm nay", value: daily.reviews, unit: "lượt", tone: "text-warn" },
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

      {/* Module học */}
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          { href: "/vocab", icon: "語", title: "Từ vựng", desc: `${stats?.vocab[level] ?? "…"} từ · flashcard & ôn tập ngắt quãng`, color: "bg-primary-soft text-primary" },
          { href: "/kanji", icon: "字", title: "Kanji", desc: `${stats?.kanji[level] ?? "…"} chữ · âm Hán Việt, thứ tự nét`, color: "bg-accent-soft text-accent" },
          { href: "/grammar", icon: "文", title: "Ngữ pháp", desc: GRAMMAR[level] ? `${GRAMMAR[level].length} mẫu câu · bài tập trắc nghiệm` : "Đang bổ sung cho cấp này", color: "bg-success-soft text-success" },
          { href: "/chat", icon: "話", title: "Hội thoại AI", desc: "Nói chuyện bằng giọng nói, AI sửa lỗi", color: "bg-warn-soft text-warn" },
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
