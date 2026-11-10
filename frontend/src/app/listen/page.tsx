"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { shuffle } from "@/components/Quiz";
import { Card, PageHeader, ProgressBar } from "@/components/ui";
import { bumpActivity } from "@/lib/activity";
import { markTarget, scoreAgainst } from "@/lib/compare";
import { GRAMMAR } from "@/lib/grammar";
import { speak, useSpeechRecognition } from "@/lib/speech";

type Mode = "shadow" | "dictation";
type Sentence = { ja: string; kana: string; vi: string; pattern: string };
const ROUND = 10;

export default function ListenPage() {
  const { level } = useLevel();
  const [mode, setMode] = useState<Mode>("shadow");
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ score: number; target: string } | null>(null);
  const [showText, setShowText] = useState(true);
  const [scores, setScores] = useState<number[]>([]);
  const [ready, setReady] = useState(false); // chỉ trộn câu ở trình duyệt (tránh lỗi khi render tĩnh)
  useEffect(() => setReady(true), []);

  const source = GRAMMAR[level] ? level : "n4";
  const sentences = useMemo<Sentence[]>(
    () => !ready ? [] : shuffle((GRAMMAR[source] ?? []).flatMap((g) => g.examples.map((e) => ({ ...e, pattern: g.pattern })))).slice(0, ROUND),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, round, ready],
  );
  const s = sentences[index];

  const reset = useCallback(() => {
    setAnswer("");
    setResult(null);
  }, []);

  useEffect(() => {
    setIndex(0);
    setScores([]);
    reset();
  }, [sentences, mode, reset]);

  const check = useCallback(
    (text: string) => {
      if (!s || !text.trim()) return;
      const r = scoreAgainst(text, s.ja, s.kana);
      setAnswer(text);
      setResult(r);
      setScores((sc) => [...sc, r.score]);
      bumpActivity("listen");
    },
    [s],
  );

  const mic = useSpeechRecognition((text) => check(text));

  const next = () => {
    reset();
    setIndex((i) => i + 1);
  };

  const finished = index >= sentences.length;
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <PageHeader
        title="Nghe & Nói"
        subtitle={source === level ? `Câu mẫu trình độ ${level.toUpperCase()}` : `Trình độ ${level.toUpperCase()} chưa có câu mẫu — đang dùng câu ${source.toUpperCase()}`}
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["shadow", "🎤 Nói theo"],
            ["dictation", "✍️ Chép chính tả"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-lg py-2 text-sm font-semibold transition-colors ${mode === k ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {finished ? (
        <Card className="flex flex-col items-center gap-2 py-10 text-center">
          <p className="text-5xl">{avg >= 80 ? "🎉" : avg >= 60 ? "👍" : "💪"}</p>
          <h2 className="text-2xl font-bold">Điểm trung bình {avg}%</h2>
          <p className="text-sm text-muted">{scores.length} câu · {mode === "shadow" ? "Shadowing" : "Chép chính tả"}</p>
          <button onClick={() => setRound((r) => r + 1)} className="mt-3 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-ink">Luyện lượt mới</button>
        </Card>
      ) : s ? (
        <>
          <div className="flex items-center gap-3">
            <ProgressBar value={index} max={sentences.length} color="bg-success" />
            <span className="whitespace-nowrap text-sm text-muted">{index + 1}/{sentences.length}</span>
          </div>

          <Card className="flex flex-col items-center gap-4 p-6 text-center" key={`${round}-${index}`}>
            <p className="text-xs font-medium text-muted">
              {mode === "shadow" ? "Nghe rồi nói lại thật giống" : "Nghe rồi gõ lại câu bạn nghe được"} · Mẫu câu <span className="jp">{s.pattern}</span>
            </p>
            <div className="flex gap-2">
              <button onClick={() => speak(s.ja)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-semibold text-primary-ink">▶ Nghe</button>
              <button onClick={() => speak(s.ja, { rate: 0.6 })} className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-muted hover:text-ink">🐢 Nghe chậm</button>
            </div>

            {mode === "shadow" && (showText || result) && (
              <div>
                <p className="jp text-2xl leading-relaxed">{s.ja}</p>
                <p className="jp text-sm text-muted">{s.kana}</p>
              </div>
            )}
            {(mode === "shadow" ? showText || result : result) && <p className="text-sm">{s.vi}</p>}
            {mode === "shadow" && !result && (
              <button onClick={() => setShowText((v) => !v)} className="text-xs text-muted underline hover:text-ink">
                {showText ? "Ẩn chữ (chỉ nghe)" : "Hiện chữ"}
              </button>
            )}
          </Card>

          {/* Khu vực trả lời */}
          {!result &&
            (mode === "shadow" ? (
              mic.supported ? (
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={mic.listening ? mic.stop : mic.start}
                    className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-md transition ${mic.listening ? "bg-accent" : "bg-accent/90 hover:bg-accent"}`}
                    aria-label={mic.listening ? "Dừng" : "Bấm để nói"}
                  >
                    {mic.listening && <span className="absolute inset-0 animate-ping rounded-full bg-accent opacity-30" />}
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" />
                      <path d="M5 10a7 7 0 0 0 14 0M12 17v5" />
                    </svg>
                  </button>
                  <p className="jp min-h-6 text-sm text-muted">{mic.listening ? mic.interim || "Đang nghe... hãy nói câu trên" : "Bấm micro rồi nói"}</p>
                </div>
              ) : (
                <p className="rounded-xl bg-warn-soft px-4 py-3 text-center text-sm text-warn">Trình duyệt chưa hỗ trợ nhận dạng giọng nói. Hãy dùng Chrome hoặc Edge, hoặc chuyển sang Chép chính tả.</p>
              )
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  check(answer);
                }}
                className="flex gap-2"
              >
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Gõ câu tiếng Nhật bạn nghe được (kana hoặc kanji đều được)"
                  className="jp min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 py-3 outline-none placeholder:font-sans placeholder:text-sm placeholder:text-muted focus:border-primary"
                  autoFocus
                />
                <button type="submit" disabled={!answer.trim()} className="rounded-xl bg-primary px-4 font-semibold text-primary-ink disabled:opacity-40">Kiểm tra</button>
              </form>
            ))}

          {/* Kết quả */}
          {result && (
            <Card className={`pop-in flex flex-col gap-3 ${result.score >= 80 ? "border-success" : result.score >= 50 ? "border-warn" : "border-accent"}`}>
              <div className="flex items-center justify-between">
                <p className={`text-3xl font-bold ${result.score >= 80 ? "text-success" : result.score >= 50 ? "text-warn" : "text-accent"}`}>{result.score}%</p>
                <p className="text-sm text-muted">{result.score >= 90 ? "Tuyệt vời!" : result.score >= 80 ? "Rất tốt!" : result.score >= 50 ? "Gần đúng rồi" : "Thử lại nhé"}</p>
              </div>
              <div>
                <p className="text-xs text-muted">{mode === "shadow" ? "Máy nghe được:" : "Bạn đã gõ:"}</p>
                <p className="jp text-lg">{answer}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Câu mẫu (chữ đỏ là phần còn thiếu/sai):</p>
                <p className="jp text-lg">
                  {markTarget(result.target, answer).map((m, i) => (
                    <span key={i} className={m.ok ? "" : "rounded bg-accent-soft text-accent underline decoration-wavy"}>
                      {m.ch}
                    </span>
                  ))}
                </p>
                {mode === "dictation" && <p className="jp mt-1 text-sm text-muted">{result.target === s.ja ? s.kana : s.ja}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={reset} className="flex-1 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium">Thử lại</button>
                <button onClick={next} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-ink">Câu tiếp →</button>
              </div>
            </Card>
          )}
          <p className="text-center text-xs text-muted">
            Điểm được chấm bằng cách so khớp chữ, không chấm ngữ điệu. Máy nhận dạng có thể nghe nhầm từ đồng âm — tham khảo thôi nhé.
          </p>
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted">Chưa có câu mẫu.</p>
      )}
    </div>
  );
}
