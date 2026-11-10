"use client";

// Đồng bộ tiến độ học giữa trình duyệt (localStorage) và backend.
// - Học offline / chưa đăng nhập vẫn chạy bình thường, dữ liệu nằm trong máy.
// - Khi đăng nhập: gộp dữ liệu 2 bên (bản nào sửa sau thì thắng) rồi đẩy phần còn thiếu lên server.

import { api, getToken } from "./api";
import { load, markStudiedToday, save, todayKey } from "./storage";
import type { CardState, SrsStore } from "./srs";

const SRS_KEY = "nihongo.srs.v1";
const ACTIVITY_KEY = "nihongo.activity";
const PENDING_KEY = "nihongo.pending";

type ServerCard = { itemId: string; ease: number; interval: number; due: number; reps: number; lapses: number; updatedAt: number };

export function queueCard(id: string) {
  const pending = new Set(load<string[]>(PENDING_KEY, []));
  pending.add(id);
  save(PENDING_KEY, [...pending]);
}

let flushing: Promise<void> | null = null;

/** Đẩy các thẻ đang chờ lên server (bỏ qua nếu chưa đăng nhập / mất mạng) */
export function flushCards(): Promise<void> {
  if (!getToken()) return Promise.resolve();
  flushing ??= (async () => {
    try {
      const store = load<SrsStore>(SRS_KEY, {});
      const ids = load<string[]>(PENDING_KEY, []);
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const cards = chunk.filter((id) => store[id]).map((id) => toServer(id, store[id]));
        if (cards.length) await api("/progress/cards", { method: "PUT", body: { cards } });
        const sent = new Set(chunk);
        save(PENDING_KEY, load<string[]>(PENDING_KEY, []).filter((id) => !sent.has(id)));
      }
    } catch {
      /* thử lại ở lần sau */
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Ghi nhận hôm nay có học (local + server) */
export function recordStudyDay() {
  markStudiedToday();
  if (getToken()) api("/progress/study-days", { body: { day: todayKey() } }).catch(() => {});
}

/** Gộp dữ liệu sau khi đăng nhập / mở app */
export async function syncAll() {
  if (!getToken()) return;
  const server = await api<{ cards: ServerCard[]; studyDays: string[] }>("/progress");
  const local = load<SrsStore>(SRS_KEY, {});
  const serverMap = new Map(server.cards.map((c) => [c.itemId, c]));

  for (const c of server.cards) {
    const mine = local[c.itemId];
    if (!mine || c.updatedAt > (mine.updatedAt ?? 0)) {
      local[c.itemId] = { ease: c.ease, interval: c.interval, due: c.due, reps: c.reps, lapses: c.lapses, updatedAt: c.updatedAt };
    }
  }
  for (const [id, mine] of Object.entries(local)) {
    const theirs = serverMap.get(id);
    if (!mine.updatedAt) local[id] = { ...mine, updatedAt: Date.now() }; // thẻ cũ chưa có mốc thời gian
    if (!theirs || local[id].updatedAt! > theirs.updatedAt) queueCard(id);
  }
  save(SRS_KEY, local);

  const localDays = load<string[]>(ACTIVITY_KEY, []);
  const serverDays = new Set(server.studyDays);
  save(ACTIVITY_KEY, [...new Set([...localDays, ...server.studyDays])].sort().slice(-400));
  await Promise.all(
    localDays.filter((d) => !serverDays.has(d)).slice(-60).map((day) => api("/progress/study-days", { body: { day } }).catch(() => {})),
  );

  await flushCards();
  window.dispatchEvent(new Event("nihongo:synced"));
}

function toServer(itemId: string, c: CardState): ServerCard {
  return { itemId, ease: c.ease, interval: c.interval, due: c.due, reps: c.reps, lapses: c.lapses, updatedAt: c.updatedAt ?? Date.now() };
}
