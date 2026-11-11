import n5 from "@/data/grammar-n5.json";
import n4 from "@/data/grammar-n4.json";
import quizN5 from "@/data/grammar-quiz-n5.json";
import quizN4 from "@/data/grammar-quiz-n4.json";

type Example = { ja: string; kana: string; vi: string };

export type GrammarPoint = {
  id: string;
  pattern: string;
  meaning: string;
  structure: string;
  explanation: string;
  examples: Example[];
  group?: string; // "Bài X" theo giáo trình Minna no Nihongo
  lesson?: number; // 0 = mẫu bổ sung
  summary?: string;
  when?: string[];
  notWhen?: string[];
  conjugation?: { label: string; example: string }[];
  variants?: { label: string; pattern?: string; example?: string }[];
  dialogue?: { speaker: string; ja: string; vi: string }[];
  mistakes?: { wrong: string; right: string; note?: string }[];
  compare?: { pattern: string; difference: string }[];
  tip?: string;
};

export type GrammarQuestion = { q: string; choices: string[]; answer: number; vi: string; explain: string };

// Thêm cấp khác: tạo grammar-<cấp>.json (+ grammar-quiz-<cấp>.json) rồi khai báo ở đây
export const GRAMMAR: Record<string, GrammarPoint[]> = { n5: n5 as GrammarPoint[], n4: n4 as GrammarPoint[] };
export const GRAMMAR_QUIZ: Record<string, Record<string, GrammarQuestion[]>> = { n5: quizN5, n4: quizN4 };

export function findGrammar(id: string): { level: string; point: GrammarPoint } | null {
  for (const [level, list] of Object.entries(GRAMMAR)) {
    const point = list.find((g) => g.id === id);
    if (point) return { level, point };
  }
  return null;
}

/** Gom mẫu ngữ pháp theo nhóm (giữ thứ tự xuất hiện) */
export function groupGrammar(list: GrammarPoint[]): { group: string; items: { point: GrammarPoint; index: number }[] }[] {
  const out: { group: string; items: { point: GrammarPoint; index: number }[] }[] = [];
  list.forEach((point, index) => {
    const group = point.group ?? "Mẫu câu";
    let g = out.find((x) => x.group === group);
    if (!g) out.push((g = { group, items: [] }));
    g.items.push({ point, index });
  });
  return out;
}
