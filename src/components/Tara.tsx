"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Send, Volume2, VolumeX, X, Sparkles, HelpCircle, Coins, Wallet, Scale, ShieldCheck, Map, Ear, EarOff } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore, type Lang } from "@/lib/store";
import { useFacts } from "@/lib/facts";
import { tr, useT, type L } from "@/lib/i18n";
import { brain, CHIPS, PAGE_HELP, snapshot, TOUR, type Reply } from "@/lib/tara";
import { canListen, listen, speak, stopSpeaking, toAsciiDigits } from "@/lib/voice";
import { detectLang, heardName, startEar, type Ear as EarCtl } from "@/lib/ear";
import { groundingGuard } from "@/lib/ledger/analytics";
import { TaraAvatar } from "./three/lazy";
import type { TaraMood } from "./three/TaraAvatar";

type Msg = { from: "tara" | "me"; text: string; lang: Lang; live?: boolean };
const CHIP_ICON: Record<string, React.ReactNode> = { page: <HelpCircle size={20} />, gold: <Coins size={20} />, pay: <Wallet size={20} />, diff: <Scale size={20} />, safe: <ShieldCheck size={20} />, tour: <Map size={20} /> };

const HELLO: L = {
  en: "Hello, I am Tara. Just talk to me in your own language and I will answer in it. You can also call me any time by saying my name: Tara.",
  hi: "नमस्ते, मैं तारा हूँ। मुझसे अपनी बोली में बात करो, मैं उसी में जवाब दूँगी। जब भी ज़रूरत हो, बस मेरा नाम लो: तारा।",
  bn: "নমস্কার, আমি তারা। নিজের ভাষায় আমার সাথে কথা বলো, আমি সেই ভাষাতেই উত্তর দেব। দরকার হলে শুধু আমার নাম ধরে ডাকো: তারা।",
};
const YES: L = { en: "Yes, tell me.", hi: "हाँ, बोलो।", bn: "হ্যাঁ, বলো।" };
const STOP_WORDS = /^(stop|quiet|bas|chup|ruko|ruk jao|band karo|thamo|बस|चुप|रुको|बंद करो|থামো|চুপ)\b|^(बस|चुप|रुको|থামো)/i;

/** Put a gold ring around the thing Tara is talking about, and scroll it into view. */
export function spotlight(name?: string) {
  document.querySelectorAll(".tara-spot").forEach((n) => n.classList.remove("tara-spot"));
  if (!name) return;
  let tries = 0;
  const find = () => {
    const el = document.querySelector<HTMLElement>(`[data-tara="${name}"]`);
    if (el) {
      el.classList.add("tara-spot");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => el.classList.remove("tara-spot"), 9000);
    } else if (tries++ < 20) setTimeout(find, 150);
  };
  find();
}

export default function Tara() {
  const router = useRouter();
  const path = usePathname();
  const t = useT();
  const { lang, setLang } = useStore();
  const facts = useFacts();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [mood, setMood] = useState<TaraMood>("idle");
  const [heard, setHeard] = useState("");
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [live, setLive] = useState(false);
  const [earOn, setEarOn] = useState(false);

  const stopMic = useRef<() => void>(noop);
  const ear = useRef<EarCtl | null>(null);
  const convoUntil = useRef(0); // while this is in the future, the next thing heard is for Tara, no name needed
  const tourRef = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const hearLang = useRef<Lang>(lang); // the language she listens in: follows whatever the person last used
  const ctx = useRef({ lang, path, facts, open, muted });
  ctx.current = { lang, path, facts, open, muted };
  const askRef = useRef<(q: string) => void>(() => {});

  useEffect(() => { hearLang.current = lang; }, [lang]);
  useEffect(() => { fetch("/api/tara").then((r) => r.json()).then((d) => setLive(!!d.live)).catch(() => {}); }, []);
  useEffect(() => { const a = setTimeout(() => setNudge(true), 3000), b = setTimeout(() => setNudge(false), 12000); return () => { clearTimeout(a); clearTimeout(b); }; }, []);
  useEffect(() => { scroller.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [msgs, heard]);

  /** After she finishes talking: open a short window where she keeps listening for the follow-up. */
  const afterSpeech = useCallback(() => {
    setMood("idle");
    if (!ear.current) return;
    ear.current.resume();
    if (ctx.current.open) {
      convoUntil.current = Date.now() + 11000;
      setMood("listening");
      setTimeout(() => { if (Date.now() >= convoUntil.current) setMood((m) => (m === "listening" ? "idle" : m)); }, 11200);
    }
  }, []);

  const say = useCallback((text: string, l: Lang, after?: () => void, live?: boolean) => {
    setMsgs((m) => [...m, { from: "tara", text, lang: l, live }]);
    ear.current?.pause(); // never let her hear herself
    if (ctx.current.muted) { afterSpeech(); after?.(); return; }
    setMood("speaking");
    speak(text, l, () => { afterSpeech(); after?.(); });
  }, [afterSpeech]);

  const runTour = useCallback((i: number) => {
    const step = TOUR[i];
    if (!step || tourRef.current === -1) { tourRef.current = 0; return; }
    tourRef.current = i;
    router.push(step.go);
    setTimeout(() => {
      spotlight(step.spot);
      const l = hearLang.current;
      say(PAGE_HELP[step.go][l], l, () => setTimeout(() => { if (tourRef.current === i) runTour(i + 1); }, 600));
    }, 700);
  }, [router, say]);

  const act = useCallback((r: Reply, l: Lang) => {
    if (r.setLang) { setLang(r.setLang); hearLang.current = r.setLang; }
    if (r.go && (r.go.includes("?") || r.go !== ctx.current.path)) router.push(r.go);
    if (r.spot) setTimeout(() => spotlight(r.spot), 600);
    say(r.say, r.setLang ?? l, r.tour ? () => runTour(0) : undefined);
  }, [router, say, setLang, runTour]);

  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    tourRef.current = -1;
    convoUntil.current = 0;
    stopSpeaking();
    // Answer in whatever language they just used, and keep listening in it.
    const l = detectLang(q, hearLang.current);
    hearLang.current = l;
    if (l !== ctx.current.lang) setLang(l);
    setMsgs((m) => [...m, { from: "me", text: q, lang: l }]);
    if (STOP_WORDS.test(q)) { setMood("idle"); ear.current?.resume(); return; }

    const c = { lang: l, path: ctx.current.path, facts: ctx.current.facts };
    const r = brain(q, c);
    if (!r.unknown || !live) { act(r, l); return; }

    // Open question: ask the free Gemini tier, then refuse any number it did not get from the ledger.
    setMood("thinking");
    ear.current?.pause();
    try {
      const account = snapshot(c);
      const res = await fetch("/api/tara", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: q, lang: l, account }) });
      const data = (await res.json()) as { say: string | null; lang?: Lang; go?: string };
      const allowed = JSON.stringify(account).match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
      if (data.say && groundingGuard(toAsciiDigits(data.say), allowed).ok) {
        const rl = data.lang ?? l;
        if (rl !== l) { hearLang.current = rl; setLang(rl); }
        if (data.go && data.go !== ctx.current.path) router.push(data.go);
        say(data.say, rl, undefined, true);
        return;
      }
    } catch {}
    act(r, l);
  }, [act, live, router, say, setLang]);
  askRef.current = ask;

  /** A tapped suggestion: shown in the reader's language, answered in it, no language guessing needed. */
  const askChip = (label: string, intent: string) => {
    tourRef.current = -1; convoUntil.current = 0; stopSpeaking();
    const l = ctx.current.lang;
    setMsgs((m) => [...m, { from: "me", text: label, lang: l }]);
    act(brain(intent, { lang: l, path: ctx.current.path, facts: ctx.current.facts }), l);
  };

  /* ----- hands-free ear: "Tara…" from anywhere on the site ----- */
  const startListeningForName = useCallback(() => {
    if (ear.current || !canListen()) return;
    ear.current = startEar(
      () => hearLang.current,
      (phrase) => {
        const { called, rest } = heardName(phrase);
        if (called) {
          setOpen(true); setNudge(false);
          ctx.current.open = true;
          if (rest) askRef.current(rest);
          else say(tr(hearLang.current, YES), hearLang.current);
        } else if (Date.now() < convoUntil.current && ctx.current.open) {
          askRef.current(phrase); // follow-up inside the conversation window: no name needed
        }
      },
      () => { ear.current = null; setEarOn(false); try { localStorage.removeItem("tarazu-ear"); } catch {} },
    );
    setEarOn(true);
    try { localStorage.setItem("tarazu-ear", "1"); } catch {}
  }, [say]);

  const stopListeningForName = useCallback(() => {
    ear.current?.stop(); ear.current = null; convoUntil.current = 0;
    setEarOn(false); setMood((m) => (m === "listening" ? "idle" : m));
    try { localStorage.removeItem("tarazu-ear"); } catch {}
  }, []);

  // If they switched hands-free on before and the microphone is still allowed, start it again quietly.
  useEffect(() => {
    let wanted = false;
    try { wanted = localStorage.getItem("tarazu-ear") === "1"; } catch {}
    if (!wanted || !canListen() || !navigator.permissions) return;
    navigator.permissions.query({ name: "microphone" as PermissionName }).then((p) => { if (p.state === "granted") startListeningForName(); }).catch(() => {});
    return () => { ear.current?.stop(); ear.current = null; };
  }, [startListeningForName]);

  const mic = () => {
    if (heard !== "") { stopMic.current(); return; }
    if (!canListen()) {
      say(t({ en: "This browser cannot hear. Please type, or tap one of the buttons below. Chrome works best.", hi: "यह ब्राउज़र सुन नहीं सकता। नीचे लिखो या कोई बटन दबाओ। क्रोम में सबसे अच्छा चलता है।", bn: "এই ব্রাউজার শুনতে পারে না। নিচে লেখো বা কোনো বোতাম টিপো। ক্রোমে সবচেয়ে ভালো চলে।" }), lang);
      return;
    }
    tourRef.current = -1;
    stopSpeaking();
    ear.current?.pause();
    setHeard(" "); setMood("listening");
    let last = "";
    stopMic.current = listen(hearLang.current, (text) => { last = text; setHeard(text || " "); }, (err) => {
      stopMic.current = noop;
      setHeard(""); setMood("idle");
      if (last) {
        if (!ear.current) startListeningForName(); // the microphone is allowed now: switch hands-free on for next time
        ask(last);
      } else {
        ear.current?.resume();
        if (err === "not-allowed" || err === "service-not-allowed") say(t({ en: "Please allow the microphone, then press it again.", hi: "माइक की इजाज़त दो, फिर दोबारा दबाओ।", bn: "মাইকের অনুমতি দাও, তারপর আবার টিপো।" }), lang);
      }
    });
  };

  const toggle = () => {
    setNudge(false);
    if (open) { stopSpeaking(); stopMic.current(); tourRef.current = -1; convoUntil.current = 0; setMood("idle"); setOpen(false); ear.current?.resume(); return; }
    setOpen(true); ctx.current.open = true;
    if (!msgs.length) say(tr(lang, HELLO), lang);
  };

  const status = mood === "listening" ? t({ en: "I am listening…", hi: "मैं सुन रही हूँ…", bn: "আমি শুনছি…" })
    : mood === "speaking" ? t({ en: "Speaking…", hi: "बोल रही हूँ…", bn: "বলছি…" })
    : mood === "thinking" ? t({ en: "Thinking…", hi: "सोच रही हूँ…", bn: "ভাবছি…" })
    : earOn ? t({ en: "Say “Tara” any time", hi: "जब चाहो “तारा” बोलो", bn: "যখন খুশি “তারা” বলো" })
    : t({ en: "Talk to me in any language", hi: "किसी भी भाषा में बात करो", bn: "যেকোনো ভাষায় কথা বলো" });
  const micLive = heard !== "";

  return (
    <>
      {/* launcher: a living portrait, bottom-right, above the phone tab bar */}
      <div className="fixed bottom-[88px] right-3 z-50 flex items-end gap-2 md:bottom-6 md:right-6">
        <AnimatePresence>
          {nudge && !open && (
            <motion.button initial={{ opacity: 0, x: 16, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 16 }} onClick={toggle}
              className="relative mb-6 max-w-[210px] rounded-2xl rounded-br-sm border border-line bg-paper px-4 py-3 text-left text-sm font-semibold shadow-xl">
              {t({ en: "Hi, I am Tara. Tap me, or just say my name.", hi: "मैं तारा हूँ। मुझे छुओ, या बस मेरा नाम लो।", bn: "আমি তারা। আমাকে ছোঁও, বা শুধু নাম ধরে ডাকো।" })}
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button onClick={toggle} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.92 }} aria-label={t({ en: "Open Tara, the voice helper", hi: "तारा, बोलने वाली सहायक खोलो", bn: "তারা, কথা-বলা সহায়ক খোলো" })}
          className="group relative h-[92px] w-[92px] shrink-0 md:h-[104px] md:w-[104px]">
          <span className={`absolute inset-1 rounded-full ${open ? "" : "pulse-ring"}`} style={{ background: "radial-gradient(circle at 35% 25%, #fffaf0 0%, #f6e3b0 45%, #d9b45a 100%)", boxShadow: "0 0 0 3px #c9a24b, 0 0 0 6px #fbf8f1, 0 14px 30px -8px #6b4c10cc" }} />
          <span className="absolute inset-1 overflow-hidden rounded-full"><TaraAvatar mood={mood} className="h-full w-full" /></span>
          <span className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[12px] font-bold text-ivory shadow-lg">
            <span className={`h-2 w-2 rounded-full ${earOn ? "bg-emerald-400" : "bg-gold-2"} ${mood === "listening" ? "animate-ping" : ""}`} />
            {t({ en: "Tara", hi: "तारा", bn: "তারা" })}
          </span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Tara" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed inset-x-2 bottom-[190px] top-16 z-50 flex flex-col overflow-hidden rounded-[26px] border border-line bg-paper shadow-2xl md:inset-x-auto md:bottom-[140px] md:right-6 md:top-auto md:h-[620px] md:max-h-[calc(100vh-170px)] md:w-[400px]">
            <div className="relative flex items-center gap-3 px-4 py-3 text-ivory" style={{ background: "linear-gradient(135deg,#2a2018,#15130F 60%)" }}>
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "radial-gradient(circle at 35% 25%, #fffaf0, #e6c56e)", boxShadow: "0 0 0 2px #c9a24b" }}>
                <TaraAvatar mood={mood} className="h-full w-full scale-[1.18] translate-y-[6%]" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl font-semibold leading-tight">{t({ en: "Tara", hi: "तारा", bn: "তারা" })}</div>
                <div className="flex items-center gap-1.5 text-[13px] text-ivory/75">
                  {live && <Sparkles size={12} className="shrink-0 text-gold-2" />}
                  {(mood === "listening" || mood === "speaking") && <span className="wave scale-50 text-gold-2"><i /><i /><i /></span>}
                  <span className="truncate">{status}</span>
                </div>
              </div>
              <button onClick={() => (earOn ? stopListeningForName() : startListeningForName())} className={`grid h-11 w-11 place-items-center rounded-full ${earOn ? "bg-emerald-500/25 text-emerald-300" : "bg-white/10"}`}
                aria-pressed={earOn} aria-label={earOn ? "Turn off hands-free listening" : "Turn on hands-free: say Tara"} title={earOn ? "Hands-free is on" : "Turn on hands-free"}>{earOn ? <Ear size={20} /> : <EarOff size={20} />}</button>
              <button onClick={() => { setMuted((m) => { if (!m) stopSpeaking(); return !m; }); }} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
              <button onClick={toggle} className="grid h-11 w-11 place-items-center rounded-full bg-white/10" aria-label="Close"><X size={22} /></button>
            </div>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-[17px] leading-relaxed ${m.from === "me" ? "rounded-br-md bg-verdigris text-white" : "rounded-bl-md border border-line bg-white"}`}>
                    {m.text}
                    {m.from === "tara" && (
                      <button onClick={() => { ear.current?.pause(); setMood("speaking"); speak(m.text, m.lang, afterSpeech); }} className="mt-2 flex min-h-9 items-center gap-1.5 text-xs font-bold text-gold-deep" aria-label="Hear again"><Volume2 size={15} />{t({ en: "Hear again", hi: "फिर सुनो", bn: "আবার শোনো" })}</button>
                    )}
                  </div>
                </motion.div>
              ))}
              {mood === "thinking" && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-line bg-white px-4 py-3 text-gold-deep"><span className="wave"><i /><i /><i /></span></div></div>}
              {heard.trim() && <div className="flex justify-end"><div className="max-w-[86%] rounded-2xl rounded-br-md bg-verdigris/60 px-4 py-3 text-[17px] italic text-white">{heard}…</div></div>}
              {!earOn && msgs.length > 0 && canListen() && (
                <button onClick={startListeningForName} className="mx-auto flex min-h-11 items-center gap-2 rounded-full border border-dashed border-gold px-4 text-sm font-bold text-gold-deep"><Ear size={16} />{t({ en: "Turn on: call me by saying “Tara”", hi: "चालू करो: “तारा” बोलकर बुलाओ", bn: "চালু করো: “তারা” বলে ডাকো" })}</button>
              )}
            </div>

            <div className="scroll-x flex gap-2 border-t border-line px-3 py-2">
              {CHIPS.map((c) => (
                <button key={c.id} onClick={() => askChip(c.label[lang], c.ask)} className="flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-gold/50 bg-gold-2/20 px-4 text-sm font-bold text-ink">
                  <span className="text-gold-deep">{CHIP_ICON[c.id]}</span>{c.label[lang]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-line bg-ivory-2/60 px-3 py-3">
              <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); setInput(""); }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t({ en: "Type in any language", hi: "किसी भी भाषा में लिखो", bn: "যেকোনো ভাষায় লেখো" })} aria-label={t({ en: "Type your question", hi: "अपना सवाल लिखो", bn: "তোমার প্রশ্ন লেখো" })}
                  className="min-h-[52px] min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 text-[16px] outline-none focus:border-gold" />
                {input && <button type="submit" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-ink text-ivory" aria-label="Send"><Send size={20} /></button>}
              </form>
              <button onClick={mic} aria-label={t({ en: "Press and speak", hi: "दबाओ और बोलो", bn: "টিপে বলো" })}
                className={`relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full text-white transition active:scale-90 ${micLive ? "bg-terracotta pulse-ring" : "bg-verdigris"}`} style={{ boxShadow: "0 4px 0 #0003, 0 12px 24px -8px #1f6f5c" }}>
                {micLive ? <span className="wave"><i /><i /><i /><i /><i /></span> : <Mic size={30} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const noop = () => {};
