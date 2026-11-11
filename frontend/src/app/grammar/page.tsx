"use client";

import Link from "next/link";
import { useState } from "react";
import { useLevel } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { GRAMMAR, groupGrammar } from "@/lib/grammar";

export default function GrammarPage() {
  const { level } = useLevel();
  const list = GRAMMAR[level] ?? [];
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query ? list.filter((g) => g.pattern.toLowerCase().includes(query) || g.meaning.toLowerCase().includes(query)) : list;
  const groups = groupGrammar(list).map((g) => ({ ...g, items: g.items.filter((it) => shown.includes(it.point)) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader title={`Ngữ pháp ${level.toUpperCase()}`} subtitle={list.length ? `${list.length} mẫu câu · bấm vào mẫu để xem bài học` : undefined}>
        {list.length > 0 && (
          <div className="flex w-full gap-2 sm:w-auto">
            <Link href="/grammar/quiz" className="whitespace-nowrap rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90">
              Làm bài tập
            </Link>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm mẫu câu hoặc nghĩa..."
              className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-primary sm:w-64"
            />
          </div>
        )}
      </PageHeader>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="jp text-4xl">準備中</p>
          <p className="mt-3 text-sm text-muted">
            Ngữ pháp {level.toUpperCase()} đang được bổ sung. Hiện đã có N5 và N4. Bạn vẫn có thể luyện hội thoại {level.toUpperCase()} với AI.
          </p>
        </div>
      ) : groups.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">Không tìm thấy mẫu câu phù hợp.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.group}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
                {g.group}
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">{g.items.length}</span>
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.items.map(({ point, index }) => (
                  <Link
                    key={point.id}
                    href={`/grammar/${point.id}`}
                    className="group flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-success hover:shadow-md"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-sm font-semibold text-success">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="jp block text-lg font-medium leading-snug">{point.pattern}</span>
                      <span className="block text-sm text-muted">{point.meaning}</span>
                    </span>
                    <span className="self-center text-muted transition group-hover:translate-x-1 group-hover:text-success">›</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
