"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { shuffle } from "@/components/Quiz";
import { Loading, ProgressBar, SpeakButton } from "@/components/ui";
import { bumpActivity } from "@/lib/activity";
import { meaningOf, useVocab, type Vocab } from "@/lib/data";
import { getDeck } from "@/lib/decks";
import { getSettings } from "@/lib/settings";
import { speak } from "@/lib/speech";
import { markSeen, toggleStar, useStars } from "@/lib/stars";
import { load, save } from "@/lib/storage";

export default function FlashcardPage() {
  const { level } = useLevel();
  const levelVocab = useVocab(level);
  const stars = useStars();

  const [params, setParams] = useState<{ deckId: string | null; starredOnly: boolean } | null>(null);
  const [deck, setDeck] = useState<{ id: string; name: string; cards: Vocab[] } | null>(null);
  const [order, setOrder] = useState<Vocab[] | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const deckId = p.get("deck");
    setParams({ deckId, starredOnly: p.get("starred") === "1" });
    if (deckId) setDeck(getDeck(deckId));
    setAutoSpeak(getSettings().autoSpeakCard);
  }, []);

  const source = params?.deckId ? deck?.cards ?? null : levelVocab;
  const sourceKey = params ? `${params.deckId ?? level}${params.starredOnly ? ":star" : ""}` : "";
  const posKey = `nihongo.flashPos.${sourceKey}`;

  // Danh sách thẻ (chỉ lấy thẻ có sao nếu đang ôn thẻ có sao). Danh sách sao chụp lúc mở
  // để bỏ sao giữa chừng không làm thẻ biến mất.
  const [starSnapshot, setStarSnapshot] = useState<Set<string> | null>(null);
  useEffect(() => {
    if (params && !starSnapshot && stars) setStarSnapshot(new Set(stars));
  }, [params, stars, starSnapshot]);

  const cards = useMemo(() => {
    if (!source || !params) return null;
    if (!params.starredOnly) return source;
    return starSnapshot ? source.filter((v) => starSnapshot.has(v.id)) : null;
  }, [source, params, starSnapshot]);

  // Khôi phục vị trí đang học
  useEffect(() => {
    if (!cards) return;
    setOrder(cards);
    setShuffled(false);
    const saved = load<number>(posKey, 0);
    setIndex(saved < cards.length ? saved : 0);
    setFlipped(false);
  }, [cards, posKey]);

  const card = order?.[index];

  useEffect(() => {
    if (order && !shuffled) save(posKey, index);
  }, [index, order, shuffled, posKey]);

  const flip = useCallback(() => {
    if (!card) return;
    setFlipped((f) => {
      if (!f) {
        if (autoSpeak) speak(card.reading || card.word);
        if (markSeen(card.id)) bumpActivity("review");
      }
      return !f;
    });
  }, [card, autoSpeak]);

  const go = useCallback(
    (delta: number) => {
      if (!order) return;
      setFlipped(false);
      setIndex((i) => Math.min(order.length - 1, Math.max(0, i + delta)));
    },
    [order],
  );

  const toggleShuffle = () => {
    if (!cards) return;
    setOrder(shuffled ? cards : shuffle(cards));
    setShuffled(!shuffled);
    setIndex(0);
    setFlipped(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "s" && card) toggleStar(card.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flip, go, card]);

  if (!params || !order) return <Loading />;

  const backHref = params.deckId ? `/vocab?deck=${params.deckId}` : "/vocab";
  const title = params.deckId ? deck?.name ?? "Bộ từ" : `Từ vựng ${level.toUpperCase()}`;

  if (order.length === 0) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-5xl">☆</p>
        <h1 className="mt-4 text-xl font-bold">Chưa có thẻ nào được đánh dấu sao</h1>
        <p className="mt-2 text-sm text-muted">Khi học flashcard, bấm ★ ở góc thẻ để đánh dấu từ cần ôn lại.</p>
        {/* thẻ <a> để tải lại trang (đổi tham số ?starred) */}
        <a href={params.deckId ? `/vocab/study?deck=${params.deckId}` : "/vocab/study"} className="mt-6 inline-block rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-ink">Học flashcard</a>
      </div>
    );
  }

  const starred = card ? stars.has(card.id) : false;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href={backHref} className="text-sm text-muted hover:text-ink" aria-label="Thoát">✕</Link>
        <ProgressBar value={index + 1} max={order.length} />
        <span className="whitespace-nowrap text-sm text-muted">
          {index + 1}/{order.length}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium">
          {title}
          {params.starredOnly && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs text-warn">★ Thẻ có sao</span>}
        </span>
        <button onClick={toggleShuffle} className={`rounded-lg border px-2.5 py-1 text-xs ${shuffled ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"}`}>
          🔀 {shuffled ? "Đang trộn" : "Trộn thẻ"}
        </button>
      </div>

      {/* Thẻ lật */}
      {card && (
        <div className="flip-scene h-[340px] cursor-pointer select-none" onClick={flip} role="button" aria-label={flipped ? "Lật lại mặt trước" : "Lật xem đáp án"}>
          <div className={`flip-card ${flipped ? "is-flipped" : ""}`}>
            {/* Mặt trước */}
            <div className="flip-face flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
              <p className="jp text-5xl font-medium md:text-6xl">{card.word}</p>
              <p className="mt-4 text-sm text-muted">Bấm vào thẻ để xem đáp án</p>
            </div>
            {/* Mặt sau */}
            <div className="flip-face flip-back flex flex-col items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary-soft p-8 text-center shadow-sm">
              <p className="jp text-4xl font-medium">{card.word}</p>
              <div className="flex items-center gap-1">
                <p className="jp text-xl text-muted">{card.reading}</p>
                <SpeakButton text={card.reading || card.word} />
              </div>
              <p className="text-xl font-semibold">{meaningOf(card)}</p>
              {card.vi && card.meaning && <p className="text-sm text-muted">{card.meaning}</p>}
            </div>
          </div>
          {/* Nút sao — nằm trên cả 2 mặt */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(card.id);
            }}
            className={`absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-2xl transition ${starred ? "text-warn" : "text-muted/50 hover:text-warn"}`}
            aria-label={starred ? "Bỏ đánh dấu sao" : "Đánh dấu sao để ôn lại"}
            title={starred ? "Bỏ đánh dấu sao (S)" : "Đánh dấu sao để ôn lại (S)"}
          >
            {starred ? "★" : "☆"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => go(-1)} disabled={index === 0} className="rounded-xl border border-line bg-surface py-3.5 font-semibold transition hover:border-primary disabled:opacity-30">
          ← Trước
        </button>
        {index + 1 < order.length ? (
          <button onClick={() => go(1)} className="rounded-xl bg-primary py-3.5 font-semibold text-primary-ink shadow-sm transition hover:opacity-90">
            Sau →
          </button>
        ) : (
          <Link href={backHref} className="flex items-center justify-center rounded-xl bg-success py-3.5 font-semibold text-white shadow-sm">
            ✓ Hết bộ thẻ
          </Link>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="accent-[var(--primary)]" />
          Tự đọc khi lật thẻ
        </label>
        <span className="hidden sm:inline">Space lật thẻ · ← → chuyển thẻ · S đánh dấu sao</span>
      </div>
    </div>
  );
}
