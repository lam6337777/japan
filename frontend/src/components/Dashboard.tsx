"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, ProgressBar } from "@/components/ui";
import { getActivityCounts, getDailyActivity, type DailyActivity } from "@/lib/activity";
import { load } from "@/lib/storage";

function useActivity() {
  const [daily, setDaily] = useState<DailyActivity | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    const refresh = () => {
      setDaily(getDailyActivity());
      // ngày học đồng bộ từ server (không có số lượt) → tính tối thiểu 1
      const c = { ...getActivityCounts() };
      for (const d of load<string[]>("nihongo.activity", [])) c[d] ??= 1;
      setCounts(c);
    };
    refresh();
    window.addEventListener("nihongo:activity", refresh);
    window.addEventListener("nihongo:synced", refresh);
    return () => {
      window.removeEventListener("nihongo:activity", refresh);
      window.removeEventListener("nihongo:synced", refresh);
    };
  }, []);
  return { daily, counts };
}

// ---------------- Kế hoạch hôm nay ----------------
export function DailyPlan({ flashcardTarget }: { flashcardTarget: number }) {
  const { daily } = useActivity();
  if (!daily) return null;

  const tasks = [
    { href: "/vocab/study", icon: "語", title: "Flashcard từ vựng", value: daily.review, target: flashcardTarget, unit: "lượt" },
    { href: "/grammar/quiz", icon: "文", title: "Bài tập ngữ pháp", value: daily.grammarQuiz, target: 1, unit: "bài" },
    { href: "/kanji/quiz", icon: "字", title: "Kiểm tra kanji", value: daily.kanjiQuiz, target: 1, unit: "bài" },
    { href: "/listen", icon: "聴", title: "Nghe & Nói", value: daily.listen, target: 5, unit: "câu" },
    { href: "/chat", icon: "話", title: "Trò chuyện với AI", value: daily.chat, target: 5, unit: "tin nhắn" },
  ];
  const doneCount = tasks.filter((t) => t.value >= t.target).length;
  const allDone = doneCount === tasks.length;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Kế hoạch hôm nay</h2>
        <span className={`text-sm font-medium ${allDone ? "text-success" : "text-muted"}`}>
          {allDone ? "🎉 Hoàn thành!" : `${doneCount}/${tasks.length} nhiệm vụ`}
        </span>
      </div>
      <ProgressBar value={doneCount} max={tasks.length} color="bg-success" />
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {tasks.map((t) => {
          const done = t.value >= t.target;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:border-primary ${done ? "border-success/40 bg-success-soft" : "border-line bg-surface"}`}
              >
                <span className={`jp flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${done ? "bg-success text-white" : "bg-surface-2"}`}>
                  {done ? "✓" : t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${done ? "text-success" : ""}`}>{t.title}</span>
                  <span className="block text-xs text-muted">
                    {Math.min(t.value, t.target)}/{t.target} {t.unit}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------- Lịch heatmap ----------------
const WEEKS = 18;
const key = (d: Date) => d.toLocaleDateString("sv-SE");

export function Heatmap() {
  const { counts } = useActivity();
  const [days, setDays] = useState<Date[]>([]);

  useEffect(() => {
    // Bắt đầu từ thứ Hai của tuần cách đây WEEKS-1 tuần
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (WEEKS - 1) * 7);
    const list: Date[] = [];
    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) list.push(new Date(d));
    setDays(list);
  }, []);

  if (!days.length) return null;

  const studied = days.filter((d) => counts[key(d)]).length;
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = counts[key(d)] ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const level = (n: number) => (n <= 0 ? "bg-surface-2" : n < 10 ? "bg-success/30" : n < 30 ? "bg-success/60" : "bg-success");
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Lịch học</h2>
        <span className="text-xs text-muted">
          {studied} ngày học trong {WEEKS} tuần · chuỗi dài nhất {best} ngày
        </span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex w-max gap-[3px]">
          <div className="mr-1 flex flex-col gap-[3px] text-[10px] leading-3 text-muted">
            {["T2", "", "T4", "", "T6", "", "CN"].map((l, i) => (
              <span key={i} className="h-3">{l}</span>
            ))}
          </div>
          {weeks.map((w, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {w.map((d) => {
                const n = counts[key(d)] ?? 0;
                return <span key={key(d)} className={`h-3 w-3 rounded-[3px] ${level(n)}`} title={`${d.toLocaleDateString("vi-VN")}: ${n} lượt học`} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        Ít
        {[0, 5, 15, 40].map((n) => (
          <span key={n} className={`h-3 w-3 rounded-[3px] ${level(n)}`} />
        ))}
        Nhiều
      </div>
    </Card>
  );
}
