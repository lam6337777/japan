"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listenOnce, speakAsync, stopSpeaking, type ListenResult } from "./speech";

/**
 * Chế độ "trò chuyện trực tiếp": nghe → gửi AI → AI đọc → nghe tiếp… cho đến khi người dùng bấm Kết thúc.
 * - Micro tạm tắt trong lúc AI đọc để không thu lại giọng của AI (nhất là khi dùng loa ngoài).
 * - Người dùng im lặng SILENCE_MS (tính từ lúc micro mở) → AI hỏi lại; sau MAX_PROMPTS lần → AI chào và kết thúc.
 */
export const SILENCE_MS = 4000;
export const MAX_PROMPTS = 2;

export type LiveLine = { ja: string; kana: string; vi: string };
const PROMPTS: LiveLine[] = [
  { ja: "もしもし、聞こえますか？", kana: "もしもし、きこえますか？", vi: "Alo, bạn có nghe thấy không?" },
  { ja: "あのう、まだいますか？", kana: "あのう、まだ いますか？", vi: "Ừm, bạn vẫn còn ở đó chứ?" },
];
const GOODBYE: LiveLine = {
  ja: "声が聞こえないので、今日はここまでにしましょう。またね！",
  kana: "こえが きこえないので、きょうは ここまでに しましょう。またね！",
  vi: "Cô không nghe thấy bạn nên hôm nay mình dừng ở đây nhé. Hẹn gặp lại!",
};

export type LivePhase = "off" | "starting" | "listening" | "hearing" | "thinking" | "speaking" | "prompting";

export function useLiveConversation(opts: {
  /** Gửi câu của người dùng (null = xin câu chào mở đầu); trả về câu trả lời của AI, null nếu lỗi */
  send: (text: string | null) => Promise<string | null>;
  /** Hiện câu hỏi lại / câu chào của AI trong khung chat (không gửi cho AI) */
  onLocalLine: (line: LiveLine) => void;
  /** Cuộc hội thoại đã có câu nào chưa (chưa có thì AI chào trước) */
  hasMessages: () => boolean;
}) {
  const [phase, setPhase] = useState<LivePhase>("off");
  const [interim, setInterim] = useState("");
  const [misses, setMisses] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const tokenRef = useRef(0);
  const abortRef = useRef<(() => void) | null>(null);
  const optsRef = useRef(opts);
  useEffect(() => {
    optsRef.current = opts;
  });

  const end = useCallback((message: string | null = null) => {
    tokenRef.current++;
    abortRef.current?.();
    abortRef.current = null;
    stopSpeaking();
    setPhase("off");
    setInterim("");
    setMisses(0);
    setNotice(message);
  }, []);

  useEffect(() => () => end(), [end]);

  const start = useCallback(async () => {
    const token = ++tokenRef.current;
    const alive = () => tokenRef.current === token;
    setNotice(null);
    setMisses(0);
    setPhase("starting");

    const say = async (text: string, p: LivePhase = "speaking") => {
      if (!alive()) return;
      setPhase(p);
      await speakAsync(text);
    };

    // Chưa có câu nào → AI chào trước
    if (!optsRef.current.hasMessages()) {
      setPhase("thinking");
      const greet = await optsRef.current.send(null);
      if (!alive()) return;
      if (greet == null) return end("Không kết nối được với AI. Hãy thử lại.");
      await say(greet);
    }

    let missed = 0;
    while (alive()) {
      setInterim("");
      setPhase("listening");
      const listener = listenOnce({
        silenceMs: SILENCE_MS,
        onPhase: (p) => alive() && setPhase(p === "hearing" ? "hearing" : "listening"),
        onInterim: (t) => alive() && setInterim(t),
      });
      abortRef.current = listener.abort;
      const r: ListenResult = await listener.result;
      abortRef.current = null;
      if (!alive() || r.kind === "aborted") return;

      if (r.kind === "error") return end(r.message);

      if (r.kind === "text") {
        missed = 0;
        setMisses(0);
        setInterim(r.text);
        setPhase("thinking");
        const reply = await optsRef.current.send(r.text);
        if (!alive()) return;
        if (reply == null) return end("Gửi tin nhắn không thành công nên cuộc trò chuyện đã dừng. Hãy thử lại.");
        await say(reply);
        continue;
      }

      // Im lặng
      missed++;
      setMisses(missed);
      if (missed > MAX_PROMPTS) {
        optsRef.current.onLocalLine(GOODBYE);
        await say(GOODBYE.ja);
        if (alive()) end("Cuộc trò chuyện đã kết thúc vì Sakura không nghe thấy bạn.");
        return;
      }
      const prompt = PROMPTS[(missed - 1) % PROMPTS.length];
      optsRef.current.onLocalLine(prompt);
      await say(prompt.ja, "prompting");
    }
  }, [end]);

  return { active: phase !== "off", phase, interim, misses, notice, start, end, clearNotice: () => setNotice(null) };
}
