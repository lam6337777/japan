"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { Loading, PageHeader, Pill, SpeakButton } from "@/components/ui";
import { meaningOf, useVocab } from "@/lib/data";
import { loadDecks, type Deck } from "@/lib/decks";
import { loadSrs, statusOf, type SrsStore, type Status } from "@/lib/srs";

const FILTERS: { key: "all" | Status; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "new", label: "Chưa học" },
  { key: "learning", label: "Đang học" },
  { key: "mastered", label: "Thành thạo" },
];

const PAGE = 60;

export default function VocabPage() {
  const { level } = useLevel();
  const levelVocab = useVocab(level);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState<string | null>(null);
  useEffect(() => {
    const all = loadDecks();
    setDecks(all);
    const id = new URLSearchParams(window.location.search).get("deck");
    if (id && all.some((d) => d.id === id)) setDeckId(id);
  }, []);
  const deck = deckId ? decks.find((d) => d.id === deckId) ?? null : null;
  const vocab = deck ? deck.cards : levelVocab;
  const selectDeck = (id: string | null) => {
    setDeckId(id);
    window.history.replaceState(null, "", id ? `/vocab?deck=${id}` : "/vocab");
  };
  const [srs, setSrs] = useState<SrsStore>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const refresh = () => setSrs(loadSrs());
    refresh();
    window.addEventListener("nihongo:synced", refresh);
    return () => window.removeEventListener("nihongo:synced", refresh);
  }, []);
  useEffect(() => setLimit(PAGE), [level, q, filter, deckId]);

  const list = useMemo(() => {
    if (!vocab) return [];
    const query = q.trim().toLowerCase();
    return vocab.filter((v) => {
      if (filter !== "all" && statusOf(srs[v.id]) !== filter) return false;
      if (!query) return true;
      return v.word.includes(query) || v.reading.includes(query) || v.meaning.toLowerCase().includes(query) || v.vi.toLowerCase().includes(query);
    });
  }, [vocab, q, filter, srs]);

  const hasVi = deck || vocab?.some((v) => v.vi);

  return (
    <div>
      <PageHeader title={deck ? deck.name : `Từ vựng ${level.toUpperCase()}`} subtitle={vocab ? `${vocab.length} từ` : undefined}>
        <Link href={deck ? `/vocab/study?deck=${deck.id}` : "/vocab/study"} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink shadow-sm transition hover:opacity-90">
          Học flashcard →
        </Link>
      </PageHeader>

      {vocab && !hasVi && (
        <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Nghĩa đang hiển thị bằng tiếng Anh. Khi có API key DeepSeek, chạy <code className="font-mono">npm run data:vi</code> để dịch sang tiếng Việt.
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
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${
                filter === f.key ? "bg-ink text-bg" : "bg-surface text-muted hover:text-ink"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!vocab ? (
        <Loading />
      ) : list.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Không có từ nào phù hợp.</p>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {list.slice(0, limit).map((v) => {
              const st = statusOf(srs[v.id]);
              return (
                <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${st === "mastered" ? "bg-success" : st === "learning" ? "bg-warn" : "bg-line"}`}
                    title={FILTERS.find((f) => f.key === st)?.label}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="jp flex flex-wrap items-baseline gap-x-2">
                      <span className="text-lg font-medium">{v.word}</span>
                      {v.reading !== v.word && <span className="text-sm text-muted">{v.reading}</span>}
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
          <p className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
            <Pill>● Chưa học</Pill>
            <Pill tone="warn">● Đang học</Pill>
            <Pill tone="success">● Thành thạo (ôn cách ≥ 21 ngày)</Pill>
          </p>
        </>
      )}
    </div>
  );
}
