"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/AppShell";
import { Card } from "@/components/ui";
import { api, type User } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const { user, ready, login, logout } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!ready) return null;

  // Đã đăng nhập → trang tài khoản
  if (user) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 py-6">
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-2xl font-bold text-accent">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-semibold">{user.displayName}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <p className="text-sm text-muted">Tiến độ học và lịch sử hội thoại được lưu trên máy chủ, dùng được trên mọi thiết bị.</p>
          <div className="mt-2 flex gap-2">
            <Link href="/" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink">Về trang chủ</Link>
            <button onClick={logout} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-muted hover:text-accent">
              Đăng xuất
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = mode === "login" ? { email: form.email, password: form.password } : form;
      const res = await api<{ token: string; user: User }>(`/auth/${mode}`, { body });
      login(res.token, res.user);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary";

  return (
    <div className="mx-auto max-w-md py-6">
      <div className="mb-6 text-center">
        <span className="jp mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-white">日</span>
        <h1 className="mt-4 text-2xl font-bold">{mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}</h1>
        <p className="mt-1 text-sm text-muted">Đăng nhập để lưu tiến độ và trò chuyện với AI</p>
      </div>

      <Card>
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError(null);
              }}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === m ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
            >
              {m === "login" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          {mode === "register" && (
            <label className="flex flex-col gap-1 text-sm">
              Tên hiển thị
              <input className={input} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="Ví dụ: Lâm" required maxLength={100} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input className={input} type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ban@email.com" required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Mật khẩu
            <input
              className={input}
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={mode === "register" ? "Tối thiểu 6 ký tự" : ""}
              required
              minLength={mode === "register" ? 6 : undefined}
            />
          </label>

          {error && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}

          <button type="submit" disabled={loading} className="mt-2 rounded-xl bg-primary py-3 font-semibold text-primary-ink shadow-sm transition hover:opacity-90 disabled:opacity-50">
            {loading ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}
          </button>
        </form>
      </Card>

      <p className="mt-4 text-center text-xs text-muted">
        Chưa muốn đăng nhập? Bạn vẫn học từ vựng, kanji, ngữ pháp được, tiến độ sẽ lưu trong trình duyệt này.
      </p>
    </div>
  );
}
