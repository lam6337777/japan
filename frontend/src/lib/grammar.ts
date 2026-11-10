import n5 from "@/data/grammar-n5.json";

export type GrammarPoint = {
  id: string;
  pattern: string;
  meaning: string;
  structure: string;
  explanation: string;
  examples: { ja: string; kana: string; vi: string }[];
};

// Thêm các cấp khác: tạo src/data/grammar-n4.json ... rồi khai báo ở đây
export const GRAMMAR: Record<string, GrammarPoint[]> = { n5 };

export function findGrammar(id: string): { level: string; point: GrammarPoint } | null {
  for (const [level, list] of Object.entries(GRAMMAR)) {
    const point = list.find((g) => g.id === id);
    if (point) return { level, point };
  }
  return null;
}
