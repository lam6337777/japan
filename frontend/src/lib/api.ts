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

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Không kết nối được máy chủ. Backend (cổng 8080) đã chạy chưa?");
  }

  if (res.status === 401 && token) {
    clearSession();
    window.dispatchEvent(new Event("nihongo:logout"));
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* không phải JSON */
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error;
    const fallback = res.status >= 500 ? "Không kết nối được máy chủ. Backend (cổng 8080) đã chạy chưa?" : `Lỗi ${res.status}`;
    throw new ApiError(res.status, msg ?? fallback);
  }
  return data as T;
}
