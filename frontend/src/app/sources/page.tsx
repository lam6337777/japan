import { Card, PageHeader } from "@/components/ui";

const SOURCES = [
  {
    name: "Open Anki JLPT Decks",
    url: "https://github.com/jamsinclair/open-anki-jlpt-decks",
    use: "Danh sách từ vựng JLPT N5–N1 (dựa trên tanos.co.uk và JMdict)",
    license: "Mã nguồn mở",
  },
  {
    name: "JMdict / KANJIDIC2 — EDRDG",
    url: "https://www.edrdg.org/",
    use: "Nghĩa từ, cách đọc và dữ liệu kanji gốc",
    license: "CC BY-SA 4.0",
  },
  {
    name: "kanji-data (David Gouveia)",
    url: "https://github.com/davidluzgouveia/kanji-data",
    use: "Kanji kèm cấp JLPT, âm On/Kun, số nét, độ thông dụng",
    license: "MIT (dữ liệu từ KANJIDIC2)",
  },
  {
    name: "KanjiVG (Ulrich Apel)",
    url: "https://kanjivg.tagaini.net/",
    use: "Hình vẽ thứ tự nét kanji",
    license: "CC BY-SA 3.0",
  },
  {
    name: "Jonathan Waller — tanos.co.uk",
    url: "http://www.tanos.co.uk/jlpt/",
    use: "Danh sách từ vựng và kanji theo cấp JLPT",
    license: "CC BY",
  },
];

export default function SourcesPage() {
  return (
    <div>
      <PageHeader title="Nguồn dữ liệu" subtitle="Cảm ơn các dự án mở đã giúp xây dựng ứng dụng này" />
      <div className="flex flex-col gap-3">
        {SOURCES.map((s) => (
          <Card key={s.name} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <a href={s.url} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">{s.name}</a>
              <p className="text-sm text-muted">{s.use}</p>
            </div>
            <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">{s.license}</span>
          </Card>
        ))}
        <p className="mt-2 text-sm text-muted">
          Âm Hán Việt, nghĩa tiếng Việt và giải thích ngữ pháp được biên soạn riêng cho dự án (có hỗ trợ của AI) và có thể còn sai sót.
        </p>
      </div>
    </div>
  );
}
