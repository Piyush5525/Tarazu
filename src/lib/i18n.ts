"use client";
import { useCallback } from "react";
import { useStore, type Lang } from "./store";

export type L = { en: string; hi: string; bn: string };

export const tr = (lang: Lang, s: L) => s[lang] ?? s.en;

/** const t = useT();  t({ en: "My gold", hi: "मेरा सोना", bn: "আমার সোনা" }) */
export function useT() {
  const lang = useStore((s) => s.lang);
  return useCallback((s: L) => tr(lang, s), [lang]);
}

export const LANGS: { id: Lang; label: string; hello: string }[] = [
  { id: "hi", label: "हिंदी", hello: "नमस्ते" },
  { id: "bn", label: "বাংলা", hello: "নমস্কার" },
  { id: "en", label: "English", hello: "Hello" },
];

const BN = "০১২৩৪৫৬৭৮৯", HI = "०१२३४५६७८९";
/** Show numerals in the reader's own script (optional setting; weights stay in mono). */
export const localDigits = (s: string, lang: Lang) => (lang === "en" ? s : s.replace(/\d/g, (d) => (lang === "bn" ? BN : HI)[+d]));
