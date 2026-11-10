"use client";

import { load, save } from "./storage";
import type { Vocab } from "./data";

// Bộ từ vựng tự tạo (nhập từ CSV). Lưu trong trình duyệt; trạng thái ôn tập vẫn đồng bộ lên server.
export type Deck = { id: string; name: string; createdAt: number; cards: Vocab[] };

const KEY = "nihongo.decks";

export const loadDecks = () => load<Deck[]>(KEY, []);
export const getDeck = (id: string) => loadDecks().find((d) => d.id === id) ?? null;

export function saveDeck(name: string, rows: { word: string; reading: string; meaning: string }[]): Deck {
  const id = Date.now().toString(36);
  const seen = new Set<string>();
  const cards: Vocab[] = [];
  for (const r of rows) {
    const cardId = `deck-${id}-${r.word}-${r.reading}`;
    if (seen.has(cardId)) continue;
    seen.add(cardId);
    cards.push({ id: cardId, word: r.word, reading: r.reading || r.word, meaning: "", vi: r.meaning });
  }
  const deck: Deck = { id, name: name.trim() || "Bộ từ của tôi", createdAt: Date.now(), cards };
  save(KEY, [...loadDecks(), deck]);
  return deck;
}

export function deleteDeck(id: string) {
  save(KEY, loadDecks().filter((d) => d.id !== id));
}

// ---------- Đọc CSV / TSV ----------
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const HEADER_WORDS = /^(word|từ|tu|kanji|expression|từ vựng|tango|単語|reading|cách đọc|meaning|nghĩa)$/i;

/**
 * Nhận text CSV/TSV với các cột: từ, cách đọc, nghĩa (cách đọc có thể bỏ trống).
 * Tự nhận dấu phân cách (tab, dấu phẩy, chấm phẩy) và bỏ dòng tiêu đề nếu có.
 */
export function parseVocabCSV(text: string): { rows: { word: string; reading: string; meaning: string }[]; skipped: number } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], skipped: 0 };
  const sample = lines.slice(0, 5).join("\n");
  const sep = sample.includes("\t") ? "\t" : (sample.match(/;/g)?.length ?? 0) > (sample.match(/,/g)?.length ?? 0) ? ";" : ",";
  let skipped = 0;
  const rows: { word: string; reading: string; meaning: string }[] = [];
  lines.forEach((line, i) => {
    const cols = splitLine(line, sep);
    if (i === 0 && HEADER_WORDS.test(cols[0] ?? "")) return; // dòng tiêu đề
    const [word, a = "", b = ""] = cols;
    if (!word) return void skipped++;
    // 2 cột: từ, nghĩa  ·  3 cột: từ, cách đọc, nghĩa
    const row = cols.length >= 3 ? { word, reading: a, meaning: b } : { word, reading: "", meaning: a };
    if (!row.meaning) return void skipped++;
    rows.push(row);
  });
  return { rows, skipped };
}
