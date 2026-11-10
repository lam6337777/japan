"use client";

import { load, save } from "./storage";

export type Settings = {
  newPerDay: number; // số từ mới mỗi ngày trong flashcard
  speechRate: number; // tốc độ đọc (0.6 – 1.2)
  autoSpeakCard: boolean; // tự đọc khi lật thẻ
};

export const DEFAULT_SETTINGS: Settings = { newPerDay: 10, speechRate: 0.9, autoSpeakCard: true };
const KEY = "nihongo.settings";

export const getSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...load<Partial<Settings>>(KEY, {}) });

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  save(KEY, next);
  return next;
}
