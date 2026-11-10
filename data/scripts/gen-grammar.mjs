// Sinh nội dung ngữ pháp bằng DeepSeek
//   npm run grammar -- --kind=points --level=n4   → frontend/src/data/grammar-n4.json (giải thích + ví dụ từ danh sách mẫu câu)
//   npm run grammar -- --kind=quiz --level=n5     → frontend/src/data/grammar-quiz-n5.json (câu hỏi trắc nghiệm)
// Chạy lại sẽ chỉ sinh phần còn thiếu. Nội dung do AI viết — nên đọc lại và sửa tay nếu cần.
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.resolve(ROOT, "../frontend/src/data");

try {
  const env = await readFile(path.resolve(ROOT, "../chatbot/.env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const KEY = process.env.DEEPSEEK_API_KEY;
if (!KEY) {
  console.error("Thiếu DEEPSEEK_API_KEY trong chatbot/.env");
  process.exit(1);
}

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const kind = arg("kind", "quiz");
const level = arg("level", "n5");
const exists = (p) => access(p).then(() => true, () => false);

async function askJSON(system, user) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 6000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const content = (await res.json()).choices[0].message.content ?? "";
    try {
      return JSON.parse(content);
    } catch {
      console.log(`  (JSON lỗi, thử lại ${attempt}/3)`);
    }
  }
  throw new Error("AI trả JSON lỗi 3 lần liên tiếp");
}

// ---------------- Danh sách mẫu ngữ pháp N4 ----------------
const N4_POINTS = [
  ["koto-ga-dekiru", "V (từ điển) ことができる", "có thể làm V"],
  ["kanoukei", "Thể khả năng (V られる / V える)", "có thể làm V"],
  ["ta-koto-ga-aru", "V た ことが ある", "đã từng làm V"],
  ["tari-tari", "V たり V たり する", "lúc thì… lúc thì…, làm nào là… nào là…"],
  ["nagara", "V (bỏ ます) ながら", "vừa… vừa…"],
  ["te-shimau", "V て しまう", "lỡ làm, làm xong hết"],
  ["te-oku", "V て おく", "làm sẵn, làm trước"],
  ["te-miru", "V て みる", "thử làm"],
  ["te-aru", "V (tha động từ) て ある", "đã được làm sẵn (trạng thái)"],
  ["you-to-omou", "V (ý chí) よう と思う", "định làm"],
  ["yotei", "V (từ điển) / N の 予定です", "dự định, theo kế hoạch"],
  ["nakereba-naranai", "V なければ ならない", "phải làm"],
  ["nakute-mo-ii", "V なくても いい", "không làm cũng được"],
  ["tara", "〜たら", "nếu, khi (điều kiện)"],
  ["ba", "〜ば", "nếu (điều kiện)"],
  ["to-joken", "V (từ điển) と", "hễ… thì… (kết quả tất yếu)"],
  ["nara", "〜なら", "nếu là…, nếu vậy thì…"],
  ["te-mo", "〜ても", "dù… cũng…"],
  ["noni", "〜のに", "vậy mà, mặc dù"],
  ["node", "〜ので", "vì… (lý do khách quan, lịch sự)"],
  ["sou-da-yousou", "V (bỏ ます) / A (bỏ い/な) そうだ", "trông có vẻ (phỏng đoán qua quan sát)"],
  ["sou-da-denbun", "Thể thường + そうだ", "nghe nói là"],
  ["you-da", "〜ようだ / 〜みたいだ", "hình như, có vẻ như"],
  ["rashii", "〜らしい", "nghe nói, có vẻ; đúng kiểu, ra dáng"],
  ["kamoshirenai", "〜かもしれない", "có lẽ, không chừng"],
  ["deshou", "〜でしょう / 〜だろう", "chắc là"],
  ["ukemi", "Thể bị động (V られる)", "bị, được (làm gì)"],
  ["shieki", "Thể sai khiến (V させる)", "bắt, cho phép (ai) làm"],
  ["jujudoushi", "V て あげる / くれる / もらう", "làm cho ai / ai làm cho mình / nhờ ai làm"],
  ["sugiru", "〜すぎる", "quá…"],
  ["yasui-nikui", "V (bỏ ます) やすい / にくい", "dễ… / khó…"],
  ["tame-ni", "〜ために", "để (mục đích); vì (nguyên nhân)"],
  ["you-ni", "V (từ điển/ない) ように", "để (mục tiêu, trạng thái mong muốn)"],
  ["you-ni-naru", "V (từ điển) ように なる", "trở nên có thể, bắt đầu (thay đổi thói quen)"],
  ["koto-ni-suru", "V ことに する / ことに なる", "quyết định làm / được quyết định là"],
  ["baai-wa", "〜場合は", "trong trường hợp"],
  ["ka-douka", "〜かどうか", "có… hay không"],
  ["aida-ni", "〜間 / 〜間に", "trong suốt khi / trong lúc (xảy ra một việc)"],
  ["keigo", "尊敬語・謙譲語 cơ bản (いらっしゃる, 召し上がる, 参る, いたす…)", "kính ngữ và khiêm nhường ngữ"],
  ["bakari", "V た ばかり / N ばかり", "vừa mới làm / toàn là"],
];

const POINT_SYSTEM = `Bạn là giáo viên tiếng Nhật giỏi, viết giáo trình cho người Việt học JLPT ${level.toUpperCase()}.
Với mỗi mẫu ngữ pháp, viết nội dung chính xác, dễ hiểu. Ví dụ phải tự nhiên, dùng từ vựng phù hợp trình độ.
Trả về JSON: {"items": [{"id": "<giữ nguyên id>", "pattern": "<mẫu câu, tiếng Nhật>", "meaning": "<nghĩa ngắn gọn tiếng Việt>",
"structure": "<cách chia/kết hợp, ví dụ: V (thể từ điển) + ことができる>", "explanation": "<giải thích cách dùng 1-3 câu tiếng Việt, nêu lưu ý quan trọng>",
"examples": [{"ja": "<câu ví dụ có kanji>", "kana": "<cùng câu viết toàn hiragana/katakana, có cách giữa các cụm>", "vi": "<dịch tiếng Việt>"}]}]}
Mỗi mẫu 3 ví dụ.`;

const QUIZ_SYSTEM = `Bạn là giáo viên tiếng Nhật ra đề luyện thi JLPT ${level.toUpperCase()} cho người Việt.
Với mỗi mẫu ngữ pháp, tạo 4 câu hỏi trắc nghiệm điền vào chỗ trống, kiểu đề JLPT:
- "q": câu tiếng Nhật có đúng 1 chỗ trống viết là （　　）. Ngữ cảnh phải đủ rõ để chỉ 1 đáp án đúng.
- "choices": đúng 4 lựa chọn ngắn (cùng loại, gây nhiễu hợp lý, ví dụ trợ từ/cách chia khác). Chỉ 1 lựa chọn đúng ngữ pháp và đúng nghĩa.
- "answer": chỉ số (0-3) của đáp án đúng.
- "vi": dịch câu hoàn chỉnh sang tiếng Việt.
- "explain": giải thích ngắn bằng tiếng Việt vì sao đáp án đúng (và vì sao lựa chọn khác sai nếu cần).
Dùng từ vựng trình độ ${level.toUpperCase()}. Kiểm tra kỹ: đáp án phải đúng 100%.
Trả về JSON: {"items": [{"id": "<id mẫu ngữ pháp>", "questions": [{"q": "...", "choices": ["...","...","...","..."], "answer": 0, "vi": "...", "explain": "..."}]}]}`;

if (kind === "points") {
  if (level !== "n4") throw new Error("Hiện chỉ có danh sách mẫu câu cho N4");
  const outFile = path.join(OUT_DIR, `grammar-${level}.json`);
  const done = (await exists(outFile)) ? JSON.parse(await readFile(outFile, "utf8")) : [];
  const doneIds = new Set(done.map((g) => g.id));
  const todo = N4_POINTS.filter(([id]) => !doneIds.has(id));
  console.log(`Ngữ pháp ${level.toUpperCase()}: còn ${todo.length}/${N4_POINTS.length} mẫu`);
  for (let i = 0; i < todo.length; i += 5) {
    const batch = todo.slice(i, i + 5).map(([id, pattern, meaning]) => ({ id, pattern, meaning }));
    const { items } = await askJSON(POINT_SYSTEM, JSON.stringify(batch));
    for (const it of items ?? []) {
      if (!it?.id || !it.pattern || !Array.isArray(it.examples) || !N4_POINTS.some(([id]) => id === it.id)) continue;
      done.push({ id: it.id, pattern: it.pattern, meaning: it.meaning, structure: it.structure, explanation: it.explanation, examples: it.examples.filter((e) => e?.ja).slice(0, 3) });
    }
    // giữ đúng thứ tự giáo trình
    done.sort((a, b) => N4_POINTS.findIndex(([id]) => id === a.id) - N4_POINTS.findIndex(([id]) => id === b.id));
    await writeFile(outFile, JSON.stringify(done, null, 2) + "\n");
    console.log(`  ✓ ${done.length}/${N4_POINTS.length}`);
  }
} else if (kind === "quiz") {
  const points = JSON.parse(await readFile(path.join(OUT_DIR, `grammar-${level}.json`), "utf8"));
  const outFile = path.join(OUT_DIR, `grammar-quiz-${level}.json`);
  const quiz = (await exists(outFile)) ? JSON.parse(await readFile(outFile, "utf8")) : {};
  const todo = points.filter((g) => !quiz[g.id]?.length);
  console.log(`Bài tập ${level.toUpperCase()}: còn ${todo.length}/${points.length} mẫu`);
  let dropped = 0;
  for (let i = 0; i < todo.length; i += 4) {
    const batch = todo.slice(i, i + 4).map((g) => ({ id: g.id, pattern: g.pattern, meaning: g.meaning, structure: g.structure }));
    const { items } = await askJSON(QUIZ_SYSTEM, JSON.stringify(batch));
    for (const it of items ?? []) {
      if (!batch.some((b) => b.id === it?.id)) continue;
      const valid = (it.questions ?? []).filter((q) => {
        const ok =
          typeof q?.q === "string" && /（\s*）|\(\s*\)|＿/.test(q.q) &&
          Array.isArray(q.choices) && q.choices.length === 4 && new Set(q.choices).size === 4 &&
          Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4;
        if (!ok) dropped++;
        return ok;
      });
      if (valid.length) quiz[it.id] = valid.map((q) => ({ q: q.q.replace(/\(\s*\)|（\s*）/, "（　　）"), choices: q.choices, answer: q.answer, vi: q.vi ?? "", explain: q.explain ?? "" }));
    }
    await writeFile(outFile, JSON.stringify(quiz, null, 2) + "\n");
    console.log(`  ✓ ${Object.keys(quiz).length}/${points.length}`);
  }
  if (dropped) console.log(`Đã loại ${dropped} câu hỏi sai định dạng`);
} else if (kind === "verify") {
  // Kiểm tra chéo: AI tự giải lại từng câu (không biết đáp án). Khác đáp án đã lưu hoặc mơ hồ → loại.
  const VERIFY_SYSTEM = `Bạn là giám khảo JLPT cực kỳ cẩn thận. Với mỗi câu hỏi điền vào chỗ trống, hãy tự giải.
Xét kỹ ngữ pháp (ví dụ: そうだ "nghe nói" đi với thể thường như 暇だそうだ; そうだ "trông có vẻ" đi với gốc tính từ như 暇そうだ).
Trả về JSON: {"results": [{"key": "<giữ nguyên key>", "answer": <chỉ số 0-3 đáp án đúng nhất>, "ambiguous": <true nếu có từ 2 lựa chọn đều đúng ngữ pháp và tự nhiên, hoặc không lựa chọn nào đúng>, "reason": "<ngắn gọn>"}]}`;
  const file = path.join(OUT_DIR, `grammar-quiz-${level}.json`);
  const quiz = JSON.parse(await readFile(file, "utf8"));
  const all = Object.entries(quiz).flatMap(([id, qs]) => qs.map((q, i) => ({ key: `${id}#${i}`, id, i, q })));
  console.log(`Kiểm tra ${all.length} câu ${level.toUpperCase()}...`);
  const bad = new Map();
  for (let i = 0; i < all.length; i += 12) {
    const batch = all.slice(i, i + 12);
    const { results } = await askJSON(VERIFY_SYSTEM, JSON.stringify(batch.map((b) => ({ key: b.key, question: b.q.q, choices: b.q.choices }))));
    for (const r of results ?? []) {
      const item = batch.find((b) => b.key === r.key);
      if (!item) continue;
      if (r.ambiguous || r.answer !== item.q.answer) bad.set(item.key, `${item.q.q} | lưu: ${item.q.choices[item.q.answer]} | kiểm tra: ${item.q.choices[r.answer] ?? "?"}${r.ambiguous ? " (mơ hồ)" : ""} — ${r.reason}`);
    }
    console.log(`  ✓ ${Math.min(i + 12, all.length)}/${all.length}`);
  }
  for (const [id, qs] of Object.entries(quiz)) quiz[id] = qs.filter((_, i) => !bad.has(`${id}#${i}`));
  await writeFile(file, JSON.stringify(quiz, null, 2) + "\n");
  console.log(`\nĐã loại ${bad.size} câu nghi sai:`);
  for (const line of bad.values()) console.log(" -", line);
  const empty = Object.entries(quiz).filter(([, qs]) => !qs.length).map(([id]) => id);
  if (empty.length) console.log(`Mẫu không còn câu hỏi (chạy lại --kind=quiz để sinh bù): ${empty.join(", ")}`);
}
console.log("Xong.");
