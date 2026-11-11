// Sinh bài học ngữ pháp đầy đủ bằng DeepSeek, rồi cho AI kiểm duyệt và viết lại bài có lỗi.
//   npm run lessons -- --level=n5            sinh bài còn thiếu
//   npm run lessons -- --level=n5 --review   kiểm duyệt + sửa
//   npm run lessons -- --level=n5 --only=te-form,wo   chỉ làm lại vài mẫu
import { readFile, writeFile, mkdir, copyFile, access } from "node:fs/promises";
import path from "node:path";
import { N5_POINTS } from "./grammar-list-n5.mjs";

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
if (!KEY) throw new Error("Thiếu DEEPSEEK_API_KEY trong chatbot/.env");

const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=")[1] ?? d;
const level = arg("level", "n5");
const review = process.argv.includes("--review");
const only = arg("only", "")?.split(",").filter(Boolean);
const LISTS = { n5: N5_POINTS };
const POINTS = LISTS[level];
if (!POINTS) throw new Error(`Chưa có danh sách mẫu cho ${level}`);

const exists = (p) => access(p).then(() => true, () => false);

async function askJSON(system, user, maxTokens = 8000) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: maxTokens,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    try {
      return JSON.parse(data.choices[0].message.content ?? "");
    } catch {
      console.log(`  (JSON lỗi${data.choices[0].finish_reason === "length" ? " – quá dài" : ""}, thử lại ${attempt}/3)`);
    }
  }
  throw new Error("AI trả JSON lỗi 3 lần");
}

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

const LESSON_SYSTEM = `Bạn là giáo viên tiếng Nhật giàu kinh nghiệm dạy người Việt, đang viết giáo trình JLPT ${level.toUpperCase()}.
Viết bài học CHÍNH XÁC, dễ hiểu cho người mới học, bằng tiếng Việt. Từ vựng trong ví dụ phải ở trình độ ${level.toUpperCase()}.
Trả về JSON: {"items": [ BÀI HỌC ]}. Mỗi BÀI HỌC:
{
 "id": "<giữ nguyên>",
 "pattern": "<mẫu câu, có thể chỉnh cho chuẩn>",
 "meaning": "<nghĩa ngắn gọn>",
 "summary": "<2–4 câu: mẫu này dùng để làm gì, tương đương cách nói nào trong tiếng Việt>",
 "structure": "<công thức kết hợp, ví dụ: V (bỏ ます) + たいです>",
 "when": ["<tình huống dùng 1>", "<tình huống 2>", "..."],
 "notWhen": ["<khi KHÔNG dùng / giới hạn, có thể rỗng>"],
 "conjugation": [{"label": "<Động từ nhóm I / nhóm II / nhóm III / Tính từ い / Danh từ...>", "example": "<từ gốc → dạng đã kết hợp, ví dụ 行きます → 行きたいです>"}],
 "variants": [{"label": "<Phủ định / Quá khứ / Câu hỏi / Lịch sự hơn...>", "pattern": "<dạng biến thể>", "example": "<câu ví dụ ngắn>"}],
 "examples": [{"ja": "<câu có kanji N5>", "kana": "<cùng câu viết toàn hiragana/katakana, cách nhau giữa các cụm>", "vi": "<dịch>"}],
 "dialogue": [{"speaker": "A", "ja": "...", "vi": "..."}, {"speaker": "B", "ja": "...", "vi": "..."}],
 "mistakes": [{"wrong": "<câu sai người Việt hay nói>", "right": "<câu đúng>", "note": "<vì sao>"}],
 "compare": [{"pattern": "<mẫu dễ nhầm>", "difference": "<khác nhau thế nào>"}],
 "tip": "<1 câu mẹo ghi nhớ>"
}
Yêu cầu: 5 câu "examples" từ dễ đến khó; "dialogue" 2–4 lượt; 1–3 "mistakes"; 0–2 "compare"; "conjugation" để [] nếu mẫu không cần chia.
Với mẫu dạy cách chia (thể て, thể ない...), "conjugation" phải liệt kê đủ quy tắc cho từng nhóm/đuôi kèm ví dụ.
Kiểm tra kỹ từng câu tiếng Nhật: đúng ngữ pháp, tự nhiên, đúng mẫu đang dạy.`;

const REVIEW_SYSTEM = `Bạn là chuyên gia ngôn ngữ Nhật, kiểm duyệt giáo trình JLPT cho người Việt. Đọc kỹ từng bài học (JSON) và tìm LỖI THẬT:
sai ngữ pháp, câu ví dụ không tự nhiên hoặc không dùng đúng mẫu, cách chia sai, kana không khớp câu, dịch sai nghĩa, giải thích sai hoặc gây hiểu nhầm, "mistakes" có câu "right" vẫn sai.
Không bắt lỗi văn phong vụn vặt. Trả về JSON: {"results": [{"id": "...", "ok": true/false, "issues": ["<mô tả lỗi cụ thể + cách sửa>"]}]}`;

const outFile = path.join(OUT_DIR, `grammar-${level}.json`);
const existing = (await exists(outFile)) ? JSON.parse(await readFile(outFile, "utf8")) : [];
// Sao lưu bản cũ một lần
const backup = path.join(ROOT, `backup/grammar-${level}.before-lessons.json`);
if (!(await exists(backup)) && existing.length) {
  await mkdir(path.dirname(backup), { recursive: true });
  await copyFile(outFile, backup);
}

const byId = new Map(existing.filter((g) => g.summary).map((g) => [g.id, g])); // chỉ coi bài đã có "summary" là bài mới
const meta = new Map(POINTS.map(([id, group, pattern, meaning]) => [id, { id, group, pattern, meaning }]));

function clean(it) {
  const m = meta.get(it.id);
  const arr = (x) => (Array.isArray(x) ? x : []);
  return {
    id: it.id,
    group: m.group,
    pattern: it.pattern || m.pattern,
    meaning: it.meaning || m.meaning,
    summary: it.summary ?? "",
    structure: it.structure ?? "",
    explanation: it.summary ?? "", // giữ trường cũ cho bài tập/chat
    when: arr(it.when).filter(Boolean),
    notWhen: arr(it.notWhen).filter(Boolean),
    conjugation: arr(it.conjugation).filter((c) => c?.example),
    variants: arr(it.variants).filter((v) => v?.pattern || v?.example),
    examples: arr(it.examples).filter((e) => e?.ja).slice(0, 6),
    dialogue: arr(it.dialogue).filter((d) => d?.ja),
    mistakes: arr(it.mistakes).filter((x) => x?.wrong && x?.right),
    compare: arr(it.compare).filter((c) => c?.pattern),
    tip: it.tip ?? "",
  };
}

async function save() {
  const ordered = POINTS.map(([id]) => byId.get(id)).filter(Boolean);
  await writeFile(outFile, JSON.stringify(ordered, null, 2) + "\n");
}

async function generate(ids, feedback = {}) {
  const batches = [];
  for (let i = 0; i < ids.length; i += 2) batches.push(ids.slice(i, i + 2));
  let done = 0;
  await pool(batches, 4, async (batch) => {
    const input = batch.map((id) => ({ ...meta.get(id), ...(feedback[id] ? { fix_these_issues: feedback[id] } : {}) }));
    try {
      const { items } = await askJSON(LESSON_SYSTEM, JSON.stringify(input));
      for (const it of items ?? []) if (meta.has(it?.id) && it.examples?.length) byId.set(it.id, clean(it));
    } catch (e) {
      console.log(`  ✗ lỗi lô ${batch.join(",")}: ${e.message}`);
    }
    await save();
    done += batch.length;
    console.log(`  ✓ ${done}/${ids.length}`);
  });
}

if (!review) {
  const todo = POINTS.map(([id]) => id).filter((id) => (only.length ? only.includes(id) : !byId.has(id)));
  console.log(`Sinh bài học ${level.toUpperCase()}: ${todo.length} mẫu`);
  await generate(todo);
} else {
  const ids = POINTS.map(([id]) => id).filter((id) => byId.has(id) && (!only.length || only.includes(id)));
  console.log(`Kiểm duyệt ${ids.length} bài...`);
  const feedback = {};
  const batches = [];
  for (let i = 0; i < ids.length; i += 3) batches.push(ids.slice(i, i + 3));
  await pool(batches, 4, async (batch) => {
    try {
      const { results } = await askJSON(REVIEW_SYSTEM, JSON.stringify(batch.map((id) => byId.get(id))), 3000);
      for (const r of results ?? []) if (r && r.ok === false && r.issues?.length && meta.has(r.id)) feedback[r.id] = r.issues;
    } catch (e) {
      console.log(`  ✗ lỗi kiểm duyệt ${batch.join(",")}: ${e.message}`);
    }
  });
  const flagged = Object.keys(feedback);
  console.log(`\n${flagged.length} bài có lỗi:`);
  for (const id of flagged) console.log(` - ${id}: ${feedback[id].join(" | ").slice(0, 300)}`);
  if (flagged.length) {
    console.log("\nViết lại các bài có lỗi...");
    await generate(flagged, feedback);
  }
}
await save();
console.log("Xong.");
