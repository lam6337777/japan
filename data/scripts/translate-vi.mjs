// Dịch nghĩa tiếng Việt cho từ vựng / bổ sung Hán Việt cho kanji bằng DeepSeek
// Chạy: npm run data:vi -- --level=n5 --kind=vocab     (kind: vocab | kanji)
// Kết quả lưu ở data/vi/<kind>-<level>.json (có thể sửa tay), sau đó chạy lại: npm run build (trong thư mục data)
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// --- dùng chung key với chatbot: đọc chatbot/.env ---
try {
  const env = await readFile(path.resolve(ROOT, "../chatbot/.env"), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const KEY = process.env.DEEPSEEK_API_KEY;
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
if (!KEY) {
  console.error("Thiếu DEEPSEEK_API_KEY trong file chatbot/.env");
  process.exit(1);
}

const arg = (name, def) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const level = arg("level", "n5");
const kind = arg("kind", "vocab");
const BATCH = 50;

const exists = (p) => access(p).then(() => true, () => false);
const outFile = path.join(ROOT, `vi/${kind}-${level}.json`);
await mkdir(path.dirname(outFile), { recursive: true });
const done = (await exists(outFile)) ? JSON.parse(await readFile(outFile, "utf8")) : {};

const source = JSON.parse(await readFile(path.resolve(ROOT, `../frontend/public/data/${kind}-${level}.json`), "utf8"));
const items =
  kind === "vocab"
    ? source.filter((v) => !done[v.id]).map((v) => ({ id: v.id, word: v.word, reading: v.reading, en: v.meaning }))
    : source.filter((k) => !done[k.char]).map((k) => ({ id: k.char, on: k.on, kun: k.kun, en: k.meanings }));

const SYSTEM =
  kind === "vocab"
    ? `Bạn là chuyên gia từ điển Nhật–Việt. Với mỗi từ, viết nghĩa tiếng Việt ngắn gọn, tự nhiên (tối đa ~6 từ, nhiều nghĩa cách nhau bằng dấu phẩy), dựa vào từ gốc tiếng Nhật và nghĩa tiếng Anh tham khảo. Trả về JSON: {"<id>": "<nghĩa tiếng Việt>"}.`
    : `Bạn là chuyên gia Hán tự. Với mỗi kanji, cho âm Hán Việt chuẩn (VIẾT HOA, âm phổ biến nhất) và nghĩa tiếng Việt ngắn gọn. Trả về JSON: {"<kanji>": ["<HÁN VIỆT>", "<nghĩa>"]}.`;

console.log(`${kind} ${level.toUpperCase()}: còn ${items.length} mục cần dịch`);

for (let i = 0; i < items.length; i += BATCH) {
  const batch = items.slice(i, i + BATCH);
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(batch) },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`Lỗi API: HTTP ${res.status}`, await res.text());
    break;
  }
  const data = await res.json();
  try {
    Object.assign(done, JSON.parse(data.choices[0].message.content));
  } catch {
    console.error("Không đọc được JSON trả về, bỏ qua lô này");
    continue;
  }
  await writeFile(outFile, JSON.stringify(done, null, 1)); // lưu dần để không mất tiến độ
  console.log(`  ✓ ${Math.min(i + BATCH, items.length)}/${items.length}`);
}

console.log(`\nĐã lưu ${outFile}\nChạy tiếp: npm run build (trong thư mục data)`);
