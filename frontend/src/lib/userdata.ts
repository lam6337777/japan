"use client";

// Đồng bộ dữ liệu cá nhân lưu trong trình duyệt lên server, theo tài khoản.
// - Mỗi khoá có mốc "sửa lần cuối"; khi hai bên khác nhau, bản sửa sau cùng thắng.
// - Lần đầu đăng nhập trên một máy: GỘP dữ liệu máy với server (không bên nào bị mất).
import { api, getToken } from "./api";

type Merge = (server: unknown, local: unknown) => unknown;

const union: Merge = (s, l) => [...new Set([...((s as string[]) ?? []), ...((l as string[]) ?? [])])];
const byId: Merge = (s, l) => {
  const map = new Map<string, { id: string }>();
  for (const x of [...((s as { id: string }[]) ?? []), ...((l as { id: string }[]) ?? [])]) map.set(x.id, x);
  return [...map.values()];
};
const maxPerDay: Merge = (s, l) => {
  const out: Record<string, number> = { ...((s as Record<string, number>) ?? {}) };
  for (const [d, n] of Object.entries((l as Record<string, number>) ?? {})) out[d] = Math.max(out[d] ?? 0, n);
  return out;
};
const keepServer: Merge = (s) => s;
const dailyMax: Merge = (s, l) => {
  const a = (s ?? {}) as Record<string, number | string>;
  const b = (l ?? {}) as Record<string, number | string>;
  if (a.date !== b.date) return (String(a.date) > String(b.date) ? a : b);
  const out: Record<string, number | string> = { ...a };
  for (const [k, v] of Object.entries(b)) if (typeof v === "number") out[k] = Math.max(Number(a[k] ?? 0), v);
  return out;
};

/** Các khoá localStorage được đồng bộ + cách gộp khi lần đầu đăng nhập trên máy */
export const SYNC_KEYS: Record<string, Merge> = {
  "nihongo.starred": union,
  "nihongo.seen": union,
  "nihongo.decks": byId,
  "nihongo.mistakes.quiz": byId,
  "nihongo.mistakes.chatDone": union,
  "nihongo.activityCount": maxPerDay,
  "nihongo.dailyActivity": dailyMax,
  "nihongo.settings": keepServer,
  "nihongo.chatSettings": keepServer,
};

const META_KEY = "nihongo.syncmeta"; // { [key]: mốc sửa cuối (ms) } — chỉ có sau khi đã đồng bộ với server
type Meta = Record<string, number>;

function readMeta(): Meta {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function writeMeta(m: Meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {}
}
function readRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
/** Ghi thẳng (không phát sự kiện thay đổi → không bị gửi ngược lên server) */
function writeRaw(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

const dirty = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

async function push(key: string) {
  const value = readRaw(key);
  if (value === undefined) return;
  const updatedAt = readMeta()[key] ?? Date.now();
  const res = await api<{ key: string; value: string; updatedAt: number; accepted: boolean }>(`/userdata/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: { value: JSON.stringify(value), updatedAt },
  });
  if (!res.accepted) {
    // Máy khác vừa sửa mới hơn → lấy bản của server
    writeRaw(key, JSON.parse(res.value));
    writeMeta({ ...readMeta(), [key]: res.updatedAt });
    notify();
  }
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    if (!getToken()) return dirty.clear();
    for (const key of [...dirty]) {
      dirty.delete(key);
      await push(key).catch(() => dirty.add(key)); // lỗi mạng → thử lại lần sau
    }
  }, 1500);
}

function notify() {
  for (const ev of ["nihongo:stars", "nihongo:synced", "nihongo:activity"]) window.dispatchEvent(new Event(ev));
}

/** Bắt đầu theo dõi thay đổi để tự đẩy lên server (gọi 1 lần khi mở app) */
export function startUserDataSync() {
  if (listening) return;
  listening = true;
  window.addEventListener("nihongo:localchange", (e) => {
    const key = (e as CustomEvent<string>).detail;
    if (!(key in SYNC_KEYS)) return;
    // Chưa đăng nhập → không ghi mốc, để lần đầu đăng nhập sẽ GỘP thay vì ghi đè
    if (!getToken()) return;
    writeMeta({ ...readMeta(), [key]: Date.now() });
    dirty.add(key);
    schedule();
  });
}

/** Tải dữ liệu từ server và đối chiếu với máy (gọi khi mở app / sau khi đăng nhập) */
export async function syncUserData() {
  if (!getToken()) return;
  const items = await api<{ key: string; value: string; updatedAt: number }[]>("/userdata");
  const server = new Map(items.map((i) => [i.key, i]));
  const meta = readMeta();
  for (const [key, merge] of Object.entries(SYNC_KEYS)) {
    const s = server.get(key);
    const local = readRaw(key);
    const localAt = meta[key];
    if (!s) {
      if (local !== undefined) dirty.add(key); // server chưa có → đẩy lên
      continue;
    }
    const sValue = JSON.parse(s.value);
    if (localAt === undefined && local !== undefined) {
      // Lần đầu đồng bộ trên máy này → gộp
      writeRaw(key, merge(sValue, local));
      meta[key] = Date.now();
      dirty.add(key);
    } else if (local === undefined || s.updatedAt > (localAt ?? 0)) {
      writeRaw(key, sValue);
      meta[key] = s.updatedAt;
    } else if ((localAt ?? 0) > s.updatedAt) {
      dirty.add(key);
    }
  }
  writeMeta(meta);
  notify();
  if (dirty.size) schedule();
}

/** Đăng xuất: xoá dữ liệu cá nhân trên máy để tài khoản khác dùng chung trình duyệt không bị lẫn */
export function clearLocalUserData() {
  for (const key of [...Object.keys(SYNC_KEYS), META_KEY, "nihongo.srs.v1", "nihongo.activity", "nihongo.pending", "nihongo.daily"]) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
  dirty.clear();
  notify();
}
