import n5 from "@/data/grammar-n5.json";
import n4 from "@/data/grammar-n4.json";
import quizN5 from "@/data/grammar-quiz-n5.json";
import quizN4 from "@/data/grammar-quiz-n4.json";

export type GrammarPoint = {
  id: string;
  pattern: string;
  meaning: string;
  structure: string;
  explanation: string;
  examples: { ja: string; kana: string; vi: string }[];
};

export type GrammarQuestion = { q: string; choices: string[]; answer: number; vi: string; explain: string };

// Thêm cấp khác: tạo grammar-<cấp>.json (+ grammar-quiz-<cấp>.json) rồi khai báo ở đây
export const GRAMMAR: Record<string, GrammarPoint[]> = { n5, n4 };
export const GRAMMAR_QUIZ: Record<string, Record<string, GrammarQuestion[]>> = { n5: quizN5, n4: quizN4 };

export function findGrammar(id: string): { level: string; point: GrammarPoint } | null {
  for (const [level, list] of Object.entries(GRAMMAR)) {
    const point = list.find((g) => g.id === id);
    if (point) return { level, point };
  }
  return null;
}
