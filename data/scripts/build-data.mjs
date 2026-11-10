// Xử lý dữ liệu gốc → public/data/*.json cho web
// Chạy: npm run data:build   (tuỳ chọn: --strokes=n5,n4 để tải SVG nét viết)
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");   // thư mục data/
const FRONTEND = path.resolve(ROOT, "../frontend");
const RAW = path.join(ROOT, "raw");
const OUT = path.join(FRONTEND, "public/data");
const VI_DIR = path.join(ROOT, "vi"); // bản dịch tiếng Việt (do translate-vi.mjs tạo)
const SVG_DIR = path.join(FRONTEND, "public/kanjivg");
const LEVELS = ["n5", "n4", "n3", "n2", "n1"];

const strokeArg = process.argv.find((a) => a.startsWith("--strokes="));
const STROKE_LEVELS = strokeArg ? strokeArg.split("=")[1].split(",") : ["n5", "n4"];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------- CSV parser (hỗ trợ dấu ngoặc kép) ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function loadVi(kind, level) {
  const f = path.join(VI_DIR, `${kind}-${level}.json`);
  return (await exists(f)) ? JSON.parse(await readFile(f, "utf8")) : {};
}

await mkdir(OUT, { recursive: true });

// ---------- Kanji ----------
const kanjiRaw = JSON.parse(await readFile(path.join(RAW, "kanji.json"), "utf8"));
const kanjiByLevel = Object.fromEntries(LEVELS.map((l) => [l, []]));
for (const [ch, k] of Object.entries(kanjiRaw)) {
  if (!k.jlpt_new) continue;
  const level = `n${k.jlpt_new}`;
  kanjiByLevel[level].push({
    char: ch,
    meanings: k.meanings ?? [],
    on: k.readings_on ?? [],
    kun: k.readings_kun ?? [],
    strokes: k.strokes ?? null,
    freq: k.freq ?? null,
  });
}
for (const level of LEVELS) {
  const vi = await loadVi("kanji", level);
  const list = kanjiByLevel[level]
    .map((k) => ({ ...k, hanViet: vi[k.char]?.[0] ?? "", vi: vi[k.char]?.[1] ?? "" }))
    .sort((a, b) => (a.freq ?? 9999) - (b.freq ?? 9999));
  await writeFile(path.join(OUT, `kanji-${level}.json`), JSON.stringify(list));
  console.log(`Kanji ${level.toUpperCase()}: ${list.length}`);
}

// ---------- Từ vựng ----------
const vocabStats = {};
for (const level of LEVELS) {
  const rows = parseCSV(await readFile(path.join(RAW, `vocab-${level}.csv`), "utf8"));
  const header = rows.shift();
  const idx = (n) => header.indexOf(n);
  const vi = await loadVi("vocab", level);
  const seen = new Set();
  const list = [];
  for (const r of rows) {
    const expression = r[idx("expression")]?.trim();
    const reading = r[idx("reading")]?.trim();
    if (!expression) continue;
    const id = `${level}-${expression}-${reading}`;
    if (seen.has(id)) continue;
    seen.add(id);
    list.push({ id, word: expression, reading, meaning: r[idx("meaning")]?.trim() ?? "", vi: vi[id] ?? "" });
  }
  vocabStats[level] = list.length;
  await writeFile(path.join(OUT, `vocab-${level}.json`), JSON.stringify(list));
  console.log(`Từ vựng ${level.toUpperCase()}: ${list.length}`);
}

await writeFile(
  path.join(OUT, "stats.json"),
  JSON.stringify({
    vocab: vocabStats,
    kanji: Object.fromEntries(LEVELS.map((l) => [l, kanjiByLevel[l].length])),
    builtAt: new Date().toISOString(),
  }),
);

// ---------- SVG thứ tự nét (KanjiVG, CC BY-SA 3.0) ----------
await mkdir(SVG_DIR, { recursive: true });
let downloaded = 0;
for (const level of STROKE_LEVELS) {
  const chars = kanjiByLevel[level]?.map((k) => k.char) ?? [];
  const queue = [...chars];
  async function worker() {
    while (queue.length) {
      const ch = queue.shift();
      const hex = ch.codePointAt(0).toString(16).padStart(5, "0");
      const dest = path.join(SVG_DIR, `${hex}.svg`);
      if (await exists(dest)) continue;
      const res = await fetch(`https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${hex}.svg`);
      if (res.ok) {
        await writeFile(dest, await res.text());
        downloaded++;
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
}
console.log(`SVG nét viết: tải mới ${downloaded} file (${STROKE_LEVELS.join(", ")})`);
console.log("\nXong! Dữ liệu ở frontend/public/data/");
