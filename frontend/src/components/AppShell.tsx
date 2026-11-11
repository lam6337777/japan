"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { LEVELS, type Level } from "@/lib/data";
import { api, clearSession, getStoredUser, getToken, setSession, type User } from "@/lib/api";
import { load, save } from "@/lib/storage";
import { syncAll } from "@/lib/sync";
import { clearLocalUserData, startUserDataSync, syncUserData } from "@/lib/userdata";

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
// Chỉ hiện ở thanh bên (máy tính); trên điện thoại vào qua trang chủ
const NAV_EXTRA = [
  { href: "/listen", icon: "聴", label: "Nghe & Nói" },
  { href: "/mistakes", icon: "帳", label: "Sổ lỗi sai" },
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

function SettingsLink() {
  return (
    <Link
      href="/settings"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink"
      aria-label="Cài đặt"
      title="Cài đặt"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    </Link>
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
      {[...NAV, ...NAV_EXTRA].map((n) => {
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
    <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
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
  const [waking, setWaking] = useState(false);

  useEffect(() => {
    setLevelState(load<Level>("nihongo.level", "n5"));
    setUser(getStoredUser());
    setReady(true);
    const onWaking = (e: Event) => setWaking((e as CustomEvent<boolean>).detail);
    window.addEventListener("nihongo:waking", onWaking);
    api("/health").catch(() => {}); // đánh thức backend (và chatbot) ngay khi mở app
    startUserDataSync();
    if (getToken()) {
      // Làm mới thông tin tài khoản + đồng bộ tiến độ mỗi lần mở app
      api<User>("/me")
        .then((u) => {
          setUser(u);
          save("nihongo.user", u);
        })
        .catch(() => {});
      syncAll().catch(() => {});
      syncUserData().catch(() => {});
    }
    const onLogout = () => setUser(null);
    window.addEventListener("nihongo:logout", onLogout);
    return () => {
      window.removeEventListener("nihongo:logout", onLogout);
      window.removeEventListener("nihongo:waking", onWaking);
    };
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
      syncUserData().catch(() => {});
    },
    logout: () => {
      clearSession();
      clearLocalUserData();
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
              <span className="flex items-center">
                <SettingsLink />
                <ThemeToggle />
              </span>
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
              <SettingsLink />
              <ThemeToggle />
              <UserBadge compact />
            </div>
          </header>

          {waking && (
            <div className="sticky top-[57px] z-10 flex items-center justify-center gap-2 bg-warn-soft px-4 py-2 text-center text-sm text-warn md:top-0">
              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-warn/30 border-t-warn" />
              Máy chủ miễn phí đang khởi động sau thời gian nghỉ, vui lòng đợi 2–3 phút…
            </div>
          )}
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
