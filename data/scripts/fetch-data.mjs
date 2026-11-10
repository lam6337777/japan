// Tải dữ liệu gốc (nguồn mở) về data/raw/
// Chạy: npm run data:fetch
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

const RAW = path.resolve(import.meta.dirname, "../raw");

const SOURCES = [
  // Từ vựng JLPT (dựa trên tanos.co.uk + JMdict) — github.com/jamsinclair/open-anki-jlpt-decks
  ...["n5", "n4", "n3", "n2", "n1"].map((lv) => ({
    file: `vocab-${lv}.csv`,
    url: `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/main/src/${lv}.csv`,
  })),
  // Kanji (KANJIDIC2 + cấp JLPT) — github.com/davidluzgouveia/kanji-data
  {
    file: "kanji.json",
    url: "https://raw.githubusercontent.com/davidluzgouveia/kanji-data/master/kanji.json",
  },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

await mkdir(RAW, { recursive: true });
const force = process.argv.includes("--force");

for (const { file, url } of SOURCES) {
  const dest = path.join(RAW, file);
  if (!force && (await exists(dest))) {
    console.log(`✓ ${file} (đã có, bỏ qua — dùng --force để tải lại)`);
    continue;
  }
  process.stdout.write(`↓ ${file} ... `);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tải thất bại ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  console.log(`${(buf.length / 1024).toFixed(0)} KB`);
}

console.log("\nXong. Tiếp theo: npm run data:build");
