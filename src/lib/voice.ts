"use client";
import type { Lang } from "./store";

// Free, built-in browser speech. No key, no server. Chrome/Edge/Android support both directions;
// where a voice or the recogniser is missing we fall back to text silently.

export const BCP47: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", bn: "bn-IN" };

let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  voices = window.speechSynthesis.getVoices();
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

function pickVoice(lang: Lang) {
  if (!voices.length) loadVoices();
  const want = lang === "bn" ? ["bn-IN", "bn-BD", "bn"] : lang === "hi" ? ["hi-IN", "hi"] : ["en-IN", "en-GB", "en"];
  for (const w of want) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase().startsWith(w.toLowerCase()));
    if (v) return v;
  }
  return null;
}

// A little slower than normal is easier to follow; "speak slowly" drops it further.
let speechRate = 0.92;
export const setSpeechRate = (r: number) => { speechRate = Math.max(0.6, Math.min(1.1, r)); };

// The hands-free ear registers here so any one-shot listen() can borrow the microphone and give it back.
export const earHooks = { pause: () => {}, resume: () => {} };

export const YES_WORDS = /\b(yes|yeah|haan|han|ha|ji|sahi|theek|thik|correct|ok|okay)\b|हाँ|हां|जी|सही|ठीक|হ্যাঁ|হা|ঠিক|সঠিক/i;
export const NO_WORDS = /\b(no|nahi|nahin|nai|na|galat|wrong|cancel)\b|नहीं|नही|ग़लत|गलत|না|ভুল/i;

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speak(text: string, lang: Lang, onEnd?: () => void) {
  if (!canSpeak()) { onEnd?.(); return; }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#]/g, ""));
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.lang = v?.lang ?? BCP47[lang];
  u.rate = speechRate;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  synth.speak(u);
}

export type Rec = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null };

export const recCtor = () => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canListen = () => !!recCtor();

/** Start listening. Returns a stop function. `onText(text, final)` fires as words arrive. */
export function listen(lang: Lang, onText: (text: string, final: boolean) => void, onEnd: (error?: string) => void): () => void {
  const C = recCtor();
  if (!C) { onEnd("unsupported"); return () => {}; }
  stopSpeaking();
  earHooks.pause();
  const done = onEnd;
  onEnd = (e) => { earHooks.resume(); done(e); };
  const rec = new C();
  rec.lang = BCP47[lang];
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let err: string | undefined;
  rec.onresult = (e) => {
    let text = "", final = false;
    for (let i = 0; i < e.results.length; i++) { text += e.results[i][0].transcript; if (e.results[i].isFinal) final = true; }
    onText(text.trim(), final);
  };
  rec.onerror = (e) => { err = e.error; };
  rec.onend = () => onEnd(err);
  try { rec.start(); } catch { onEnd("failed"); }
  return () => { try { rec.stop(); } catch {} };
}

/* ---------- Scribe's deterministic reader: weight and purity out of a spoken sentence ---------- */

const NATIVE_DIGITS: Record<string, string> = {};
"০১২৩৪৫৬৭৮৯".split("").forEach((d, i) => (NATIVE_DIGITS[d] = String(i)));
"०१२३४५६७८९".split("").forEach((d, i) => (NATIVE_DIGITS[d] = String(i)));
export const toAsciiDigits = (s: string) => s.replace(/[০-৯०-९]/g, (d) => NATIVE_DIGITS[d]);

const WORDS: [RegExp, number][] = [
  [/\b(dhai sau|adhai sau)\b|ढाई सौ|আড়াইশো|আড়াই শো/i, 250], [/\b(do sau|two hundred)\b|दो सौ|দুইশো|দুশো/i, 200],
  [/\b(ek sau|sau|one hundred|hundred)\b|सौ|একশো/i, 100], [/\b(pachas|fifty)\b|पचास|পঞ্চাশ/i, 50],
];

export type Heard = { netMg: number | null; purityBp: number | null; karat: number | null; item: string | null };

/**
 * "Aaj 250 gram 22 carat sona mila Mehta ji se, haar ke liye" -> 250000 mg, 9160 bp, haar.
 * It never guesses: a missing weight comes back null and the bot asks.
 */
export function readIssue(raw: string): Heard {
  const s = toAsciiDigits(raw.toLowerCase());
  let netMg: number | null = null;
  const g = s.match(/(\d+(?:[.,]\d+)?)\s*(?:g\b|gm|gram|grams|ग्राम|গ্রাম)/);
  if (g) netMg = Math.round(parseFloat(g[1].replace(",", ".")) * 1000);
  else if (/gram|ग्राम|গ্রাম/.test(s)) for (const [re, v] of WORDS) if (re.test(s)) { netMg = v * 1000; break; }
  let karat: number | null = null;
  const k = s.match(/(\d{2})\s*(?:k\b|kt|carat|karat|कैरेट|कैरट|ক্যারেট|ক্যারাট)/);
  if (k) karat = parseInt(k[1], 10);
  const purityBp = karat === 22 ? 9160 : karat === 24 ? 9999 : karat === 18 ? 7500 : karat === 14 ? 5850 : null;
  const item = /haar|हार|হার|necklace/.test(s) ? "haar" : /kada|bangle|चूड़ी|कड़ा|চুড়ি|বালা/.test(s) ? "bangle" : /ring|anguthi|अंगूठी|আংটি/.test(s) ? "ring" : null;
  return { netMg, purityBp, karat, item };
}
