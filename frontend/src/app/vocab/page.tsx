"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { Loading, PageHeader, SpeakButton } from "@/components/ui";
import { meaningOf, useVocab } from "@/lib/data";
import { loadDecks, type Deck } from "@/lib/decks";
import { loadSeen, toggleStar, useStars } from "@/lib/stars";

type Filter = "all" | "starred" | "seen" | "unseen";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "starred", label: "★ Có sao" },
  { key: "seen", label: "Đã xem" },
  { key: "unseen", label: "Chưa xem" },
];

const PAGE = 60;

export default function VocabPage() {
  const { level } = useLevel();
  const levelVocab = useVocab(level);
  const stars = useStars();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const all = loadDecks();
    setDecks(all);
    setSeen(loadSeen());
    const id = new URLSearchParams(window.location.search).get("deck");
    if (id && all.some((d) => d.id === id)) setDeckId(id);
  }, []);
  useEffect(() => setLimit(PAGE), [level, q, filter, deckId]);

  const deck = deckId ? decks.find((d) => d.id === deckId) ?? null : null;
  const vocab = deck ? deck.cards : levelVocab;
  const selectDeck = (id: string | null) => {
    setDeckId(id);
    window.history.replaceState(null, "", id ? `/vocab?deck=${id}` : "/vocab");
  };

  const list = useMemo(() => {
    if (!vocab) return [];
    const query = q.trim().toLowerCase();
    return vocab.filter((v) => {
      if (filter === "starred" && !stars.has(v.id)) return false;
      if (filter === "seen" && !seen.has(v.id)) return false;
      if (filter === "unseen" && seen.has(v.id)) return false;
      if (!query) return true;
      return v.word.includes(query) || v.reading.includes(query) || v.meaning.toLowerCase().includes(query) || v.vi.toLowerCase().includes(query);
    });
  }, [vocab, q, filter, stars, seen]);

  const starredCount = vocab?.filter((v) => stars.has(v.id)).length ?? 0;
  const deckQuery = deck ? `deck=${deck.id}` : "";
  const hasVi = deck || vocab?.some((v) => v.vi);

  return (
    <div>
      <PageHeader title={deck ? deck.name : `Từ vựng ${level.toUpperCase()}`} subtitle={vocab ? `${vocab.length} từ · ${starredCount} từ có sao` : undefined}>
        <div className="flex flex-wrap gap-2">
          {starredCount > 0 && (
            <Link href={`/vocab/study?${deckQuery ? deckQuery + "&" : ""}starred=1`} className="rounded-xl border-2 border-warn bg-warn-soft px-4 py-2 text-sm font-semibold text-warn transition hover:opacity-90">
              ★ Ôn thẻ có sao ({starredCount})
            </Link>
          )}
          <Link href={`/vocab/study${deckQuery ? "?" + deckQuery : ""}`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink shadow-sm transition hover:opacity-90">
            Học flashcard →
          </Link>
        </div>
      </PageHeader>

      {vocab && !hasVi && (
        <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Nghĩa đang hiển thị bằng tiếng Anh. Chạy <code className="font-mono">cd data &amp;&amp; npm run vi -- --level={level} --kind=vocab</code> để dịch sang tiếng Việt.
        </p>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => selectDeck(null)}
          className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm font-medium ${!deck ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"}`}
        >
          JLPT {level.toUpperCase()}
        </button>
        {decks.map((d) => (
          <button
            key={d.id}
            onClick={() => selectDeck(d.id)}
            className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-sm font-medium ${deck?.id === d.id ? "border-primary bg-primary-soft text-primary" : "border-line bg-surface text-muted hover:text-ink"}`}
          >
            {d.name}
          </button>
        ))}
        <Link href="/settings" className="whitespace-nowrap rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
          + Nhập từ CSV
        </Link>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo từ, cách đọc hoặc nghĩa..."
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-primary sm:max-w-xs"
        />
        <div className="flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${filter === f.key ? "bg-ink text-bg" : "bg-surface text-muted hover:text-ink"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!vocab ? (
        <Loading />
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          {filter === "starred" ? "Chưa có từ nào được đánh dấu sao. Bấm ☆ ở mỗi dòng hoặc trên thẻ flashcard để đánh dấu." : "Không có từ nào phù hợp."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {list.slice(0, limit).map((v) => {
              const starred = stars.has(v.id);
              return (
                <li key={v.id} className="flex items-center gap-2 px-3 py-3 sm:px-4">
                  <button
                    onClick={() => toggleStar(v.id)}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg transition ${starred ? "text-warn" : "text-muted/60 hover:text-warn"}`}
                    aria-label={starred ? "Bỏ đánh dấu sao" : "Đánh dấu sao"}
                  >
                    {starred ? "★" : "☆"}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="jp flex flex-wrap items-baseline gap-x-2">
                      <span className="text-lg font-medium">{v.word}</span>
                      {v.reading !== v.word && <span className="text-sm text-muted">{v.reading}</span>}
                      {seen.has(v.id) && <span className="font-sans text-[11px] text-success">đã xem</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{meaningOf(v)}</p>
                  </div>
                  <SpeakButton text={v.reading || v.word} />
                </li>
              );
            })}
          </ul>
          {limit < list.length && (
            <div className="mt-4 flex justify-center">
              <button onClick={() => setLimit((l) => l + PAGE)} className="rounded-xl border border-line bg-surface px-4 py-2 text-sm text-muted hover:text-ink">
                Xem thêm ({list.length - limit} từ)
              </button>
            </div>
          )}
          <p className="mt-4 text-center text-xs text-muted">
            Muốn máy tự nhắc ôn đúng lúc sắp quên?{" "}
            <Link href={`/vocab/review${deckQuery ? "?" + deckQuery : ""}`} className="text-primary hover:underline">
              Dùng chế độ ôn tập ngắt quãng
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
