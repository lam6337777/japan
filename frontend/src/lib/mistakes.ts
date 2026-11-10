"use client";

// Sổ lỗi sai: câu làm sai trong bài tập (lưu ở máy) + lỗi được AI sửa khi chat (lấy từ server)
import { load, save } from "./storage";
import type { QuizQuestion } from "@/components/Quiz";

export type QuizMistake = {
  id: string;
  kind: "grammar" | "kanji";
  q: QuizQuestion; // lưu nguyên câu hỏi để làm lại
  at: number;
  streak: number; // số lần làm đúng liên tiếp khi ôn lại; đủ 2 lần thì coi như đã nhớ
};

export type ChatMistake = {
  id: string;
  sessionId: number;
  sentence: string;
  original: string;
  corrected: string;
  explanation: string;
  createdAt: string;
};

const QUIZ_KEY = "nihongo.mistakes.quiz";
const CHAT_DONE_KEY = "nihongo.mistakes.chatDone";
export const MASTER_STREAK = 2;

const idOf = (q: QuizQuestion) => `${q.prompt}|${q.choices[q.answer]}`;

export const loadQuizMistakes = () => load<QuizMistake[]>(QUIZ_KEY, []);

export function addQuizMistake(kind: QuizMistake["kind"], q: QuizQuestion) {
  const list = loadQuizMistakes();
  const id = idOf(q);
  const existing = list.find((m) => m.id === id);
  if (existing) {
    existing.streak = 0;
    existing.at = Date.now();
  } else list.unshift({ id, kind, q, at: Date.now(), streak: 0 });
  save(QUIZ_KEY, list.slice(0, 500));
}

/** Ôn lại 1 câu: đúng → tăng chuỗi (đủ thì xoá khỏi sổ), sai → về 0 */
export function reviewQuizMistake(q: QuizQuestion, correct: boolean) {
  const id = idOf(q);
  const list = loadQuizMistakes()
    .map((m) => (m.id === id ? { ...m, streak: correct ? m.streak + 1 : 0 } : m))
    .filter((m) => m.streak < MASTER_STREAK);
  save(QUIZ_KEY, list);
}

export const removeQuizMistake = (id: string) => save(QUIZ_KEY, loadQuizMistakes().filter((m) => m.id !== id));

export const loadChatDone = () => new Set(load<string[]>(CHAT_DONE_KEY, []));
export function setChatDone(id: string, done: boolean) {
  const s = loadChatDone();
  if (done) s.add(id);
  else s.delete(id);
  save(CHAT_DONE_KEY, [...s]);
}
