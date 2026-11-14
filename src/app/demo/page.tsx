"use client";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Check, ChevronLeft, ChevronRight, ExternalLink, Gavel, Hammer, Landmark, Mic, Pause, Play, Radio, RotateCcw, ShieldCheck, Stamp, Store, Volume2, VolumeX, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Balance3D, Chain3D } from "@/components/three/lazy";
import { Ring } from "@/components/ui";
import { useT, type L } from "@/lib/i18n";
import { fairBand, findDivergence, proposeAtMedian, simulateSchedule } from "@/lib/ledger/analytics";
import { reconcile } from "@/lib/ledger/engine";
import { grams, pct } from "@/lib/ledger/units";
import { useStore } from "@/lib/store";
import { speak, stopSpeaking } from "@/lib/voice";

/** `step` rises 0,1,2… on a timer while a scene is on stage; each scene reveals itself by it. */
function useSteps(count: number, every = 1300, playing = true) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!playing || step >= count) return;
    const id = setTimeout(() => setStep((s) => s + 1), every);
    return () => clearTimeout(id);
  }, [step, count, every, playing]);
  return step;
}

const pop = { initial: { opacity: 0, y: 14, scale: 0.94 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { type: "spring" as const, stiffness: 260, damping: 22 } };
type Num = { issuedG: string; lossPct: string; capPct: string; p10: string; p50: string; p90: string; owesBefore: string; owesAfter: string; ledgerG: string; bookG: string; deltaG: string; job: string; before: number; after: number };

/* ---------------- scenes ---------------- */

function SBalance({ playing }: { playing: boolean }) {
  const s = useSteps(3, 1900, playing);
  return (
    <div className="relative h-full">
      <Balance3D tilt={s < 1 ? -0.9 : s < 2 ? 0.5 : 0} leftBeads={8} rightBeads={s < 2 ? 5 : 8} alert={s < 2} className="h-full w-full" />
      <motion.div key={s >= 2 ? "ok" : "no"} {...pop} className={`absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${s >= 2 ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"}`}>
        {s >= 2 ? "✓ both books agree" : "two books, two answers"}
      </motion.div>
    </div>
  );
}

function SVoice({ playing, links }: { playing: boolean; links: { id: string }[] }) {
  const s = useSteps(5, 1350, playing);
  return (
    <div className="grid h-full content-center items-center gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-8">
      <div className="mx-auto w-full max-w-[230px] rounded-[28px] border-4 border-white/15 bg-[#efe6d2] p-3 text-ink shadow-2xl sm:max-w-[250px]">
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-verdigris px-3 py-2 text-xs font-bold text-white"><Mic size={14} />Mehta Jewellers</div>
        <div className="min-h-[168px] space-y-2 sm:min-h-[190px]">
          <motion.div {...pop} className="ml-auto flex w-fit items-center gap-2 rounded-2xl rounded-br-sm bg-[#d9f2c7] px-3 py-2 text-verdigris"><span className="wave"><i /><i /><i /><i /><i /></span></motion.div>
          {s >= 1 && <motion.div {...pop} className="w-fit max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[13px]">আজ সোনা পেলে?<div className="num mt-1 rounded-lg bg-gold-2/30 px-2 py-1 text-center text-xl font-bold">250.000 g<span className="ml-1 text-xs">22K</span></div></motion.div>}
          {s >= 2 && <motion.div {...pop} className="grid grid-cols-2 gap-2"><span className="grid h-10 place-items-center rounded-xl bg-verdigris text-white ring-4 ring-verdigris/30"><Check size={20} /></span><span className="grid h-10 place-items-center rounded-xl bg-terracotta/30 text-terracotta"><X size={20} /></span></motion.div>}
        </div>
      </div>
      <div className="text-center">
        <div className="flex justify-center gap-3">
          {[{ n: "Bablu", at: 2, c: "#1f6f5c", i: Hammer }, { n: "Mehta", at: 3, c: "#8e1b1b", i: Store }].map((p) => (
            <motion.div key={p.n} animate={s >= p.at ? { scale: [1.5, 1], rotate: [-18, -6], opacity: 1 } : { opacity: 0.25 }} className="grid h-16 w-24 place-items-center rounded-xl border-2 border-dashed text-[11px] font-extrabold uppercase sm:h-20 sm:text-xs" style={{ borderColor: p.c, color: s >= p.at ? "#fff" : "#fff8", background: s >= p.at ? p.c : "transparent" }}>
              <span><p.i className="mx-auto mb-0.5" size={18} />{p.n}<br />{s >= p.at ? "signed ✓" : "…"}</span>
            </motion.div>
          ))}
        </div>
        <div className="mt-1 h-[84px] sm:mt-2 sm:h-[120px]">{s >= 3 && <Chain3D links={s >= 4 ? [...links, { id: "new" }] : links} brokenAt={null} newest="new" className="h-[84px] w-full sm:h-[120px]" />}</div>
        {s >= 4 && <motion.div {...pop} className="mx-auto inline-flex items-center gap-2 rounded-full bg-gold-2/20 px-4 py-1.5 text-sm font-bold text-gold-2"><Stamp size={15} />Day Seal sent to both</motion.div>}
      </div>
    </div>
  );
}

function SDiverge({ playing, n }: { playing: boolean; n: Num }) {
  const s = useSteps(4, 1500, playing);
  const rows = [["J-1017", "132.300", "132.300"], ["J-1019", "125.000", "125.000"], [n.job, n.ledgerG, n.bookG], ["J-1040", "56.900", "56.900"]];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4 sm:p-8">
      <div className="relative grid w-full max-w-xl grid-cols-2 gap-3">
        {["Shop's book", "Bablu's notebook"].map((h, col) => (
          <div key={h} className="overflow-hidden rounded-2xl bg-[#fbf6ea] text-ink">
            <div className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white ${col ? "bg-verdigris" : "bg-bahi"}`}>{h}</div>
            {rows.map((r, i) => {
              const bad = i === 2 && s >= 2;
              return <motion.div key={i} animate={{ backgroundColor: bad ? (col ? "#1f6f5c33" : "#c4553b40") : s > i ? "#1f6f5c12" : "#0000" }} className="flex justify-between border-b border-bahi/10 px-3 py-2 text-sm"><span className="num text-ink-3">{r[0]}</span><span className={`num font-bold ${bad ? (col ? "text-verdigris" : "text-terracotta") : ""}`}>{r[1 + col]}</span></motion.div>;
            })}
          </div>
        ))}
        {s < 3 && <motion.div className="pointer-events-none absolute inset-x-0 h-9 rounded bg-gradient-to-b from-transparent via-gold-2/60 to-transparent" animate={{ top: ["18%", "62%"] }} transition={{ duration: 2.6, ease: "easeInOut" }} />}
      </div>
      {s >= 2 && (
        <motion.div {...pop} className="flex flex-wrap items-center justify-center gap-3 text-center">
          <span className="num text-3xl font-bold text-red-300 sm:text-4xl">{n.ledgerG}</span>
          <span className="text-2xl text-gold-2">⇄</span>
          <span className="num text-3xl font-bold text-emerald-300 sm:text-4xl">{n.bookG}</span>
        </motion.div>
      )}
      {s >= 3 && <motion.div {...pop} className="flex flex-wrap justify-center gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">first split: {n.job}</span><span className="rounded-full bg-red-400/20 px-3 py-1.5 text-red-200">two digits swapped</span><span className="rounded-full bg-gold-2/20 px-3 py-1.5 text-gold-2">Δ {n.deltaG} g pure, karigar&apos;s favour</span></motion.div>}
    </div>
  );
}

function SAgents({ playing, n }: { playing: boolean; n: Num }) {
  const s = useSteps(5, 1500, playing);
  const says = [
    { i: Store, c: "#8e1b1b", who: "Steward", t: `Loss ${n.lossPct}%, cap ${n.capPct}%. He owes ${n.owesBefore} g.` },
    { i: Hammer, c: "#1f6f5c", who: "Advocate", t: `Normal loss here is ${n.p10}–${n.p90}%. The cap was the unfair part.` },
    { i: Gavel, c: "#a67c26", who: "Mediator", t: `Settle at the median, ${n.p50}%. Both must sign.` },
  ];
  const x = (v: string) => `${(parseFloat(v) / 5.4) * 100}%`;
  return (
    <div className="flex h-full flex-col justify-center gap-3 p-4 sm:p-8">
      {says.map((a, i) => s > i && (
        <motion.div key={i} {...pop} className={`flex items-start gap-3 ${i === 1 ? "flex-row-reverse text-right" : ""}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: a.c }}><a.i size={20} /></span>
          <div className="max-w-[78%] rounded-2xl bg-white/10 px-4 py-2.5"><div className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: "#e6c56e" }}>{a.who}</div><div className="text-sm sm:text-base">{a.t}</div></div>
        </motion.div>
      ))}
      {s >= 3 && (
        <motion.div {...pop} className="mt-2">
          <div className="relative mx-auto h-4 max-w-lg rounded-full bg-white/15">
            <div className="absolute inset-y-0 rounded-full bg-emerald-400/70" style={{ left: x(n.p10), width: `calc(${x(n.p90)} - ${x(n.p10)})` }} />
            <motion.div className="absolute -top-2 h-8 w-1.5 rounded bg-red-400" initial={{ left: x(n.capPct) }} animate={{ left: s >= 4 ? x(n.p50) : x(n.capPct), backgroundColor: s >= 4 ? "#e6c56e" : "#f87171" }} transition={{ duration: 0.9 }} />
          </div>
          <div className="mt-3 text-center"><span className="text-xs font-bold uppercase tracking-widest text-ivory/60">Rafiq owes </span>
            <motion.span key={s >= 4 ? "a" : "b"} {...pop} className={`num ml-2 inline-block text-3xl font-bold ${s >= 4 ? "text-emerald-300" : "text-red-300"}`}>{s >= 4 ? n.owesAfter : n.owesBefore} g</motion.span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Card({ name, jobs }: { name: string; jobs: string[] }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3"><div className="mb-2 text-sm font-bold">{name}</div><div className="flex min-h-[64px] flex-wrap content-start gap-1.5">{jobs.map((j) => <motion.span layoutId={`job-${j}`} key={j} className={`rounded-lg px-2 py-1 text-[11px] font-bold ${j === "earrings" ? "bg-gold-2 text-ink" : "bg-white/15"}`}>{j}</motion.span>)}</div></div>
  );
}

function SDeadline({ playing, n }: { playing: boolean; n: Num }) {
  const s = useSteps(4, 1500, playing);
  const moved = s >= 2;
  return (
    <div className="grid h-full items-center gap-5 p-4 sm:grid-cols-[auto_1fr] sm:p-8">
      <div className="mx-auto rounded-full bg-ivory p-2"><Ring bp={(s >= 3 ? n.after : n.before)} size={150} label="on time" /></div>
      <div>
        <div className="mb-3 text-center text-sm font-bold text-ivory/80 sm:text-left">Aarti&apos;s wedding · 12 days · hallmark still to come</div>
        <div className="grid grid-cols-2 gap-3">
          <Card name="Bablu · 4 orders" jobs={["haar", ...(moved ? [] : ["earrings"]), "jhumka", "nath", "kada"]} />
          <Card name="Suresh · free" jobs={["ring", ...(moved ? ["earrings"] : [])]} />
        </div>
        {s >= 1 && <motion.div {...pop} className={`mt-3 rounded-xl px-3 py-2 text-center text-sm font-bold ${s >= 3 ? "bg-emerald-400/20 text-emerald-200" : "bg-gold-2/20 text-gold-2"}`}>{s >= 3 ? "Suresh said yes. The date is protected." : s >= 2 ? "Asked Suresh. Nobody is moved without a yes." : "Below 80%. Guardian raises an alert."}</motion.div>}
      </div>
    </div>
  );
}

function SPassport({ playing }: { playing: boolean }) {
  const s = useSteps(4, 1400, playing);
  return (
    <div className="grid h-full items-center gap-6 p-4 sm:grid-cols-2 sm:p-8">
      <div className="persp mx-auto w-full max-w-[280px]">
        <motion.div animate={{ rotateY: s >= 1 ? [0, 360] : 0, y: [0, -6, 0] }} transition={{ rotateY: { duration: 1.4 }, y: { duration: 3, repeat: Infinity } }} className="relative aspect-[1.58] overflow-hidden rounded-2xl p-4 text-ink shadow-2xl" style={{ background: "linear-gradient(135deg,#f4dc95,#d2a94e 45%,#9c7220)" }}>
          <div className="shimmer absolute inset-0 opacity-60" />
          <div className="relative text-xs font-bold">Tarazu · Trust Passport</div>
          <div className="relative mt-5 font-display text-2xl font-semibold">বাবলু মাইতি</div>
          <div className="relative text-[11px] font-semibold opacity-80">Master karigar · since 2011</div>
          <BadgeCheck className="absolute bottom-3 right-3" size={30} />
        </motion.div>
      </div>
      <div className="space-y-2">
        {["Jobs delivered", "On time", "Wastage within fair band"].map((f, i) => s > i && <motion.div key={f} {...pop} className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400 text-ink"><Check size={14} /></span>{f}<span className="ml-auto text-[11px] font-semibold text-ivory/60">he chose to show</span></motion.div>)}
        {s >= 3 && <motion.div {...pop} className="flex items-center gap-2 rounded-xl bg-gold-2 px-3 py-2.5 text-sm font-bold text-ink"><Landmark size={18} />Lender: signatures verified<ShieldCheck className="ml-auto" size={18} /></motion.div>}
      </div>
    </div>
  );
}

function SClose({ playing, links }: { playing: boolean; links: { id: string }[] }) {
  const s = useSteps(4, 1600, playing);
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center">
      <Chain3D links={links} brokenAt={s === 1 ? 3 : null} className="h-[140px] w-full max-w-2xl" />
      <div className={`mb-4 rounded-full px-4 py-1.5 text-sm font-bold ${s === 1 ? "bg-red-400/20 text-red-200" : "bg-emerald-400/20 text-emerald-200"}`}>{s === 1 ? "someone edits an old weight → the link breaks, everyone sees" : "every link intact · every entry signed twice"}</div>
      {s >= 2 && <motion.p {...pop} className="font-display text-2xl leading-snug sm:text-4xl">Agents propose. Humans approve.<br /><span className="gold-text italic">The ledger remembers.</span></motion.p>}
    </div>
  );
}

/* ---------------- film ---------------- */

type Scene = { id: string; href: string; ms: number; title: L; line: L };
const SCENES: Scene[] = [
  { id: "balance", href: "/", ms: 8000, title: { en: "Two books, one truth", hi: "दो बहियाँ, एक सच", bn: "দুই খাতা, এক সত্যি" }, line: { en: "Gold moves on trust. Tarazu makes it move on proof, and gives the weaker side the same book.", hi: "सोना भरोसे पर चलता है। तराज़ू उसे सबूत पर चलाता है, और कमज़ोर पक्ष को भी वही बही देता है।", bn: "সোনা চলে ভরসায়। তরাজু তাকে চালায় প্রমাণে, আর দুর্বল পক্ষকেও একই খাতা দেয়।" } },
  { id: "voice", href: "/karigar", ms: 9500, title: { en: "He speaks. Both sign.", hi: "वह बोलता है। दोनों दस्तख़त करते हैं।", bn: "সে বলে। দুজনে সই করে।" }, line: { en: "Bablu says what gold he received. The app reads it back. His yes is his signature, the jeweller countersigns, and a new link locks into the chain.", hi: "बबलू बताता है कितना सोना मिला। ऐप पढ़कर सुनाता है। उसकी हाँ ही उसका दस्तख़त है, सेठ भी दस्तख़त करता है, और ज़ंजीर में नई कड़ी जुड़ जाती है।", bn: "বাবলু বলে কত সোনা পেল। অ্যাপ পড়ে শোনায়। তার হ্যাঁ-ই তার সই, মালিকও সই করে, আর শিকলে নতুন কড়া জুড়ে যায়।" } },
  { id: "diverge", href: "/karigar?do=mismatch", ms: 9500, title: { en: "“My count is different”", hi: "“मेरा हिसाब अलग है”", bn: "“আমার হিসাব আলাদা”" }, line: { en: "The two books are laid side by side, and the first entry where they split is found in seconds: two digits swapped in an old, single-signed line.", hi: "दोनों बहियाँ साथ रखी जाती हैं, और पल भर में वह पहली एंट्री मिल जाती है जहाँ से हिसाब अलग हुआ: पुरानी, एक दस्तख़त वाली लाइन में दो अंक आगे-पीछे।", bn: "দুই খাতা পাশাপাশি রাখা হয়, আর মুহূর্তে পাওয়া যায় সেই প্রথম এন্ট্রি, যেখান থেকে হিসাব আলাদা: পুরনো, এক-সইয়ের লাইনে দুটো অঙ্ক উল্টে গেছে।" } },
  { id: "agents", href: "/agents", ms: 10500, title: { en: "Fairness, argued in the open", hi: "इंसाफ़ की खुली बहस", bn: "ন্যায্যতার খোলা তর্ক" }, line: { en: "One agent speaks for the jeweller, one for the karigar, and a neutral one finds the fair middle from past jobs. They only propose. Both people sign.", hi: "एक एजेंट सेठ की तरफ़ से बोलता है, एक कारीगर की तरफ़ से, और तीसरा पुराने कामों से बीच का सही रास्ता निकालता है। वे सिर्फ़ सुझाते हैं। दस्तख़त दोनों लोग करते हैं।", bn: "এক এজেন্ট মালিকের হয়ে বলে, একজন কারিগরের হয়ে, আর তৃতীয়জন আগের কাজ দেখে মাঝামাঝি ন্যায্য পথ বের করে। ওরা শুধু প্রস্তাব দেয়। সই করে দুজন মানুষ।" } },
  { id: "deadline", href: "/jeweller", ms: 9000, title: { en: "The wedding date is protected", hi: "शादी की तारीख़ सुरक्षित", bn: "বিয়ের তারিখ সুরক্ষিত" }, line: { en: "Two thousand simulations say the bridal set may be late. The earrings are offered to a karigar with free time. He says yes, and the odds recover.", hi: "दो हज़ार बार हिसाब लगाकर पता चलता है कि ब्राइडल सेट लेट हो सकता है। झुमके एक ख़ाली कारीगर को दिए जाते हैं। वह हाँ कहता है, और भरोसा लौट आता है।", bn: "দুই হাজার বার হিসাব করে বোঝা যায় ব্রাইডাল সেট দেরি হতে পারে। দুল দেওয়া হয় একজন ফাঁকা কারিগরকে। সে হ্যাঁ বলে, আর ভরসা ফিরে আসে।" } },
  { id: "passport", href: "/passport", ms: 8500, title: { en: "Honest work becomes credit", hi: "ईमानदार काम बनता है साख", bn: "সৎ কাজ হয়ে ওঠে সুনাম" }, line: { en: "The karigar owns his record. He chooses what a lender may see. Milk records already finance dairy farmers; gold-delivery records can do the same for karigars.", hi: "रिकॉर्ड कारीगर का अपना है। बैंक क्या देखे, वह ख़ुद तय करता है। दूध के रिकॉर्ड पर किसानों को क़र्ज़ मिलता है; सोने की डिलीवरी के रिकॉर्ड पर कारीगरों को भी मिल सकता है।", bn: "রেকর্ড কারিগরের নিজের। ব্যাংক কী দেখবে, সে নিজেই ঠিক করে। দুধের রেকর্ডে চাষিরা ঋণ পায়; সোনা ডেলিভারির রেকর্ডে কারিগররাও পেতে পারে।" } },
  { id: "close", href: "/ledger", ms: 9000, title: { en: "The ledger remembers", hi: "बही सब याद रखती है", bn: "খাতা সব মনে রাখে" }, line: { en: "Change one old entry and the chain breaks where everyone can see. Agents propose. Humans approve. The ledger remembers.", hi: "एक पुरानी एंट्री बदलो तो ज़ंजीर सबके सामने टूट जाती है। एजेंट सुझाते हैं। इंसान मंज़ूर करते हैं। बही याद रखती है।", bn: "একটা পুরনো এন্ট্রি বদলালে শিকল সবার সামনে ভেঙে যায়। এজেন্ট প্রস্তাব দেয়। মানুষ সম্মতি দেয়। খাতা মনে রাখে।" } },
];

const PRESENTER = [
  ["Home", "Tap the lighter pan until the scale settles level."],
  ["My Book", "Play sample (or the mic) → green Yes. Then Shop → Countersign → Day Seal."],
  ["My Book", "Show my notebook → Compare → Ask for correction. Then Shop → Countersign."],
  ["Agent Room", "Start the session → Rafiq: हाँ → Mehta: approve. The scale levels."],
  ["Shop", "Deadline Guardian → Ask Suresh → accept. Then Wedding for the customer's view."],
  ["Passport", "Flip the card → toggle a field → Allow a lender → Lender's view."],
  ["Ledger", "Demo: secretly edit an old weight → link turns red → Restore."],
];

export default function DemoPage() {
  const t = useT();
  const { chain, jobs, history, babluBook, reset, lang } = useStore();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [sound, setSound] = useState(false);
  const [live, setLive] = useState<boolean | null>(null);
  const [wiped, setWiped] = useState(false);
  const [run, setRun] = useState(0); // bump to replay the current scene from its start
  const started = useRef(0);

  // Every figure in the film comes from the engine, not from the script.
  const n: Num = useMemo(() => {
    const job = jobs.find((j) => j.id === "J-1043")!;
    const r = reconcile(job, chain, 250), band = fairBand(history, job.designClass), offer = proposeAtMedian(r.issuedFine, r.lossFine, band);
    const d = findDivergence(chain, "bablu", babluBook);
    return {
      issuedG: grams(r.issuedFine), lossPct: pct(r.lossBp), capPct: pct(250), p10: pct(band.p10), p50: pct(band.p50), p90: pct(band.p90),
      owesBefore: grams(r.excessFine), owesAfter: grams(offer.karigarOwes),
      ledgerG: grams(d?.ledgerNetMg ?? 0), bookG: grams(d?.bookNetMg ?? 0), deltaG: grams(d?.deltaFineMg ?? 0), job: d?.jobId ?? "J-1019",
      before: simulateSchedule({ daysAvailable: 12, karigarLoad: 4, split: false }).onTimeBp, after: simulateSchedule({ daysAvailable: 12, karigarLoad: 4, split: true }).onTimeBp,
    };
  }, [chain, jobs, history, babluBook]);
  const links = useMemo(() => chain.slice(-6).map((e) => ({ id: e.id })), [chain]);

  const go = (k: number) => { stopSpeaking(); setI(Math.max(0, Math.min(SCENES.length - 1, k))); setRun((x) => x + 1); };
  useEffect(() => { fetch("/api/tara").then((r) => r.json()).then((d) => setLive(!!d.live)).catch(() => setLive(false)); return () => stopSpeaking(); }, []);

  // Auto-advance. With narration on, wait for her to finish the line as well as the scene's own length.
  useEffect(() => {
    if (!playing) { stopSpeaking(); return; } // pausing the film silences the narrator too
    started.current = Date.now();
    let spoken = !sound, timeUp = false, dead = false;
    const next = () => { if (dead || !spoken || !timeUp) return; if (i < SCENES.length - 1) { setI(i + 1); setRun((x) => x + 1); } else setPlaying(false); };
    if (sound) speak(SCENES[i].line[lang], lang, () => { spoken = true; next(); });
    const id = setTimeout(() => { timeUp = true; next(); }, SCENES[i].ms);
    return () => { dead = true; clearTimeout(id); if (sound) stopSpeaking(); };
  }, [i, playing, sound, lang, run]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key.toLowerCase() === "r") { reset(); setWiped(true); setTimeout(() => setWiped(false), 1800); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, reset]);

  const sc = SCENES[i], key = `${sc.id}-${run}`;
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><div className="mb-1 text-xs font-extrabold uppercase tracking-[0.18em] text-bahi">{t({ en: "The story in one minute", hi: "एक मिनट में पूरी कहानी", bn: "এক মিনিটে পুরো গল্প" })}</div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{t({ en: "Watch how Tarazu works", hi: "देखो तराज़ू कैसे काम करता है", bn: "দেখো তরাজু কীভাবে কাজ করে" })}</h1></div>
        <span className={`chip px-3 py-1.5 text-sm ${live ? "chip-ok" : "chip-gold"}`}><Radio size={14} />{live === null ? "…" : live ? "Tara: LIVE + offline" : "Tara: offline brain"}</span>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-[#332d22] text-ivory shadow-2xl" style={{ background: "radial-gradient(120% 90% at 50% 0%, #3a2d18 0%, #1b1813 55%, #100e0b 100%)" }}>
        <div className="flex gap-1.5 px-4 pt-1">
          {SCENES.map((s, k) => (
            <button key={s.id} onClick={() => go(k)} aria-label={`Scene ${k + 1}`} className="flex h-11 flex-1 items-center">
              <span className="block h-2 w-full overflow-hidden rounded-full bg-white/15">
                {k < i ? <span className="block h-full w-full gold-fill" /> : k === i ? <motion.span key={key + String(playing)} className="block h-full gold-fill" initial={{ width: "0%" }} animate={{ width: playing ? "100%" : "35%" }} transition={{ duration: playing ? sc.ms / 1000 : 0, ease: "linear" }} /> : null}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 px-5 pt-3">
          <span className="num grid h-8 w-8 place-items-center rounded-full bg-gold-2 text-sm font-bold text-ink">{i + 1}</span>
          <AnimatePresence mode="wait"><motion.h2 key={sc.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-xl font-semibold sm:text-2xl">{t(sc.title)}</motion.h2></AnimatePresence>
        </div>

        <div className="relative h-[520px] sm:h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div key={key} className="absolute inset-0" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.35 }}>
              {sc.id === "balance" && <SBalance playing={playing} />}
              {sc.id === "voice" && <SVoice playing={playing} links={links.slice(-4)} />}
              {sc.id === "diverge" && <SDiverge playing={playing} n={n} />}
              {sc.id === "agents" && <SAgents playing={playing} n={n} />}
              {sc.id === "deadline" && <SDeadline playing={playing} n={n} />}
              {sc.id === "passport" && <SPassport playing={playing} />}
              {sc.id === "close" && <SClose playing={playing} links={links} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait"><motion.p key={sc.id + lang} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="min-h-[84px] px-5 text-center text-base text-ivory/85 sm:px-12 sm:text-lg">{t(sc.line)}</motion.p></AnimatePresence>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-3">
          <button onClick={() => go(i - 1)} disabled={i === 0} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 disabled:opacity-30" aria-label="Previous scene"><ChevronLeft /></button>
          <button onClick={() => { if (!playing && i === SCENES.length - 1) go(0); setPlaying((p) => !p); }} className="btn btn-gold min-w-[140px]">{playing ? <><Pause size={20} />{t({ en: "Pause", hi: "रोको", bn: "থামাও" })}</> : <><Play size={20} />{t({ en: "Play", hi: "चलाओ", bn: "চালাও" })}</>}</button>
          <button onClick={() => go(i + 1)} disabled={i === SCENES.length - 1} className="grid h-12 w-12 place-items-center rounded-full bg-white/10 disabled:opacity-30" aria-label="Next scene"><ChevronRight /></button>
          <button onClick={() => { setSound((s) => { if (s) stopSpeaking(); return !s; }); setRun((x) => x + 1); }} className={`flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-bold ${sound ? "bg-gold-2 text-ink" : "bg-white/10"}`} aria-pressed={sound}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}{t({ en: "Narration", hi: "आवाज़ में सुनो", bn: "গলায় শোনো" })}</button>
          <Link href={sc.href} className="flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-bold"><ExternalLink size={16} />{t({ en: "Try this yourself", hi: "ख़ुद करके देखो", bn: "নিজে করে দেখো" })}</Link>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={() => { reset(); go(0); setPlaying(true); setWiped(true); setTimeout(() => setWiped(false), 1800); }} className="btn btn-ghost"><RotateCcw size={18} />Reset &amp; reseed the ledger</button>
        {wiped && <span className="chip chip-ok">Ledger reseeded. Chain rebuilt and re-signed.</span>}
        <span className="text-xs text-ink-3">Keys: ← → scenes · space play/pause · R reset</span>
      </div>

      <details className="card mt-5 p-5 text-sm">
        <summary className="cursor-pointer text-lg font-semibold">Presenter notes: the live click-path, and what is real</summary>
        <ol className="mt-3 space-y-2">{PRESENTER.map(([where, what], k) => <li key={k} className="flex gap-3"><span className="num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-ivory">{k + 1}</span><span><b>{where}:</b> {what}</span></li>)}</ol>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-ink-2">
          <li><b>Real:</b> integer-mg ledger, fine-weight and reconciliation maths, SHA-256 hash chain, Ed25519 signatures and verification, Merkle Day Seal, tamper detection, fair-band statistics, divergence finder, 2,000-run seeded simulation, numeric grounding guard, browser speech in Hindi / Bengali / English. Every number in the film above is computed by that engine.</li>
          <li><b>Staged:</b> seeded demo data and people; agent wording in the Agent Room; keys held in-app (demo signing); the notebook image; UPI payout, lender and ULI flows are mocks.</li>
        </ul>
      </details>
    </div>
  );
}
