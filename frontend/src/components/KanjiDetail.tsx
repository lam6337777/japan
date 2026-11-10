"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, Loading, Pill, SpeakButton } from "@/components/ui";
import StrokeOrder from "@/components/StrokeOrder";
import { LEVELS, meaningOf, useKanji, useVocab, type Level } from "@/lib/data";

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default function KanjiDetail() {
  const params = useParams<{ level: string; char: string }>();
  const level = (LEVELS.includes(params.level as Level) ? params.level : "n5") as Level;
  const char = safeDecode(params.char);
  const kanji = useKanji(level);
  const vocab = useVocab(level);

  if (!kanji) return <Loading />;
  const idx = kanji.findIndex((k) => k.char === char);
  const k = kanji[idx];
  if (!k) return <p className="py-16 text-center text-muted">Không tìm thấy chữ {char}.</p>;

  const prev = kanji[idx - 1];
  const next = kanji[idx + 1];
  const examples = (vocab ?? []).filter((v) => v.word.includes(char)).slice(0, 12);
  const clean = (r: string) => r.replace(/\./g, "").replace(/-/g, "");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between text-sm">
        <Link href="/kanji" className="text-muted hover:text-ink">← Kanji {level.toUpperCase()}</Link>
        <div className="flex gap-2">
          {prev && <Link href={`/kanji/${level}/${encodeURIComponent(prev.char)}`} className="jp rounded-lg border border-line bg-surface px-3 py-1">‹ {prev.char}</Link>}
          {next && <Link href={`/kanji/${level}/${encodeURIComponent(next.char)}`} className="jp rounded-lg border border-line bg-surface px-3 py-1">{next.char} ›</Link>}
        </div>
      </div>

      <Card className="grid items-center gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex justify-center"><StrokeOrder char={char} /></div>
        <div className="flex flex-col gap-4">
          <div>
            {k.hanViet && <p className="text-3xl font-bold tracking-wide text-accent">{k.hanViet}</p>}
            <p className="mt-1 text-lg">{k.vi || k.meanings.join(", ")}</p>
            {k.vi && <p className="text-sm text-muted">{k.meanings.join(", ")}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted">Âm On (音読み)</p>
              <p className="jp mt-1 flex flex-wrap gap-x-3 text-lg">{k.on.length ? k.on.map((r) => <span key={r}>{r}</span>) : "—"}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs font-medium text-muted">Âm Kun (訓読み)</p>
              <p className="jp mt-1 flex flex-wrap gap-x-3 text-lg">
                {k.kun.length
                  ? k.kun.map((r) => {
                      const [stem, okuri] = r.replace(/-/g, "").split(".");
                      return (
                        <span key={r}>
                          {stem}
                          {okuri && <span className="text-muted">{okuri}</span>}
                        </span>
                      );
                    })
                  : "—"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="primary">JLPT {level.toUpperCase()}</Pill>
            {k.strokes && <Pill>{k.strokes} nét</Pill>}
            {k.freq && <Pill>Độ thông dụng #{k.freq}</Pill>}
            {k.on[0] && <SpeakButton text={clean(k.on[0])} size="sm" label="Nghe âm On" />}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Từ vựng {level.toUpperCase()} có chữ {char}</h2>
        {!vocab ? (
          <Loading />
        ) : examples.length === 0 ? (
          <p className="text-sm text-muted">Chưa có từ ví dụ ở cấp này.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {examples.map((v) => (
              <li key={v.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="jp">
                    <span className="font-medium">{v.word}</span> <span className="text-sm text-muted">{v.reading}</span>
                  </p>
                  <p className="truncate text-sm text-muted">{meaningOf(v)}</p>
                </div>
                <SpeakButton text={v.reading} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
