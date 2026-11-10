"use client";

// Tra từ trong câu tiếng Nhật: tách từ bằng Intl.Segmenter (có sẵn trong trình duyệt),
// tìm trong từ điển JLPT N5–N1 của web; không thấy thì hỏi AI.
import { api } from "./api";
import { LEVELS, type Level, type Vocab } from "./data";

export type Token = { text: string; isWord: boolean };

// Trợ từ / đuôi câu không gộp vào từ đứng trước
const STOP = new Set(["は", "が", "を", "に", "で", "へ", "と", "も", "の", "か", "ね", "よ", "や", "な", "から", "まで", "より", "です", "でした", "だ", "けど", "ので", "のに"]);
const KANJI_END = /[一-龯々]$/;
const ALL_HIRA = /^[぀-ゟ]+$/;

export function segment(text: string): Token[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!Seg) return [{ text, isWord: false }];
  const seg = new Seg("ja", { granularity: "word" });
  const raw = [...seg.segment(text)].map((s) => ({ text: s.segment, isWord: !!s.isWordLike && /[぀-ヿ一-龯]/.test(s.segment) }));
  // Bộ tách từ của trình duyệt hay cắt động từ/tính từ quá vụn (行った → 行 / っ / たん):
  // gộp phần đuôi hiragana vào chữ Hán đứng trước, trừ trợ từ.
  const out: Token[] = [];
  let chaining = false;
  for (const t of raw) {
    const prev = out[out.length - 1];
    if (prev?.isWord && t.isWord && t.text.length <= 3 && ALL_HIRA.test(t.text) && !STOP.has(t.text) && (chaining || KANJI_END.test(prev.text))) {
      prev.text += t.text;
      chaining = true;
    } else {
      out.push({ ...t });
      chaining = false;
    }
  }
  return out;
}

type Entry = Vocab & { level: Level };
let indexPromise: Promise<Map<string, Entry[]>> | null = null;

function loadIndex() {
  indexPromise ??= Promise.all(
    LEVELS.map((lv) =>
      fetch(`/data/vocab-${lv}.json`)
        .then((r) => r.json() as Promise<Vocab[]>)
        .then((list) => list.map((v) => ({ ...v, level: lv }))),
    ),
  ).then((lists) => {
    const map = new Map<string, Entry[]>();
    for (const e of lists.flat()) {
      for (const key of new Set([e.word, e.reading])) map.set(key, [...(map.get(key) ?? []), e]);
    }
    return map;
  });
  return indexPromise;
}

export type LookupResult = {
  word: string;
  reading: string;
  meaning: string;
  dictionaryForm?: string;
  note?: string;
  level?: Level;
  source: "dict" | "ai";
};

/** Tra trong từ điển của web (nhanh, miễn phí) */
export async function lookupLocal(word: string): Promise<LookupResult | null> {
  const index = await loadIndex();
  const hits = index.get(word);
  if (!hits?.length) return null;
  const best = hits.find((h) => h.word === word) ?? hits[0];
  return { word: best.word, reading: best.reading, meaning: best.vi || best.meaning, level: best.level, source: "dict" };
}

/** Hỏi AI (hiểu cả dạng đã chia, theo ngữ cảnh câu) */
export async function lookupAI(word: string, context: string): Promise<LookupResult> {
  const r = await api<{ word: string; reading: string; dictionary_form: string; meaning_vi: string; note: string }>("/chat/lookup", {
    body: { word, context },
  });
  return { word: r.word || word, reading: r.reading, meaning: r.meaning_vi, dictionaryForm: r.dictionary_form, note: r.note, source: "ai" };
}
