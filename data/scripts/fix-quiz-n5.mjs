// Sửa tay bài tập N5 (đã đọc duyệt cả 282 câu).
// Chạy: node scripts/fix-quiz-n5.mjs   (an toàn khi chạy lại)
//  REPLACE: viết lại toàn bộ câu hỏi của mẫu · DROP: xoá câu theo nội dung · PATCH: sửa đáp án / lựa chọn
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.resolve(import.meta.dirname, "../../frontend/src/data/grammar-quiz-n5.json");
// q(câu hỏi, [đáp án đúng, ...lựa chọn sai], dịch, giải thích) — đáp án đúng luôn để đầu (giao diện sẽ tự trộn)
const q = (question, choices, vi, explain) => ({ q: question, choices, answer: 0, vi, explain });

const REPLACE = {
  desu: [
    q("A: あの人は先生ですか。 B: はい、先生（　　）。", ["です", "じゃありません", "ですか", "も"], "A: Người kia là giáo viên à? B: Vâng, là giáo viên.", "Trả lời はい (vâng) nên dùng câu khẳng định: 先生です."),
    q("わたし（　　）マイです。ベトナム人です。", ["は", "を", "に", "で"], "Tôi là Mai. Tôi là người Việt Nam.", "Chủ đề của câu giới thiệu dùng は (đọc là \"wa\")."),
    q("これは わたしの かばん（　　）。", ["です", "ます", "がです", "をです"], "Đây là cặp của tôi.", "Sau danh từ dùng です. ます chỉ đi với động từ."),
  ],
  "dewa-arimasen": [
    q("A: あなたは学生ですか。 B: いいえ、学生（　　）。会社員です。", ["じゃありません", "です", "ですか", "でした"], "A: Bạn là sinh viên à? B: Không, tôi không phải sinh viên. Tôi là nhân viên công ty.", "Trả lời いいえ và câu sau nói mình là nhân viên công ty → phủ định: じゃありません."),
    q("いいえ、これは わたしの 本では（　　）。", ["ありません", "ます", "です", "いません"], "Không, đây không phải sách của tôi.", "では + ありません = không phải là."),
    q("A: 田中さんは日本人ですか。 B: いいえ、日本人（　　）。韓国人です。", ["じゃありません", "です", "ですか", "も"], "A: Anh Tanaka là người Nhật à? B: Không, không phải người Nhật. Là người Hàn.", "いいえ + câu sau nêu quốc tịch khác → phủ định."),
  ],
  "ka-question": [
    q("A: あの人は だれです（　　）。 B: 山田さんです。", ["か", "よ", "ね", "も"], "A: Người kia là ai vậy? B: Là anh Yamada.", "Câu hỏi có từ để hỏi だれ, cuối câu lịch sự dùng か."),
    q("A: これは 何です（　　）。 B: ペンです。", ["か", "ね", "よ", "を"], "A: Đây là cái gì? B: Là cây bút.", "Câu hỏi lịch sự kết thúc bằng か."),
    q("A: 学生です（　　）。 B: はい、学生です。", ["か", "を", "に", "で"], "A: Bạn là sinh viên à? B: Vâng, là sinh viên.", "B trả lời はい nên câu của A là câu hỏi → か."),
  ],
  "wa-topic": [
    q("わたし（　　）学生です。", ["は", "を", "に", "へ"], "Tôi là học sinh.", "Chủ đề câu dùng は."),
    q("A: これは何ですか。 B: それ（　　）本です。", ["は", "を", "に", "で"], "A: Đây là gì? B: Đó là sách.", "それ là chủ đề câu trả lời → は."),
    q("田中さん（　　）会社員です。", ["は", "を", "に", "で"], "Anh Tanaka là nhân viên công ty.", "Giới thiệu về ai đó: [người] は [nghề] です."),
  ],
  deshita: [
    q("きのうは 日曜日（　　）。きょうは 月曜日です。", ["でした", "です", "じゃありません", "ですか"], "Hôm qua là chủ nhật. Hôm nay là thứ hai.", "きのう (hôm qua) → quá khứ: でした."),
    q("A: きのうは 休みでしたか。 B: いいえ、休み（　　）。", ["じゃありませんでした", "でした", "じゃありません", "です"], "A: Hôm qua bạn nghỉ à? B: Không, hôm qua không phải ngày nghỉ.", "いいえ + quá khứ → じゃありませんでした."),
    q("去年、わたしは 大学生（　　）。今は 会社員です。", ["でした", "です", "じゃありません", "ですか"], "Năm ngoái tôi là sinh viên. Bây giờ là nhân viên công ty.", "去年 (năm ngoái) → でした."),
  ],
  "i-adjective": [
    q("きのうは とても（　　）です。きょうは すずしいです。", ["暑かった", "暑い", "暑くない", "暑くて"], "Hôm qua rất nóng. Hôm nay thì mát.", "Nói về hôm qua → quá khứ: 暑かったです."),
    q("この ラーメンは あまり（　　）です。", ["おいしくない", "おいしい", "おいしかった", "おいしくて"], "Món ramen này không ngon lắm.", "あまり luôn đi với phủ định: おいしくないです."),
    q("A: テストは むずかしかったですか。 B: いいえ、（　　）です。", ["むずかしくなかった", "むずかしかった", "むずかしい", "むずかしくて"], "A: Bài kiểm tra có khó không? B: Không, không khó.", "Câu hỏi ở quá khứ, trả lời いいえ → quá khứ phủ định: くなかったです."),
    q("きのうは 天気が（　　）です。あたたかかったです。", ["よかった", "いかった", "いいかった", "よい"], "Hôm qua thời tiết đẹp. Trời ấm.", "いい là ngoại lệ: quá khứ là よかった."),
  ],
  mashou: [
    q("A: いっしょに 昼ごはんを 食べませんか。 B: ええ、食べ（　　）。", ["ましょう", "ません", "ました", "ませんでした"], "A: Cùng ăn trưa không? B: Ừ, cùng ăn nào.", "Đồng ý với lời rủ → 〜ましょう."),
    q("あした、駅まで いっしょに（　　）。", ["歩きましょう", "歩きました", "歩いた", "歩きませんでした"], "Ngày mai cùng đi bộ đến ga nhé.", "あした + rủ cùng làm → ましょう."),
    q("A: こんばん、映画を 見（　　）か。 B: いいですね。", ["ません", "ました", "ませんでした", "まして"], "A: Tối nay đi xem phim không? B: Hay đấy.", "Mời ai làm gì: 〜ませんか."),
  ],
  naru: [
    q("だんだん さむ（　　）なりました。", ["く", "に", "い", "くて"], "Trời dần dần lạnh đi.", "Tính từ い: bỏ い + く + なる."),
    q("へやが しずか（　　）なりました。", ["に", "く", "な", "で"], "Căn phòng đã trở nên yên tĩnh.", "Tính từ な: bỏ な + に + なる."),
    q("わたしは 医者（　　）なりたいです。", ["に", "を", "が", "で"], "Tôi muốn trở thành bác sĩ.", "Danh từ + に + なる."),
  ],
  adverb: [
    q("あしたは（　　）起きます。", ["はやく", "はやい", "はやくて", "はやいに"], "Ngày mai tôi sẽ dậy sớm.", "Tính từ い bổ nghĩa cho động từ: bỏ い + く."),
    q("図書館では（　　）話してください。", ["しずかに", "しずかな", "しずか", "しずかで"], "Trong thư viện hãy nói chuyện nhỏ nhẹ.", "Tính từ な bổ nghĩa cho động từ: + に."),
    q("字を（　　）書いてください。", ["きれいに", "きれいな", "きれい", "きれいく"], "Hãy viết chữ cho đẹp.", "きれい là tính từ な (dù kết thúc bằng い) → きれいに."),
  ],
  "totemo-amari": [
    q("この 本は（　　）おもしろいです。毎日 読んでいます。", ["とても", "あまり", "ぜんぜん", "少しも"], "Cuốn sách này rất hay. Ngày nào tôi cũng đọc.", "Câu khẳng định → とても. あまり, ぜんぜん, 少しも đi với phủ định."),
    q("わたしは お酒を（　　）飲みません。ときどき 飲みます。", ["あまり", "ぜんぜん", "とても", "よく"], "Tôi không uống rượu lắm. Thỉnh thoảng mới uống.", "Vẫn có uống (thỉnh thoảng) → không… lắm: あまり. ぜんぜん là hoàn toàn không."),
    q("フランス語は（　　）わかりません。何も わかりません。", ["ぜんぜん", "あまり", "とても", "よく"], "Tôi hoàn toàn không hiểu tiếng Pháp. Không hiểu gì cả.", "\"Không hiểu gì cả\" → hoàn toàn không: ぜんぜん."),
  ],
  "yo-ne": [
    q("A: いい 天気です（　　）。 B: そうですね。", ["ね", "よ", "を", "に"], "A: Trời đẹp nhỉ. B: Đúng vậy.", "A tìm sự đồng tình, B đáp そうですね → dùng ね."),
    q("A: あの 店は どこですか。 B: 駅の 前です（　　）。", ["よ", "ね", "か", "を"], "A: Cửa hàng đó ở đâu? B: Ở trước ga đấy.", "B cho A biết thông tin A chưa biết → よ."),
  ],
  "to-ya": [
    q("わたしは　パン（　　）たまごを　たべました。", ["と", "を", "が", "で"], "Tôi đã ăn bánh mì và trứng.", "Nối hai danh từ \"và\" → と."),
    q("つくえの　うえに　えんぴつ（　　）ペンが　あります。", ["と", "を", "が", "で"], "Trên bàn có bút chì và bút bi.", "Liệt kê hai đồ vật → と."),
    q("きのう　スーパーで　りんご（　　）バナナなどを　かいました。", ["や", "を", "が", "に"], "Hôm qua tôi mua táo, chuối… ở siêu thị.", "Có など ở sau (…v.v.) → liệt kê không đầy đủ: や."),
    q("かばんの　なかに　ほん（　　）ノートなどが　あります。", ["や", "を", "が", "に"], "Trong cặp có sách, vở…", "や … など: liệt kê vài thứ tiêu biểu."),
  ],
  "ka-or": [
    q("あした　コーヒー（　　）こうちゃを　のみますか。", ["か", "を", "が", "に"], "Ngày mai bạn uống cà phê hay trà?", "Chọn một trong hai → か."),
    q("えきまで　バス（　　）タクシーで　いきます。", ["か", "を", "が", "に"], "Tôi sẽ đi đến ga bằng xe buýt hoặc taxi.", "\"Hoặc\" giữa hai danh từ → か."),
    q("あの　ひとは　がくせい（　　）せんせいですか。", ["か", "と", "や", "しか"], "Người kia là sinh viên hay giáo viên?", "Hỏi chọn một trong hai → か."),
  ],
  "kono-sono": [
    q("A: その かさは だれのですか。 B: （　　）かさは わたしのです。", ["この", "その", "あの", "どの"], "A: Cái ô đó của ai? B: Cái ô này là của tôi.", "A nói その (cái gần B), nên B gọi là この (cái gần mình)."),
    q("A: 田中さんは （　　）人ですか。 B: あの 人です。", ["どの", "この", "その", "あの"], "A: Anh Tanaka là người nào? B: Là người kia.", "Hỏi \"người nào\" → どの + 人."),
  ],
};

// Xoá các câu mơ hồ / sai (so khớp theo phần đầu câu hỏi)
const DROP = {
  kosoado: ["あそこにやまがあります"],
  "koko-soko": ["わたしの いえは"],
  kochira: ["はじめまして。わたしは マイク", "A: じしょは"],
  "arimasu-imasu": ["冷蔵庫に牛乳"],
  "plain-form": ["A: あした ひま？", "これは わたしの ほん"],
  toki: ["（　　）とき、でんわ", "（　　）とき、いつも"],
  mashouka: ["わたしが てつだいましょうか"],
  setsuzoku: ["まどを あけました"],
};

// Sửa đáp án / lựa chọn
const PATCH = [
  { id: "dare-nani", startsWith: "これは（　　）ですか", answerText: "なん", explain: "Trước です dùng なん: なんですか (không nói なにですか)." },
  { id: "nai-form", startsWith: "「来ます」のない形", replaceChoice: ["来ない", "くない"] },
  { id: "dict-form", startsWith: "「来ます」の辞書形", replaceChoice: ["くる", "きる"] },
  { id: "jikan", startsWith: "今 何時", choices: ["です", "ます", "でした", "ません"], answerText: "です" },
  { id: "jikan", startsWith: "きょうは 何曜日", choices: ["です", "ます", "でした", "ません"], answerText: "です" },
  { id: "jikan", startsWith: "あしたは 何月何日", choices: ["です", "ます", "でした", "ません"], answerText: "です" },
  { id: "de-means", startsWith: "にほんご（", replaceChoice: ["を", "へ"] },
  { id: "to-with", startsWith: "せんせい（", replaceChoice: ["に", "へ"] },
  {
    id: "hou-ga-ii",
    startsWith: "この　くすりは",
    q: "ねつが ありますから、きょうは 学校を（　　）ほうが いいです。",
    choices: ["休んだ", "休んで", "休みます", "休みましょう"],
    answerText: "休んだ",
    vi: "Vì bị sốt nên hôm nay bạn nên nghỉ học.",
    explain: "Khuyên \"nên làm\" → thể た + ほうがいい.",
  },
  {
    id: "masu",
    startsWith: "あした わたしは がっこうへ",
    q: "あした 東京へ 行き（　　）。",
    choices: ["ます", "ました", "ませんでした", "まして"],
    answerText: "ます",
    vi: "Ngày mai tôi sẽ đi Tokyo.",
    explain: "あした (ngày mai) → thể hiện tại – tương lai: 行きます.",
  },
  {
    id: "mashita",
    startsWith: "きのう えいがを",
    q: "きのう えいがを（　　）。とても おもしろかったです。",
    choices: ["みました", "みます", "みませんでした", "みましょう"],
    answerText: "みました",
    vi: "Hôm qua tôi đã xem phim. Rất hay.",
    explain: "Có xem và thấy hay → みました.",
  },
  {
    id: "mashita",
    startsWith: "けさ ごはんを",
    q: "けさ、ごはんを（　　）から、おなかが すいています。",
    choices: ["たべませんでした", "たべました", "たべます", "たべません"],
    answerText: "たべませんでした",
    vi: "Sáng nay tôi không ăn nên bây giờ đang đói.",
    explain: "Bụng đang đói → sáng nay đã không ăn: たべませんでした.",
  },
];

const ADD = {
  setsuzoku: [q("朝ごはんを 食べました。（　　）、学校へ 行きました。", ["それから", "でも", "じゃ", "しかし"], "Tôi đã ăn sáng. Sau đó, tôi đi học.", "Hành động tiếp theo → それから.")],
};

const data = JSON.parse(await readFile(FILE, "utf8"));
for (const [id, qs] of Object.entries(REPLACE)) data[id] = qs;
for (const [id, starts] of Object.entries(DROP)) data[id] = (data[id] ?? []).filter((x) => !starts.some((s) => x.q.startsWith(s)));
for (const p of PATCH) {
  const x = (data[p.id] ?? []).find((y) => y.q.startsWith(p.startsWith));
  if (!x) continue; // đã sửa ở lần chạy trước
  if (p.q) x.q = p.q;
  if (p.choices) x.choices = p.choices;
  if (p.replaceChoice) x.choices = x.choices.map((c) => (c === p.replaceChoice[0] ? p.replaceChoice[1] : c));
  if (p.answerText) x.answer = x.choices.indexOf(p.answerText);
  if (p.vi) x.vi = p.vi;
  if (p.explain) x.explain = p.explain;
}
for (const [id, qs] of Object.entries(ADD)) {
  for (const n of qs) if (!data[id]?.some((x) => x.q === n.q)) (data[id] ??= []).push(n);
}
// Kiểm tra: mỗi câu có đúng 4 lựa chọn khác nhau và đáp án hợp lệ
let total = 0;
for (const [id, qs] of Object.entries(data)) {
  for (const x of qs) {
    total++;
    if (x.choices.length !== 4 || new Set(x.choices).size !== 4 || x.answer < 0 || x.answer > 3) console.log(`! câu lỗi ở ${id}: ${x.q}`);
  }
}
await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`Xong. Tổng ${total} câu.`);
