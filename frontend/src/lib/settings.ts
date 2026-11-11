"use client";

import { load, save } from "./storage";

export type Settings = {
  newPerDay: number; // số từ mới mỗi ngày trong flashcard
  speechRate: number; // tốc độ đọc (0.6 – 1.2)
  autoSpeakCard: boolean; // tự đọc khi lật thẻ
  voiceURI: string; // giọng đọc tiếng Nhật đã chọn ("" = tự chọn giọng tốt nhất)
  pitch: number; // độ cao giọng (0.7 – 1.3)
};

export const DEFAULT_SETTINGS: Settings = { newPerDay: 10, speechRate: 0.9, autoSpeakCard: true, voiceURI: "", pitch: 1 };
const KEY = "nihongo.settings";

export const getSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEY, {}) });

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  save(KEY, next);
  return next;
}
