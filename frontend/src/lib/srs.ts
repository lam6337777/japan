"use client";

import { getSettings } from "./settings";
import { load, save, todayKey } from "./storage";
import { flushCards, queueCard, recordStudyDay } from "./sync";

// Thuật toán lặp lại ngắt quãng (biến thể đơn giản của SM-2)
export type CardState = {
  ease: number; // hệ số dễ (≥ 1.3)
  interval: number; // số ngày đến lần ôn tiếp
  due: number; // timestamp (ms)
  reps: number; // số lần nhớ liên tiếp
  lapses: number; // số lần quên
  updatedAt?: number; // lần sửa cuối (ms) — dùng khi đồng bộ với server
};

export type Grade = 0 | 1 | 2 | 3; // Quên · Khó · Nhớ · Dễ

const SRS_KEY = "nihongo.srs.v1";
const DAILY_KEY = "nihongo.daily";
const DAY = 86_400_000;
export const newPerDay = () => getSettings().newPerDay;

export type SrsStore = Record<string, CardState>;

export const loadSrs = () => load<SrsStore>(SRS_KEY, {});

export function nextState(card: CardState | undefined, grade: Grade, now = Date.now()): CardState {
  const c: CardState = card ?? { ease: 2.5, interval: 0, due: now, reps: 0, lapses: 0 };
  const { reps, lapses } = c;
  let { ease, interval } = c;

  if (grade === 0) {
    return { ease: Math.max(1.3, ease - 0.2), interval: 0, due: now + 60_000, reps: 0, lapses: lapses + 1, updatedAt: now };
  }
  if (grade === 1) {
    interval = Math.max(1, interval * 1.2);
    ease = Math.max(1.3, ease - 0.15);
  } else if (grade === 2) {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : interval * ease;
  } else {
    interval = reps === 0 ? 4 : interval * ease * 1.3;
    ease += 0.15;
  }
  interval = Math.round(interval * 10) / 10;
  return { ease, interval, due: now + interval * DAY, reps: reps + 1, lapses, updatedAt: now };
}

export function describeInterval(card: CardState | undefined, grade: Grade): string {
  const s = nextState(card, grade, 0);
  if (s.interval === 0) return "1 phút";
  if (s.interval < 30) return `${Math.round(s.interval)} ngày`;
  if (s.interval < 365) return `${Math.round(s.interval / 30)} tháng`;
  return `${(s.interval / 365).toFixed(1)} năm`;
}

export function review(id: string, grade: Grade, isNew: boolean) {
  const store = loadSrs();
  store[id] = nextState(store[id], grade);
  save(SRS_KEY, store);
  const daily = getDaily();
  save(DAILY_KEY, { ...daily, reviews: daily.reviews + 1, newCount: daily.newCount + (isNew ? 1 : 0) });
  recordStudyDay();
  queueCard(id);
  flushCards();
}

export function getDaily(): { date: string; newCount: number; reviews: number } {
  const d = load(DAILY_KEY, { date: "", newCount: 0, reviews: 0 });
  return d.date === todayKey() ? d : { date: todayKey(), newCount: 0, reviews: 0 };
}

export type Status = "new" | "learning" | "mastered";
export function statusOf(card: CardState | undefined): Status {
  if (!card || card.reps === 0) return card ? "learning" : "new";
  return card.interval >= 21 ? "mastered" : "learning";
}
