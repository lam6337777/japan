"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { Card, Loading, ProgressBar, SpeakButton } from "@/components/ui";
import { meaningOf, useVocab, type Vocab } from "@/lib/data";
import { describeInterval, getDaily, loadSrs, newPerDay, review, type Grade, type SrsStore } from "@/lib/srs";
import { getDeck } from "@/lib/decks";
import { getSettings } from "@/lib/settings";
import { speak } from "@/lib/speech";

const GRADES: { grade: Grade; label: string; key: string; cls: string }[] = [
  { grade: 0, label: "Quên", key: "1", cls: "bg-accent-soft text-accent hover:bg-accent hover:text-white" },
  { grade: 1, label: "Khó", key: "2", cls: "bg-warn-soft text-warn hover:bg-warn hover:text-white" },
  { grade: 2, label: "Nhớ", key: "3", cls: "bg-primary-soft text-primary hover:bg-primary hover:text-primary-ink" },
  { grade: 3, label: "Dễ", key: "4", cls: "bg-success-soft text-success hover:bg-success hover:text-white" },
];

type QItem = { v: Vocab; isNew: boolean };

export default function StudyPage() {
  const { level } = useLevel();
  const levelVocab = useVocab(level);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [deck, setDeck] = useState<{ id: string; name: string; cards: Vocab[] } | null | undefined>(undefined);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("deck");
    setDeck(id ? getDeck(id) : null);
    setAutoSpeak(getSettings().autoSpeakCard);
  }, []);
  const vocab = deck === undefined ? null : deck ? deck.cards : levelVocab;
  const [queue, setQueue] = useState<QItem[] | null>(null);
  const [srs, setSrs] = useState<SrsStore>({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);

  // Tạo hàng đợi: từ đến hạn ôn + từ mới (giới hạn mỗi ngày)
  useEffect(() => {
    if (!vocab) return;
    const store = loadSrs();
    const now = Date.now();
    const dueItems = vocab.filter((v) => store[v.id] && store[v.id].due <= now).map((v) => ({ v, isNew: false }));
    const newLeft = Math.max(0, newPerDay() - getDaily().newCount);
    // Trộn thứ tự từ mới cố định (tránh học theo bảng chữ cái: ああ, あう, あお...)
    const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
    const newItems = vocab
      .filter((v) => !store[v.id])
      .sort((a, b) => hash(a.id) - hash(b.id))
      .slice(0, newLeft).map((v) => ({ v, isNew: true }));
    const q = [...dueItems.sort(() => Math.random() - 0.5), ...newItems];
    setSrs(store);
    setQueue(q);
    setTotal(q.length);
    setDone(0);
    setRevealed(false);
  }, [vocab]);

  const current = queue?.[0];

  const reveal = useCallback(() => {
    setRevealed(true);
    if (current && autoSpeak) speak(current.v.reading || current.v.word);
  }, [current, autoSpeak]);

  const grade = useCallback(
    (g: Grade) => {
      if (!current || !queue) return;
      review(current.v.id, g, current.isNew);
      setSrs(loadSrs());
      const rest = queue.slice(1);
      // Quên → đưa thẻ về cuối hàng để ôn lại trong phiên này
      if (g === 0) rest.push({ v: current.v, isNew: false });
      else setDone((d) => d + 1);
      setQueue(rest);
      setRevealed(false);
    },
    [current, queue],
  );

  // Phím tắt: Space = lật thẻ, 1-4 = đánh giá
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!revealed) reveal();
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        grade((Number(e.key) - 1) as Grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, reveal, grade]);

  if (!vocab || !queue) return <Loading />;

  if (!current) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="jp text-6xl">🎉</p>
        <h1 className="mt-4 text-2xl font-bold">{total > 0 ? "Hoàn thành phiên học!" : "Hôm nay đã học xong"}</h1>
        <p className="mt-2 text-sm text-muted">
          {total > 0 ? `Bạn đã ôn ${done} từ. ` : ""}Không còn từ nào đến hạn. Quay lại vào ngày mai để ôn tiếp nhé.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium">Trang chủ</Link>
          <Link href="/chat" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink">Luyện nói với AI →</Link>
        </div>
      </div>
    );
  }

  const { v, isNew } = current;
  const card = srs[v.id];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link href={deck ? `/vocab?deck=${deck.id}` : "/vocab"} className="text-sm text-muted hover:text-ink" aria-label="Thoát">✕</Link>
        <ProgressBar value={done} max={total} color="bg-success" />
        <span className="whitespace-nowrap text-sm text-muted">{done}/{total}</span>
      </div>

      <Card className="pop-in flex min-h-[340px] flex-col items-center justify-center gap-3 p-8 text-center" key={v.id + revealed}>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isNew ? "bg-accent-soft text-accent" : "bg-primary-soft text-primary"}`}>
          {isNew ? "Từ mới" : "Ôn tập"}
        </span>
        <p className="jp text-5xl font-medium md:text-6xl">{v.word}</p>

        {revealed ? (
          <div className="pop-in mt-2 flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              <p className="jp text-xl text-muted">{v.reading}</p>
              <SpeakButton text={v.reading || v.word} />
            </div>
            <p className="text-lg font-semibold">{meaningOf(v)}</p>
            {v.vi && <p className="text-sm text-muted">{v.meaning}</p>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Bạn có nhớ cách đọc và nghĩa không?</p>
        )}
      </Card>

      {revealed ? (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <button key={g.grade} onClick={() => grade(g.grade)} className={`flex flex-col items-center rounded-xl py-3 font-semibold transition-colors ${g.cls}`}>
              {g.label}
              <span className="text-[11px] font-normal opacity-80">{describeInterval(card, g.grade)}</span>
            </button>
          ))}
        </div>
      ) : (
        <button onClick={reveal} className="rounded-xl bg-primary py-3.5 font-semibold text-primary-ink shadow-sm transition hover:opacity-90">
          Hiện đáp án
        </button>
      )}

      <div className="flex items-center justify-between text-xs text-muted">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="accent-[var(--primary)]" />
          Tự đọc khi lật thẻ
        </label>
        <span className="hidden sm:inline">Phím tắt: Space lật thẻ · 1–4 đánh giá</span>
      </div>
    </div>
  );
}
