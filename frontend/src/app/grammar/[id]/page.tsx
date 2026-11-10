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

async function GrammarDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = findGrammar(id);
  if (!found) notFound();
  const { level, point: g } = found;
  const list = GRAMMAR[level];
  const idx = list.findIndex((x) => x.id === id);
  const prev = list[idx - 1];
  const next = list[idx + 1];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/grammar" className="text-sm text-muted hover:text-ink">← Ngữ pháp {level.toUpperCase()}</Link>

      <Card className="border-l-4 border-l-success">
        <p className="text-xs font-medium text-success">Mẫu {idx + 1} · {level.toUpperCase()}</p>
        <h1 className="jp mt-1 text-3xl font-bold">{g.pattern}</h1>
        <p className="mt-1 text-lg">{g.meaning}</p>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-muted">Cấu trúc</h2>
          <p className="jp rounded-xl bg-surface-2 px-4 py-3">{g.structure}</p>
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-muted">Cách dùng</h2>
          <p className="leading-relaxed">{g.explanation}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">Ví dụ</h2>
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
      </Card>

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

      <Link
        href={`/chat?grammar=${g.id}`}
        className="flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-primary-ink transition hover:opacity-95"
      >
        <span>
          <span className="block font-semibold">Luyện mẫu câu này với AI</span>
          <span className="block text-sm opacity-80">AI sẽ hỏi để bạn trả lời bằng 「{g.pattern}」</span>
        </span>
        <span className="text-xl">→</span>
      </Link>

      <div className="flex justify-between text-sm">
        {prev ? <Link href={`/grammar/${prev.id}`} className="jp rounded-xl border border-line bg-surface px-4 py-2">‹ {prev.pattern}</Link> : <span />}
        {next ? <Link href={`/grammar/${next.id}`} className="jp rounded-xl border border-line bg-surface px-4 py-2">{next.pattern} ›</Link> : <span />}
      </div>
    </div>
  );
}
