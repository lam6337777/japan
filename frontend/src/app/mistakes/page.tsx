"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AppShell";
import Quiz, { type QuizQuestion } from "@/components/Quiz";
import { Card, Loading, PageHeader, SpeakButton } from "@/components/ui";
import { bumpActivity } from "@/lib/activity";
import { api } from "@/lib/api";
import {
  loadChatDone,
  loadQuizMistakes,
  MASTER_STREAK,
  removeQuizMistake,
  reviewQuizMistake,
  setChatDone,
  type ChatMistake,
  type QuizMistake,
} from "@/lib/mistakes";

type Tab = "quiz" | "chat";

export default function MistakesPage() {
  const { user, ready } = useAuth();
  const [tab, setTab] = useState<Tab>("quiz");
  const [quiz, setQuiz] = useState<QuizMistake[]>([]);
  const [chat, setChat] = useState<ChatMistake[] | null>(null);
  const [chatDone, setChatDoneState] = useState<Set<string>>(new Set());
  const [chatError, setChatError] = useState<string | null>(null);
  const [reviewQuiz, setReviewQuiz] = useState<QuizQuestion[] | null>(null);
  const [reviewChat, setReviewChat] = useState<ChatMistake[] | null>(null);
  const [showDone, setShowDone] = useState(false);

  const reloadQuiz = useCallback(() => setQuiz(loadQuizMistakes()), []);

  useEffect(() => {
    reloadQuiz();
    setChatDoneState(loadChatDone());
  }, [reloadQuiz]);

  useEffect(() => {
    if (!user || chat) return;
    api<ChatMistake[]>("/chat/mistakes")
      .then(setChat)
      .catch((e) => setChatError(e instanceof Error ? e.message : "Không tải được"));
  }, [user, chat]);

  if (!ready) return <Loading />;

  // ---- Đang ôn câu sai trong bài tập ----
  if (reviewQuiz) {
    return (
      <Quiz
        title="Ôn lại câu sai"
        questions={reviewQuiz}
        backHref="/mistakes"
        backLabel="Về sổ lỗi sai"
        activity="review"
        onAnswer={(q, ok) => reviewQuizMistake(q, ok)}
        onRestart={() => {
          const list = loadQuizMistakes();
          setQuiz(list);
          setReviewQuiz(list.length ? list.slice(0, 15).map((m) => m.q) : null);
        }}
      />
    );
  }

  // ---- Đang ôn lỗi khi chat ----
  if (reviewChat) {
    return (
      <ChatReview
        items={reviewChat}
        onExit={() => {
          setReviewChat(null);
          setChatDoneState(loadChatDone());
        }}
      />
    );
  }

  const chatPending = chat?.filter((m) => !chatDone.has(m.id)) ?? [];
  const chatShown = showDone ? chat ?? [] : chatPending;

  return (
    <div>
      <PageHeader title="Sổ lỗi sai" subtitle="Học từ chính lỗi của mình — ôn đến khi nhớ thì lỗi tự rời sổ" />

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 sm:max-w-sm">
        {(
          [
            ["quiz", `Bài tập (${quiz.length})`],
            ["chat", `Hội thoại (${user ? chatPending.length : "–"})`],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 text-sm font-semibold transition-colors ${tab === k ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "quiz" &&
        (quiz.length === 0 ? (
          <Empty text="Chưa có câu sai nào. Làm bài tập ngữ pháp hoặc kiểm tra kanji, câu nào sai sẽ tự vào đây." href="/grammar/quiz" cta="Làm bài tập" />
        ) : (
          <div className="flex flex-col gap-3">
            <button onClick={() => setReviewQuiz(quiz.slice(0, 15).map((m) => m.q))} className="self-start rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink shadow-sm">
              Ôn lại {Math.min(15, quiz.length)} câu
            </button>
            <p className="text-xs text-muted">Mỗi câu cần làm đúng {MASTER_STREAK} lần liên tiếp khi ôn để rời khỏi sổ.</p>
            <ul className="flex flex-col gap-2">
              {quiz.map((m) => (
                <li key={m.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${m.kind === "grammar" ? "bg-success-soft text-success" : "bg-accent-soft text-accent"}`}>
                    {m.kind === "grammar" ? "Ngữ pháp" : "Kanji"}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className={m.q.promptIsJa ? "jp text-base" : "text-base"}>{m.q.prompt}</p>
                    <p className="mt-0.5">
                      Đáp án: <b className={m.q.choicesAreJa ? "jp" : ""}>{m.q.choices[m.q.answer]}</b>
                    </p>
                    <p className="mt-1 flex gap-1" title="Số lần đúng liên tiếp khi ôn">
                      {Array.from({ length: MASTER_STREAK }, (_, i) => (
                        <span key={i} className={`h-1.5 w-6 rounded-full ${i < m.streak ? "bg-success" : "bg-line"}`} />
                      ))}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      removeQuizMistake(m.id);
                      reloadQuiz();
                    }}
                    className="text-xs text-muted hover:text-accent"
                  >
                    Xoá
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

      {tab === "chat" &&
        (!user ? (
          <Empty text="Đăng nhập để xem các lỗi Sakura-sensei đã sửa cho bạn khi trò chuyện." href="/login" cta="Đăng nhập" />
        ) : chatError ? (
          <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">{chatError}</p>
        ) : !chat ? (
          <Loading />
        ) : chat.length === 0 ? (
          <Empty text="Chưa có lỗi nào được sửa. Trò chuyện với AI, lỗi của bạn sẽ tự được ghi lại ở đây." href="/chat" cta="Trò chuyện với AI" />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {chatPending.length > 0 && (
                <button onClick={() => setReviewChat(chatPending.slice(0, 15))} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink shadow-sm">
                  Ôn lại {Math.min(15, chatPending.length)} lỗi
                </button>
              )}
              <label className="flex items-center gap-2 text-sm text-muted">
                <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-[var(--primary)]" />
                Hiện cả lỗi đã nhớ ({chat.length - chatPending.length})
              </label>
            </div>
            <ul className="flex flex-col gap-2">
              {chatShown.map((m) => (
                <li key={m.id} className={`rounded-2xl border border-line bg-surface px-4 py-3 text-sm ${chatDone.has(m.id) ? "opacity-60" : ""}`}>
                  <p className="jp text-muted">「{m.sentence}」</p>
                  <p className="jp mt-1 text-base">
                    {m.original && <span className="text-accent line-through">{m.original}</span>}
                    {m.original && " → "}
                    <b className="text-success">{m.corrected}</b>
                  </p>
                  <p className="mt-1 text-muted">{m.explanation}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span>{new Date(m.createdAt).toLocaleDateString("vi-VN")}</span>
                    <button
                      onClick={() => {
                        setChatDone(m.id, !chatDone.has(m.id));
                        setChatDoneState(loadChatDone());
                      }}
                      className="hover:text-ink"
                    >
                      {chatDone.has(m.id) ? "Đánh dấu chưa nhớ" : "✓ Đã nhớ"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <p className="text-4xl">📒</p>
      <p className="mx-auto mt-3 max-w-sm text-sm text-muted">{text}</p>
      <Link href={href} className="mt-4 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink">{cta}</Link>
    </div>
  );
}

/** Ôn lỗi hội thoại: xem câu sai → tự nghĩ cách sửa → lật đáp án → tự đánh giá */
function ChatReview({ items, onExit }: { items: ChatMistake[]; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [remembered, setRemembered] = useState(0);
  const m = items[i];

  const answer = (ok: boolean) => {
    if (ok) {
      setChatDone(m.id, true);
      setRemembered((r) => r + 1);
    }
    bumpActivity("review");
    setRevealed(false);
    setI(i + 1);
  };

  if (!m) {
    return (
      <Card className="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
        <p className="text-5xl">🎉</p>
        <h1 className="text-xl font-bold">Ôn xong {items.length} lỗi</h1>
        <p className="text-sm text-muted">Đã nhớ {remembered} lỗi. Những lỗi chưa nhớ sẽ còn trong sổ để ôn lần sau.</p>
        <button onClick={onExit} className="mt-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink">Về sổ lỗi sai</button>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <button onClick={onExit} aria-label="Thoát">✕</button>
        <span>{i + 1}/{items.length}</span>
      </div>
      <Card className="pop-in flex flex-col gap-3 p-6" key={m.id + revealed}>
        <p className="text-xs font-medium text-muted">Câu bạn đã nói — sai ở đâu, sửa thế nào?</p>
        <p className="jp text-xl">{m.sentence}</p>
        {m.original && (
          <p className="text-sm">
            Phần cần sửa: <span className="jp font-semibold text-accent">{m.original}</span>
          </p>
        )}
        {revealed && (
          <div className="pop-in rounded-xl bg-success-soft px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="jp text-lg font-semibold text-success">{m.corrected}</p>
              <SpeakButton text={m.corrected} size="sm" />
            </div>
            <p className="mt-1 text-sm">{m.explanation}</p>
          </div>
        )}
      </Card>
      {revealed ? (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => answer(false)} className="rounded-xl bg-accent-soft py-3 font-semibold text-accent">Chưa nhớ</button>
          <button onClick={() => answer(true)} className="rounded-xl bg-success-soft py-3 font-semibold text-success">Đã nhớ</button>
        </div>
      ) : (
        <button onClick={() => setRevealed(true)} className="rounded-xl bg-primary py-3.5 font-semibold text-primary-ink">Xem cách sửa</button>
      )}
    </div>
  );
}
