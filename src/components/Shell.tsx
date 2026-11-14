"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Home, Store, Users, Link2, CalendarHeart, BadgeCheck, Play, MoreHorizontal, Mic, Ear, PenLine, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useStore, type Lang } from "@/lib/store";
import { LANGS, useT, type L } from "@/lib/i18n";
import { speak, stopSpeaking } from "@/lib/voice";
import { PAGE_HELP } from "@/lib/tara";
import { Volume2 } from "lucide-react";
import Tara from "./Tara";

const NAV: { href: string; icon: typeof Home; label: L }[] = [
  { href: "/", icon: Home, label: { en: "Home", hi: "घर", bn: "হোম" } },
  { href: "/karigar", icon: BookOpen, label: { en: "My Book", hi: "मेरा खाता", bn: "আমার খাতা" } },
  { href: "/jeweller", icon: Store, label: { en: "Shop", hi: "दुकान", bn: "দোকান" } },
  { href: "/ledger", icon: Link2, label: { en: "Ledger", hi: "बही", bn: "বড় খাতা" } },
  { href: "/agents", icon: Users, label: { en: "Agent Room", hi: "पंचायत", bn: "বৈঠক" } },
  { href: "/track", icon: CalendarHeart, label: { en: "Wedding", hi: "शादी", bn: "বিয়ে" } },
  { href: "/passport", icon: BadgeCheck, label: { en: "Passport", hi: "पासपोर्ट", bn: "পাসপোর্ট" } },
  { href: "/demo", icon: Play, label: { en: "Demo", hi: "डेमो", bn: "ডেমো" } },
];

function Onboarding({ onDone }: { onDone: () => void }) {
  const { lang, setLang } = useStore();
  const t = useT();
  const [step, setStep] = useState(0);
  const choose = (l: Lang, hello: string) => { setLang(l); speak(hello, l); setStep(1); };
  const steps: { icon: typeof Mic; title: L; body: L; color: string }[] = [
    { icon: Mic, color: "#1f6f5c", title: { en: "1. Speak", hi: "1. बोलो", bn: "১. বলো" }, body: { en: "Press the big microphone and say what gold you got.", hi: "बड़ा माइक दबाओ और बताओ कितना सोना मिला।", bn: "বড় মাইক টিপে বলো কত সোনা পেলে।" } },
    { icon: Ear, color: "#c9a24b", title: { en: "2. Listen", hi: "2. सुनो", bn: "২. শোনো" }, body: { en: "The app reads it back to you. Say yes only if it is right.", hi: "ऐप तुम्हें पढ़कर सुनाएगा। सही हो तभी हाँ बोलो।", bn: "অ্যাপ তোমাকে পড়ে শোনাবে। ঠিক হলে তবেই হ্যাঁ বলো।" } },
    { icon: PenLine, color: "#8e1b1b", title: { en: "3. Both sign", hi: "3. दोनों के दस्तख़त", bn: "৩. দুজনের সই" }, body: { en: "You sign. The jeweller signs. Then nobody can change it.", hi: "तुम दस्तख़त करो। सेठ दस्तख़त करे। फिर कोई नहीं बदल सकता।", bn: "তুমি সই করো। মালিক সই করে। তারপর কেউ বদলাতে পারে না।" } },
  ];
  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div initial={{ y: 30, scale: 0.96 }} animate={{ y: 0, scale: 1 }} className="card relative w-full max-w-md bg-paper p-6 sm:p-8">
        <button onClick={onDone} className="absolute right-3 top-3 grid h-12 w-12 place-items-center rounded-full text-ink-3" aria-label="Skip"><X /></button>
        <Image src="/assets/logo-tarazu.svg" alt="" width={64} height={64} className="mx-auto" />
        {step === 0 ? (
          <>
            <h2 className="mt-3 text-center text-2xl font-semibold">अपनी भाषा चुनो</h2>
            <p className="text-center text-ink-2">ভাষা বেছে নাও · Choose your language</p>
            <div className="mt-5 grid gap-3">
              {LANGS.map((l) => (
                <button key={l.id} onClick={() => choose(l.id, l.hello)} className={`btn btn-xl w-full justify-between ${lang === l.id ? "btn-gold" : "btn-ghost"}`}>
                  <span className="text-2xl">{l.label}</span><span className="text-base font-semibold opacity-70">{l.hello}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-center text-2xl font-semibold">{t({ en: "Only three things to know", hi: "बस तीन बातें", bn: "শুধু তিনটে কথা" })}</h2>
            <div className="mt-5 grid gap-3">
              {steps.map((s, i) => (
                <motion.button key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} onClick={() => speak(`${t(s.title)}. ${t(s.body)}`, lang)}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4 text-left">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white" style={{ background: s.color }}><s.icon size={28} /></span>
                  <span><span className="block text-lg font-bold">{t(s.title)}</span><span className="text-[15px] text-ink-2">{t(s.body)}</span></span>
                </motion.button>
              ))}
            </div>
            <p className="mt-4 text-center text-sm text-ink-3">{t({ en: "Stuck anywhere? Tap the gold face at the bottom right.", hi: "कहीं अटको तो नीचे दाईं तरफ़ सुनहरे चेहरे को दबाओ।", bn: "কোথাও আটকে গেলে নিচে ডানদিকে সোনালি মুখটা টিপো।" })}</p>
            <button onClick={onDone} className="btn btn-gold btn-xl mt-4 w-full">{t({ en: "Start", hi: "शुरू करो", bn: "শুরু করো" })}</button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const t = useT();
  const { ready, init, lang, setLang, autoRead, setAutoRead } = useStore();
  // Read-to-me mode: every screen introduces itself aloud as soon as it opens.
  useEffect(() => {
    if (!ready || !autoRead || !PAGE_HELP[path]) return;
    const id = setTimeout(() => speak(PAGE_HELP[path][lang], lang), 700);
    return () => { clearTimeout(id); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, autoRead, ready]);
  const readLabel = t({ en: "Read every screen to me", hi: "हर पन्ना पढ़कर सुनाओ", bn: "প্রতিটা পাতা পড়ে শোনাও" });
  const [more, setMore] = useState(false);
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    init();
    try { if (!localStorage.getItem("tarazu-welcomed")) setWelcome(true); } catch {}
  }, [init]);
  useEffect(() => setMore(false), [path]);
  const doneWelcome = () => { try { localStorage.setItem("tarazu-welcomed", "1"); } catch {} setWelcome(false); };

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const tabs = NAV.slice(0, 4), rest = NAV.slice(4);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/70 bg-ivory/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Tarazu home">
            <Image src="/assets/logo-tarazu.svg" alt="" width={40} height={40} priority />
            <span className="font-display text-2xl font-semibold tracking-tight">Tarazu</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-0.5 xl:flex" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-bold transition ${active(n.href) ? "bg-ink text-ivory" : "text-ink-2 hover:bg-ink/5"}`}>
                <n.icon size={16} />{t(n.label)}
              </Link>
            ))}
          </nav>
          <button onClick={() => setAutoRead(!autoRead)} aria-pressed={autoRead} title={readLabel} aria-label={readLabel}
            className={`ml-auto hidden h-11 items-center gap-2 rounded-full border px-3 text-sm font-bold transition sm:flex ${autoRead ? "border-verdigris bg-verdigris text-white" : "border-line bg-white/70 text-ink-2"}`}>
            <Volume2 size={18} /><span className="hidden whitespace-nowrap 2xl:inline">{autoRead ? t({ en: "Reading aloud", hi: "पढ़कर सुना रही हूँ", bn: "পড়ে শোনাচ্ছি" }) : t({ en: "Read to me", hi: "पढ़कर सुनाओ", bn: "পড়ে শোনাও" })}</span>
          </button>
          <div className="ml-auto flex items-center rounded-full border border-line bg-white/70 p-1 sm:ml-0" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l.id} onClick={() => setLang(l.id)} className={`min-h-10 rounded-full px-3 text-sm font-bold transition ${lang === l.id ? "gold-fill text-ink shadow" : "text-ink-2"}`}>{l.id === "en" ? "EN" : l.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto min-h-[70vh] max-w-7xl px-4 pb-40 pt-6 xl:pb-24">
        {ready ? children : (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="text-center"><Image src="/assets/logo-tarazu.svg" alt="" width={84} height={84} className="floaty mx-auto" /><p className="mt-3 font-semibold text-ink-3">Opening the book…</p></div>
          </div>
        )}
      </main>

      {/* phone tab bar: four big targets + More */}
      <nav className="safe-b fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur xl:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {tabs.map((n) => (
            <Link key={n.href} href={n.href} className={`flex min-h-[68px] flex-col items-center justify-center gap-1 text-[12px] font-bold ${active(n.href) ? "text-bahi" : "text-ink-3"}`}>
              <span className={`grid h-9 w-14 place-items-center rounded-full transition ${active(n.href) ? "bg-gold-2/50" : ""}`}><n.icon size={24} /></span>{t(n.label)}
            </Link>
          ))}
          <button onClick={() => setMore((m) => !m)} className={`flex min-h-[68px] flex-col items-center justify-center gap-1 text-[12px] font-bold ${rest.some((r) => active(r.href)) || more ? "text-bahi" : "text-ink-3"}`} aria-expanded={more}>
            <span className="grid h-9 w-14 place-items-center rounded-full"><MoreHorizontal size={24} /></span>{t({ en: "More", hi: "और", bn: "আরও" })}
          </button>
        </div>
        <AnimatePresence>
          {more && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="card absolute inset-x-3 bottom-[80px] grid grid-cols-2 gap-2 bg-paper p-3">
              {rest.map((n) => (
                <Link key={n.href} href={n.href} className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 font-bold ${active(n.href) ? "bg-ink text-ivory" : "bg-ivory-2/70"}`}><n.icon size={22} />{t(n.label)}</Link>
              ))}
              <button onClick={() => setAutoRead(!autoRead)} aria-pressed={autoRead} className={`col-span-2 flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left font-bold ${autoRead ? "bg-verdigris text-white" : "border border-line bg-white"}`}>
                <Volume2 size={22} /><span className="flex-1">{readLabel}</span>
                <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${autoRead ? "bg-white/40" : "bg-line"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${autoRead ? "left-6" : "left-1"}`} /></span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {ready && <Tara />}
      <AnimatePresence>{welcome && ready && <Onboarding onDone={doneWelcome} />}</AnimatePresence>
    </>
  );
}
