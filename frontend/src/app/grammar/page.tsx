"use client";

import Link from "next/link";
import { useState } from "react";
import { useLevel } from "@/components/AppShell";
import { PageHeader } from "@/components/ui";
import { GRAMMAR } from "@/lib/grammar";

export default function GrammarPage() {
  const { level } = useLevel();
  const list = GRAMMAR[level] ?? [];
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const shown = query
    ? list.filter((g) => g.pattern.toLowerCase().includes(query) || g.meaning.toLowerCase().includes(query))
    : list;

  return (
    <div>
      <PageHeader title={`Ngữ pháp ${level.toUpperCase()}`} subtitle={list.length ? `${list.length} mẫu câu` : undefined}>
        {list.length > 0 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm mẫu câu hoặc nghĩa..."
            className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-primary sm:w-64"
          />
        )}
      </PageHeader>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="jp text-4xl">準備中</p>
          <p className="mt-3 text-sm text-muted">
            Ngữ pháp {level.toUpperCase()} đang được bổ sung. Hiện tại đã có đầy đủ phần N5. Bạn vẫn có thể luyện hội thoại {level.toUpperCase()} với AI.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {shown.map((g, i) => (
            <Link
              key={g.id}
              href={`/grammar/${g.id}`}
              className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-success hover:shadow-md"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-sm font-semibold text-success">{i + 1}</span>
              <span className="min-w-0">
                <span className="jp block text-lg font-medium">{g.pattern}</span>
                <span className="block text-sm text-muted">{g.meaning}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
