// So sánh câu người học nói/gõ với câu mẫu (chấm điểm shadowing & chép chính tả)

/** Bỏ dấu câu/khoảng trắng, chuyển katakana → hiragana, số toàn góc → số thường */
export function normalizeJa(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s、。，．,.!?！？「」『』（）()・〜~ー―…"'“”]/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Độ giống 0–100 giữa 2 chuỗi đã chuẩn hoá */
export function similarity(a: string, b: string): number {
  const x = normalizeJa(a);
  const y = normalizeJa(b);
  if (!x && !y) return 100;
  return Math.max(0, Math.round((1 - levenshtein(x, y) / Math.max(x.length, y.length)) * 100));
}

/**
 * Chấm câu trả lời so với câu mẫu (có kanji) và bản kana của nó — lấy điểm cao hơn,
 * vì người học có thể gõ/nói ra kana hoặc kanji.
 */
export function scoreAgainst(answer: string, ja: string, kana: string): { score: number; target: string } {
  const a = similarity(answer, ja);
  const b = similarity(answer, kana);
  return a >= b ? { score: a, target: ja } : { score: b, target: kana };
}

/** Đánh dấu ký tự nào của câu mẫu xuất hiện (theo thứ tự) trong câu trả lời — dùng LCS */
export function markTarget(target: string, answer: string): { ch: string; ok: boolean }[] {
  const t = [...target];
  const a = [...normalizeJa(answer)];
  const tn = t.map((c) => normalizeJa(c));
  const dp = Array.from({ length: t.length + 1 }, () => new Array<number>(a.length + 1).fill(0));
  for (let i = t.length - 1; i >= 0; i--)
    for (let j = a.length - 1; j >= 0; j--)
      dp[i][j] = tn[i] && tn[i] === a[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: { ch: string; ok: boolean }[] = [];
  let i = 0;
  let j = 0;
  while (i < t.length) {
    if (!tn[i]) {
      out.push({ ch: t[i], ok: true }); // dấu câu, khoảng trắng — không chấm
      i++;
    } else if (j < a.length && tn[i] === a[j]) {
      out.push({ ch: t[i], ok: true });
      i++;
      j++;
    } else if (j < a.length && dp[i][j + 1] >= dp[i + 1][j]) j++;
    else {
      out.push({ ch: t[i], ok: false });
      i++;
    }
  }
  return out;
}
