"use client";
import type { Lang } from "./store";
import { BCP47, earHooks, recCtor, type Rec } from "./voice";

/* ---------- Which language did they just use? ---------- */

const HI_ROMAN = /\b(hai|hain|kya|kyu|kyun|mera|meri|mere|mujhe|kitna|kitni|kab|kaise|kahan|nahi|nahin|sona|paisa|paise|hisab|hisaab|dikhao|batao|bolo|chahiye|karo|milega|seth|aaj|kal|haan|theek|samjhao|madad)\b/i;
const BN_ROMAN = /\b(ami|amar|amake|tumi|koto|kobe|kothay|taka|ache|achhe|nei|dekhao|kore|korbo|hobe|pabo|kemon|keno|malik|alada|bujhiye|sahajyo)\b/i;

/** Script first (Devanagari / Bengali), then tell-tale romanised words, otherwise English. */
export function detectLang(text: string, fallback: Lang): Lang {
  const bn = (text.match(/[ঀ-৿]/g) ?? []).length;
  const hi = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  if (bn || hi) return bn > hi ? "bn" : "hi";
  if (!/[a-z]/i.test(text)) return fallback;
  if (BN_ROMAN.test(text) && !HI_ROMAN.test(text)) return "bn";
  if (HI_ROMAN.test(text)) return "hi";
  return "en";
}

/* ---------- Hands-free: an always-on ear that waits for her name ---------- */

// Her name as the recognisers tend to write it. Whatever follows it in the same breath is the request.
export const WAKE = /\b(?:tara|taara|tarah|thara|tada)\b[\s,.!?]*|तारा[\s,।.!?]*|तरा\s+|তারা[\s,।.!?]*|টারা[\s,।.!?]*/i;

/** "Hello Tara, mera sona kitna hai" -> { called: true, rest: "mera sona kitna hai" } */
export function heardName(text: string): { called: boolean; rest: string } {
  const m = text.match(WAKE);
  if (!m || m.index === undefined) return { called: false, rest: text };
  const rest = text.slice(m.index + m[0].length).trim();
  return { called: true, rest: /^(hello|hi|hey|suno|सुनो|শোনো)?$/i.test(rest) ? "" : rest };
}

/**
 * Continuous recognition that restarts itself. Every finished phrase goes to onPhrase; the caller decides
 * whether it was a call ("Tara…") or a follow-up. pause() while she talks so she does not hear herself.
 */
export function startEar(getLang: () => Lang, onPhrase: (text: string) => void, onError?: (e: string) => void) {
  const C = recCtor();
  let rec: Rec | null = null, alive = !!C, paused = false;
  const boot = () => {
    if (!C || !alive || paused || rec) return;
    const r = new C();
    rec = r;
    r.lang = BCP47[getLang()];
    r.continuous = true;
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      if (last?.isFinal) onPhrase(last[0].transcript.trim());
    };
    r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { alive = false; onError?.(e.error); } };
    r.onend = () => { if (rec === r) rec = null; if (alive && !paused) setTimeout(boot, 300); };
    try { r.start(); } catch { rec = null; setTimeout(boot, 900); }
  };
  boot();
  const ctl = {
    supported: !!C,
    pause: () => { paused = true; try { rec?.abort(); } catch {} },
    resume: () => { if (!alive) return; paused = false; setTimeout(boot, 150); },
    stop: () => { alive = false; earHooks.pause = earHooks.resume = () => {}; try { rec?.abort(); } catch {} },
  };
  earHooks.pause = ctl.pause;
  earHooks.resume = ctl.resume;
  return ctl;
}

export type Ear = ReturnType<typeof startEar>;
