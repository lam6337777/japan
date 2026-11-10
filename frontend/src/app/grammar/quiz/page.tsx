"use client";

import { useEffect, useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import Quiz, { shuffle, type QuizQuestion } from "@/components/Quiz";
import { Loading } from "@/components/ui";
import { findGrammar, GRAMMAR_QUIZ, type GrammarQuestion } from "@/lib/grammar";

const ROUND = 10;

function toQuiz(q: GrammarQuestion, pattern?: string): QuizQuestion {
  const full = q.q.replace(/（\s*）/, q.choices[q.answer]);
  return {
    prompt: q.q,
    promptIsJa: true,
    hint: pattern ? `Mẫu câu: ${pattern}` : undefined,
    choices: q.choices,
    answer: q.answer,
    choicesAreJa: true,
    explain: [q.vi && `「${full}」 — ${q.vi}`, q.explain].filter(Boolean).join("\n"),
    speak: full,
  };
}

export default function GrammarQuizPage() {
  const { level } = useLevel();
  const [pointId, setPointId] = useState<string | null | undefined>(undefined);
  const [round, setRound] = useState(0);

  useEffect(() => {
    setPointId(new URLSearchParams(window.location.search).get("id"));
  }, []);

  const found = pointId ? findGrammar(pointId) : null;

  const questions = useMemo(() => {
    if (pointId === undefined) return [];
    if (found) return (GRAMMAR_QUIZ[found.level]?.[found.point.id] ?? []).map((q) => toQuiz(q));
    // Không chọn mẫu cụ thể → trộn ngẫu nhiên câu hỏi của cả cấp độ
    const all = Object.entries(GRAMMAR_QUIZ[level] ?? {}).flatMap(([id, qs]) => qs.map((q) => toQuiz(q, findGrammar(id)?.point.pattern)));
    return shuffle(all).slice(0, ROUND);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointId, level, round]);

  if (pointId === undefined) return <Loading />;

  return (
    <Quiz
      title={found ? `Bài tập · ${found.point.pattern}` : `Bài tập ngữ pháp ${level.toUpperCase()} (ngẫu nhiên)`}
      questions={questions}
      backHref={found ? `/grammar/${found.point.id}` : "/grammar"}
      backLabel={found ? "Xem lại mẫu câu" : "Về trang Ngữ pháp"}
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}
