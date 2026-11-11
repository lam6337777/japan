// Sửa tay các lỗi trong bài học N5 do AI viết (đã đọc duyệt từng bài).
// Chạy: node scripts/fix-grammar-n5.mjs   (an toàn khi chạy lại nhiều lần)
// mistakes: thay toàn bộ · conjugation: thay toàn bộ · examples: { chỉ số: [ja, kana, vi] } · dropVariants: bỏ biến thể theo nhãn · setVariants: thay biến thể theo nhãn
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FILE = path.resolve(import.meta.dirname, "../../frontend/src/data/grammar-n5.json");
const m = (wrong, right, note) => ({ wrong, right, note });

const FIXES = {
  "te-form": {
    conjugation: [
      { label: "Nhóm I: う・つ・る → って", example: "買います → 買って・待ちます → 待って・帰ります → 帰って" },
      { label: "Nhóm I: む・ぶ・ぬ → んで", example: "飲みます → 飲んで・遊びます → 遊んで・死にます → 死んで" },
      { label: "Nhóm I: く → いて", example: "書きます → 書いて・聞きます → 聞いて" },
      { label: "⚠️ Ngoại lệ: 行く", example: "行きます → 行って (không phải 行いて)" },
      { label: "Nhóm I: ぐ → いで", example: "泳ぎます → 泳いで" },
      { label: "Nhóm I: す → して", example: "話します → 話して" },
      { label: "Nhóm II: bỏ る + て", example: "食べます → 食べて・見ます → 見て" },
      { label: "Nhóm III", example: "します → して・来ます → 来て (きて)" },
    ],
  },
  "te-form": {
    notWhen: ["Tính từ な và danh từ không chia thể て theo quy tắc động từ mà dùng で: 静かで、きれいです / 学生で、二十歳です.", "Tính từ い đổi い → くて: 安くて、おいしいです."],
  },
  "dare-nani": {
    when: ["Hỏi về người: あの人はだれですか / どなたですか (lịch sự hơn).", "Hỏi về vật: これはなんですか.", "Hỏi về hành động: なにをしますか.", "なん dùng trước です, trước các âm d/t/n và trong từ ghép: なんですか, なんじ, なんさい, なんの本."],
  },
  "ka-question": {
    notWhen: ["Trong hội thoại thân mật, câu hỏi thường bỏ か và chỉ lên giọng: 行く？ / なに？ (dùng か ở thể thường nghe cộc, kiểu nam giới).", "Dạng lịch sự luôn có か: 行きますか / なんですか."], mistakes: [m("これはなんか。", "これはなんですか。", "Trong câu lịch sự, phải có です trước か. 「なんか」 cụt lủn và còn dễ nghe thành 「何か」 (cái gì đó).")] },
  "yo-ne": {
    mistakes: [
      m("（Mới gặp lần đầu）私はラムですね。", "私はラムです。", "ね dùng khi người nghe cũng biết hoặc để tìm sự đồng tình. Giới thiệu thông tin về mình với người mới gặp thì không dùng ね."),
      m("A: 今日は暑いですね。 B: はい、暑いですよ。", "A: 今日は暑いですね。 B: はい、暑いですね。", "Đáp lại lời tìm đồng tình thì dùng ね. Dùng よ nghe như đang báo cho người kia điều họ chưa biết."),
    ],
  },
  kosoado: { mistakes: [m("これは本は私のです。", "この本は私のです。", "これ đứng một mình làm chủ ngữ. Muốn đi kèm danh từ thì dùng この + danh từ."), m("これ本は高いです。", "この本は高いです。", "Không đặt これ ngay trước danh từ.")] },
  "koko-soko": { mistakes: [m("トイレはどこにですか。", "トイレはどこですか。", "Hỏi vị trí với です thì không cần に. Nếu dùng động từ tồn tại thì nói: トイレはどこにありますか。")] },
  kochira: { mistakes: [m("（Nghe điện thoại）こちらはだれですか。", "どちら様ですか。", "Hỏi người ở đầu dây bên kia là ai thì dùng どちら様. こちら chỉ phía mình, còn だれ kém lịch sự.")] },
  "itsu-doko-doushite": { mistakes: [m("いつに日本へ行きますか。", "いつ日本へ行きますか。", "いつ không đi với trợ từ に (khác với 〜時に, 日曜日に).")] },
  donna: { dropVariants: ["Dạng phủ định"] },
  "ga-subject": {
    mistakes: [m("私は学生がです。", "私は学生です。", "Vị ngữ là danh từ + です thì không đặt が trước です."), m("私は日本語をわかります。", "私は日本語がわかります。", "わかる dùng が cho đối tượng (điều mình hiểu), không dùng を.")],
  },
  wo: {
    compare: [{ pattern: "が với 好き・わかる・ほしい・上手", difference: "Những từ này không phải động từ tác động, nên đối tượng dùng が: 日本語がわかります (không nói 日本語をわかります)." }], mistakes: [m("パンが食べます。", "パンを食べます。", "Tân ngữ của 食べる dùng を."), m("日本語を上手です。", "日本語が上手です。", "上手・好き・わかる dùng が, không dùng を.")] },
  "ni-time": { mistakes: [m("まいにちに日本語を勉強します。", "まいにち日本語を勉強します。", "まいにち・きょう・あした・いま không đi với に."), m("日曜日で友だちに会います。", "日曜日に友だちに会います。", "Thời điểm cụ thể (thứ, ngày, giờ) dùng に, không dùng で.")] },
  "e-direction": { mistakes: [m("日本を行きます。", "日本へ行きます。", "Đích đến của động từ di chuyển dùng へ hoặc に, không dùng を."), m("学校で行きます。", "学校へ（に）行きます。", "で chỉ nơi diễn ra hành động, không chỉ hướng đi.")] },
  "de-means": { mistakes: [m("歩いてで学校へ行きます。", "歩いて学校へ行きます。", "「歩いて」 đã có nghĩa là đi bộ, không thêm で."), m("バスに学校へ行きます。", "バスで学校へ行きます。", "Phương tiện dùng で (バスで, 電車で).")] },
  "to-with": { mistakes: [m("友だちに一緒に映画を見ます。", "友だちと一緒に映画を見ます。", "\"Cùng với ai\" dùng と.")] },
  "to-ya": { mistakes: [m("私は犬と猫や好きです。", "私は犬と猫が好きです。", "Không trộn と và や trong cùng một chuỗi liệt kê, và đối tượng của 好き dùng が.")] },
  mo: { mistakes: [m("私も学生はです。", "私も学生です。", "も thay cho は, không dùng cả hai cùng lúc."), m("私はもコーヒーを飲みます。", "私もコーヒーを飲みます。", "Không nói 「はも」. Chỉ dùng も.")] },
  "no-possessive": { mistakes: [m("これは私が本です。", "これは私の本です。", "\"Của ai\" dùng の."), m("日本語本を読みます。", "日本語の本を読みます。", "Hai danh từ đứng cạnh nhau phải nối bằng の.")] },
  "ka-or": { mistakes: [m("コーヒーやお茶、どちらがいいですか。", "コーヒーかお茶、どちらがいいですか。", "Chọn một trong hai thì dùng か. や dùng để liệt kê.")] },
  "dake-shika": {
    mistakes: [
      m("千円だけありません。（muốn nói: chỉ có 1000 yên）", "千円しかありません。", "\"Chỉ có\" đi với động từ phủ định thì dùng しか. だけ đi với khẳng định: 千円だけあります。"),
      m("水しか飲みます。", "水しか飲みません。", "しか luôn đi với động từ phủ định."),
    ],
  },
  "arimasu-imasu": {
    conjugation: [
      { label: "あります (thể từ điển ある – động từ nhóm I)", example: "あります / ありません / ありました / ありませんでした" },
      { label: "います (thể từ điển いる – động từ nhóm II)", example: "います / いません / いました / いませんでした" },
    ],
  },
  "ni-ga-aru": {
    setVariants: { "Quá khứ": { pattern: "Nơi に N が ありました", example: "昨日、机の上に本がありました。" } },
    mistakes: [m("公園で木があります。", "公園に木があります。", "Nơi tồn tại dùng に, không dùng で.")],
  },
  counters: {
    mistakes: [
      m("ベンチが五台あります。", "ベンチが五つあります。", "台 dùng cho máy móc, xe cộ. Ghế băng đếm bằng 〜つ."),
      m("学生が三つ います。", "学生が三人います。", "Đếm người dùng 〜人 (ひとり, ふたり, さんにん…)."),
    ],
  },
  jikan: { mistakes: [m("今、しじです。", "今、よじです。（４時）", "4時 đọc là よじ, không đọc しじ."), m("今、９時（きゅうじ）です。", "今、９時（くじ）です。", "9時 đọc là くじ.")] },
  "gurai-goro": {
    dropVariants: ["Phủ định"],
    mistakes: [
      m("家から学校まで３時ごろかかります。", "家から学校まで３時間ぐらいかかります。", "ごろ chỉ thời điểm. Lượng thời gian (bao lâu) dùng ぐらい."),
      m("1000円ごろです。", "1000円ぐらいです。", "Số lượng, giá tiền dùng ぐらい."),
    ],
  },
  "mada-mou": {
    mistakes: [
      m("A: もう食べましたか。 B: いいえ、もう食べました。", "A: もう食べましたか。 B: いいえ、まだです。", "Trả lời \"chưa\" dùng まだです (hoặc まだ食べていません)."),
      m("まだ食べませんでした。（muốn nói: vẫn chưa ăn）", "まだ食べていません。", "\"Vẫn chưa làm\" dùng まだ + 〜ていません."),
    ],
  },
  "verb-groups": {
    summary: "Động từ tiếng Nhật chia làm 3 nhóm. Nhóm III chỉ có する và 来る. Nhóm II (一段) có thể từ điển kết thúc bằng 〜eる hoặc 〜iる và chỉ cần bỏ る để chia (食べる, 見る). Còn lại là nhóm I (五段), có đuôi う・く・す・つ・ぬ・む・る… và đổi âm cuối khi chia (書く, 飲む). Chú ý: nhiều động từ trông như nhóm II nhưng là nhóm I, như 帰る, 入る, 切る, 走る, 知る. Gặp những từ này thì phải học thuộc.",
    compare: [{ pattern: "Nhóm I vs Nhóm II", difference: "Nhóm I đổi âm cuối khi chia (書く → 書かない, 帰る → 帰らない). Nhóm II chỉ bỏ る (食べる → 食べない, 見る → 見ない). Thể ます không phân biệt được 帰ります (nhóm I) với 見ます (nhóm II), nên hãy nhớ thể ない." }],
    tip: "Thể ます trước ます là âm hàng え (食べます, 寝ます) → gần như chắc chắn nhóm II. Âm hàng い → đa số nhóm I, trừ vài từ phải học thuộc (見ます, 起きます, 借ります, います).",
    conjugation: [
      { label: "Nhóm I", example: "書きます → 書く・飲みます → 飲む・話します → 話す・帰ります → 帰る" },
      { label: "Nhóm II", example: "食べます → 食べる・寝ます → 寝る・見ます → 見る・起きます → 起きる" },
      { label: "Nhóm III", example: "します → する・来ます → 来る" },
      { label: "⚠️ Ngoại lệ (trông như nhóm II nhưng là nhóm I)", example: "帰ります → 帰る・入ります → 入る・切ります → 切る・走ります → 走る・知ります → 知る" },
    ],
    setVariants: {
      "Nhận biết nhóm I": { pattern: "Âm ngay trước ます thuộc hàng い (き・し・ち・に・み・り・ぎ・び…), thể từ điển đổi sang hàng う tương ứng", example: "書きます → 書く, 飲みます → 飲む, 帰ります → 帰る (ngoại lệ cần nhớ)" },
      "Nhận biết nhóm II": { pattern: "Phần lớn có âm trước ます thuộc hàng え (食べます, 寝ます). Một số động từ hàng い cũng là nhóm II, phải học thuộc: 見ます, 起きます, 借ります, います", example: "食べます → 食べる, 見ます → 見る" },
    },
    mistakes: [
      m("帰ります → thể ない: 帰ない", "帰ります → thể ない: 帰らない", "帰る là động từ nhóm I (ngoại lệ), nên chia như nhóm I: る → ら + ない."),
      m("食べます → thể ない: 食べらない", "食べます → thể ない: 食べない", "食べる là nhóm II: chỉ cần bỏ る, thêm ない."),
    ],
  },
  masu: {
    conjugation: [
      { label: "Nhóm I (đổi đuôi う → い + ます)", example: "書く → 書きます・飲む → 飲みます・話す → 話します" },
      { label: "Nhóm II (bỏ る + ます)", example: "食べる → 食べます・見る → 見ます" },
      { label: "Nhóm III", example: "する → します・来る → 来ます" },
    ],
  },
  "nai-form": {
    mistakes: [m("飲みない", "飲まない", "Nhóm I: đổi đuôi う sang hàng あ rồi thêm ない (飲む → 飲ま + ない)."), m("来ない（きない）", "来ない（こない）", "来る chia thể ない đọc là こない.")],
  },
  "plain-form": { dropVariants: ["Thân mật hơn (nam giới)"] },
  tai: { mistakes: [m("日本へ行くたいです。", "日本へ行きたいです。", "たい gắn vào động từ bỏ ます (行きます → 行き + たい), không gắn vào thể từ điển."), m("私は日本へ行きたいではありません。", "私は日本へ行きたくないです。", "たい chia như tính từ い: phủ định là たくない.")] },
  hoshii: { mistakes: [m("新しい車をほしいです。", "新しい車がほしいです。", "Đồ vật muốn có đi với が."), m("私は車がほしいたいです。", "私は車がほしいです。", "ほしい đã có nghĩa là \"muốn có\", không thêm たい.")] },
  mashou: {
    setVariants: { "Phủ định": { label: "Mời lịch sự hơn", pattern: "V ませんか", example: "一緒に昼ご飯を食べませんか。" } },
    mistakes: [m("一緒に食べましょうですか。", "一緒に食べませんか。/ 一緒に食べましょうか。", "Không thêm です sau ましょう."), m("昨日、映画を見ましょう。", "昨日、映画を見ました。", "ましょう dùng để rủ làm việc sắp tới, không dùng cho quá khứ.")],
  },
  mashouka: {
    dropVariants: ["Phủ định"],
    mistakes: [m("（Muốn xách đồ giúp）荷物を持ちませんか。", "荷物を持ちましょうか。", "ませんか là mời người khác làm. Đề nghị mình làm giúp thì dùng ましょうか.")],
  },
  "ni-iku": {
    conjugation: [
      { label: "Động từ nhóm I", example: "読みます → 読みに行きます" },
      { label: "Động từ nhóm II", example: "食べます → 食べに行きます" },
      { label: "Động từ nhóm III", example: "します → しに行きます" },
      { label: "Danh từ chỉ hành động", example: "勉強 → 勉強に行きます・買い物 → 買い物に行きます" },
    ],
    mistakes: [m("映画を見るに行きます。", "映画を見に行きます。", "Dùng động từ bỏ ます + に, không dùng thể từ điển.")],
  },
  tsumori: { mistakes: [m("日本へ行きますつもりです。", "日本へ行くつもりです。", "つもり đi sau thể từ điển, không đi sau thể ます."), m("私は行くつもりですです。", "私は行くつもりです。", "Không lặp です.")] },
  "te-kudasai": {
    dropVariants: ["Câu hỏi"],
    mistakes: [m("ここで写真を撮ってくださいません。", "ここで写真を撮ってくださいませんか。", "Nhờ lịch sự phải có か ở cuối: 〜てくださいませんか."), m("ちょっと待ちてください。", "ちょっと待ってください。", "待つ là nhóm I đuôi つ → って.")],
  },
  "te-mo-ii": {
    dropVariants: ["Quá khứ"],
    mistakes: [m("写真を撮るてもいいですか。", "写真を撮ってもいいですか。", "Phải dùng thể て: 撮る → 撮って.")],
  },
  "te-wa-ikenai": {
    dropVariants: ["Lịch sự hơn", "Cấm đoán mạnh"],
    mistakes: [m("ここでたばこを吸うはいけません。", "ここでたばこを吸ってはいけません。", "Phải dùng thể て + は: 吸う → 吸って + は.")],
  },
  "te-kara": {
    mistakes: [m("ご飯を食べたから、歯をみがきます。", "ご飯を食べてから、歯をみがきます。", "\"Sau khi\" dùng 〜てから. 〜たから nghĩa là \"vì đã…\".")],
  },
  "te-sequence": {
    mistakes: [m("朝起きます、顔を洗います、学校へ行きます。", "朝起きて、顔を洗って、学校へ行きます。", "Nối nhiều hành động thì các động từ ở giữa dùng thể て, chỉ động từ cuối chia thì.")],
  },
  "nai-de-kudasai": { mistakes: [m("ここで写真を撮らないください。", "ここで写真を撮らないでください。", "Phải có で: 〜ないでください.")] },
  "hou-ga-ii": {
    mistakes: [
      m("お酒を飲みないほうがいいです。", "お酒を飲まないほうがいいです。", "Thể ない của 飲む là 飲まない."),
      m("野菜を食べないほうがいいです。（muốn nói: nên ăn rau）", "野菜を食べたほうがいいです。", "\"Nên làm\" dùng thể た + ほうがいい. Thể ない + ほうがいい nghĩa là \"không nên\"."),
    ],
  },
  "ato-de": { dropVariants: ["Phủ định"] },
  toki: {
    dropVariants: ["Phủ định", "Câu hỏi"],
    mistakes: [m("静かとき、音楽を聞きます。", "静かなとき、音楽を聞きます。", "Tính từ な đứng trước とき phải giữ な."), m("子どもとき、よく泳ぎました。", "子どものとき、よく泳ぎました。", "Danh từ + の + とき.")],
  },
  naru: {
    setVariants: { "Phủ định": { pattern: "A く / N に なりません", example: "なかなか暖かくなりません。" } },
    mistakes: [m("医者でなります。", "医者になります。", "Danh từ + に + なる."), m("静かくになります。", "静かになります。", "Tính từ な: bỏ な + に なります.")],
  },
  "totemo-amari": { dropVariants: ["Phủ định của とても"] },
  suki: { mistakes: [m("私は日本語を好きです。", "私は日本語が好きです。", "Đối tượng của 好き dùng が."), m("私は歌が上手じゃないです、でも好きです。", "私は歌が上手じゃないですが、好きです。", "Nối hai ý trái ngược trong một câu dùng 〜が、. でも dùng ở đầu câu sau.")] },
  yori: { conjugation: [] },
  dochira: { conjugation: [] },
  ichiban: {
    dropVariants: ["Lịch sự hơn"],
    mistakes: [m("果物の中でりんごがいちばんに好きです。", "果物の中でりんごがいちばん好きです。", "いちばん đứng trực tiếp trước tính từ, không thêm に.")],
  },
  "kara-reason": { mistakes: [m("バスが来ませんでしたからです。", "バスが来なかったからです。", "Trước からです dùng thể thường.")] },
  "ga-but": {
    mistakes: [
      m("この部屋は広いですが、明るいです。", "この部屋は広くて、明るいです。", "が nối hai ý trái ngược. Hai ý cùng chiều (đều tốt) thì dùng 〜くて/〜で."),
      m("私は学生です。が、田中さんは学生です。", "私は学生ですが、田中さんは学生ではありません。", "が nối hai vế trái ngược nhau, đặt cuối vế trước."),
    ],
  },
  setsuzoku: {
    mistakes: [
      m("この本はおもしろいです。そして、高いです。（muốn nói: hay nhưng đắt）", "この本はおもしろいです。でも、高いです。", "Ý trái ngược dùng でも. そして dùng khi thêm ý cùng chiều."),
    ],
  },
};

const EXAMPLES = {
  "ga-subject": { 2: ["雨が降っています。", "あめが ふって います。", "Trời đang mưa."] },
  "de-means": { 4: ["東京まで新幹線で行きます。", "とうきょうまで しんかんせんで いきます。", "Tôi đi Tokyo bằng tàu Shinkansen."] },
  "ni-ga-aru": { 4: ["銀行はあそこにあります。", "ぎんこうは あそこに あります。", "Ngân hàng ở đằng kia."] },
  counters: { 4: ["この公園にベンチが五つあります。", "この こうえんに ベンチが いつつ あります。", "Công viên này có năm cái ghế băng."] },
  "nai-form": { 4: ["日曜日は会社へ行かない。", "にちようびは かいしゃへ いかない。", "Chủ nhật tôi không đi làm."] },
  "dict-form": { 3: ["毎朝コーヒーを飲む。", "まいあさ コーヒーを のむ。", "Mỗi sáng tôi uống cà phê."] },
  tsumori: { 3: ["私はたばこをやめるつもりです。", "わたしは たばこを やめる つもりです。", "Tôi định bỏ thuốc lá."] },
  "hou-ga-ii": { 4: ["熱がありますから、学校を休んだほうがいいです。", "ねつが ありますから、がっこうを やすんだ ほうが いいです。", "Vì bị sốt nên bạn nên nghỉ học."] },
  "ato-de": { 4: ["映画を見たあとで、レストランへ行きました。", "えいがを みた あとで、レストランへ いきました。", "Sau khi xem phim, chúng tôi đã đi nhà hàng."] },
  adverb: {
    2: ["田中さんは日本語を上手に話します。", "たなかさんは にほんごを じょうずに はなします。", "Anh Tanaka nói tiếng Nhật giỏi."],
    4: ["もっとゆっくり話してください。", "もっと ゆっくり はなして ください。", "Hãy nói chậm hơn."],
  },
  "i-adjective": { 2: ["昨日は暑かったです。", "きのうは あつかったです。", "Hôm qua trời nóng."] },
  "adj-noun": { 4: ["これは新しい車です。", "これは あたらしい くるまです。", "Đây là chiếc xe mới."] },
  suki: { 4: ["私は野菜がきらいです。", "わたしは やさいが きらいです。", "Tôi ghét rau."] },
  mashou: { 4: ["週末、公園でサッカーをしましょう。", "しゅうまつ、こうえんで サッカーを しましょう。", "Cuối tuần cùng chơi bóng đá ở công viên nhé."] },
};

const d = (speaker, ja, vi) => ({ speaker, ja, vi });
const DIALOGUES = {
  "verb-groups": [
    d("A", "「帰ります」は何グループですか。", "\"帰ります\" thuộc nhóm mấy?"),
    d("B", "グループ１です。", "Nhóm 1."),
    d("A", "え？「食べます」と同じじゃありませんか。", "Hả? Không giống \"食べます\" sao?"),
    d("B", "いいえ。「帰る」は「帰らない」になりますから、グループ１です。", "Không. Vì \"帰る\" chia thành \"帰らない\" nên là nhóm 1."),
  ],
  "gurai-goro": [
    d("A", "電車は何時ごろ駅に着きますか。", "Tàu đến ga khoảng mấy giờ?"),
    d("B", "９時ごろ着きます。", "Khoảng 9 giờ."),
    d("A", "駅から会社まで、どのくらいかかりますか。", "Từ ga đến công ty mất bao lâu?"),
    d("B", "１０分ぐらいです。", "Khoảng 10 phút."),
  ],
  "ga-but": [
    d("A", "この店は安いですが、あまりおいしくないですね。", "Quán này rẻ nhưng không ngon lắm nhỉ."),
    d("B", "そうですね。でも、駅から近いですから、よく来ます。", "Đúng vậy. Nhưng vì gần ga nên tôi hay đến."),
    d("A", "あの店は少し高いですが、とてもおいしいですよ。", "Quán kia hơi đắt nhưng rất ngon đấy."),
  ],
  setsuzoku: [
    d("A", "きのう、何をしましたか。", "Hôm qua bạn đã làm gì?"),
    d("B", "映画を見ました。それから、友だちと晩ごはんを食べました。", "Tôi xem phim. Sau đó ăn tối cùng bạn."),
    d("A", "いいですね。映画はおもしろかったですか。", "Hay quá. Phim có hay không?"),
    d("B", "ええ。でも、ちょっと長かったです。", "Có. Nhưng hơi dài."),
  ],
};

const TEXT = {
  desu: {
    notWhen: ["Không đặt です sau động từ: ✗ 私は行きますです → ✓ 私は行きます.", "Nói thân mật thì thay です bằng だ hoặc bỏ hẳn: 学生だ / 学生。"],
    compare: [{ pattern: "N が います / あります", difference: "です dùng để nói \"A là B\". Muốn nói ở đâu có ai, có cái gì thì dùng います/あります: 教室に先生がいます." }],
  },
  "ni-time": {
    when: ["Thời điểm có con số: 6時に, 3月に, 2025年に, 15日に.", "Thứ trong tuần và các dịp: 日曜日に, 誕生日に, 週末に, 夏休みに."],
    tip: "Có con số (giờ, ngày, tháng, năm) hoặc thứ → thêm に. Không có (きょう, あした, まいにち, いま, 朝) → không thêm.",
  },
  "de-means": { notWhen: ["Đi bộ nói 歩いて, không dùng で.", "Không dùng で để chỉ nơi tồn tại (dùng に): 部屋にいます."] },
  "to-with": { notWhen: ["Làm một mình thì dùng 一人で: 一人で行きます (không dùng と)."] },
  "ka-or": { notWhen: ["Chọn giữa hai hành động thì nói cả hai câu hỏi: 行きますか、行きませんか。"] },
  counters: {
    compare: [
      { pattern: "〜つ vs số + 個", difference: "〜つ đếm đồ vật nói chung nhưng chỉ đến 10 (ひとつ…とお). Từ 11 trở lên dùng 〜個 (じゅういっこ) hoặc chỉ nói số." },
      { pattern: "〜人 vs 〜名", difference: "〜人 là cách đếm người thông thường; 〜名 lịch sự hơn, hay gặp ở nhà hàng, khách sạn (何名様ですか)." },
    ],
  },
  "gurai-goro": {
    compare: [{ pattern: "ぐらい vs ごろ", difference: "ぐらい: khoảng bao nhiêu (số lượng, độ dài thời gian): 3時間ぐらい, 1000円ぐらい. ごろ: khoảng lúc nào (thời điểm): 3時ごろ, 5月ごろ." }],
  },
  "mada-mou": {
    notWhen: ["もう + phủ định nghĩa là \"không… nữa\": もう食べません (tôi không ăn nữa), khác hẳn \"đã… rồi\".", "\"Vẫn chưa làm\" không nói まだ〜ませんでした mà nói まだ〜ていません."],
  },
  "dict-form": {
    structure: "Nhóm I: đổi âm trước ます từ hàng い sang hàng う (書きます → 書く, 飲みます → 飲む). Nhóm II: bỏ ます, thêm る (食べます → 食べる). Nhóm III: します → する, 来ます → 来る.",
    tip: "Nhóm I đổi い → う (書き → 書く), nhóm II thêm る (食べ → 食べる), nhóm III học thuộc する, 来る.",
  },
  "ta-form": {
    when: ["Kể việc đã làm trong hội thoại thân mật: 昨日、映画を見た.", "Hỏi hoặc trả lời về việc đã làm với bạn bè: 宿題、した？", "Dùng trong các mẫu câu khác: 〜たあとで, 〜たほうがいい."],
    tip: "Thể た chia giống hệt thể て, chỉ đổi て → た, で → だ (書いて → 書いた, 飲んで → 飲んだ). Ngoại lệ: 行く → 行った.",
  },
  tai: { notWhen: ["Không nói trực tiếp mong muốn của người khác: ✗ 彼は行きたいです → ✓ 彼は行きたがっています (học kỹ ở N4)."] },
  mashouka: { notWhen: ["Rủ người khác cùng làm thì dùng ませんか / ましょう, không dùng ましょうか với nghĩa mời."] },
  "ni-iku": { notWhen: ["Không dùng thể từ điển trước に: ✗ 見るに行きます → ✓ 見に行きます."] },
  "te-kudasai": {
    summary: "Mẫu câu dùng để nhờ hoặc yêu cầu ai đó làm gì một cách lịch sự. Tương đương \"hãy… / xin hãy…\" trong tiếng Việt. Dùng được với hầu hết mọi người; khi nhờ người trên làm việc gì phiền hà, nói 〜てくださいませんか sẽ nhã nhặn hơn.",
    when: ["Nhờ ai làm gì: ちょっと待ってください.", "Hướng dẫn, chỉ dẫn: ここに名前を書いてください.", "Mời: どうぞ、入ってください."],
    notWhen: ["Khi nhờ người trên làm việc phiền hà, nên dùng 〜てくださいませんか cho nhã nhặn.", "Muốn nói \"đừng làm\" thì dùng 〜ないでください."],
    tip: "てください = \"hãy\"; muốn mềm mỏng hơn thì thêm ませんか: 〜てくださいませんか.",
  },
  "nai-de-kudasai": { compare: [{ pattern: "V ないで (thân mật)", difference: "Bỏ ください thì thành cách nói thân mật với bạn bè, người nhà: 心配しないで." }] },
  toki: { notWhen: ["Danh từ phải có の (子どものとき), tính từ な phải giữ な (ひまなとき).", "Không dùng thể ます trước とき: ✗ 行きますとき → ✓ 行くとき."] },
  "i-adjective": {
    notWhen: ["Tính từ な (きれい, 静か…) chia khác: きれいじゃないです.", "Ngoại lệ: いい → よくないです / よかったです (không nói いくない, いかった)."],
    tip: "い → くない, い → かった, い → くなかった. Ngoại lệ cần nhớ: いい → よくない, よかった.",
  },
  "adj-noun": {
    summary: "Tính từ đứng ngay trước danh từ để bổ nghĩa, giống \"núi cao\" trong tiếng Việt nhưng đảo thứ tự: 高い山. Tính từ い giữ nguyên い (高い山); tính từ な phải giữ な (静かな町, きれいな花). Dạng phủ định, quá khứ cũng đứng trước danh từ được: 高くない山.",
    structure: "Tính từ い + N (高い山) · Tính từ な + な + N (静かな町)",
    tip: "い giữ い, な giữ な: 高い山, 静かな町. Không bao giờ chen の vào giữa tính từ và danh từ.",
  },
  suki: { notWhen: ["Không dùng を với 好き・きらい・上手・下手・わかる: ✗ 日本語を好きです → ✓ 日本語が好きです."] },
};

// Gộp phần sửa chữ vào FIXES
for (const [id, v] of Object.entries(TEXT)) FIXES[id] = { ...(FIXES[id] ?? {}), ...v };

const data = JSON.parse(await readFile(FILE, "utf8"));
for (const [id, lines] of Object.entries(DIALOGUES)) {
  const g = data.find((x) => x.id === id);
  if (g) g.dialogue = lines;
}
for (const [id, rows] of Object.entries(EXAMPLES)) {
  const g = data.find((x) => x.id === id);
  if (!g) continue;
  for (const [i, [ja, kana, vi]] of Object.entries(rows)) g.examples[Number(i)] = { ja, kana, vi };
}
let changed = 0;
for (const [id, fix] of Object.entries(FIXES)) {
  const g = data.find((x) => x.id === id);
  if (!g) {
    console.log(`! không thấy ${id}`);
    continue;
  }
  for (const k of ["summary", "structure", "when", "notWhen", "compare", "tip"]) if (fix[k]) g[k] = fix[k];
  if (fix.summary) g.explanation = fix.summary;
  if (fix.mistakes) g.mistakes = fix.mistakes;
  if (fix.conjugation) g.conjugation = fix.conjugation;
  if (fix.dropVariants) g.variants = (g.variants ?? []).filter((v) => !fix.dropVariants.some((l) => v.label?.startsWith(l)));
  if (fix.setVariants) {
    for (const [label, v] of Object.entries(fix.setVariants)) {
      const i = (g.variants ?? []).findIndex((x) => x.label?.startsWith(label));
      const next = { label: v.label ?? label, pattern: v.pattern, example: v.example };
      if (i >= 0) g.variants[i] = next;
      else (g.variants ??= []).push(next);
    }
  }
  changed++;
}
await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
console.log(`Đã áp dụng sửa cho ${changed} bài.`);
