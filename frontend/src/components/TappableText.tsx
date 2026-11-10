"use client";

import { useMemo, useState } from "react";
import { SpeakButton } from "@/components/ui";
import { addToSavedDeck } from "@/lib/decks";
import { lookupAI, lookupLocal, segment, type LookupResult } from "@/lib/dictionary";

/** Câu tiếng Nhật mà mỗi từ đều bấm được để xem nghĩa và lưu vào flashcard */
export default function TappableText({ text, className = "" }: { text: string; className?: string }) {
  const tokens = useMemo(() => segment(text), [text]);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "notfound" | "error">("idle");
  const [saved, setSaved] = useState<string | null>(null);

  const open = async (i: number) => {
    if (selected === i) {
      setSelected(null);
      return;
    }
    setSelected(i);
    setResult(null);
    setSaved(null);
    setState("loading");
    const hit = await lookupLocal(tokens[i].text);
    if (hit) {
      setResult(hit);
      setState("idle");
    } else setState("notfound");
  };

  const askAI = async () => {
    if (selected === null) return;
    setState("loading");
    try {
      setResult(await lookupAI(tokens[selected].text, text));
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const save = () => {
    if (!result) return;
    const word = result.dictionaryForm || result.word;
    const r = addToSavedDeck(word, result.reading, result.meaning);
    setSaved(r === "added" ? "Đã lưu vào bộ “Từ đã lưu”" : "Từ này đã có trong bộ “Từ đã lưu”");
  };

  return (
    <>
      <p className={`jp ${className}`}>
        {tokens.map((t, i) =>
          t.isWord ? (
            <button
              key={i}
              type="button"
              onClick={() => open(i)}
              className={`rounded-sm decoration-dotted underline-offset-4 transition-colors hover:bg-primary-soft hover:underline ${selected === i ? "bg-primary-soft text-primary underline" : ""}`}
            >
              {t.text}
            </button>
          ) : (
            <span key={i}>{t.text}</span>
          ),
        )}
      </p>

      {selected !== null && (
        <div className="pop-in mt-2 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm">
          {state === "loading" && <p className="text-muted">Đang tra...</p>}
          {state === "notfound" && (
            <p className="flex flex-wrap items-center gap-2 text-muted">
              <span className="jp font-medium text-ink">{tokens[selected].text}</span> chưa có trong từ điển (có thể đang ở dạng chia).
              <button onClick={askAI} className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-ink">Hỏi AI</button>
            </p>
          )}
          {state === "error" && <p className="text-accent">Không tra được, thử lại sau nhé.</p>}
          {state === "idle" && result && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="jp text-lg font-semibold">{result.word}</span>
                {result.reading && result.reading !== result.word && <span className="jp text-muted">{result.reading}</span>}
                {result.level && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">{result.level.toUpperCase()}</span>}
                <SpeakButton text={result.reading || result.word} size="sm" />
              </div>
              {result.dictionaryForm && result.dictionaryForm !== result.word && (
                <p className="text-xs text-muted">
                  Thể từ điển: <span className="jp">{result.dictionaryForm}</span>
                </p>
              )}
              <p>{result.meaning}</p>
              {result.note && <p className="text-xs text-muted">{result.note}</p>}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <button onClick={save} className="rounded-lg bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-ink">
                  + Lưu vào flashcard
                </button>
                {result.source === "dict" && (
                  <button onClick={askAI} className="rounded-lg px-2 py-1 text-xs text-muted hover:text-ink" title="Giải thích theo ngữ cảnh câu này">
                    Hỏi AI theo ngữ cảnh
                  </button>
                )}
                {saved && <span className="text-xs text-success">{saved}</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
