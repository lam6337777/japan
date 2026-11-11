// Sắp xếp ngữ pháp theo thứ tự bài của giáo trình Minna no Nihongo (bài 1–25: N5, 26–50: N4)
// và ghép các bài do Claude tự biên soạn trong data/content/.
// Chạy sau fix-grammar-n5.mjs và fix-quiz-n5.mjs:  node data/scripts/build-grammar.mjs
// Chạy lại nhiều lần vẫn cho cùng kết quả.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as n5x from "../content/n5-extra.mjs";
import * as n4a from "../content/n4-a.mjs";
import * as n4b from "../content/n4-b.mjs";
import * as n4c from "../content/n4-c.mjs";

const dataDir = (f) => fileURLToPath(new URL(`../../frontend/src/data/${f}`, import.meta.url));
const read = async (f) => JSON.parse(await readFile(dataDir(f), "utf8"));
const write = (f, v) => writeFile(dataDir(f), JSON.stringify(v, null, 2) + "\n");

// Bài Minna cho các mẫu N5 sẵn có (0 = bổ sung, không có bài riêng trong giáo trình)
const N5_LESSON = {
  desu: 1, "dewa-arimasen": 1, "ka-question": 1, "wa-topic": 1, mo: 1, "no-possessive": 1, "dare-nani": 1,
  kosoado: 2, "kono-sono": 2,
  "koko-soko": 3, kochira: 3, "kudasai-noun": 3,
  masu: 4, mashita: 4, "ni-time": 4, "kara-made": 4, jikan: 4,
  "e-direction": 5, "to-with": 5, "yo-ne": 5, "nanika-daremo": 5,
  wo: 6, "de-place": 6, mashou: 6,
  "de-means": 7, "ni-target": 7, "mada-mou": 7,
  "i-adjective": 8, "na-adjective": 8, "adj-noun": 8, "totemo-amari": 8, "ga-but": 8, donna: 8,
  suki: 9, "kara-reason": 9, "itsu-doko-doushite": 9,
  "arimasu-imasu": 10, "ni-ga-aru": 10, "to-ya": 10, "ga-subject": 10,
  counters: 11, "ikura-ikutsu": 11, "gurai-goro": 11, "dake-shika": 11,
  deshita: 12, yori: 12, dochira: 12, ichiban: 12,
  tai: 13, hoshii: 13, "ni-iku": 13,
  "verb-groups": 14, "te-form": 14, "te-kudasai": 14, "te-imasu": 14, mashouka: 14,
  "te-mo-ii": 15, "te-wa-ikenai": 15,
  "te-kara": 16, "te-sequence": 16, "kute-de": 16,
  "nai-form": 17, "nai-de-kudasai": 17,
  "dict-form": 18, "mae-ni": 18,
  "ta-form": 19, naru: 19,
  "plain-form": 20,
  toki: 23,
  "ka-or": 0, adverb: 0, "koto-ga-suki": 0, setsuzoku: 0,
};
// Mẫu trước đây xếp ở N5 nhưng trong Minna thuộc phần N4 (giữ nguyên nội dung đã duyệt)
const MOVE_TO_N4 = { tsumori: 31, "hou-ga-ii": 32, "ato-de": 34 };

const groupName = (lesson, level) => (lesson ? `Bài ${lesson}` : `Bổ sung ${level.toUpperCase()}`);
const order = (lesson) => (lesson ? lesson : 999);
const finish = (list, level) =>
  list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => order(a.p.lesson) - order(b.p.lesson) || a.i - b.i)
    .map(({ p }) => {
      const { lesson, ...rest } = p;
      return { ...rest, id: rest.id, group: groupName(lesson, level), lesson, explanation: rest.summary };
    });

const oldN5 = await read("grammar-n5.json");
const oldN4 = await read("grammar-n4.json");
const quizN5 = await read("grammar-quiz-n5.json");
const quizN4 = await read("grammar-quiz-n4.json");

const extraN5Ids = new Set(n5x.LESSONS.map((l) => l.id));
const newN4 = [...n4a.LESSONS, ...n4b.LESSONS, ...n4c.LESSONS];

// ---- N5
const n5 = [];
for (const p of oldN5) {
  if (extraN5Ids.has(p.id) || p.id in MOVE_TO_N4) continue;
  if (!(p.id in N5_LESSON)) throw new Error(`Chưa gán bài Minna cho ${p.id}`);
  n5.push({ ...p, lesson: N5_LESSON[p.id] });
}
n5.push(...n5x.LESSONS);

// ---- N4: bài mới + các bài chuyển từ N5 sang
const n4 = [...newN4];
for (const [id, lesson] of Object.entries(MOVE_TO_N4)) {
  const src = oldN5.find((p) => p.id === id) ?? oldN4.find((p) => p.id === id);
  if (!src) throw new Error(`Không tìm thấy ${id}`);
  n4.push({ ...src, lesson });
}

// ---- Kiểm tra trùng id
const ids = [...n5, ...n4].map((p) => p.id);
const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dup.length) throw new Error(`Trùng id: ${dup.join(", ")}`);

// ---- Bài tập
const qN5 = {};
const qN4 = {};
for (const p of n5) qN5[p.id] = extraN5Ids.has(p.id) ? n5x.QUIZ[p.id] : quizN5[p.id];
const newQuiz = { ...n4a.QUIZ, ...n4b.QUIZ, ...n4c.QUIZ };
for (const p of n4) qN4[p.id] = newQuiz[p.id] ?? quizN5[p.id] ?? quizN4[p.id];

let bad = 0;
for (const [level, qs] of [["n5", qN5], ["n4", qN4]]) {
  for (const [id, list] of Object.entries(qs)) {
    if (!list?.length) {
      console.log(`! ${level}/${id}: chưa có bài tập`);
      bad++;
      continue;
    }
    for (const x of list) {
      if (x.choices.length !== 4 || new Set(x.choices).size !== 4 || !(x.answer >= 0 && x.answer < 4)) {
        console.log(`! ${level}/${id}: câu lỗi ${x.q}`);
        bad++;
      }
      if (!x.q.includes("（　　）")) console.log(`? ${level}/${id}: câu không có chỗ trống: ${x.q}`);
    }
  }
}
// Kiểm tra trường bắt buộc của bài học
for (const p of [...n5, ...n4]) {
  for (const k of ["id", "pattern", "meaning", "summary", "structure", "examples"]) {
    if (!p[k] || (Array.isArray(p[k]) && !p[k].length)) {
      console.log(`! ${p.id}: thiếu ${k}`);
      bad++;
    }
  }
}
if (bad) throw new Error(`${bad} lỗi, dừng lại.`);

const outN5 = finish(n5, "n5");
const outN4 = finish(n4, "n4");
const sortQuiz = (list, qs) => Object.fromEntries(list.map((p) => [p.id, qs[p.id]]));
await write("grammar-n5.json", outN5);
await write("grammar-n4.json", outN4);
await write("grammar-quiz-n5.json", sortQuiz(outN5, qN5));
await write("grammar-quiz-n4.json", sortQuiz(outN4, qN4));

const count = (qs) => Object.values(qs).reduce((s, l) => s + l.length, 0);
console.log(`N5: ${outN5.length} bài, ${count(qN5)} câu · N4: ${outN4.length} bài, ${count(qN4)} câu`);
