"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, Send, Volume2, VolumeX, X, Sparkles, HelpCircle, Coins, Wallet, Scale, ShieldCheck, Map } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore, type Lang } from "@/lib/store";
import { useFacts } from "@/lib/facts";
import { LANGS, useT } from "@/lib/i18n";
import { brain, CHIPS, greeting, PAGE_HELP, snapshot, TOUR, type Reply } from "@/lib/tara";
import { canListen, listen, speak, stopSpeaking, toAsciiDigits } from "@/lib/voice";
import { groundingGuard } from "@/lib/ledger/analytics";

type Msg = { from: "tara" | "me"; text: string; live?: boolean };
const CHIP_ICON: Record<string, React.ReactNode> = { page: <HelpCircle size={20} />, gold: <Coins size={20} />, pay: <Wallet size={20} />, diff: <Scale size={20} />, safe: <ShieldCheck size={20} />, tour: <Map size={20} /> };

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

function Orb({ busy }: { busy: "idle" | "listening" | "speaking" }) {
  return (
    <span className="relative grid h-full w-full place-items-center rounded-full" style={{ background: "radial-gradient(circle at 32% 28%, #fff6d8 0%, #f0d587 22%, #c9a24b 55%, #7c5a16 100%)", boxShadow: "inset -6px -8px 14px #6b4c10aa, inset 4px 5px 10px #fff8, 0 10px 26px -6px #8a6418cc" }}>
      {busy === "idle" ? (
        <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden>
          <circle cx="17" cy="21" r="3.2" fill="#15130F" /><circle cx="31" cy="21" r="3.2" fill="#15130F" />
          <path d="M16 30 Q24 37 32 30" stroke="#15130F" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>
      ) : (
        <span className="wave text-ink"><i /><i /><i /><i /><i /></span>
      )}
    </span>
  );
}

export default function Tara() {
  const router = useRouter();
  const path = usePathname();
  const t = useT();
  const { lang, setLang } = useStore();
  const facts = useFacts();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState<"idle" | "listening" | "speaking">("idle");
  const [heard, setHeard] = useState("");
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [live, setLive] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const tourRef = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const ctx = useRef({ lang, path, facts });
  ctx.current = { lang, path, facts };

  useEffect(() => { fetch("/api/tara").then((r) => r.json()).then((d) => setLive(!!d.live)).catch(() => {}); }, []);
  useEffect(() => { const id = setTimeout(() => setNudge(true), 3500); const off = setTimeout(() => setNudge(false), 14000); return () => { clearTimeout(id); clearTimeout(off); }; }, []);
  useEffect(() => { scroller.current?.scrollTo({ top: 99999, behavior: "smooth" }); }, [msgs, heard]);

  const say = useCallback((text: string, l: Lang, after?: () => void) => {
    setMsgs((m) => [...m, { from: "tara", text }]);
    if (muted) { after?.(); return; }
    setBusy("speaking");
    speak(text, l, () => { setBusy("idle"); after?.(); });
  }, [muted]);

  const runTour = useCallback((i: number) => {
    const step = TOUR[i];
    if (!step || tourRef.current === -1) { tourRef.current = 0; return; }
    tourRef.current = i;
    router.push(step.go);
    setTimeout(() => {
      spotlight(step.spot);
      const l = ctx.current.lang;
      say(PAGE_HELP[step.go][l], l, () => setTimeout(() => { if (tourRef.current === i) runTour(i + 1); }, 600));
    }, 700);
  }, [router, say]);

  const act = useCallback((r: Reply, l: Lang) => {
    if (r.setLang) setLang(r.setLang);
    if (r.go && r.go.split("?")[0] !== ctx.current.path) router.push(r.go);
    else if (r.go?.includes("?")) router.push(r.go);
    if (r.spot) setTimeout(() => spotlight(r.spot), 500);
    say(r.say, r.setLang ?? l, r.tour ? () => runTour(0) : undefined);
  }, [router, say, setLang, runTour]);

  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    tourRef.current = -1;
    stopSpeaking();
    setMsgs((m) => [...m, { from: "me", text: q }]);
    const c = ctx.current;
    const r = brain(q, c);
    if (!r.unknown || !live) { act(r, c.lang); return; }
    // Open question: ask the free Gemini tier, then refuse any number it did not get from the ledger.
    setBusy("speaking");
    try {
      const account = snapshot(c);
      const res = await fetch("/api/tara", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: q, lang: c.lang, account }) });
      const data = (await res.json()) as { say: string | null };
      const allowed = JSON.stringify(account).match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
      if (data.say && groundingGuard(toAsciiDigits(data.say), allowed).ok) {
        setBusy("idle");
        setMsgs((m) => [...m, { from: "tara", text: data.say!, live: true }]);
        if (!muted) { setBusy("speaking"); speak(data.say, c.lang, () => setBusy("idle")); }
        return;
      }
    } catch {}
    setBusy("idle");
    act(r, c.lang);
  }, [act, live, muted]);

  const mic = () => {
    if (busy === "listening") { stopRef.current(); return; }
    if (!canListen()) {
      say(t({ en: "This browser cannot hear. Please type, or tap one of the buttons below. Chrome works best.", hi: "यह ब्राउज़र सुन नहीं सकता। नीचे लिखो या कोई बटन दबाओ। क्रोम में सबसे अच्छा चलता है।", bn: "এই ব্রাউজার শুনতে পারে না। নিচে লেখো বা কোনো বোতাম টিপো। ক্রোমে সবচেয়ে ভালো চলে।" }), lang);
      return;
    }
    tourRef.current = -1;
    setHeard(""); setBusy("listening");
    let last = "";
    stopRef.current = listen(lang, (text) => { last = text; setHeard(text); }, (err) => {
      setBusy("idle"); setHeard("");
      if (last) ask(last);
      else if (err === "not-allowed" || err === "service-not-allowed") say(t({ en: "Please allow the microphone, then press it again.", hi: "माइक की इजाज़त दो, फिर दोबारा दबाओ।", bn: "মাইকের অনুমতি দাও, তারপর আবার টিপো।" }), lang);
    });
  };

  const toggle = () => {
    setNudge(false);
    if (open) { stopSpeaking(); stopRef.current(); tourRef.current = -1; setBusy("idle"); setOpen(false); return; }
    setOpen(true);
    if (!msgs.length) say(greeting(lang), lang);
  };

  const pickLang = (l: Lang) => { setLang(l); stopSpeaking(); say(greeting(l), l); };

  return (
    <>
      {/* launcher: bottom-right, above the phone tab bar */}
      <div className="fixed bottom-[92px] right-4 z-50 flex items-end gap-3 md:bottom-6 md:right-6">
        <AnimatePresence>
          {nudge && !open && (
            <motion.button initial={{ opacity: 0, x: 16, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 16 }} onClick={toggle}
              className="card max-w-[230px] px-4 py-3 text-left text-sm font-semibold shadow-xl">
              {t({ en: "Need help? Tap me and just speak.", hi: "मदद चाहिए? मुझे दबाओ और बस बोलो।", bn: "সাহায্য লাগবে? আমাকে টিপে শুধু বলো।" })}
            </motion.button>
          )}
        </AnimatePresence>
        <button onClick={toggle} aria-label={t({ en: "Open Tara, the voice helper", hi: "तारा, बोलने वाली सहायक खोलो", bn: "তারা, কথা-বলা সহায়ক খোলো" })}
          className={`relative h-[68px] w-[68px] shrink-0 rounded-full transition-transform active:scale-90 ${open ? "" : "floaty pulse-ring"}`}>
          <Orb busy={busy} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-ivory">{t({ en: "Help", hi: "मदद", bn: "সাহায্য" })}</span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Tara" initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.96 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed inset-x-2 bottom-[168px] top-16 z-50 flex flex-col overflow-hidden rounded-[26px] border border-line bg-paper shadow-2xl md:inset-x-auto md:bottom-28 md:right-6 md:top-auto md:h-[640px] md:max-h-[calc(100vh-140px)] md:w-[400px]">
            <div className="flex items-center gap-3 bg-ink px-4 py-3 text-ivory">
              <span className="h-11 w-11 shrink-0"><Orb busy={busy} /></span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg font-semibold leading-tight">{t({ en: "Tara", hi: "तारा", bn: "তারা" })}</div>
                <div className="flex items-center gap-1.5 text-xs text-ivory/70">
                  {live && <Sparkles size={12} className="text-gold-2" />}
                  {busy === "listening" ? t({ en: "I am listening…", hi: "मैं सुन रही हूँ…", bn: "আমি শুনছি…" }) : busy === "speaking" ? t({ en: "Speaking…", hi: "बोल रही हूँ…", bn: "বলছি…" }) : t({ en: "Your helper. Just speak.", hi: "तुम्हारी सहायक। बस बोलो।", bn: "তোমার সহায়ক। শুধু বলো।" })}
                </div>
              </div>
              <button onClick={() => { setMuted((m) => { if (!m) stopSpeaking(); return !m; }); setBusy("idle"); }} className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
              <button onClick={toggle} className="grid h-12 w-12 place-items-center rounded-full bg-white/10" aria-label="Close"><X size={22} /></button>
            </div>

            <div className="flex gap-2 border-b border-line bg-ivory-2/60 px-3 py-2">
              {LANGS.map((l) => (
                <button key={l.id} onClick={() => pickLang(l.id)} className={`min-h-12 flex-1 rounded-xl text-[15px] font-bold transition ${lang === l.id ? "bg-ink text-ivory" : "bg-white/70 text-ink-2"}`}>{l.label}</button>
              ))}
            </div>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
              {msgs.map((m, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-3 text-[17px] leading-relaxed ${m.from === "me" ? "rounded-br-md bg-verdigris text-white" : "rounded-bl-md border border-line bg-white"}`}>
                    {m.text}
                    {m.from === "tara" && (
                      <button onClick={() => speak(m.text, lang)} className="mt-2 flex min-h-9 items-center gap-1.5 text-xs font-bold text-gold-deep" aria-label="Hear again"><Volume2 size={15} />{t({ en: "Hear again", hi: "फिर सुनो", bn: "আবার শোনো" })}</button>
                    )}
                  </div>
                </motion.div>
              ))}
              {heard && <div className="flex justify-end"><div className="max-w-[86%] rounded-2xl rounded-br-md bg-verdigris/60 px-4 py-3 text-[17px] italic text-white">{heard}…</div></div>}
            </div>

            <div className="scroll-x flex gap-2 border-t border-line px-3 py-2">
              {CHIPS.map((c) => (
                <button key={c.id} onClick={() => ask(c.ask)} className="flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-gold/50 bg-gold-2/20 px-4 text-sm font-bold text-ink">
                  <span className="text-gold-deep">{CHIP_ICON[c.id]}</span>{c.label[lang]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-line bg-ivory-2/60 px-3 py-3">
              <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); setInput(""); }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t({ en: "or type here", hi: "या यहाँ लिखो", bn: "অথবা এখানে লেখো" })} aria-label={t({ en: "Type your question", hi: "अपना सवाल लिखो", bn: "তোমার প্রশ্ন লেখো" })}
                  className="h-13 min-h-[52px] min-w-0 flex-1 rounded-2xl border border-line bg-white px-4 text-[16px] outline-none focus:border-gold" />
                {input && <button type="submit" className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-ink text-ivory" aria-label="Send"><Send size={20} /></button>}
              </form>
              <button onClick={mic} aria-label={t({ en: "Press and speak", hi: "दबाओ और बोलो", bn: "টিপে বলো" })}
                className={`relative grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full text-white transition active:scale-90 ${busy === "listening" ? "bg-terracotta pulse-ring" : "bg-verdigris"}`} style={{ boxShadow: "0 4px 0 #0003, 0 12px 24px -8px #1f6f5c" }}>
                {busy === "listening" ? <span className="wave"><i /><i /><i /><i /><i /></span> : <Mic size={30} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
