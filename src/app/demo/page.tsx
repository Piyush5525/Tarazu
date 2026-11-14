"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, RotateCcw, Radio } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHead } from "@/components/ui";
import { useStore } from "@/lib/store";

const STEPS = [
  { at: "0:00", href: "/", title: "The Balance", say: "Gold moves on trust. Tarazu makes it move on proof, and gives the weaker side the same book.", do: "Tap the lighter pan until the scale settles level." },
  { at: "0:20", href: "/karigar", title: "Bablu records gold by voice", say: "Bablu speaks in Bengali. The app reads it back. His yes is his signature.", do: "Mera Khata → Play sample (or the mic) → green Yes. Then Shop → Countersign → Day Seal appears." },
  { at: "0:50", href: "/karigar?do=mismatch", title: "“Mera hisab alag hai”", say: "Git bisect for gold: it pinpoints J-1019, 118.250 against 118.520, two digits swapped in a single-signed legacy entry.", do: "Show my notebook → Compare → Ask for correction. Then Shop → Countersign." },
  { at: "1:20", href: "/agents", title: "Fairness, argued in the open", say: "Rafiq's loss was normal. The cap was below the P10 band. Steward, Advocate and Mediator reach a proposal; both humans sign.", do: "Start the session → Rafiq: हाँ → Mehta: approve. Watch the scale level." },
  { at: "1:50", href: "/jeweller", title: "Aarti's wedding is at risk", say: "About 60% on time. One tap asks Suresh to take the earrings. He accepts. About 90%.", do: "Deadline Guardian → Ask Suresh → accept. Then open Wedding to see the customer's view." },
  { at: "2:20", href: "/passport", title: "Trust Passport", say: "Milk-collection data finances dairy farmers. Gold-delivery data should do the same for karigars. And the Payer Score flips the power dynamic.", do: "Flip the card → toggle a field → Allow a lender → Lender's view." },
  { at: "2:50", href: "/ledger", title: "Close on the chain", say: "Agents propose. Humans approve. The ledger remembers.", do: "Demo: secretly edit an old weight → the link turns red → Restore." },
];

export default function DemoPage() {
  const reset = useStore((s) => s.reset);
  const [i, setI] = useState(0);
  const [live, setLive] = useState<boolean | null>(null);
  const [wiped, setWiped] = useState(false);

  useEffect(() => { fetch("/api/tara").then((r) => r.json()).then((d) => setLive(!!d.live)).catch(() => setLive(false)); }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
      if (e.key.toLowerCase() === "r") { reset(); setWiped(true); setTimeout(() => setWiped(false), 1800); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [reset]);

  const s = STEPS[i];
  return (
    <div className="mx-auto max-w-4xl">
      <PageHead kicker="Presenter only" title="The 3-minute demo" sub="← → to move, R to reset and reseed. Navigation keeps all state; a full page reload reseeds too."
        right={<span className={`chip px-3 py-1.5 text-sm ${live ? "chip-ok" : "chip-gold"}`}><Radio size={14} />{live === null ? "…" : live ? "Tara: LIVE (free Gemini) + offline brain" : "Tara: FIXTURE (offline brain)"}</span>} />

      <div className="flex gap-1.5">{STEPS.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Step ${k + 1}`} className={`h-3 flex-1 rounded-full transition ${k <= i ? "gold-fill" : "bg-line"}`} />)}</div>

      <AnimatePresence mode="wait">
        <motion.section key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="card mt-5 p-6 sm:p-8">
          <div className="flex items-center gap-3"><span className="num rounded-full bg-ink px-3 py-1 text-sm font-bold text-ivory">{s.at}</span><span className="text-sm font-bold text-ink-3">Step {i + 1} of {STEPS.length}</span></div>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">{s.title}</h2>
          <p className="mt-3 font-display text-xl italic leading-snug text-ink-2 sm:text-2xl">“{s.say}”</p>
          <div className="mt-4 rounded-2xl bg-ivory-2/80 p-4"><div className="text-xs font-extrabold uppercase tracking-widest text-bahi">Do</div><p className="text-lg">{s.do}</p></div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={s.href} className="btn btn-gold btn-xl"><ExternalLink size={20} />Open this screen</Link>
            <button onClick={() => setI((x) => Math.max(x - 1, 0))} disabled={i === 0} className="btn btn-ghost" aria-label="Previous"><ArrowLeft /></button>
            <button onClick={() => setI((x) => Math.min(x + 1, STEPS.length - 1))} disabled={i === STEPS.length - 1} className="btn btn-ink">Next<ArrowRight /></button>
          </div>
        </motion.section>
      </AnimatePresence>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button onClick={() => { reset(); setI(0); setWiped(true); setTimeout(() => setWiped(false), 1800); }} className="btn btn-no"><RotateCcw size={20} />Reset &amp; reseed</button>
        {wiped && <span className="chip chip-ok">Ledger reseeded. Chain rebuilt and re-signed.</span>}
      </div>

      <section className="card mt-6 p-5 text-sm">
        <h3 className="text-lg font-semibold">What is real, what is staged</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
          <li><b>Real:</b> integer-mg ledger, fine-weight and reconciliation maths, SHA-256 hash chain, Ed25519 signatures and verification, Merkle Day Seal, tamper detection, fair-band statistics, divergence finder, 2,000-run seeded simulation, numeric grounding guard, browser speech in Hindi / Bengali / English.</li>
          <li><b>Staged:</b> seeded demo data and people; agent wording in the Agent Room (fixture, numbers live); keys held in-app (demo signing); notebook image; UPI payout, lender and ULI flows are mocks.</li>
        </ul>
      </section>
    </div>
  );
}
