"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useLevel } from "@/components/AppShell";
import TappableText from "@/components/TappableText";
import { SpeakButton } from "@/components/ui";
import { api } from "@/lib/api";
import { findGrammar } from "@/lib/grammar";
import { speak, stopSpeaking, useSpeechRecognition } from "@/lib/speech";
import { MAX_PROMPTS, useLiveConversation, type LivePhase } from "@/lib/live";
import { load, save } from "@/lib/storage";
import { bumpActivity } from "@/lib/activity";
import { TOPICS } from "@/lib/topics";

type Correction = { type?: "error" | "tip"; original: string; corrected: string; explanation: string };
type Suggestion = { ja: string; vi: string };
type Msg = { id: number; role: "user" | "assistant"; content: string; kana?: string | null; vi?: string | null; corrections?: Correction[] | null };
type SendResponse = { sessionId: number; userMessage: Msg | null; assistantMessage: Msg; suggestions: Suggestion[] };
type SessionInfo = { id: number; level: string; topic: string; grammarPattern: string | null; title: string | null; updatedAt: string };

type Settings = { showKana: boolean; showVi: boolean; autoSpeak: boolean; autoSend: boolean };
const DEFAULT_SETTINGS: Settings = { showKana: true, showVi: false, autoSpeak: true, autoSend: true };

export default function ChatPage() {
  const { user, ready } = useAuth();
  const { level } = useLevel();
  const [topic, setTopic] = useState("free");
  const [grammarId, setGrammarId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [pendingText, setPendingText] = useState<string | null>(null); // tin vừa gửi, chờ server lưu
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [revealedVi, setRevealedVi] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<SessionInfo[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>("nihongo.chatSettings", {}) });
    const g = new URLSearchParams(window.location.search).get("grammar");
    if (g && findGrammar(g)) setGrammarId(g);
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    save("nihongo.chatSettings", next);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, pendingText]);

  const send = useCallback(
    async (text: string | null, opts: { live?: boolean } = {}): Promise<string | null> => {
      if (loading) return null;
      const content = text?.trim() || null;
      const grammar = grammarId ? findGrammar(grammarId)?.point : null;
      setInput("");
      setSuggestions([]);
      setError(null);
      setLoading(true);
      setPendingText(content);
      stopSpeaking();
      try {
        const res = await api<SendResponse>("/chat", {
          body: {
            sessionId,
            level,
            topic,
            grammar: grammar ? { pattern: grammar.pattern, meaning: grammar.meaning } : null,
            message: content,
          },
        });
        setSessionId(res.sessionId);
        setMessages((prev) => [...prev, ...(res.userMessage ? [res.userMessage] : []), res.assistantMessage]);
        setSuggestions(res.suggestions);
        setHistory(null); // tải lại danh sách khi mở lịch sử
        if (settings.autoSpeak && !opts.live) speak(res.assistantMessage.content);
        if (content) bumpActivity("chat");
        return res.assistantMessage.content;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
        if (content) setInput(content); // trả lại nội dung để gửi lại
        return null;
      } finally {
        setLoading(false);
        setPendingText(null);
      }
    },
    [loading, sessionId, level, topic, grammarId, settings.autoSpeak],
  );

  const sendRef = useRef(send);
  const autoSendRef = useRef(settings.autoSend);
  useEffect(() => {
    sendRef.current = send;
    autoSendRef.current = settings.autoSend;
  });

  const loadingRef = useRef(loading);
  const inputRef = useRef(input);
  useEffect(() => {
    loadingRef.current = loading;
    inputRef.current = input;
  });
  const mic = useSpeechRecognition((text) => {
    // Đang chờ AI trả lời thì không gửi được → để câu trong ô nhập, gửi sau.
    // Nếu ô nhập đang có chữ (câu nói trước đó chưa gửi) thì gửi gộp cả hai.
    const prev = inputRef.current.trim();
    const joined = prev ? (/[。！？!?、]$/.test(prev) ? prev : prev + "。") + text : text;
    if (autoSendRef.current && !loadingRef.current) sendRef.current(joined);
    else setInput((prev) => prev + text);
  });

  // Chế độ trò chuyện trực tiếp (nói liên tục, micro không tự đóng)
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  });
  const localId = useRef(-1000);
  const live = useLiveConversation({
    send: (text) => sendRef.current(text, { live: true }),
    onLocalLine: (line) => setMessages((prev) => [...prev, { id: localId.current--, role: "assistant", content: line.ja, kana: line.kana, vi: line.vi }]),
    hasMessages: () => messagesRef.current.length > 0,
  });
  useEffect(() => {
    if (live.notice) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [live.notice]);

  const reset = () => {
    live.end();
    stopSpeaking();
    setSessionId(null);
    setMessages([]);
    setSuggestions([]);
    setError(null);
  };

  const openHistory = async () => {
    setShowHistory((v) => !v);
    if (!history) {
      try {
        setHistory(await api<SessionInfo[]>("/chat/sessions"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được lịch sử");
      }
    }
  };

  const loadSession = async (id: number) => {
    try {
      const res = await api<{ session: SessionInfo; messages: Msg[] }>(`/chat/sessions/${id}`);
      live.end();
      stopSpeaking();
      setSessionId(id);
      setTopic(res.session.topic in TOPICS ? res.session.topic : "free");
      setGrammarId(null);
      setMessages(res.messages);
      setSuggestions([]);
      setShowHistory(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không mở được cuộc hội thoại");
    }
  };

  const deleteSession = async (id: number) => {
    await api(`/chat/sessions/${id}`, { method: "DELETE" }).catch(() => {});
    setHistory((h) => h?.filter((s) => s.id !== id) ?? null);
    if (id === sessionId) reset();
  };

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <span className="jp mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl text-accent">桜</span>
        <h1 className="mt-4 text-2xl font-bold">Hội thoại với AI</h1>
        <p className="mt-2 text-sm text-muted">Đăng nhập để trò chuyện với Sakura-sensei. Lịch sử hội thoại sẽ được lưu lại để bạn xem lại lỗi sai.</p>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-ink">
          Đăng nhập / Đăng ký
        </Link>
      </div>
    );
  }

  const grammar = grammarId ? findGrammar(grammarId)?.point : null;
  const started = messages.length > 0 || loading || live.active;

  return (
    <div className="flex flex-col">
      {/* Thanh công cụ */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hội thoại AI</h1>
          <p className="text-sm text-muted">Trình độ {level.toUpperCase()} · {TOPICS[topic]?.label}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <select
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              reset();
            }}
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary sm:flex-none"
            aria-label="Chủ đề"
          >
            {Object.entries(TOPICS).map(([k, t]) => (
              <option key={k} value={k}>{t.label}</option>
            ))}
          </select>
          <button onClick={openHistory} className={`rounded-xl border px-3 py-2 text-sm ${showHistory ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"}`}>
            Lịch sử
          </button>
          {started && (
            <button onClick={reset} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted hover:text-ink">
              Cuộc mới
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="pop-in mb-4 rounded-2xl border border-line bg-surface p-2">
          {!history ? (
            <p className="p-3 text-sm text-muted">Đang tải...</p>
          ) : history.length === 0 ? (
            <p className="p-3 text-sm text-muted">Chưa có cuộc hội thoại nào.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto">
              {history.map((s) => (
                <li key={s.id} className={`flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-surface-2 ${s.id === sessionId ? "bg-primary-soft" : ""}`}>
                  <button onClick={() => loadSession(s.id)} className="min-w-0 flex-1 text-left">
                    <span className="jp block truncate text-sm">{s.title}</span>
                    <span className="block text-xs text-muted">
                      {s.level.toUpperCase()} · {TOPICS[s.topic]?.label ?? s.topic}
                      {s.grammarPattern ? ` · ${s.grammarPattern}` : ""} · {new Date(s.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </button>
                  <button onClick={() => deleteSession(s.id)} className="rounded-lg px-2 py-1 text-xs text-muted hover:text-accent" aria-label="Xoá">
                    Xoá
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {(
          [
            ["showKana", "Hiện kana"],
            ["showVi", "Hiện bản dịch"],
            ["autoSpeak", "AI tự đọc"],
            ["autoSend", "Nói xong tự gửi"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => updateSettings({ [key]: !settings[key] })}
            className={`rounded-full border px-3 py-1 transition-colors ${settings[key] ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted"}`}
          >
            {settings[key] ? "✓ " : ""}{label}
          </button>
        ))}
      </div>

      {grammar && !sessionId && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-success-soft px-4 py-2.5 text-sm text-success">
          <span>Đang luyện mẫu câu: <b className="jp">{grammar.pattern}</b> ({grammar.meaning})</span>
          <button onClick={() => setGrammarId(null)} aria-label="Bỏ luyện mẫu câu" className="px-1">✕</button>
        </div>
      )}

      {/* Khung hội thoại */}
      <div className="flex min-h-[50vh] flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-6">
        {!started && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
            <span className="jp flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl text-accent">桜</span>
            <div>
              <p className="font-semibold">Sakura-sensei</p>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Cô sẽ trò chuyện với bạn bằng tiếng Nhật trình độ {level.toUpperCase()}, sửa lỗi và gợi ý câu trả lời. Bạn có thể gõ phím hoặc bấm micro để nói. Bấm vào bất kỳ từ nào trong câu của cô để xem nghĩa.
              </p>
            </div>
            <div className="flex w-full max-w-xs flex-col gap-2">
              <button onClick={() => send(null)} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-ink shadow-sm transition hover:opacity-90">
                Bắt đầu hội thoại
              </button>
              {mic.supported && (
                <button onClick={live.start} className="flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent-soft px-5 py-2.5 font-semibold text-accent transition hover:bg-accent hover:text-white">
                  <LiveIcon /> Trò chuyện bằng giọng nói
                </button>
              )}
            </div>
            {mic.supported && <p className="max-w-sm text-xs text-muted">Trò chuyện bằng giọng nói: cứ nói tự nhiên như gọi điện, micro tự bật lại sau mỗi câu của cô. Bấm “Kết thúc” khi muốn dừng.</p>}
          </div>
        )}

        {messages.map((m) =>
          m.role === "assistant" ? (
            <div key={m.id} className="pop-in flex max-w-[90%] items-start gap-3">
              <span className="jp flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">桜</span>
              <div className="rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-3">
                <TappableText text={m.content} className="text-lg leading-relaxed" />
                {settings.showKana && m.kana && m.kana !== m.content && <p className="jp mt-1 text-sm text-muted">{m.kana}</p>}
                {(settings.showVi || revealedVi.has(m.id)) && m.vi && <p className="mt-2 border-t border-line pt-2 text-sm">{m.vi}</p>}
                <div className="mt-1 flex items-center gap-1">
                  <SpeakButton text={m.content} size="sm" />
                  {!settings.showVi && m.vi && (
                    <button onClick={() => setRevealedVi((s) => new Set(s).add(m.id))} className="rounded-full px-2 py-0.5 text-xs text-muted hover:bg-surface hover:text-ink">
                      Dịch
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <UserBubble key={m.id} msg={m} />
          ),
        )}

        {pendingText && <UserBubble msg={{ id: -1, role: "user", content: pendingText }} />}

        {loading && (
          <div className="flex items-center gap-3">
            <span className="jp flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">桜</span>
            <span className="flex gap-1 rounded-2xl bg-surface-2 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
          </div>
        )}

        {error && <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{error}</div>}
        {live.notice && !live.active && (
          <div className="pop-in flex items-start justify-between gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm text-muted">
            <span>{live.notice}</span>
            <button onClick={live.clearNotice} aria-label="Đóng thông báo" className="px-1">✕</button>
          </div>
        )}
        <div ref={bottomRef} className="scroll-mb-44 md:scroll-mb-28" />
      </div>

      {/* Gợi ý câu trả lời */}
      {suggestions.length > 0 && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button key={s.ja} onClick={() => setInput(s.ja)} className="pop-in rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm transition hover:border-primary" title="Bấm để dùng câu này">
              <span className="jp block">{s.ja}</span>
              <span className="block text-xs text-muted">{s.vi}</span>
            </button>
          ))}
        </div>
      )}

      {/* Trò chuyện trực tiếp: thay cho ô nhập */}
      {live.active && <LivePanel phase={live.phase} interim={live.interim} misses={live.misses} onEnd={() => live.end()} />}

      {/* Ô nhập */}
      {started && !live.active && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) send(input);
          }}
          className="sticky bottom-[68px] mt-3 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm md:bottom-4"
        >
          <MicStatus mic={mic} />
          {mic.supported && (
            <button
              type="button"
              onClick={mic.listening ? mic.stop : mic.start}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${mic.listening ? "bg-accent text-white" : "bg-accent-soft text-accent hover:bg-accent hover:text-white"}`}
              aria-label={mic.listening ? "Dừng nghe" : "Nói bằng giọng"}
              title={mic.listening ? "Dừng nghe" : "Bấm để nói tiếng Nhật"}
            >
              {mic.listening && <span className="absolute inset-0 animate-ping rounded-xl bg-accent opacity-30" />}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
              </svg>
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim()) send(input);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={mic.listening ? "" : "Nhập tiếng Nhật…"}
            className="jp max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none placeholder:font-sans placeholder:text-muted"
          />
          <button type="submit" disabled={!input.trim() || loading} aria-label="Gửi" className="flex h-11 shrink-0 items-center justify-center rounded-xl bg-primary px-3 font-semibold text-primary-ink transition hover:opacity-90 disabled:opacity-40 sm:px-4">
            <svg className="sm:hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
            <span className="hidden sm:inline">Gửi</span>
          </button>
          {mic.supported && (
            <button
              type="button"
              onClick={() => {
                mic.stop();
                live.start();
              }}
              disabled={loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-accent/40 text-accent transition hover:bg-accent hover:text-white disabled:opacity-40"
              aria-label="Trò chuyện trực tiếp bằng giọng nói"
              title="Trò chuyện trực tiếp: nói liên tục, bấm Kết thúc để dừng"
            >
              <LiveIcon />
            </button>
          )}
        </form>
      )}
      {started && !mic.supported && (
        <p className="mt-2 text-center text-xs text-muted">Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge để nói chuyện bằng giọng.</p>
      )}
    </div>
  );
}

function LiveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M3 11v2M7 8v8M11 5v14M15 8v8M19 10v4" />
    </svg>
  );
}

const LIVE_TEXT: Record<Exclude<LivePhase, "off">, string> = {
  starting: "Đang bắt đầu…",
  listening: "Mời bạn nói — Sakura đang nghe",
  hearing: "Đang nghe bạn nói…",
  thinking: "Sakura đang nghĩ…",
  speaking: "Sakura đang nói (micro tạm tắt)",
  prompting: "Sakura đang hỏi lại…",
};

// Bảng điều khiển khi đang trò chuyện trực tiếp
function LivePanel({ phase, interim, misses, onEnd }: { phase: LivePhase; interim: string; misses: number; onEnd: () => void }) {
  if (phase === "off") return null;
  const micOn = phase === "listening" || phase === "hearing";
  const bars = phase === "hearing" ? "hearing" : micOn ? "ready" : phase === "speaking" || phase === "prompting" ? "hearing" : "idle";
  return (
    <div role="status" aria-live="polite" className="pop-in sticky bottom-[68px] mt-3 rounded-2xl border border-accent/40 bg-surface p-3 shadow-md md:bottom-4">
      <div className="flex items-center gap-3">
        <span className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${micOn ? "bg-accent text-white" : "bg-surface-2 text-muted"}`}>
          {micOn && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-25" />}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
            {!micOn && <path d="M3 3l18 18" />}
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${micOn ? "text-accent" : "text-ink"}`}>{LIVE_TEXT[phase]}</p>
          <div className="mt-1 flex items-center gap-2">
            <div className={`mic-bars flex h-5 items-center gap-[3px] ${micOn ? "text-accent" : "text-muted"}`} data-phase={bars}>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            {misses > 0 && phase === "listening" && <span className="text-xs text-muted">Chưa nghe thấy bạn ({misses}/{MAX_PROMPTS})</span>}
          </div>
        </div>
        <button type="button" onClick={onEnd} className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
          Kết thúc
        </button>
      </div>
      {interim && (phase === "hearing" || phase === "thinking") && <p className="jp mt-2 break-words rounded-xl bg-surface-2 px-3 py-2 text-base leading-snug">{interim}</p>}
    </div>
  );
}

const MIC_TEXT = {
  starting: "Đang bật micro…",
  ready: "Micro đã sẵn sàng — hãy nói tiếng Nhật",
  hearing: "Đang nghe…",
} as const;

// Khung trạng thái micro, nổi ngay trên ô nhập
function MicStatus({ mic }: { mic: ReturnType<typeof useSpeechRecognition> }) {
  if (!mic.supported) return null;
  const box = "absolute inset-x-0 bottom-full mb-2 rounded-2xl border px-3 py-2.5 shadow-md";
  if (mic.listening) {
    return (
      <div role="status" aria-live="polite" className={`${box} pop-in border-accent/40 bg-surface`}>
        <div className="flex items-center gap-3">
          <div className="mic-bars flex h-6 shrink-0 items-center gap-[3px] text-accent" data-phase={mic.phase}>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <p className={`min-w-0 flex-1 text-sm font-medium ${mic.phase === "hearing" ? "text-accent" : "text-muted"}`}>{MIC_TEXT[mic.phase as keyof typeof MIC_TEXT]}</p>
          <button type="button" onClick={mic.stop} className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink">
            Dừng
          </button>
        </div>
        {mic.interim && <p className="jp mt-1.5 break-words text-base leading-snug">{mic.interim}</p>}
      </div>
    );
  }
  if (mic.captured) {
    return (
      <div role="status" aria-live="polite" className={`${box} pop-in border-success/40 bg-success-soft text-success`}>
        <p className="text-xs font-semibold">✓ Đã ghi lại câu của bạn</p>
        <p className="jp mt-0.5 break-words text-base leading-snug text-ink">{mic.captured.text}</p>
      </div>
    );
  }
  if (mic.error) {
    return (
      <p role="alert" className={`${box} border-accent/30 bg-accent-soft text-center text-xs text-accent`}>
        🎤 {mic.error}
      </p>
    );
  }
  return null;
}

function UserBubble({ msg }: { msg: Msg }) {
  const errors = msg.corrections?.filter((c) => c.type !== "tip") ?? [];
  const tips = msg.corrections?.filter((c) => c.type === "tip") ?? [];
  return (
    <div className="pop-in flex flex-col items-end gap-2">
      <p className={`jp max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-ink ${msg.id < 0 ? "opacity-70" : ""}`}>{msg.content}</p>
      {errors.length > 0 && <FeedbackBox title="Cần sửa" items={errors} tone="warn" />}
      {msg.corrections && errors.length === 0 && <p className="text-xs font-medium text-success">✓ Câu đúng rồi!</p>}
      {tips.length > 0 && <FeedbackBox title="Gợi ý nói tự nhiên hơn" items={tips} tone="primary" />}
    </div>
  );
}

function FeedbackBox({ title, items, tone }: { title: string; items: Correction[]; tone: "warn" | "primary" }) {
  const box = tone === "warn" ? "border-warn/40 bg-warn-soft" : "border-primary/30 bg-primary-soft";
  return (
    <div className={`max-w-[85%] rounded-xl border px-4 py-3 text-sm ${box}`}>
      <p className={`mb-1 font-semibold ${tone === "warn" ? "text-warn" : "text-primary"}`}>{title}</p>
      {items.map((c, i) => (
        <div key={i} className="mt-1.5">
          <p className="jp">
            {c.original && <span className={tone === "warn" ? "text-muted line-through" : "text-muted"}>{c.original}</span>}
            {c.original && " → "}
            <span className="font-semibold">{c.corrected}</span>
          </p>
          <p className="text-muted">{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}
