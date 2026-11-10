"use client";

// Đếm hoạt động học trong ngày (cho "Kế hoạch hôm nay") và theo từng ngày (cho lịch heatmap)
import { load, save, todayKey } from "./storage";
import { recordStudyDay } from "./sync";

export type ActivityKind = "review" | "grammarQuiz" | "kanjiQuiz" | "chat" | "listen";
export type DailyActivity = { date: string } & Record<ActivityKind, number>;

const DAILY_KEY = "nihongo.dailyActivity";
const COUNT_KEY = "nihongo.activityCount"; // { "YYYY-MM-DD": số lượt học }

const empty = (): DailyActivity => ({ date: todayKey(), review: 0, grammarQuiz: 0, kanjiQuiz: 0, chat: 0, listen: 0 });

export function getDailyActivity(): DailyActivity {
  const d = load<DailyActivity | null>(DAILY_KEY, null);
  return d && d.date === todayKey() ? { ...empty(), ...d } : empty();
}

export function getActivityCounts(): Record<string, number> {
  return load<Record<string, number>>(COUNT_KEY, {});
}

/** Ghi nhận 1 lượt học: tăng bộ đếm hôm nay + đánh dấu ngày học (đồng bộ server) */
export function bumpActivity(kind: ActivityKind, n = 1) {
  const d = getDailyActivity();
  d[kind] += n;
  save(DAILY_KEY, d);
  const counts = getActivityCounts();
  counts[todayKey()] = (counts[todayKey()] ?? 0) + n;
  // chỉ giữ ~1 năm
  const keys = Object.keys(counts).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete counts[k];
  save(COUNT_KEY, counts);
  recordStudyDay();
  window.dispatchEvent(new Event("nihongo:activity"));
}
