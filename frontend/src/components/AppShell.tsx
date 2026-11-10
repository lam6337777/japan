"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { LEVELS, type Level } from "@/lib/data";
import { api, clearSession, getStoredUser, getToken, setSession, type User } from "@/lib/api";
import { load, save } from "@/lib/storage";
import { syncAll } from "@/lib/sync";

// ---------- Trình độ đang chọn (dùng chung toàn app) ----------
const LevelContext = createContext<{ level: Level; setLevel: (l: Level) => void }>({
  level: "n5",
  setLevel: () => {},
});
export const useLevel = () => useContext(LevelContext);

// ---------- Tài khoản đăng nhập ----------
type AuthState = {
  user: User | null;
  ready: boolean; // đã đọc xong trạng thái đăng nhập từ máy
  login: (token: string, user: User) => void;
  logout: () => void;
};
const AuthContext = createContext<AuthState>({ user: null, ready: false, login: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

function UserBadge({ compact = false }: { compact?: boolean }) {
  const { user, ready } = useAuth();
  if (!ready) return compact ? <span className="h-8 w-8" /> : null;
  if (!user)
    return (
      <Link
        href="/login"
        className={compact
          ? "rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-ink"
          : "flex items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-ink transition hover:opacity-90"}
      >
        Đăng nhập
      </Link>
    );
  const initial = user.displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <Link href="/login" className={compact ? "" : "flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-surface-2"} title="Tài khoản">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">{initial}</span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{user.displayName}</span>
          <span className="block truncate text-xs text-muted">Đã đồng bộ tiến độ</span>
        </span>
      )}
    </Link>
  );
}

const NAV = [
  { href: "/", icon: "家", label: "Trang chủ" },
  { href: "/vocab", icon: "語", label: "Từ vựng" },
  { href: "/kanji", icon: "字", label: "Kanji" },
  { href: "/grammar", icon: "文", label: "Ngữ pháp" },
  { href: "/chat", icon: "話", label: "Hội thoại AI" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function LevelPicker({ compact = false }: { compact?: boolean }) {
  const { level, setLevel } = useLevel();
  if (compact)
    return (
      <select
        value={level}
        onChange={(e) => setLevel(e.target.value as Level)}
        aria-label="Trình độ"
        className="rounded-lg border border-line bg-surface-2 px-2 py-1.5 text-sm font-semibold text-primary outline-none"
      >
        {LEVELS.map((l) => (
          <option key={l} value={l}>{l.toUpperCase()}</option>
        ))}
      </select>
    );
  return (
    <div className={`flex gap-1 rounded-xl bg-surface-2 p-1 ${compact ? "" : "w-full"}`} role="radiogroup" aria-label="Trình độ">
      {LEVELS.map((l) => (
        <button
          key={l}
          role="radio"
          aria-checked={level === l}
          onClick={() => setLevel(l)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
            level === l ? "bg-primary text-primary-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    const saved = load<"light" | "dark" | null>("nihongo.theme", null);
    setTheme(saved ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    save("nihongo.theme", next);
  };
  return (
    <button
      onClick={toggle}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label="Đổi giao diện sáng/tối"
      title="Đổi giao diện sáng/tối"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

function WithPath({ render }: { render: (pathname: string) => React.ReactNode }) {
  return <>{render(usePathname())}</>;
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            <span className={`jp flex h-7 w-7 items-center justify-center rounded-lg text-sm ${active ? "bg-primary text-primary-ink" : "bg-surface-2"}`}>
              {n.icon}
            </span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 backdrop-blur md:hidden">
      {NAV.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-primary" : "text-muted"}`}>
            <span className={`jp text-lg leading-none ${active ? "font-bold" : ""}`}>{n.icon}</span>
            {n.label.replace("Hội thoại AI", "Chat AI")}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [level, setLevelState] = useState<Level>("n5");
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLevelState(load<Level>("nihongo.level", "n5"));
    setUser(getStoredUser());
    setReady(true);
    if (getToken()) {
      // Làm mới thông tin tài khoản + đồng bộ tiến độ mỗi lần mở app
      api<User>("/me")
        .then((u) => {
          setUser(u);
          save("nihongo.user", u);
        })
        .catch(() => {});
      syncAll().catch(() => {});
    }
    const onLogout = () => setUser(null);
    window.addEventListener("nihongo:logout", onLogout);
    return () => window.removeEventListener("nihongo:logout", onLogout);
  }, []);

  const setLevel = (l: Level) => {
    setLevelState(l);
    save("nihongo.level", l);
    if (getToken()) api("/me", { method: "PATCH", body: { level: l } }).catch(() => {});
  };

  const auth: AuthState = {
    user,
    ready,
    login: (token, u) => {
      setSession(token, u);
      setUser(u);
      if (LEVELS.includes(u.level as Level)) {
        setLevelState(u.level as Level);
        save("nihongo.level", u.level);
      }
      syncAll().catch(() => {});
    },
    logout: () => {
      clearSession();
      setUser(null);
    },
  };

  return (
    <AuthContext.Provider value={auth}>
    <LevelContext.Provider value={{ level, setLevel }}>
      <div className="flex min-h-screen overflow-x-clip">
        {/* Thanh bên (máy tính) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface px-4 py-6 md:flex">
          <Link href="/" className="flex items-center gap-3 px-2">
            <span className="jp flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">日</span>
            <span>
              <span className="block font-bold leading-tight">Nihongo AI</span>
              <span className="block text-xs text-muted">Học tiếng Nhật cùng AI</span>
            </span>
          </Link>

          <Suspense fallback={<SideNav pathname="" />}>
            <WithPath render={(p) => <SideNav pathname={p} />} />
          </Suspense>

          <div className="mt-auto flex flex-col gap-3">
            <UserBadge />
            <div>
              <p className="mb-2 px-1 text-xs font-medium text-muted">Trình độ</p>
              <LevelPicker />
            </div>
            <div className="flex items-center justify-between px-1">
              <Link href="/sources" className="text-xs text-muted hover:text-ink">
                Nguồn dữ liệu
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Thanh trên (điện thoại) */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-line bg-surface/90 px-4 py-2.5 backdrop-blur md:hidden">
            <Link href="/" className="flex items-center gap-2">
              <span className="jp flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-bold text-white">日</span>
              <span className="font-bold">Nihongo AI</span>
            </Link>
            <div className="flex items-center gap-1">
              <LevelPicker compact />
              <ThemeToggle />
              <UserBadge compact />
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 md:pt-8">{children}</main>
        </div>

        {/* Thanh điều hướng dưới (điện thoại) */}
        <Suspense fallback={<BottomNav pathname="" />}>
          <WithPath render={(p) => <BottomNav pathname={p} />} />
        </Suspense>
      </div>
    </LevelContext.Provider>
    </AuthContext.Provider>
  );
}
