"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useLevel } from "@/components/AppShell";
import TappableText from "@/components/TappableText";
import { SpeakButton } from "@/components/ui";
import { api } from "@/lib/api";
import { findGrammar } from "@/lib/grammar";
import { speak, stopSpeaking, useSpeechRecognition } from "@/lib/speech";
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
    async (text: string | null) => {
      if (loading) return;
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
        if (settings.autoSpeak) speak(res.assistantMessage.content);
        if (content) bumpActivity("chat");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
        if (content) setInput(content); // trả lại nội dung để gửi lại
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

  const mic = useSpeechRecognition((text) => {
    if (autoSendRef.current) sendRef.current(text);
    else setInput((prev) => prev + text);
  });

  const reset = () => {
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
  const started = messages.length > 0 || loading;

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
            <button onClick={() => send(null)} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-ink shadow-sm transition hover:opacity-90">
              Bắt đầu hội thoại
            </button>
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
        <div ref={bottomRef} />
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

      {/* Ô nhập */}
      {started && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) send(input);
          }}
          className="sticky bottom-[68px] mt-3 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm md:bottom-4"
        >
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
            value={mic.listening && mic.interim ? input + mic.interim : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (input.trim()) send(input);
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder={mic.listening ? "Đang nghe... hãy nói tiếng Nhật" : "Nhập câu trả lời bằng tiếng Nhật (Enter để gửi)"}
            className="jp max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 outline-none placeholder:font-sans placeholder:text-muted"
          />
          <button type="submit" disabled={!input.trim() || loading} className="h-11 shrink-0 rounded-xl bg-primary px-4 font-semibold text-primary-ink transition hover:opacity-90 disabled:opacity-40">
            Gửi
          </button>
        </form>
      )}
      {started && !mic.supported && (
        <p className="mt-2 text-center text-xs text-muted">Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge để nói chuyện bằng giọng.</p>
      )}
    </div>
  );
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
