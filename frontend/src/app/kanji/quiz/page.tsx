"use client";

import { useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import Quiz, { shuffle, type QuizQuestion } from "@/components/Quiz";
import { Loading, PageHeader } from "@/components/ui";
import { meaningOf, useKanji, useVocab, type Kanji, type Vocab } from "@/lib/data";

type Mode = "meaning" | "kanji" | "reading";

const MODES: { key: Mode; title: string; desc: string; icon: string }[] = [
  { key: "meaning", title: "Kanji → Nghĩa", desc: "Nhìn chữ Hán, chọn âm Hán Việt và nghĩa", icon: "字" },
  { key: "kanji", title: "Nghĩa → Kanji", desc: "Đọc nghĩa, chọn đúng chữ Hán", icon: "意" },
  { key: "reading", title: "Cách đọc từ vựng", desc: "Chọn cách đọc đúng của từ có kanji", icon: "読" },
];

const ROUND = 10;

const kanjiLabel = (k: Kanji) => (k.hanViet ? `${k.hanViet} · ${k.vi || k.meanings[0]}` : k.meanings.slice(0, 2).join(", "));

/** Lấy 3 lựa chọn sai khác đáp án */
function distractors<T>(pool: T[], correct: T, key: (x: T) => string, n = 3): T[] {
  const seen = new Set([key(correct)]);
  const out: T[] = [];
  for (const x of shuffle(pool)) {
    if (out.length >= n) break;
    if (seen.has(key(x))) continue;
    seen.add(key(x));
    out.push(x);
  }
  return out;
}

function build(mode: Mode, kanji: Kanji[], vocab: Vocab[]): QuizQuestion[] {
  if (mode === "reading") {
    const withKanji = vocab.filter((v) => /[一-龯]/.test(v.word) && v.reading !== v.word);
    return shuffle(withKanji)
      .slice(0, ROUND)
      .map((v) => {
        const wrong = distractors(withKanji, v, (x) => x.reading).map((x) => x.reading);
        return {
          prompt: v.word,
          promptIsJa: true,
          hint: meaningOf(v),
          choices: [v.reading, ...wrong],
          answer: 0,
          choicesAreJa: true,
          explain: `${v.word} đọc là「${v.reading}」— ${meaningOf(v)}`,
          speak: v.reading,
        };
      });
  }
  return shuffle(kanji)
    .slice(0, ROUND)
    .map((k) => {
      const wrong = distractors(kanji, k, (x) => (mode === "meaning" ? kanjiLabel(x) : x.char));
      const reading = [...k.on.slice(0, 2), ...k.kun.slice(0, 2).map((r) => r.replace(/[.-]/g, ""))].join("、");
      return mode === "meaning"
        ? {
            prompt: k.char,
            promptIsJa: true,
            choices: [kanjiLabel(k), ...wrong.map(kanjiLabel)],
            answer: 0,
            explain: `${k.char}: ${kanjiLabel(k)} · Cách đọc: ${reading}`,
            speak: k.on[0] ?? k.kun[0]?.replace(/[.-]/g, ""),
          }
        : {
            prompt: kanjiLabel(k),
            choices: [k.char, ...wrong.map((x) => x.char)],
            answer: 0,
            choicesAreJa: true,
            explain: `${k.char}: ${kanjiLabel(k)} · Cách đọc: ${reading}`,
          };
    });
}

export default function KanjiQuizPage() {
  const { level } = useLevel();
  const kanji = useKanji(level);
  const vocab = useVocab(level);
  const [mode, setMode] = useState<Mode | null>(null);
  const [round, setRound] = useState(0);

  const questions = useMemo(
    () => (mode && kanji && vocab ? build(mode, kanji, vocab) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, kanji, vocab, round],
  );

  if (!kanji || !vocab) return <Loading />;

  if (!mode) {
    return (
      <div>
        <PageHeader title={`Kiểm tra Kanji ${level.toUpperCase()}`} subtitle={`Mỗi lượt ${ROUND} câu, câu hỏi chọn ngẫu nhiên`} />
        <div className="grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <span className="jp flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-2xl text-accent">{m.icon}</span>
              <span>
                <span className="block font-semibold">{m.title}</span>
                <span className="block text-sm text-muted">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Quiz
      title={MODES.find((m) => m.key === mode)!.title}
      questions={questions}
      backHref="/kanji"
      backLabel="Về trang Kanji"
      onRestart={() => setRound((r) => r + 1)}
    />
  );
}
