"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLevel } from "@/components/AppShell";
import { Loading, PageHeader } from "@/components/ui";
import { useKanji } from "@/lib/data";

export default function KanjiPage() {
  const { level } = useLevel();
  const kanji = useKanji(level);
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    if (!kanji) return [];
    const query = q.trim().toLowerCase();
    if (!query) return kanji;
    return kanji.filter(
      (k) =>
        k.char === query ||
        k.hanViet.toLowerCase().includes(query) ||
        k.vi.toLowerCase().includes(query) ||
        k.meanings.some((m) => m.toLowerCase().includes(query)) ||
        [...k.on, ...k.kun].some((r) => r.replace(/[.-]/g, "").includes(query)),
    );
  }, [kanji, q]);

  return (
    <div>
      <PageHeader title={`Kanji ${level.toUpperCase()}`} subtitle={kanji ? `${kanji.length} chữ · sắp xếp theo độ thông dụng` : undefined}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm theo Hán Việt, nghĩa, cách đọc..."
          className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-primary sm:w-72"
        />
      </PageHeader>

      {!kanji ? (
        <Loading />
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
          {list.map((k) => (
            <Link
              key={k.char}
              href={`/kanji/${level}/${encodeURIComponent(k.char)}`}
              className="group flex aspect-square flex-col items-center justify-center rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md"
            >
              <span className="jp text-4xl transition group-hover:text-accent">{k.char}</span>
              <span className="mt-1 max-w-full truncate px-1 text-[11px] font-semibold tracking-wide text-muted">
                {k.hanViet || k.meanings[0]}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
