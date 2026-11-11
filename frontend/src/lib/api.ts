"use client";

import { load, save } from "./storage";

// Gọi backend Spring Boot qua đường dẫn /api (Next.js chuyển tiếp, xem next.config.ts)

export type User = { id: number; email: string; displayName: string; level: string };

const TOKEN_KEY = "nihongo.token";
const USER_KEY = "nihongo.user";

export const getToken = () => load<string | null>(TOKEN_KEY, null);
export const getStoredUser = () => load<User | null>(USER_KEY, null);

export function setSession(token: string, user: User) {
  save(TOKEN_KEY, token);
  save(USER_KEY, user);
}

export function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* bỏ qua */
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Trên gói miễn phí, máy chủ "ngủ" khi không dùng; đo thực tế backend cần ~2,5 phút để thức dậy.
// Khi gặp lỗi kết nối / lỗi cổng (502–504 không kèm thông báo từ backend) thì chờ và thử lại.
const WAKE_DELAYS = [2000, 3000, 5000, 8000, 10000, ...Array(12).fill(15000)]; // tổng ~3,5 phút
let waking = 0;
function setWaking(on: boolean) {
  waking = Math.max(0, waking + (on ? 1 : -1));
  window.dispatchEvent(new CustomEvent("nihongo:waking", { detail: waking > 0 }));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function send(path: string, init: { method?: string; body?: unknown }, token: string | null) {
  return fetch(`/api${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: {
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const method = init.method ?? (init.body ? "POST" : "GET");
  let res: Response | null = null;
  let text = "";
  let markedWaking = false;
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        res = await send(path, init, token);
        text = await res.text();
        const isGateway = res.status >= 502 && res.status <= 504 && !text.trim().startsWith("{");
        // POST chỉ thử lại khi chắc chắn chưa tới được backend (tránh gửi trùng tin nhắn)
        const retryable = isGateway && (method === "GET" || res.status !== 504);
        if (!retryable || attempt >= WAKE_DELAYS.length) break;
      } catch {
        if (attempt >= WAKE_DELAYS.length) throw new ApiError(0, "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
      }
      if (!markedWaking) {
        setWaking(true);
        markedWaking = true;
      }
      await sleep(WAKE_DELAYS[attempt]);
    }
  } finally {
    if (markedWaking) setWaking(false);
  }
  if (!res) throw new ApiError(0, "Không kết nối được máy chủ.");

  if (res.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event("nihongo:logout"));
  }
  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* không phải JSON */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error;
    const fallback = res.status >= 500 ? "Máy chủ đang bận hoặc chưa sẵn sàng, thử lại sau ít phút." : `Lỗi ${res.status}`;
    throw new ApiError(res.status, msg ?? fallback);
  }
  return data as T;
}
