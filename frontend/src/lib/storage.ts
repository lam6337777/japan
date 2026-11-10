"use client";

// Lưu tiến độ học trong trình duyệt (bản thử nghiệm 1 người dùng).
// Mọi truy cập đều bọc try/catch để không lỗi khi localStorage bị chặn.

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua */
  }
}

export const todayKey = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD theo giờ máy

// ---- Chuỗi ngày học (streak) ----
const ACTIVITY_KEY = "nihongo.activity";

export function markStudiedToday() {
  const days = load<string[]>(ACTIVITY_KEY, []);
  const t = todayKey();
  if (!days.includes(t)) save(ACTIVITY_KEY, [...days, t].slice(-400));
}

export function getStreak(): number {
  const days = new Set(load<string[]>(ACTIVITY_KEY, []));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toLocaleDateString("sv-SE"))) d.setDate(d.getDate() - 1); // hôm nay chưa học vẫn giữ chuỗi
  while (days.has(d.toLocaleDateString("sv-SE"))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
