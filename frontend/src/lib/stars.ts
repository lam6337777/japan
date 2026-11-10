"use client";

import { useEffect, useState } from "react";
import { load, save } from "./storage";

// Từ được đánh dấu sao (để ôn lại) và từ đã xem trong flashcard
const STAR_KEY = "nihongo.starred";
const SEEN_KEY = "nihongo.seen";

export const loadStars = () => new Set(load<string[]>(STAR_KEY, []));
export const loadSeen = () => new Set(load<string[]>(SEEN_KEY, []));

/** Bật/tắt sao; trả về trạng thái mới */
export function toggleStar(id: string): boolean {
  const s = loadStars();
  const on = !s.has(id);
  if (on) s.add(id);
  else s.delete(id);
  save(STAR_KEY, [...s]);
  window.dispatchEvent(new Event("nihongo:stars"));
  return on;
}

/** Đánh dấu đã xem; trả về true nếu là lần đầu xem từ này */
export function markSeen(id: string): boolean {
  const s = loadSeen();
  if (s.has(id)) return false;
  s.add(id);
  save(SEEN_KEY, [...s]);
  return true;
}

/** Danh sách sao, tự cập nhật khi trang khác thay đổi */
export function useStars() {
  const [stars, setStars] = useState<Set<string>>(new Set());
  useEffect(() => {
    const refresh = () => setStars(loadStars());
    refresh();
    window.addEventListener("nihongo:stars", refresh);
    return () => window.removeEventListener("nihongo:stars", refresh);
  }, []);
  return stars;
}
