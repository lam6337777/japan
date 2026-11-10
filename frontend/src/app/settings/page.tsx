"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { deleteDeck, loadDecks, parseVocabCSV, saveDeck, type Deck } from "@/lib/decks";
import { DEFAULT_SETTINGS, getSettings, saveSettings, type Settings } from "@/lib/settings";
import { speak } from "@/lib/speech";

const SAMPLE = `食べる,たべる,ăn
飲む,のむ,uống
学校,がっこう,trường học`;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [csv, setCsv] = useState("");
  const [deckName, setDeckName] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSettings(getSettings());
    setDecks(loadDecks());
  }, []);

  const update = (patch: Partial<Settings>) => setSettings(saveSettings(patch));
  const parsed = csv.trim() ? parseVocabCSV(csv) : null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setCsv(await file.text());
    if (!deckName) setDeckName(file.name.replace(/\.(csv|tsv|txt)$/i, ""));
  };

  const importDeck = () => {
    if (!parsed?.rows.length) return;
    const deck = saveDeck(deckName, parsed.rows);
    setDecks(loadDecks());
    setCsv("");
    setDeckName("");
    setMessage(`Đã tạo bộ "${deck.name}" với ${deck.cards.length} từ.`);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Cài đặt" subtitle="Tuỳ chỉnh cách học và nhập từ vựng của riêng bạn" />

      <Card>
        <h2 className="mb-4 font-semibold">Flashcard</h2>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-sm">
            Số từ mới mỗi ngày
            <b className="text-primary">{settings.newPerDay} từ</b>
          </span>
          <input type="range" min={5} max={50} step={5} value={settings.newPerDay} onChange={(e) => update({ newPerDay: Number(e.target.value) })} className="accent-[var(--primary)]" />
          <span className="text-xs text-muted">Gợi ý: 10 từ/ngày là vừa sức. Học nhiều từ mới thì số từ phải ôn mỗi ngày cũng tăng theo.</span>
        </label>
        <label className="mt-4 flex cursor-pointer items-center justify-between text-sm">
          Tự đọc khi lật thẻ
          <input type="checkbox" checked={settings.autoSpeakCard} onChange={(e) => update({ autoSpeakCard: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
        </label>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">Giọng đọc</h2>
        <label className="flex flex-col gap-2">
          <span className="flex items-center justify-between text-sm">
            Tốc độ đọc
            <b className="text-primary">{settings.speechRate === 0.9 ? "Bình thường" : settings.speechRate < 0.9 ? "Chậm" : "Nhanh"} ({settings.speechRate.toFixed(1)}×)</b>
          </span>
          <input type="range" min={0.6} max={1.2} step={0.1} value={settings.speechRate} onChange={(e) => update({ speechRate: Number(e.target.value) })} className="accent-[var(--primary)]" />
        </label>
        <button onClick={() => speak("こんにちは。日本語の勉強をがんばりましょう。")} className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-muted hover:text-ink">
          ▶ Nghe thử
        </button>
      </Card>

      <Card>
        <h2 className="font-semibold">Nhập bộ từ vựng (CSV)</h2>
        <p className="mt-1 text-sm text-muted">
          Mỗi dòng một từ: <code className="rounded bg-surface-2 px-1">từ, cách đọc, nghĩa</code> hoặc <code className="rounded bg-surface-2 px-1">từ, nghĩa</code>. Hỗ trợ file .csv từ Excel/Google Sheets và file xuất từ Anki (dạng văn bản, cách nhau bằng tab).
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            onChange={(e) => onFile(e.target.files?.[0])}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
          />
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={`Hoặc dán nội dung vào đây, ví dụ:\n${SAMPLE}`}
            rows={6}
            className="jp w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none placeholder:font-sans placeholder:text-muted focus:border-primary"
          />
          {parsed && (
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-sm">
              <p>
                Đọc được <b>{parsed.rows.length}</b> từ{parsed.skipped ? `, bỏ qua ${parsed.skipped} dòng thiếu dữ liệu` : ""}.
              </p>
              {parsed.rows.length > 0 && (
                <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                  {parsed.rows.slice(0, 6).map((r, i) => (
                    <li key={i} className="truncate">
                      <span className="jp font-medium">{r.word}</span> {r.reading && <span className="jp text-muted">{r.reading}</span>} — {r.meaning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Tên bộ từ (ví dụ: Minna bài 1)"
              className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-primary"
            />
            <button onClick={importDeck} disabled={!parsed?.rows.length} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-ink disabled:opacity-40">
              Tạo bộ từ
            </button>
          </div>
          {message && <p className="rounded-xl bg-success-soft px-4 py-2.5 text-sm text-success">{message}</p>}
        </div>

        {decks.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-semibold text-muted">Bộ từ của bạn</h3>
            <ul className="flex flex-col gap-2">
              {decks.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-xl bg-surface-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-muted">{d.cards.length} từ · tạo {new Date(d.createdAt).toLocaleDateString("vi-VN")}</p>
                  </div>
                  <Link href={`/vocab?deck=${d.id}`} className="rounded-lg px-2 py-1 text-sm text-primary hover:bg-primary-soft">Xem</Link>
                  <Link href={`/vocab/study?deck=${d.id}`} className="rounded-lg px-2 py-1 text-sm text-primary hover:bg-primary-soft">Học</Link>
                  <button
                    onClick={() => {
                      if (!confirm(`Xoá bộ "${d.name}"?`)) return;
                      deleteDeck(d.id);
                      setDecks(loadDecks());
                    }}
                    className="rounded-lg px-2 py-1 text-sm text-muted hover:text-accent"
                  >
                    Xoá
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Bộ từ lưu trong trình duyệt này. Tiến độ ôn tập của bộ từ vẫn được đồng bộ khi bạn đăng nhập.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
