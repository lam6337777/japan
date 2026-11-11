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

/**
 * Đọc to và chờ đọc xong. Luôn kết thúc: có hẹn giờ dự phòng vì một số trình duyệt
 * (Chrome với câu dài, Safari iOS) đôi khi không báo sự kiện "đọc xong".
 */
export function speakAsync(text: string): Promise<void> {
  if (!hasTTS() || !text.trim()) return Promise.resolve();
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      resolve();
    };
    const rate = getSettings().speechRate || 1;
    const fallback = setTimeout(finish, (text.length * 260) / rate + 3000);
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    const voice = currentVoice();
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = getSettings().pitch;
    u.onend = finish;
    u.onerror = finish;
    window.speechSynthesis.speak(u);
  });
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

export const speechRecognitionSupported = () => !!getSR();

export const MIC_MUTED =
  "Micro của máy đang bị tắt tiếng (mute) nên không thu được âm thanh nào. Trên laptop Windows: bấm phím tắt micro (thường là F9 hoặc phím có hình micro), hoặc vào Cài đặt → Hệ thống → Âm thanh → Đầu vào → bỏ tắt tiếng / kéo âm lượng micro lên.";
export const MIC_NOT_OPENED =
  "Micro không mở được. Nếu bạn đang mở trang trong Zalo, Messenger, Facebook… hãy mở bằng Chrome (Android) hoặc Safari (iPhone). Nếu đang dùng Chrome: kiểm tra đã cho phép micro chưa (ổ khóa cạnh thanh địa chỉ).";

/**
 * Kiểm tra micro có thu được tín hiệu không (đo ~0,8 giây).
 * Trả về true nếu micro bị tắt tiếng / tắt phần cứng (trình duyệt báo "muted", hoặc tín hiệu
 * gần như bằng 0 — micro thật luôn có chút tiếng ồn nền ~1e-4 trở lên). Không đo được thì trả về false.
 */
export async function micIsSilent(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const track = stream.getAudioTracks()[0];
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AC() as AudioContext;
    await ctx.resume().catch(() => {});
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    let peak = 0;
    const t0 = Date.now();
    while (Date.now() - t0 < 800) {
      await new Promise((r) => setTimeout(r, 50));
      an.getFloatTimeDomainData(buf);
      for (const v of buf) peak = Math.max(peak, Math.abs(v));
    }
    // Micro bị tắt tiếng: trình duyệt báo track "muted", hoặc tín hiệu gần như bằng 0 (~1e-10).
    // AudioContext bị trình duyệt treo (chưa chạy) thì không kết luận theo mức tín hiệu.
    if (track?.muted) return true;
    return ctx.state === "running" && peak < 1e-6;
  } catch {
    return false;
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
    ctx?.close().catch(() => {});
  }
}

export type ListenResult =
  | { kind: "text"; text: string }
  | { kind: "silence" } // không nghe được câu nào trong thời gian chờ
  | { kind: "aborted" }
  | { kind: "error"; message: string };

/**
 * Nghe MỘT câu rồi trả kết quả (dùng cho chế độ trò chuyện liên tục).
 * - silenceMs: tính từ lúc micro mở; nếu người dùng chưa nói gì thì trả "silence".
 *   Có tiếng nói thì gia hạn thêm, đã ra chữ thì chờ đến hết câu.
 * - Gọi handle.abort() để dừng ngay (trả "aborted").
 */
export function listenOnce(opts: {
  silenceMs: number;
  onPhase?: (p: Exclude<MicPhase, "idle">) => void;
  onInterim?: (text: string) => void;
}): { result: Promise<ListenResult>; abort: () => void } {
  const SR = getSR();
  if (!SR) return { result: Promise.resolve({ kind: "error", message: MIC_ERRORS["service-not-allowed"] }), abort: () => {} };

  let resolveFn: (r: ListenResult) => void = () => {};
  const result = new Promise<ListenResult>((r) => (resolveFn = r));
  let rec: Recognition = null;
  let settled = false;
  let gotText = false;
  let lastInterim = "";
  let ready = false;
  let deadline = 0; // thời điểm hết giờ chờ (tính từ lúc micro mở lần đầu)
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const detach = (r: Recognition) => {
    if (!r) return;
    r.onresult = r.onend = r.onerror = r.onstart = r.onaudiostart = r.onspeechstart = null;
    try {
      r.abort();
    } catch {
      /* bỏ qua */
    }
  };
  const finish = (r: ListenResult) => {
    if (settled) return;
    settled = true;
    if (silenceTimer) clearTimeout(silenceTimer);
    timers.forEach(clearTimeout);
    detach(rec);
    rec = null;
    resolveFn(r);
  };
  const armSilence = (ms: number) => {
    if (gotText) return;
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => finish({ kind: "silence" }), ms);
  };

  /**
   * Trình duyệt (nhất là trên điện thoại) thường tự tắt micro sau ~5–8 giây im lặng, sớm hơn silenceMs.
   * Khi đó, nếu chưa hết giờ và chưa nghe được gì → âm thầm mở phiên nhận dạng mới để chờ tiếp.
   */
  const endedQuietly = () => {
    if (settled) return;
    if (lastInterim) return finish({ kind: "text", text: lastInterim });
    if (ready && Date.now() < deadline - 500) return startRec();
    finish({ kind: "silence" });
  };

  const startRec = () => {
    detach(rec);
    const r: Recognition = new SR();
    rec = r;
    const mine = () => rec === r && !settled;
    r.lang = "ja-JP";
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    const onReady = () => {
      if (!mine() || ready) return;
      ready = true;
      deadline = Date.now() + opts.silenceMs;
      opts.onPhase?.("ready");
      armSilence(opts.silenceMs);
    };
    r.onstart = onReady;
    r.onaudiostart = onReady;
    r.onspeechstart = () => {
      if (!mine()) return;
      opts.onPhase?.("hearing");
      // có tiếng → cho thêm thời gian để ra chữ
      deadline = Math.max(deadline, Date.now() + opts.silenceMs);
      armSilence(opts.silenceMs);
    };
    r.onresult = (e: any) => {
      if (!mine()) return;
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const x = e.results[i];
        if (x.isFinal) finalText += x[0].transcript;
        else interimText += x[0].transcript;
      }
      if (finalText.trim()) return finish({ kind: "text", text: finalText.trim() });
      if (interimText.trim()) {
        gotText = true;
        lastInterim = interimText.trim();
        if (silenceTimer) clearTimeout(silenceTimer);
        opts.onPhase?.("hearing");
        opts.onInterim?.(interimText);
      }
    };
    // Một số máy kết thúc mà không gửi kết quả "cuối" → dùng phần chữ tạm đã nghe được
    r.onend = () => mine() && endedQuietly();
    r.onerror = (e: any) => {
      if (!mine()) return;
      const code = e?.error;
      if (code === "no-speech" || code === "aborted") return endedQuietly();
      finish({ kind: "error", message: MIC_ERRORS[code] ?? `Không nhận được giọng nói (${code ?? "lỗi lạ"}).` });
    };
    try {
      r.start();
    } catch {
      if (ready) finish({ kind: "silence" });
      else finish({ kind: "error", message: "Không bật được micro. Hãy thử lại hoặc tải lại trang." });
    }
  };

  opts.onPhase?.("starting");
  // Micro không mở được trong 8 giây → báo lỗi; mỗi lượt nghe tối đa 40 giây
  timers.push(setTimeout(() => !ready && finish({ kind: "error", message: "Micro không phản hồi. Hãy thử lại hoặc tải lại trang." }), 8000));
  timers.push(
    setTimeout(() => {
      try {
        rec?.stop();
      } catch {
        /* bỏ qua */
      }
      setTimeout(() => finish(lastInterim ? { kind: "text", text: lastInterim } : { kind: "silence" }), 1500);
    }, 40000),
  );
  startRec();
  return { result, abort: () => finish({ kind: "aborted" }) };
}

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
  const stopRequested = useRef(false); // người dùng tự bấm dừng
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
    let opened = false; // micro đã thực sự mở chưa
    const mine = () => recRef.current === rec;

    rec.onaudiostart = () => {
      if (!mine()) return;
      opened = true;
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
      // Tắt ngay mà micro chưa từng mở, cũng không báo lỗi (thường gặp ở trình duyệt trong Zalo/Messenger…)
      if (!opened && !done && !stopRequested.current) setError(MIC_NOT_OPENED);
    };
    rec.onerror = (e: any) => {
      if (!mine()) return;
      reset();
      const code = e?.error;
      if (code === "aborted") return; // tự dừng, không phải lỗi
      setError(MIC_ERRORS[code] ?? `Không nhận được giọng nói (${code ?? "lỗi lạ"}). Hãy thử lại.`);
      // "Không nghe thấy gì" → xem có phải micro đang bị tắt tiếng không
      if (code === "no-speech") micIsSilent().then((silent) => silent && setError(MIC_MUTED));
    };

    recRef.current = rec;
    stopRequested.current = false;
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
    stopRequested.current = true;
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
