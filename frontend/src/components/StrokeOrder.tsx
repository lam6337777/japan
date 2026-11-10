"use client";

import { useEffect, useState } from "react";

// Vẽ thứ tự nét từ dữ liệu KanjiVG (CC BY-SA 3.0)
export default function StrokeOrder({ char, size = 220 }: { char: string; size?: number }) {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const hex = char.codePointAt(0)!.toString(16).padStart(5, "0");
    let alive = true;
    setPaths(null);
    setError(false);
    const parse = (svg: string) => [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
    fetch(`/kanjivg/${hex}.svg`)
      .then((r) => (r.ok ? r.text() : fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`).then((r2) => (r2.ok ? r2.text() : Promise.reject()))))
      .then((svg) => alive && setPaths(parse(svg)))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [char]);

  if (error) return <div className="jp flex items-center justify-center text-[9rem] leading-none" style={{ width: size, height: size }}>{char}</div>;

  const perStroke = Math.min(0.6, 6 / Math.max(paths?.length ?? 1, 1));

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative rounded-2xl bg-surface-2" style={{ width: size, height: size }}>
        {/* Lưới ô vuông giúp căn chữ */}
        <svg viewBox="0 0 109 109" className="absolute inset-0 h-full w-full text-line" aria-hidden>
          <path d="M54.5 0v109M0 54.5h109" stroke="currentColor" strokeDasharray="3 3" strokeWidth="0.6" />
        </svg>
        {paths && (
          <svg key={run} viewBox="0 0 109 109" className="absolute inset-0 h-full w-full" role="img" aria-label={`Thứ tự nét chữ ${char}`}>
            {/* Nét mờ làm nền */}
            {paths.map((d, i) => (
              <path key={`bg${i}`} d={d} fill="none" stroke="var(--line)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {paths.map((d, i) => (
              <path
                key={i}
                d={d}
                pathLength={1}
                className="kanji-stroke"
                style={{ animationDelay: `${i * perStroke}s`, animationDuration: `${perStroke * 0.9}s` }}
                fill="none"
                stroke="var(--ink)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
          </svg>
        )}
      </div>
      <button onClick={() => setRun((r) => r + 1)} className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted hover:text-ink" disabled={!paths}>
        ↻ Xem lại cách viết {paths ? `(${paths.length} nét)` : ""}
      </button>
    </div>
  );
}
