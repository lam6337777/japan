"use client";

import { useEffect, useState } from "react";

export const LEVELS = ["n5", "n4", "n3", "n2", "n1"] as const;
export type Level = (typeof LEVELS)[number];

export type Vocab = { id: string; word: string; reading: string; meaning: string; vi: string };
export type Kanji = {
  char: string;
  hanViet: string;
  vi: string;
  meanings: string[];
  on: string[];
  kun: string[];
  strokes: number | null;
  freq: number | null;
};

const cache = new Map<string, Promise<unknown>>();

function fetchJSON<T>(url: string): Promise<T> {
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url).then((r) => {
        if (!r.ok) throw new Error(`Không tải được ${url}`);
        return r.json();
      }),
    );
  }
  return cache.get(url) as Promise<T>;
}

function useJSON<T>(url: string | null) {
  const [state, setState] = useState<{ url: string | null; data: T | null }>({ url: null, data: null });
  useEffect(() => {
    if (!url) return;
    let alive = true;
    fetchJSON<T>(url).then((data) => alive && setState({ url, data }));
    return () => {
      alive = false;
    };
  }, [url]);
  return state.url === url ? state.data : null;
}

export const useVocab = (level: Level) => useJSON<Vocab[]>(`/data/vocab-${level}.json`);
export const useKanji = (level: Level) => useJSON<Kanji[]>(`/data/kanji-${level}.json`);
export const useStats = () =>
  useJSON<{ vocab: Record<Level, number>; kanji: Record<Level, number> }>("/data/stats.json");

/** Nghĩa hiển thị: ưu tiên tiếng Việt, chưa có thì dùng tiếng Anh */
export const meaningOf = (v: Vocab) => v.vi || v.meaning;
