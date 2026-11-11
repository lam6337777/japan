"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSettings } from "./settings";

// ---------- Đọc to (TTS) bằng giọng có sẵn của trình duyệt ----------
const hasTTS = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** 3 = giọng AI tự nhiên (Edge "Online (Natural)"), 2 = Google / giọng mạng, 1 = giọng cài sẵn của máy */
export function voiceRank(v: SpeechSynthesisVoice): number {
  if (/natural/i.test(v.name)) return 3;
  if (/google|online|enhanced|premium|siri/i.test(v.name) || !v.localService) return 2;
  return 1;
}

/** Giọng tiếng Nhật trình duyệt có, giọng tốt xếp trước */
export function getJaVoices(): SpeechSynthesisVoice[] {
  if (!hasTTS()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ja"))
    .sort((a, b) => voiceRank(b) - voiceRank(a));
}

/** Tên ngắn gọn: "Microsoft Nanami Online (Natural) - Japanese (Japan)" → "Nanami" */
export function voiceLabel(v: SpeechSynthesisVoice): string {
  const name = v.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s*-\s*Japanese.*$/i, "")
    .replace(/\s*Online\s*\(Natural\)/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
  return name || v.name;
}

function currentVoice(): SpeechSynthesisVoice | null {
  const voices = getJaVoices();
  const chosen = getSettings().voiceURI;
  return (chosen && voices.find((v) => v.voiceURI === chosen)) || voices[0] || null;
}

/** Danh sách giọng, tự cập nhật khi trình duyệt nạp xong giọng (Chrome nạp trễ) */
export function useJaVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (!hasTTS()) return;
    const update = () => setVoices(getJaVoices());
    update();
    window.speechSynthesis.addEventListener?.("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", update);
  }, []);
  return voices;
}

export function speak(text: string, opts: { rate?: number; voice?: SpeechSynthesisVoice | null; onEnd?: () => void } = {}) {
  if (!hasTTS()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  const voice = opts.voice ?? currentVoice();
  if (voice) u.voice = voice;
  const s = getSettings();
  u.rate = opts.rate ?? s.speechRate;
  u.pitch = s.pitch;
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

const getSR = () => {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
};

/**
 * Nhận dạng giọng nói. Mỗi lần bấm mic tạo một phiên nhận dạng MỚI — trên điện thoại
 * (Safari iOS, một số máy Android) dùng lại phiên cũ thường chỉ chạy được lần đầu.
 */
export function useSpeechRecognition(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [phase, setPhase] = useState<MicPhase>("idle");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ text: string; at: number } | null>(null);
  const recRef = useRef<Recognition>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  });

  useEffect(() => {
    setSupported(!!getSR());
    return () => {
      recRef.current?.abort();
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const clearWatchdog = () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  };

  /** Bỏ phiên hiện tại (nếu có) và đưa nút về trạng thái nghỉ */
  const reset = useCallback(() => {
    clearWatchdog();
    const old = recRef.current;
    recRef.current = null;
    if (old) {
      old.onresult = old.onend = old.onerror = old.onaudiostart = old.onsoundstart = old.onspeechstart = null;
      try {
        old.abort();
      } catch {
        /* bỏ qua */
      }
    }
    setPhase("idle");
    setInterim("");
  }, []);

  // Ẩn dòng "Đã ghi lại" sau vài giây
  useEffect(() => {
    if (!captured) return;
    const t = setTimeout(() => setCaptured(null), 2500);
    return () => clearTimeout(t);
  }, [captured]);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    reset();
    stopSpeaking();
    setError(null);
    setCaptured(null);

    const rec: Recognition = new SR();
    rec.lang = "ja-JP";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let done = false; // mỗi phiên chỉ nhận 1 câu (một số máy Android trả kết quả cuối 2 lần)
    const mine = () => recRef.current === rec;

    rec.onaudiostart = () => {
      if (!mine()) return;
      clearWatchdog();
      setPhase((p) => (p === "starting" ? "ready" : p));
    };
    rec.onsoundstart = rec.onspeechstart = () => mine() && setPhase("hearing");
    rec.onresult = (e: any) => {
      if (!mine() || done) return;
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      clearWatchdog();
      setPhase("hearing");
      setInterim(interimText);
      if (finalText.trim()) {
        done = true;
        setCaptured({ text: finalText.trim(), at: Date.now() });
        onFinalRef.current(finalText.trim());
        try {
          rec.stop();
        } catch {
          /* bỏ qua */
        }
      }
    };
    rec.onend = () => {
      if (!mine()) return;
      clearWatchdog();
      recRef.current = null;
      setPhase("idle");
      setInterim("");
    };
    rec.onerror = (e: any) => {
      if (!mine()) return;
      reset();
      if (e?.error === "aborted") return; // tự dừng, không phải lỗi
      setError(MIC_ERRORS[e?.error] ?? `Không nhận được giọng nói (${e?.error ?? "lỗi lạ"}). Hãy thử lại.`);
    };

    recRef.current = rec;
    setPhase("starting");
    // Nếu micro không mở được trong 8 giây (máy bị treo phiên cũ…) thì nhả nút và báo lỗi
    watchdogRef.current = setTimeout(() => {
      if (!mine()) return;
      reset();
      setError("Micro không phản hồi. Hãy bấm lại nút mic; nếu vẫn không được, tải lại trang.");
    }, 8000);
    try {
      rec.start();
    } catch {
      reset();
      setError("Không bật được micro. Hãy bấm lại nút mic; nếu vẫn không được, tải lại trang.");
    }
  }, [reset]);

  /** Dừng nghe: giữ phần đã nói được; nếu máy không báo kết thúc trong 1,5 giây thì tự nhả nút */
  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return reset();
    try {
      rec.stop();
    } catch {
      return reset();
    }
    clearWatchdog();
    watchdogRef.current = setTimeout(() => recRef.current === rec && reset(), 1500);
  }, [reset]);

  return { supported, listening: phase !== "idle", phase, interim, error, captured, start, stop };
}
