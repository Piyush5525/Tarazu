"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlarmClock, Check, CheckCheck, Clock, GitCompareArrows, Mic, NotebookPen, PlayCircle, ScanSearch, X, Hourglass, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Balance3D } from "@/components/three/lazy";
import { Grams, Guide, Speak } from "@/components/ui";
import { useFacts } from "@/lib/facts";
import { tr, useT, type L } from "@/lib/i18n";
import { findDivergence, type Divergence } from "@/lib/ledger/analytics";
import { reconcile, type LedgerEvent } from "@/lib/ledger/engine";
import { itemName, KARIGARS } from "@/lib/ledger/seed";
import { fineMg, grams, pct, rupees } from "@/lib/ledger/units";
import { useStore, type Lang } from "@/lib/store";
import { canListen, listen, NO_WORDS, readIssue, speak, YES_WORDS } from "@/lib/voice";

const SAMPLE: L = { en: "Today I got 250 gram 22 carat gold from Mehta ji, for the haar", hi: "आज 250 ग्राम 22 कैरेट सोना मिला मेहता जी से, हार के लिए", bn: "আজ ২৫০ গ্রাম ২২ ক্যারেট সোনা পেলাম মেহতা জির কাছ থেকে, হারের জন্য" };

/** Plain-language description of an entry, in the karigar's language. This is what gets read aloud before he signs. */
function describe(e: LedgerEvent, lang: Lang): string {
  const g = e.payload.netMg !== undefined ? grams(e.payload.netMg) : "";
  const k = e.payload.purityBp === 9160 ? "22" : e.payload.purityBp === 7500 ? "18" : e.payload.purityBp === 9999 ? "24" : null;
  const pur = k ? tr(lang, { en: `${k} carat`, hi: `${k} कैरेट`, bn: `${k} ক্যারেট` }) : e.payload.purityBp ? `${pct(e.payload.purityBp)}%` : "";
  switch (e.type) {
    case "ISSUE": return tr(lang, { en: `You received ${g} grams of ${pur} gold from Mehta Jewellers for job ${e.jobId}.`, hi: `काम ${e.jobId} के लिए तुम्हें मेहता ज्वैलर्स से ${g} ग्राम ${pur} सोना मिला।`, bn: `কাজ ${e.jobId}-এর জন্য তুমি মেহতা জুয়েলার্স থেকে ${g} গ্রাম ${pur} সোনা পেয়েছ।` });
    case "RECEIVE_FINISHED": return tr(lang, { en: `You gave back the finished piece, ${g} grams, for job ${e.jobId}.`, hi: `काम ${e.jobId} का तैयार गहना, ${g} ग्राम, तुमने वापस दिया।`, bn: `কাজ ${e.jobId}-এর তৈরি গয়না, ${g} গ্রাম, তুমি ফেরত দিয়েছ।` });
    case "RECEIVE_SCRAP": return tr(lang, { en: `You gave back ${g} grams of scrap for job ${e.jobId}.`, hi: `काम ${e.jobId} का ${g} ग्राम चूरा तुमने वापस दिया।`, bn: `কাজ ${e.jobId}-এর ${g} গ্রাম গুঁড়ো তুমি ফেরত দিয়েছ।` });
    case "ADJUSTMENT": return tr(lang, { en: `Correction for job ${e.jobId}: ${grams(e.payload.fineMg ?? 0)} grams of pure gold is added back in your favour. The old entry stays; this is a new line.`, hi: `काम ${e.jobId} का सुधार: ${grams(e.payload.fineMg ?? 0)} ग्राम खरा सोना तुम्हारे हक़ में जोड़ा जाता है। पुरानी एंट्री वैसी ही रहेगी; यह नई लाइन है।`, bn: `কাজ ${e.jobId}-এর সংশোধন: ${grams(e.payload.fineMg ?? 0)} গ্রাম খাঁটি সোনা তোমার পক্ষে যোগ হচ্ছে। পুরনো এন্ট্রি যেমন আছে থাকবে; এটা নতুন লাইন।` });
    case "SETTLEMENT_SIGNED": return tr(lang, { en: `Settlement for job ${e.jobId}: wastage limit ${pct(e.payload.capBp ?? 0)} percent. You owe ${grams(e.payload.fineMg ?? 0)} grams of pure gold.`, hi: `काम ${e.jobId} का हिसाब: छीजत की सीमा ${pct(e.payload.capBp ?? 0)} प्रतिशत। तुम्हें ${grams(e.payload.fineMg ?? 0)} ग्राम खरा सोना देना है।`, bn: `কাজ ${e.jobId}-এর হিসাব: ক্ষয়ের সীমা ${pct(e.payload.capBp ?? 0)} শতাংশ। তোমাকে ${grams(e.payload.fineMg ?? 0)} গ্রাম খাঁটি সোনা দিতে হবে।` });
    case "PAYMENT_MADE": return tr(lang, { en: `Mehta Jewellers says it paid you ${rupees(e.payload.amountPaise ?? 0)} for job ${e.jobId}. Say yes only if the money has reached you.`, hi: `मेहता ज्वैलर्स का कहना है कि काम ${e.jobId} के ${rupees(e.payload.amountPaise ?? 0)} तुम्हें दे दिए। पैसा मिल गया हो तभी हाँ बोलो।`, bn: `মেহতা জুয়েলার্স বলছে কাজ ${e.jobId}-এর ${rupees(e.payload.amountPaise ?? 0)} তোমাকে দিয়েছে। টাকা পেয়ে থাকলে তবেই হ্যাঁ বলো।` });
    default: return `${e.type} ${e.jobId}`;
  }
}

function YesNo({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  const t = useT();
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <button onClick={onYes} className="btn btn-yes btn-xl"><Check size={28} />{t({ en: "Yes, correct", hi: "हाँ, सही है", bn: "হ্যাঁ, ঠিক" })}</button>
      <button onClick={onNo} className="btn btn-no btn-xl"><X size={28} />{t({ en: "No, wrong", hi: "ना, ग़लत है", bn: "না, ভুল" })}</button>
    </div>
  );
}

type Bubble = { from: "me" | "bot"; text: string; draft?: { netMg: number; purityBp: number; jobId: string }; tick?: 1 | 2 };

function VoiceCapture() {
  const t = useT();
  const { lang, me, jobs, chain, propose } = useStore();
  const [chat, setChat] = useState<Bubble[]>([]);
  const [hearing, setHearing] = useState(false);
  const [interim, setInterim] = useState("");
  const stop = useRef<() => void>(() => {});
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [chat, interim]);

  // the job this gold belongs to: an open job with nothing issued yet, else the newest open one
  const target = useMemo(() => {
    const open = jobs.filter((j) => j.karigarId === me && j.status === "OPEN");
    return open.find((j) => reconcile(j, chain).issuedFine === 0) ?? open[open.length - 1];
  }, [jobs, me, chain]);

  // After the read-back, he can simply SAY yes or no. The buttons stay for anyone who prefers to tap.
  const [hearYN, setHearYN] = useState(false);
  const stopYN = useRef<() => void>(() => {});
  const answerLast = useRef<(yes: boolean) => void>(() => {});
  const bot = (text: string, extra?: Partial<Bubble>) => {
    setChat((c) => [...c, { from: "bot", text, ...extra }]);
    speak(text, lang, () => {
      if (!extra?.draft || !canListen()) return;
      let last = "";
      setHearYN(true);
      stopYN.current = listen(lang, (x) => { last = x; }, () => {
        setHearYN(false);
        if (NO_WORDS.test(last)) answerLast.current(false);
        else if (YES_WORDS.test(last)) answerLast.current(true);
      });
    });
  };

  const heard = (text: string) => {
    setChat((c) => [...c, { from: "me", text }]);
    const h = readIssue(text);
    if (!target) return bot(t({ en: "You have no open job to add gold to. Ask the jeweller to open one.", hi: "तुम्हारा कोई चालू काम नहीं है जिसमें सोना जोड़ा जाए। सेठ से नया काम खुलवाओ।", bn: "সোনা যোগ করার মতো তোমার কোনো চালু কাজ নেই। মালিককে নতুন কাজ খুলতে বলো।" }));
    // Scribe never guesses: no weight heard means no draft.
    if (h.netMg === null) return bot(t({ en: "I could not hear the weight. Please say it again, like: 250 gram.", hi: "मुझे वज़न साफ़ नहीं सुनाई दिया। दोबारा बोलो, जैसे: ढाई सौ ग्राम।", bn: "ওজনটা ঠিক শুনতে পাইনি। আবার বলো, যেমন: আড়াইশো গ্রাম।" }));
    if (h.purityBp === null) return bot(t({ en: `I heard ${grams(h.netMg)} grams, but not the carat. Is it 22 carat or 18 carat? Say it again with the carat.`, hi: `मैंने ${grams(h.netMg)} ग्राम सुना, पर कैरेट नहीं। 22 कैरेट या 18 कैरेट? कैरेट के साथ दोबारा बोलो।`, bn: `আমি ${grams(h.netMg)} গ্রাম শুনেছি, কিন্তু ক্যারেট শুনিনি। ২২ না ১৮ ক্যারেট? ক্যারেটসহ আবার বলো।` }));
    const pure = fineMg(h.netMg, h.purityBp);
    bot(t({
      en: `I heard: you received ${grams(h.netMg)} grams of ${h.karat} carat gold for ${itemName(target.item, "en")}, job ${target.id}. That is ${grams(pure)} grams of pure gold. Is this correct?`,
      hi: `मैंने सुना: ${itemName(target.item, "hi")}, काम ${target.id} के लिए तुम्हें ${grams(h.netMg)} ग्राम ${h.karat} कैरेट सोना मिला। यानी ${grams(pure)} ग्राम खरा सोना। क्या यह सही है?`,
      bn: `আমি শুনলাম: ${itemName(target.item, "bn")}, কাজ ${target.id}-এর জন্য তুমি ${grams(h.netMg)} গ্রাম ${h.karat} ক্যারেট সোনা পেয়েছ। মানে ${grams(pure)} গ্রাম খাঁটি সোনা। এটা কি ঠিক?`,
    }), { draft: { netMg: h.netMg, purityBp: h.purityBp, jobId: target.id } });
  };

  const mic = () => {
    if (hearing) return stop.current();
    if (!canListen()) return heard(t(SAMPLE)); // no recogniser in this browser: use the recorded sample so the flow still works
    setHearing(true); setInterim("");
    let last = "";
    stop.current = listen(lang, (x) => { last = x; setInterim(x); }, () => { setHearing(false); setInterim(""); if (last) heard(last); });
  };

  const answer = (i: number, yes: boolean) => {
    const d = chat[i]?.draft;
    if (!d) return;
    stopYN.current(); setHearYN(false);
    try { navigator.vibrate?.(yes ? 60 : [40, 60, 40]); } catch {}
    setChat((c) => c.map((b, k) => (k === i ? { ...b, draft: undefined } : b)));
    if (!yes) return bot(t({ en: "Okay, nothing was saved. Press the microphone and say it again.", hi: "ठीक है, कुछ भी नहीं लिखा गया। माइक दबाकर दोबारा बोलो।", bn: "ঠিক আছে, কিছুই লেখা হয়নি। মাইক টিপে আবার বলো।" }));
    propose("ISSUE", d.jobId, me, { netMg: d.netMg, purityBp: d.purityBp }, "karigar");
    bot(t({ en: "Done. You have signed. Now it goes to Mehta ji for his signature. It becomes final only after he signs.", hi: "हो गया। तुम्हारे दस्तख़त हो गए। अब यह मेहता जी के पास उनके दस्तख़त के लिए गया है। उनके दस्तख़त के बाद ही पक्का होगा।", bn: "হয়ে গেছে। তোমার সই হলো। এখন এটা মেহতা জির কাছে গেছে তাঁর সইয়ের জন্য। তিনি সই করলে তবেই পাকা হবে।" }), { tick: 1 });
  };

  answerLast.current = (yes) => { const i = chat.findLastIndex((b) => !!b.draft); if (i >= 0) answer(i, yes); };
  useEffect(() => () => stopYN.current(), []);

  return (
    <section data-tara="mic" className="card overflow-hidden">
      <div className="flex items-center gap-3 bg-verdigris px-4 py-3 text-white">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white/20 font-display text-xl font-semibold">M</span>
        <div><div className="font-bold leading-tight">Mehta Jewellers</div><div className="text-xs opacity-80">{t({ en: "Speak to record gold", hi: "सोना लिखवाने के लिए बोलो", bn: "সোনা লেখাতে বলো" })}</div></div>
      </div>
      <div ref={box} className="max-h-[360px] min-h-[150px] space-y-3 overflow-y-auto bg-[#efe6d2]/70 p-3">
        {chat.length === 0 && <p className="px-2 py-6 text-center text-ink-3">{t({ en: "Press the green microphone and say what gold you received today.", hi: "हरा माइक दबाओ और बताओ आज कितना सोना मिला।", bn: "সবুজ মাইক টিপে বলো আজ কত সোনা পেলে।" })}</p>}
        {chat.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${b.from === "me" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-[17px] shadow-sm ${b.from === "me" ? "rounded-br-md bg-[#d9f2c7]" : "rounded-bl-md bg-white"}`}>
              {b.text}
              {b.tick && <span className="ml-2 inline-flex translate-y-0.5 text-ink-3"><Check size={16} /></span>}
              {b.draft && (
                <>
                  <div className="mt-3 rounded-xl border border-gold/50 bg-gold-2/20 p-3 text-center">
                    <Grams mg={b.draft.netMg} className="text-4xl font-bold" />
                    <div className="text-sm font-semibold text-ink-2">{b.draft.purityBp === 9160 ? "22K" : b.draft.purityBp === 7500 ? "18K" : b.draft.purityBp === 9999 ? "24K" : "14K"} · {b.draft.jobId}</div>
                  </div>
                  <YesNo onYes={() => answer(i, true)} onNo={() => answer(i, false)} />
                  <div className={`mt-2 flex items-center justify-center gap-2 text-sm font-bold ${hearYN ? "text-verdigris" : "text-ink-3"}`}>
                    {hearYN ? <span className="wave scale-75"><i /><i /><i /></span> : <Mic size={15} />}
                    {t({ en: "or just say: yes / no", hi: "या बस बोल दो: हाँ / ना", bn: "বা শুধু বলো: হ্যাঁ / না" })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        ))}
        {interim && <div className="flex justify-end"><div className="rounded-2xl rounded-br-md bg-[#d9f2c7]/70 px-4 py-3 text-[17px] italic">{interim}…</div></div>}
      </div>
      <div className="flex items-center justify-center gap-4 p-4">
        <button onClick={() => heard(t(SAMPLE))} className="btn btn-ghost"><PlayCircle size={22} />{t({ en: "Play sample", hi: "नमूना चलाओ", bn: "নমুনা চালাও" })}</button>
        <button onClick={mic} aria-label={t({ en: "Press and speak", hi: "दबाओ और बोलो", bn: "টিপে বলো" })} className={`relative grid h-24 w-24 place-items-center rounded-full text-white transition active:scale-90 ${hearing ? "bg-terracotta pulse-ring" : "bg-verdigris"}`} style={{ boxShadow: "0 6px 0 #0003, 0 18px 32px -10px #1f6f5c" }}>
          {hearing ? <span className="wave"><i /><i /><i /><i /><i /></span> : <Mic size={42} />}
        </button>
      </div>
    </section>
  );
}

function Mismatch({ auto }: { auto: boolean }) {
  const t = useT();
  const { lang, me, chain, babluBook, propose, pending } = useStore();
  const [stage, setStage] = useState<"idle" | "book" | "scan" | "found" | "none" | "asked">("idle");
  const [d, setD] = useState<Divergence | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (auto) { setStage((s) => (s === "idle" ? "book" : s)); setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 400); } }, [auto]);

  const alreadyFixed = chain.some((e) => e.type === "ADJUSTMENT" && e.karigarId === me) || pending.some((e) => e.type === "ADJUSTMENT" && e.karigarId === me);
  const book = me === "bablu" ? babluBook : [];
  const explain = d ? t({
    en: `Found it. The books split at job ${d.jobId}. The shop's book says ${grams(d.ledgerNetMg)} grams came back. Your notebook says ${grams(d.bookNetMg ?? 0)} grams. Two digits were swapped. That entry was copied from the old notebook with only the jeweller's signature. The difference is ${grams(d.deltaFineMg)} grams of pure gold, in your favour.`,
    hi: `मिल गया। हिसाब काम ${d.jobId} से अलग हुआ। दुकान की बही में ${grams(d.ledgerNetMg)} ग्राम वापसी लिखी है। तुम्हारी कॉपी में ${grams(d.bookNetMg ?? 0)} ग्राम। दो अंक आगे-पीछे हो गए। वह एंट्री पुरानी बही से सिर्फ़ सेठ के दस्तख़त के साथ उतारी गई थी। फ़र्क़ ${grams(d.deltaFineMg)} ग्राम खरे सोने का है, तुम्हारे हक़ में।`,
    bn: `পেয়ে গেছি। হিসাব আলাদা হয়েছে কাজ ${d.jobId} থেকে। দোকানের খাতায় ফেরত লেখা ${grams(d.ledgerNetMg)} গ্রাম। তোমার খাতায় ${grams(d.bookNetMg ?? 0)} গ্রাম। দুটো অঙ্ক উল্টে গেছে। ওই এন্ট্রি পুরনো খাতা থেকে শুধু মালিকের সই দিয়ে তোলা হয়েছিল। ফারাক ${grams(d.deltaFineMg)} গ্রাম খাঁটি সোনা, তোমার পক্ষে।`,
  }) : "";

  const compare = () => {
    setStage("scan");
    setTimeout(() => {
      const found = findDivergence(chain, me, book);
      setD(found);
      setStage(found ? "found" : "none");
    }, 1900);
  };
  useEffect(() => { if (stage === "found" && explain) speak(explain, lang); /* read the finding aloud once */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <section ref={ref} data-tara="mismatch" className="card p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-terracotta text-white"><GitCompareArrows size={28} /></span>
        <div><h2 className="text-2xl font-semibold">{t({ en: "My count is different", hi: "मेरा हिसाब अलग है", bn: "আমার হিসাব আলাদা" })}</h2>
          <p className="text-ink-2">{t({ en: "Show your notebook. We find the exact entry where the two books split.", hi: "अपनी कॉपी दिखाओ। हम ठीक वही एंट्री ढूँढेंगे जहाँ से दोनों बहियाँ अलग हुईं।", bn: "তোমার খাতা দেখাও। ঠিক যে এন্ট্রি থেকে দুই খাতা আলাদা হয়েছে, সেটা খুঁজে দেব।" })}</p></div>
      </div>

      {stage === "idle" && <button onClick={() => setStage("book")} disabled={alreadyFixed || me !== "bablu"} className="btn btn-no btn-xl mt-4 w-full"><NotebookPen size={24} />{alreadyFixed ? t({ en: "Correction already asked", hi: "सुधार पहले ही माँगा जा चुका", bn: "সংশোধন আগেই চাওয়া হয়েছে" }) : t({ en: "Show my notebook", hi: "मेरी कॉपी दिखाओ", bn: "আমার খাতা দেখাও" })}</button>}
      {me !== "bablu" && stage === "idle" && <p className="mt-2 text-sm text-ink-3">{t({ en: "The demo notebook belongs to Bablu.", hi: "डेमो कॉपी बबलू की है।", bn: "ডেমো খাতাটা বাবলুর।" })}</p>}

      {(stage === "book" || stage === "scan") && (
        <div className="mt-4">
          <div className="khata relative overflow-hidden p-4 pl-14" style={{ fontFamily: "var(--font-bengali), cursive" }}>
            <div className="mb-1 text-sm font-bold text-bahi">{t({ en: "Bablu's notebook (demo image)", hi: "बबलू की कॉपी (डेमो तस्वीर)", bn: "বাবলুর খাতা (ডেমো ছবি)" })}</div>
            {book.slice(-8).map((r, i) => (
              <div key={i} className="grid grid-cols-[70px_1fr_auto] gap-2 py-[9px] text-[17px] italic text-[#1c2a5a]" style={{ transform: `rotate(${(i % 3) - 1}deg)` }}>
                <span>{r.jobId}</span><span>{r.type === "ISSUE" ? "পেলাম" : r.type === "RECEIVE_FINISHED" ? "ফেরত" : "গুঁড়ো"}</span><span className="num">{grams(r.netMg)}</span>
              </div>
            ))}
            {stage === "scan" && <motion.div className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-gold-2/70 to-transparent" initial={{ top: "-20%" }} animate={{ top: "110%" }} transition={{ duration: 0.9, repeat: 1 }} />}
          </div>
          <button onClick={compare} disabled={stage === "scan"} className="btn btn-gold btn-xl mt-4 w-full"><ScanSearch size={24} />{stage === "scan" ? t({ en: "Comparing line by line…", hi: "एक-एक लाइन मिला रहे हैं…", bn: "লাইন ধরে মেলানো হচ্ছে…" }) : t({ en: "Compare with the shop's book", hi: "दुकान की बही से मिलाओ", bn: "দোকানের খাতার সাথে মেলাও" })}</button>
        </div>
      )}

      {stage === "none" && <p className="chip chip-ok mt-4 px-4 py-3 text-base"><CheckCheck size={18} />{t({ en: "Both books match. No difference found.", hi: "दोनों बहियाँ मिलती हैं। कोई फ़र्क़ नहीं।", bn: "দুই খাতা মিলে গেছে। কোনো ফারাক নেই।" })}</p>}

      {(stage === "found" || stage === "asked") && d && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl border-2 border-terracotta/40 bg-terracotta/10 p-3"><div className="text-sm font-bold text-terracotta">{t({ en: "Shop's book", hi: "दुकान की बही", bn: "দোকানের খাতা" })}</div><Grams mg={d.ledgerNetMg} className="text-2xl font-bold sm:text-3xl" /></div>
            <div className="rounded-2xl border-2 border-verdigris/40 bg-verdigris/10 p-3"><div className="text-sm font-bold text-verdigris">{t({ en: "Your notebook", hi: "तुम्हारी कॉपी", bn: "তোমার খাতা" })}</div><Grams mg={d.bookNetMg ?? 0} className="text-2xl font-bold sm:text-3xl" /></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip chip-bahi">{d.jobId} · {d.eventId}</span>
            {d.causes.map((c) => <span key={c} className="chip chip-warn">{c}</span>)}
            <span className="chip chip-gold">Δ <Grams mg={d.deltaFineMg} /> {t({ en: "pure", hi: "खरा", bn: "খাঁটি" })}</span>
          </div>
          <p className="mt-3 text-lg">{explain}</p>
          <div className="mt-2"><Speak text={explain} /></div>
          {stage === "found" ? (
            <button onClick={() => { propose("ADJUSTMENT", d.jobId, me, { fineMg: d.deltaFineMg, netMg: d.deltaNetMg, purityBp: d.purityBp, refEventId: d.eventId, note: d.causes.join("+") }, "karigar"); setStage("asked"); speak(t({ en: "I have asked for the correction and signed for you. Now Mehta ji must sign.", hi: "मैंने सुधार माँग लिया है और तुम्हारे दस्तख़त हो गए। अब मेहता जी को दस्तख़त करने हैं।", bn: "আমি সংশোধন চেয়েছি, তোমার সই হয়ে গেছে। এখন মেহতা জিকে সই করতে হবে।" }), lang); }} className="btn btn-yes btn-xl mt-4 w-full"><Check size={26} />{t({ en: "Ask for correction and sign", hi: "सुधार माँगो और दस्तख़त करो", bn: "সংশোধন চাও আর সই করো" })}</button>
          ) : (
            <p className="chip chip-gold mt-4 px-4 py-3 text-base"><Hourglass size={18} />{t({ en: "Signed by you. Waiting for the jeweller's signature.", hi: "तुम्हारे दस्तख़त हो गए। सेठ के दस्तख़त का इंतज़ार।", bn: "তোমার সই হয়েছে। মালিকের সইয়ের অপেক্ষা।" })}</p>
          )}
        </motion.div>
      )}
    </section>
  );
}

function Book() {
  const t = useT();
  const params = useSearchParams();
  const { lang, me, setMe, chain, pending, signPending, rejectPending } = useStore();
  const f = useFacts();
  const toSign = pending.filter((p) => p.karigarId === me && !p.sigKarigar);
  const waiting = pending.filter((p) => p.karigarId === me && p.sigKarigar && !p.sigJeweller);
  const given = f.openJobs.reduce((a, j) => a + reconcile(j, chain).issuedFine, 0);
  const summary = t({
    en: `You are holding ${grams(f.holdingMg)} grams of pure gold in ${f.openJobs.length} open jobs.${f.clocks[0] ? ` You are owed ${rupees(f.clocks[0].amountPaise)}, now ${f.clocks[0].elapsedDays} days old.` : ""}${toSign.length ? ` ${toSign.length} entries are waiting for your yes.` : ""}`,
    hi: `तुम्हारे पास ${f.openJobs.length} चालू कामों में ${grams(f.holdingMg)} ग्राम खरा सोना है।${f.clocks[0] ? ` तुम्हें ${rupees(f.clocks[0].amountPaise)} मिलने हैं, जिसे ${f.clocks[0].elapsedDays} दिन हो गए।` : ""}${toSign.length ? ` ${toSign.length} एंट्री तुम्हारी हाँ का इंतज़ार कर रही हैं।` : ""}`,
    bn: `তোমার কাছে ${f.openJobs.length}টা চালু কাজে ${grams(f.holdingMg)} গ্রাম খাঁটি সোনা আছে।${f.clocks[0] ? ` তোমার পাওনা ${rupees(f.clocks[0].amountPaise)}, ${f.clocks[0].elapsedDays} দিন হয়ে গেছে।` : ""}${toSign.length ? ` ${toSign.length}টা এন্ট্রি তোমার হ্যাঁ-র অপেক্ষায়।` : ""}`,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex items-center gap-1 rounded-full border border-line bg-white/70 p-1" role="group" aria-label={t({ en: "Demo: viewing as", hi: "डेमो: किसका खाता", bn: "ডেমো: কার খাতা" })}>
          {KARIGARS.map((k) => <button key={k.id} onClick={() => setMe(k.id)} className={`min-h-10 rounded-full px-4 text-sm font-bold ${me === k.id ? "bg-ink text-ivory" : "text-ink-2"}`}>{k.name.split(" ")[0]}</button>)}
        </div>
        <span className="chip chip-ok"><ShieldCheck size={14} />{t({ en: "Only your own account", hi: "सिर्फ़ तुम्हारा अपना खाता", bn: "শুধু তোমার নিজের খাতা" })}</span>
      </div>

      <h1 className="text-3xl font-semibold sm:text-4xl">{t({ en: "Hello", hi: "नमस्ते", bn: "নমস্কার" })}, <span className="gold-text">{lang === "en" ? f.who.name.split(" ")[0] : f.who.nameLocal.split(" ")[0]}</span></h1>
      <div className="mb-4 mt-2"><Speak text={summary} /></div>
      <Guide steps={[
        { en: "Look at the big gold number: that is the gold with you.", hi: "बड़ा सुनहरा अंक देखो: इतना सोना तुम्हारे पास है।", bn: "বড় সোনালি সংখ্যাটা দেখো: এতটা সোনা তোমার কাছে।" },
        { en: "Got new gold? Press the green microphone and say it.", hi: "नया सोना मिला? हरा माइक दबाकर बोल दो।", bn: "নতুন সোনা পেলে? সবুজ মাইক টিপে বলে দাও।" },
        { en: "Something looks wrong? Press the red “My count is different”.", hi: "कुछ ग़लत लगे? लाल “मेरा हिसाब अलग है” दबाओ।", bn: "কিছু ভুল মনে হলে লাল “আমার হিসাব আলাদা” টিপো।" },
      ]} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section data-tara="gold" className="card overflow-hidden p-5">
          <div className="text-lg font-bold text-ink-2">{t({ en: "Gold with you now", hi: "अभी तुम्हारे पास सोना", bn: "এখন তোমার কাছে সোনা" })}</div>
          <Grams mg={f.holdingMg} className="gold-text block text-[3.4rem] font-bold leading-none sm:text-7xl" />
          {/* the same amount as a picture: one coin = 10 grams */}
          <div className="mt-3 flex flex-wrap items-center gap-1" aria-hidden>
            {Array.from({ length: Math.min(Math.floor(f.holdingMg / 10_000), 30) }, (_, k) => <span key={k} className="gold-fill h-4 w-4 rounded-full shadow-[inset_-1px_-2px_2px_#7c5a16aa]" />)}
          </div>
          <div className="mt-1 text-sm font-semibold text-ink-2">{t({ en: `about ${Math.floor(f.holdingMg / 10_000)} coins of 10 grams`, hi: `लगभग ${Math.floor(f.holdingMg / 10_000)} सिक्के, हर एक 10 ग्राम का`, bn: `প্রায় ${Math.floor(f.holdingMg / 10_000)}টা মুদ্রা, প্রতিটা 10 গ্রামের` })}</div>
          <div className="text-sm text-ink-3">{t({ en: "pure gold, in open jobs", hi: "खरा सोना, चालू कामों में", bn: "খাঁটি সোনা, চালু কাজে" })}</div>
          <Balance3D tilt={given ? -Math.min(f.holdingMg / given, 1) * 0.8 : 0} leftBeads={Math.max(2, Math.min(11, Math.round(given / 30000)))} rightBeads={Math.max(1, Math.round((given - f.holdingMg) / 30000))} sparkles={false} className="-mt-3 h-[240px] w-full" />
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center text-sm font-bold"><span>{t({ en: "Given to you", hi: "तुम्हें दिया", bn: "তোমাকে দেওয়া" })}<br /><Grams mg={given} /></span><span>{t({ en: "You gave back", hi: "तुमने लौटाया", bn: "তুমি ফেরত দিলে" })}<br /><Grams mg={given - f.holdingMg} /></span></div>
        </section>

        <div className="grid gap-5">
          {toSign.map((e) => (
            <motion.section key={e.id} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card border-2 !border-gold p-5">
              <span className="chip chip-gold"><AlarmClock size={14} />{t({ en: "Needs your yes", hi: "तुम्हारी हाँ चाहिए", bn: "তোমার হ্যাঁ চাই" })} · {e.id}</span>
              <p className="mt-3 text-xl">{describe(e, lang)}</p>
              <div className="mt-2"><Speak text={describe(e, lang)} /></div>
              <YesNo onYes={() => { signPending(e.id, "karigar"); speak(t({ en: "Signed. It is final now.", hi: "दस्तख़त हो गए। अब यह पक्का है।", bn: "সই হয়ে গেছে। এখন এটা পাকা।" }), lang); }} onNo={() => rejectPending(e.id)} />
            </motion.section>
          ))}
          {waiting.map((e) => (
            <div key={e.id} className="card flex items-center gap-3 p-4"><Hourglass className="shrink-0 text-gold-deep" /><div><div className="font-bold">{t({ en: "Waiting for the jeweller's signature", hi: "सेठ के दस्तख़त का इंतज़ार", bn: "মালিকের সইয়ের অপেক্ষা" })}</div><div className="text-sm text-ink-2">{describe(e, lang)}</div><div className="text-xs text-ink-3">{t({ en: "Not counted in your gold until both have signed.", hi: "दोनों के दस्तख़त तक यह तुम्हारे सोने में नहीं गिना जाएगा।", bn: "দুজনের সই না হওয়া পর্যন্ত এটা তোমার সোনায় ধরা হবে না।" })}</div></div></div>
          ))}

          <section data-tara="pay" className="card p-5">
            <div className="flex items-center gap-2 text-lg font-bold text-ink-2"><Clock size={20} />{t({ en: "Money owed to you", hi: "तुम्हारी बाक़ी मज़दूरी", bn: "তোমার পাওনা মজুরি" })}</div>
            {f.clocks.length === 0 && <p className="mt-2 text-xl font-bold text-verdigris">{t({ en: "Nothing pending. All paid.", hi: "कुछ बाक़ी नहीं। सब मिल गया।", bn: "কিছু বাকি নেই। সব পেয়ে গেছ।" })}</p>}
            {f.clocks.map((c) => (
              <div key={c.eventId} className="mt-2">
                <div className="num text-5xl font-bold">{rupees(c.amountPaise)}</div>
                <div className="mt-1 text-sm text-ink-3">{c.jobId} · {c.eventId}</div>
                <div className="mt-3 h-4 overflow-hidden rounded-full bg-line"><motion.div className={`h-full rounded-full ${c.late ? "bg-terracotta" : "bg-verdigris"}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, (c.elapsedDays / (c.promisedDays * 3)) * 100)}%` }} transition={{ duration: 1 }} /></div>
                <p className={`mt-2 text-lg font-bold ${c.late ? "text-terracotta" : "text-verdigris"}`}>{t({ en: `Promised in ${c.promisedDays} days. ${c.elapsedDays} days have passed.`, hi: `वादा ${c.promisedDays} दिन का था। ${c.elapsedDays} दिन हो गए।`, bn: `কথা ছিল ${c.promisedDays} দিনে। ${c.elapsedDays} দিন হয়ে গেছে।` })}</p>
              </div>
            ))}
            <div className="mt-3 rounded-xl bg-ivory-2/80 p-3 text-[15px]">{t({ en: `Payer score: Mehta Jewellers usually pays in ${f.payerDays} days. Every karigar can see this.`, hi: `भुगतान स्कोर: मेहता ज्वैलर्स आम तौर पर ${f.payerDays} दिन में पैसा देते हैं। यह हर कारीगर देख सकता है।`, bn: `পেমেন্ট স্কোর: মেহতা জুয়েলার্স সাধারণত ${f.payerDays} দিনে টাকা দেয়। প্রত্যেক কারিগর এটা দেখতে পারে।` })}</div>
          </section>
        </div>

        <VoiceCapture />
        <Mismatch auto={params.get("do") === "mismatch"} />

        <section className="card p-5 lg:col-span-2">
          <h2 className="text-2xl font-semibold">{t({ en: "My jobs", hi: "मेरे काम", bn: "আমার কাজ" })}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {f.myJobs.slice().reverse().map((j) => {
              const r = reconcile(j, chain);
              return (
                <div key={j.id} className="rounded-2xl border border-line bg-white/70 p-4">
                  <div className="flex items-center justify-between gap-2"><span className="font-bold">{itemName(j.item, lang)}</span><span className={`chip ${j.status === "OPEN" ? "chip-gold" : j.status === "SETTLED" ? "chip-ok" : "chip-warn"}`}>{j.status === "OPEN" ? t({ en: "Working", hi: "चालू", bn: "চলছে" }) : j.status === "SETTLED" ? t({ en: "Closed", hi: "पूरा", bn: "শেষ" }) : t({ en: "To settle", hi: "हिसाब बाक़ी", bn: "হিসাব বাকি" })}</span></div>
                  <div className="num text-xs text-ink-3">{j.id}</div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs font-semibold text-ink-2">
                    <span>{t({ en: "Got", hi: "मिला", bn: "পেলে" })}<br /><Grams mg={r.issuedFine} className="text-sm text-ink" unit={false} /></span>
                    <span>{t({ en: "Gave back", hi: "लौटाया", bn: "ফেরত" })}<br /><Grams mg={r.finishedFine + r.scrapFine + r.adjustFine} className="text-sm text-ink" unit={false} /></span>
                    <span>{t({ en: "Limit", hi: "सीमा", bn: "সীমা" })}<br /><span className="num text-sm text-ink">{pct(j.capBp)}%</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function KarigarPage() {
  return <Suspense><Book /></Suspense>;
}
