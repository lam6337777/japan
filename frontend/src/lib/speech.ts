"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings } from "./settings";

// ---------- Đọc to (TTS) bằng giọng có sẵn của trình duyệt ----------
let jaVoice: SpeechSynthesisVoice | null = null;

function pickVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ja"));
  // Ưu tiên giọng chất lượng cao (Google / Microsoft Online / Natural)
  jaVoice =
    voices.find((v) => /natural|online|google/i.test(v.name)) ?? voices[0] ?? null;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  if (jaVoice) u.voice = jaVoice;
  u.rate = opts.rate ?? getSettings().speechRate;
  if (opts.onEnd) u.onend = opts.onEnd;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

// ---------- Nhận dạng giọng nói (STT) ----------
/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh thanh địa chỉ → Micro → Cho phép, rồi tải lại trang.",
  "service-not-allowed": "Trình duyệt này không cho dùng nhận dạng giọng nói. Hãy mở bằng Chrome hoặc Edge.",
  "audio-capture": "Không tìm thấy micro. Kiểm tra micro đã cắm / bật chưa, hoặc có ứng dụng khác đang dùng micro không.",
  "no-speech": "Chưa nghe thấy gì. Bấm micro rồi nói ngay, nói to và rõ hơn một chút.",
  network: "Không kết nối được dịch vụ nhận dạng giọng nói. Trình duyệt này (Cốc Cốc, Brave, Opera…) có thể không hỗ trợ — hãy dùng Chrome hoặc Edge.",
  "language-not-supported": "Trình duyệt chưa hỗ trợ nhận dạng tiếng Nhật. Hãy dùng Chrome hoặc Edge.",
};

export type MicPhase = "idle" | "starting" | "ready" | "hearing";

export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ text: string; at: number } | null>(null);
  const recRef = useRef<Recognition>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec: Recognition = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = false;
    // starting → (micro mở) ready → (nghe thấy tiếng) hearing → kết thúc
    rec.onaudiostart = () => setPhase((p) => (p === "starting" ? "ready" : p));
    rec.onsoundstart = () => setPhase((p) => (p === "idle" ? p : "hearing"));
    rec.onspeechstart = () => setPhase((p) => (p === "idle" ? p : "hearing"));
    rec.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setPhase((p) => (p === "idle" ? p : "hearing"));
      setInterim(interimText);
      if (finalText) {
        setCaptured({ text: finalText, at: Date.now() });
        onFinalRef.current(finalText);
      }
    };
    rec.onend = () => {
      setPhase("idle");
      setInterim("");
    };
    rec.onerror = (e: any) => {
      setPhase("idle");
      if (e?.error === "aborted") return; // tự dừng, không phải lỗi
      setError(MIC_ERRORS[e?.error] ?? `Không nhận được giọng nói (${e?.error ?? "lỗi lạ"}). Hãy thử lại.`);
    };
    recRef.current = rec;
    return () => rec.abort();
  }, []);

  // Ẩn dòng "Đã ghi lại" sau vài giây
  useEffect(() => {
    if (!captured) return;
    const t = setTimeout(() => setCaptured(null), 2500);
    return () => clearTimeout(t);
  }, [captured]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    stopSpeaking();
    setError(null);
    setCaptured(null);
    try {
      recRef.current.start();
      setPhase("starting");
    } catch {
      /* đã đang nghe */
    }
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening: phase !== "idle", phase, interim, error, captured, start, stop };
}
