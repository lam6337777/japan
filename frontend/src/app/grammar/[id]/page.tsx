import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Loading, SpeakButton } from "@/components/ui";
import { GRAMMAR, findGrammar } from "@/lib/grammar";

export function generateStaticParams() {
  return Object.values(GRAMMAR).flatMap((list) => list.map((g) => ({ id: g.id })));
}

export default function Page({ params }: PageProps<"/grammar/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <GrammarDetail params={params} />
    </Suspense>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 font-semibold">
        <span aria-hidden>{icon}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

async function GrammarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = findGrammar(id);
  if (!found) notFound();
  const { level, point: g } = found;
  const list = GRAMMAR[level];
  const idx = list.findIndex((x) => x.id === id);
  const prev = list[idx - 1];
  const next = list[idx + 1];
  const summary = g.summary || g.explanation;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/grammar" className="text-sm text-muted hover:text-ink">← Ngữ pháp {level.toUpperCase()}</Link>

      {/* Tiêu đề */}
      <Card className="border-l-4 border-l-success">
        <p className="text-xs font-medium text-success">
          Mẫu {idx + 1} · {level.toUpperCase()}
          {g.group ? ` · ${g.group}` : ""}
        </p>
        <h1 className="jp mt-1 text-2xl font-bold leading-snug sm:text-3xl">{g.pattern}</h1>
        <p className="mt-1 text-lg">{g.meaning}</p>
        {g.tip && <p className="mt-3 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">💡 {g.tip}</p>}
      </Card>

      {/* Ý nghĩa + cấu trúc */}
      <Section title="Ý nghĩa" icon="📖">
        <p className="leading-relaxed">{summary}</p>
        {g.structure && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-medium text-muted">Cấu trúc</p>
            <p className="jp rounded-xl bg-surface-2 px-4 py-3 font-medium">{g.structure}</p>
          </div>
        )}
      </Section>

      {/* Khi nào dùng */}
      {(g.when?.length || g.notWhen?.length) ? (
        <Section title="Khi nào dùng" icon="🎯">
          <ul className="flex flex-col gap-2 text-sm">
            {g.when?.map((w, i) => (
              <li key={`w${i}`} className="jp flex gap-2"><span className="shrink-0 text-success">✓</span><span>{w}</span></li>
            ))}
            {g.notWhen?.map((w, i) => (
              <li key={`n${i}`} className="jp flex gap-2"><span className="shrink-0 text-accent">✗</span><span>{w}</span></li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Cách chia */}
      {g.conjugation?.length ? (
        <Section title="Cách chia" icon="🔧">
          <div className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
            {g.conjugation.map((c, i) => (
              <div key={i} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <span className="shrink-0 text-sm font-medium text-muted sm:w-48">{c.label}</span>
                <span className="jp">{c.example}</span>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {/* Biến thể */}
      {g.variants?.length ? (
        <Section title="Dạng phủ định, câu hỏi…" icon="🔁">
          <ul className="flex flex-col gap-3">
            {g.variants.map((v, i) => (
              <li key={i} className="rounded-xl bg-surface-2 px-4 py-3">
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">{v.label}</span>
                {v.pattern && <p className="jp mt-1.5 font-medium">{v.pattern}</p>}
                {v.example && <p className="jp mt-0.5 text-sm text-muted">{v.example}</p>}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Ví dụ */}
      <Section title="Ví dụ" icon="📝">
        <ul className="flex flex-col gap-3">
          {g.examples.map((ex) => (
            <li key={ex.ja} className="flex items-start gap-3 rounded-xl bg-surface-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="jp text-lg">{ex.ja}</p>
                <p className="jp text-sm text-muted">{ex.kana}</p>
                <p className="mt-1 text-sm">{ex.vi}</p>
              </div>
              <SpeakButton text={ex.ja} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Hội thoại */}
      {g.dialogue?.length ? (
        <Section title="Hội thoại mẫu" icon="💬">
          <div className="flex flex-col gap-3">
            {g.dialogue.map((d, i) => {
              const right = i % 2 === 1;
              return (
                <div key={i} className={`flex items-start gap-2 ${right ? "flex-row-reverse" : ""}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${right ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent"}`}>
                    {d.speaker}
                  </span>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${right ? "rounded-tr-sm bg-primary-soft" : "rounded-tl-sm bg-surface-2"}`}>
                    <div className="flex items-start gap-1">
                      <p className="jp">{d.ja}</p>
                      <SpeakButton text={d.ja} size="sm" />
                    </div>
                    <p className="text-xs text-muted">{d.vi}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      ) : null}

      {/* Lỗi hay mắc */}
      {g.mistakes?.length ? (
        <Section title="Lỗi người Việt hay mắc" icon="⚠️">
          <ul className="flex flex-col gap-3">
            {g.mistakes.map((m, i) => (
              <li key={i} className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
                <p className="jp text-accent"><span className="font-semibold">✗</span> <span className="line-through">{m.wrong}</span></p>
                <p className="jp mt-1 text-success"><span className="font-semibold">✓</span> {m.right}</p>
                {m.note && <p className="mt-1 text-ink/80">{m.note}</p>}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* So sánh */}
      {g.compare?.length ? (
        <Section title="Phân biệt với mẫu dễ nhầm" icon="⚖️">
          <ul className="flex flex-col gap-3">
            {g.compare.map((c, i) => (
              <li key={i} className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
                <p className="jp font-semibold">{c.pattern}</p>
                <p className="jp mt-1 text-muted">{c.difference}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* Luyện tập */}
      <Link
        href={`/grammar/quiz?id=${g.id}`}
        className="flex items-center justify-between rounded-2xl border-2 border-success bg-success-soft px-5 py-4 text-success transition hover:opacity-90"
      >
        <span>
          <span className="block font-semibold">Làm bài tập mẫu câu này</span>
          <span className="block text-sm opacity-80">Trắc nghiệm điền vào chỗ trống, có giải thích đáp án</span>
        </span>
        <span className="text-xl">→</span>
      </Link>
      <Link href={`/chat?grammar=${g.id}`} className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-ink transition hover:opacity-95">
        <span>
          <span className="block font-semibold">Luyện mẫu câu này với AI</span>
          <span className="block text-sm opacity-80">AI sẽ hỏi để bạn trả lời bằng 「{g.pattern}」</span>
        </span>
        <span className="text-xl">→</span>
      </Link>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {prev ? <Link href={`/grammar/${prev.id}`} className="jp truncate rounded-xl border border-line bg-surface px-4 py-2.5">‹ {prev.pattern}</Link> : <span />}
        {next ? <Link href={`/grammar/${next.id}`} className="jp truncate rounded-xl border border-line bg-surface px-4 py-2.5 text-right">{next.pattern} ›</Link> : <span />}
      </div>
    </div>
  );
}
