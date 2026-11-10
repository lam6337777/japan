"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, ProgressBar, SpeakButton } from "@/components/ui";
import { bumpActivity, type ActivityKind } from "@/lib/activity";
import { addQuizMistake } from "@/lib/mistakes";

export type QuizQuestion = {
  prompt: string; // câu hỏi chính (thường là tiếng Nhật)
  promptIsJa?: boolean;
  hint?: string; // dòng phụ dưới câu hỏi
  choices: string[];
  answer: number; // chỉ số đáp án đúng trong choices
  choicesAreJa?: boolean;
  explain?: string; // giải thích sau khi trả lời
  speak?: string; // văn bản để đọc to sau khi trả lời
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trộn thứ tự lựa chọn nhưng vẫn giữ đúng đáp án */
function shuffleChoices(q: QuizQuestion): QuizQuestion {
  const order = shuffle(q.choices.map((_, i) => i));
  return { ...q, choices: order.map((i) => q.choices[i]), answer: order.indexOf(q.answer) };
}

export default function Quiz({
  title,
  questions,
  backHref,
  backLabel,
  onRestart,
  mistakeKind,
  activity,
  onAnswer,
}: {
  title: string;
  questions: QuizQuestion[];
  backHref: string;
  backLabel: string;
  onRestart?: () => void;
  mistakeKind?: "grammar" | "kanji"; // ghi câu sai vào sổ lỗi
  activity?: ActivityKind; // tính vào kế hoạch học khi làm xong
  onAnswer?: (q: QuizQuestion, correct: boolean) => void;
}) {
  const qs = useMemo(() => questions.map(shuffleChoices), [questions]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<{ q: QuizQuestion; picked: number }[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setIndex(0);
    setPicked(null);
    setWrong([]);
    setDone(false);
  }, [qs]);

  const q = qs[index];

  const choose = useCallback(
    (i: number) => {
      if (picked !== null || !q) return;
      setPicked(i);
      if (i !== q.answer) {
        setWrong((w) => [...w, { q, picked: i }]);
        if (mistakeKind) addQuizMistake(mistakeKind, q);
      }
      onAnswer?.(q, i === q.answer);
    },
    [picked, q, mistakeKind, onAnswer],
  );

  const next = useCallback(() => {
    if (picked === null) return;
    if (index + 1 >= qs.length) {
      setDone(true);
      if (activity) bumpActivity(activity);
    } else {
      setIndex(index + 1);
      setPicked(null);
    }
  }, [picked, index, qs.length, activity]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (["1", "2", "3", "4"].includes(e.key)) choose(Number(e.key) - 1);
      else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, next, done]);

  if (qs.length === 0) {
    return <p className="py-16 text-center text-sm text-muted">Chưa có câu hỏi cho phần này.</p>;
  }

  if (done) {
    const score = qs.length - wrong.length;
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <Card className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</p>
          <h1 className="text-2xl font-bold">
            {score}/{qs.length} câu đúng
          </h1>
          <p className="text-sm text-muted">{pct >= 80 ? "Xuất sắc!" : pct >= 50 ? "Khá tốt, cố thêm chút nữa nhé." : "Ôn lại rồi làm lại nhé."}</p>
          <div className="mt-3 flex gap-2">
            <Link href={backHref} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium">{backLabel}</Link>
            <button onClick={onRestart} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink">Làm lượt mới</button>
          </div>
        </Card>
        {wrong.length > 0 && (
          <Card>
            <h2 className="mb-3 font-semibold">Câu làm sai ({wrong.length})</h2>
            <ul className="flex flex-col gap-3">
              {wrong.map(({ q: w, picked: p }, i) => (
                <li key={i} className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
                  <p className={w.promptIsJa ? "jp text-base" : "text-base"}>{w.prompt}</p>
                  <p className="mt-1">
                    <span className={`text-accent line-through ${w.choicesAreJa ? "jp" : ""}`}>{w.choices[p]}</span>
                    {" → "}
                    <span className={`font-semibold text-success ${w.choicesAreJa ? "jp" : ""}`}>{w.choices[w.answer]}</span>
                  </p>
                  {w.explain && <p className="mt-1 text-muted">{w.explain}</p>}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-sm text-muted hover:text-ink" aria-label="Thoát">✕</Link>
        <ProgressBar value={index + (picked !== null ? 1 : 0)} max={qs.length} color="bg-success" />
        <span className="whitespace-nowrap text-sm text-muted">{index + 1}/{qs.length}</span>
      </div>

      <Card className="pop-in flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center" key={index}>
        <p className="text-xs font-medium text-muted">{title}</p>
        <p className={`${q.promptIsJa ? "jp" : ""} ${q.prompt.length <= 4 ? "text-6xl" : q.prompt.length <= 20 ? "text-2xl" : "text-xl"} font-medium leading-relaxed`}>{q.prompt}</p>
        {q.hint && <p className="text-sm text-muted">{q.hint}</p>}
      </Card>

      <div className="grid gap-2 sm:grid-cols-2">
        {q.choices.map((c, i) => {
          const state = picked === null ? "idle" : i === q.answer ? "correct" : i === picked ? "wrong" : "dim";
          const cls = {
            idle: "border-line bg-surface hover:border-primary hover:bg-primary-soft",
            correct: "border-success bg-success-soft text-success",
            wrong: "border-accent bg-accent-soft text-accent",
            dim: "border-line bg-surface opacity-50",
          }[state];
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={picked !== null}
              className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors ${cls}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-xs font-semibold text-muted">{i + 1}</span>
              <span className={`${q.choicesAreJa ? "jp text-lg" : ""}`}>{c}</span>
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className={`pop-in rounded-xl px-4 py-3 text-sm ${picked === q.answer ? "bg-success-soft" : "bg-accent-soft"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className={`font-semibold ${picked === q.answer ? "text-success" : "text-accent"}`}>{picked === q.answer ? "✓ Chính xác!" : "✗ Chưa đúng"}</p>
            {q.speak && <SpeakButton text={q.speak} size="sm" />}
          </div>
          {q.explain && <p className="mt-1 whitespace-pre-line text-ink">{q.explain}</p>}
        </div>
      )}

      <button
        onClick={next}
        disabled={picked === null}
        className="rounded-xl bg-primary py-3.5 font-semibold text-primary-ink shadow-sm transition hover:opacity-90 disabled:opacity-30"
      >
        {index + 1 >= qs.length ? "Xem kết quả" : "Câu tiếp theo"}
      </button>
      <p className="hidden text-center text-xs text-muted sm:block">Phím tắt: 1–4 chọn đáp án · Enter sang câu tiếp</p>
    </div>
  );
}

export { shuffle };
