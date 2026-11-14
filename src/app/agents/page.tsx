"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Ban, Check, Gavel, Play, Scale, ShieldCheck, Store, Hammer, Wrench, Bug, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Balance3D } from "@/components/three/lazy";
import { Grams, Guide, PageHead, Speak } from "@/components/ui";
import { tr, useT } from "@/lib/i18n";
import { classify, fairBand, groundingGuard, proposeAtMedian } from "@/lib/ledger/analytics";
import { reconcile } from "@/lib/ledger/engine";
import { DESIGN_CLASSES } from "@/lib/ledger/seed";
import { grams, pct } from "@/lib/ledger/units";
import { useStore } from "@/lib/store";

type Turn = { agent: "steward" | "advocate" | "mediator"; tool: string; text: string; cites: string[] };
const WHO = {
  steward: { name: "Jeweller's Steward", for: "acts for Mehta Jewellers", color: "#8e1b1b", icon: Store },
  advocate: { name: "Karigar's Advocate", for: "acts for Rafiq Ali", color: "#1f6f5c", icon: Hammer },
  mediator: { name: "Mediator", for: "neutral · sees FINAL entries only", color: "#8a6418", icon: Gavel },
};

export default function AgentRoom() {
  const t = useT();
  const { chain, jobs, history, pending, propose, signPending, lang } = useStore();
  const job = jobs.find((j) => j.id === "J-1043")!;
  const r = useMemo(() => reconcile(job, chain, 250), [job, chain]);
  const band = useMemo(() => fairBand(history, job.designClass), [history, job.designClass]);
  const cls = classify(r.lossBp, 250, band);
  const offer = proposeAtMedian(r.issuedFine, r.lossFine, band);
  const settled = job.status === "SETTLED";
  const draft = pending.find((p) => p.jobId === job.id && p.type === "SETTLEMENT_SIGNED");
  const ids = (type: string) => chain.filter((e) => e.jobId === job.id && e.type === type).map((e) => e.id);

  // Facts = exactly what the tools returned this run. The guard rejects any number outside this list.
  const facts = [grams(r.issuedFine), grams(r.finishedFine), grams(r.scrapFine), grams(r.lossFine), pct(r.lossBp), pct(250), grams(r.excessFine), pct(band.p10), pct(band.p50), pct(band.p90), band.n, grams(offer.capFine), grams(offer.karigarOwes), grams(r.capFine)];
  const script: Turn[] = [
    { agent: "steward", tool: "get_orders(J-1043)", cites: [...ids("AGREEMENT_SET"), ...ids("ISSUE"), ...ids("RECEIVE_FINISHED"), ...ids("RECEIVE_SCRAP")], text: `On J-1043 we issued ${grams(r.issuedFine)} g fine and received ${grams(r.finishedFine)} g finished plus ${grams(r.scrapFine)} g scrap. Loss is ${grams(r.lossFine)} g, that is ${pct(r.lossBp)}%. The agreed cap was ${pct(250)}%, so the excess is ${grams(r.excessFine)} g. We ask Rafiq to make that good.` },
    { agent: "advocate", tool: `fair_band(${job.designClass})`, cites: ids("AGREEMENT_SET"), text: `Rafiq does not dispute the weights. He disputes the cap. Across ${band.n} past jobs of this design class, loss ran from ${pct(band.p10)}% (P10) to ${pct(band.p90)}% (P90), median ${pct(band.p50)}%. His ${pct(r.lossBp)}% is inside that band. A ${pct(250)}% cap sits below P10: nine jobs in ten would have breached it.` },
    { agent: "mediator", tool: "propose_settlement(J-1043)", cites: [...ids("ISSUE"), ...ids("RECEIVE_FINISHED"), ...ids("RECEIVE_SCRAP")], text: `Both books agree on every weight, so this is a fairness question, not an accounting one. Class: ${cls}. I propose settling at the median, ${pct(band.p50)}%. That allows ${grams(offer.capFine)} g, and Rafiq owes ${grams(offer.karigarOwes)} g instead of ${grams(r.excessFine)} g. This is a proposal only: it needs both signatures.` },
  ];

  const [shown, setShown] = useState(settled ? script.length : 0);
  const [playing, setPlaying] = useState(false);
  const [inject, setInject] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing) return;
    if (shown >= script.length) { setPlaying(false); return; }
    const id = setTimeout(() => { setShown((s) => s + 1); end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, shown === 0 ? 500 : 2300);
    return () => clearTimeout(id);
  }, [playing, shown, script.length]);

  const hallucinated = `Rafiq owes 0.512 g on J-1043.`;
  const blocked = groundingGuard(hallucinated, facts);
  const readback = (l: "hi" | "en") => tr(l, {
    en: `Proposal for job J-1043. The wastage limit changes from ${pct(250)} percent to ${pct(band.p50)} percent. Rafiq gives ${grams(offer.karigarOwes)} grams of pure gold instead of ${grams(r.excessFine)} grams. Do you agree?`,
    hi: `काम J-1043 का प्रस्ताव। छीजत की सीमा ${pct(250)} प्रतिशत से बदलकर ${pct(band.p50)} प्रतिशत होगी। रफ़ीक़ को ${grams(r.excessFine)} ग्राम की जगह ${grams(offer.karigarOwes)} ग्राम खरा सोना देना होगा। क्या तुम राज़ी हो?`,
    bn: "",
  });

  const sign = (who: "karigar" | "jeweller") => {
    let id = draft?.id;
    if (!id) id = propose("SETTLEMENT_SIGNED", job.id, job.karigarId, { capBp: offer.capBp, fineMg: offer.karigarOwes, note: `Mediated at P50 (${cls})` });
    signPending(id, who);
  };
  const kSigned = settled || !!draft?.sigKarigar, jSigned = settled || !!draft?.sigJeweller;
  const owes = settled ? offer.karigarOwes : r.excessFine;
  const span = Math.max(band.p90 + 80, 520);
  const x = (bp: number) => `${Math.min(100, (bp / span) * 100)}%`;

  return (
    <div>
      <PageHead kicker="Agent Room · पंचायत" title={t({ en: "Three agents argue. Two humans decide.", hi: "तीन एजेंट बहस करते हैं। फ़ैसला दो इंसान करते हैं।", bn: "তিন এজেন্ট তর্ক করে। সিদ্ধান্ত নেয় দুজন মানুষ।" })}
        sub={t({ en: "Rafiq's temple haar, J-1043. The jeweller says he lost too much gold. Is that fair?", hi: "रफ़ीक़ का टेम्पल हार, J-1043। सेठ का कहना है कि सोना ज़्यादा घटा। क्या यह सही है?", bn: "রফিকের টেম্পল হার, J-1043। মালিক বলছে সোনা বেশি কমেছে। এটা কি ন্যায্য?" })} />

      <Guide steps={[
        { en: "Press Start and watch the three agents make their case.", hi: "शुरू दबाओ और तीनों एजेंट की दलील देखो।", bn: "শুরু টিপে তিন এজেন্টের যুক্তি দেখো।" },
        { en: "Check the green band: that is the normal loss for this work.", hi: "हरी पट्टी देखो: इस काम में इतनी छीजत आम है।", bn: "সবুজ পট্টি দেখো: এই কাজে এতটা ক্ষয় স্বাভাবিক।" },
        { en: "If the offer is fair, both sign. The scale becomes level.", hi: "प्रस्ताव सही लगे तो दोनों दस्तख़त करो। तराज़ू बराबर हो जाएगा।", bn: "প্রস্তাব ন্যায্য হলে দুজনে সই করো। দাঁড়িপাল্লা সমান হবে।" },
      ]} />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-5">
          <section className="card overflow-hidden p-5">
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{t({ en: "The balance", hi: "तराज़ू", bn: "দাঁড়িপাল্লা" })}</h2><span className={`chip ${settled ? "chip-ok" : "chip-warn"}`}>{settled ? <><Check size={14} />Settled · both signed</> : <>Disputed</>}</span></div>
            <Balance3D tilt={settled ? 0 : -0.7} leftBeads={9} rightBeads={settled ? 9 : 7} alert={!settled} sparkles={settled} className="-my-2 h-[270px] w-full" />
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div><div className="text-xs font-bold text-ink-3">Issued (fine)</div><Grams mg={r.issuedFine} className="text-xl font-bold" /></div>
              <div><div className="text-xs font-bold text-ink-3">Finished + scrap + allowed loss</div><Grams mg={r.finishedFine + r.scrapFine + (settled ? offer.capFine : r.capFine)} className="text-xl font-bold" /></div>
            </div>
            <div className="mt-3 rounded-2xl bg-ivory-2/80 p-3 text-center"><div className="text-xs font-bold text-ink-3">Rafiq owes</div>
              <AnimatePresence mode="wait"><motion.div key={owes} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Grams mg={owes} className={`text-4xl font-bold ${settled ? "text-verdigris" : "text-terracotta"}`} /></motion.div></AnimatePresence>
            </div>
          </section>

          <section data-tara="band" className="card p-5">
            <h2 className="text-xl font-semibold">Wastage fair band</h2>
            <p className="text-sm text-ink-3">{DESIGN_CLASSES[job.designClass]} · learned from {band.n} closed jobs (seeded demo history)</p>
            <div className="relative mt-12 h-5 rounded-full bg-line">
              <div className="absolute inset-y-0 rounded-full bg-verdigris/70" style={{ left: x(band.p10), width: `calc(${x(band.p90)} - ${x(band.p10)})` }} />
              <div className="absolute -top-1 h-7 w-1 rounded bg-ink" style={{ left: x(band.p50) }} />
              {[{ bp: 250, label: "cap", c: "#c4553b", top: true }, { bp: r.lossBp, label: "Rafiq", c: "#15130F", top: true }].map((m) => (
                <motion.div key={m.label} className="absolute -top-10 -translate-x-1/2 text-center" initial={{ left: "0%" }} animate={{ left: x(m.bp) }} transition={{ duration: 0.9 }}>
                  <div className="num rounded-md px-1.5 py-0.5 text-xs font-bold text-white" style={{ background: m.c }}>{m.label} {pct(m.bp)}%</div>
                  <div className="mx-auto h-4 w-0.5" style={{ background: m.c }} />
                </motion.div>
              ))}
            </div>
            <div className="relative mt-1 h-5 text-xs font-bold text-ink-3">
              <span className="num absolute -translate-x-1/2" style={{ left: x(band.p10) }}>P10 {pct(band.p10)}</span>
              <span className="num absolute -translate-x-1/2 text-ink" style={{ left: x(band.p50) }}>P50 {pct(band.p50)}</span>
              <span className="num absolute -translate-x-1/2" style={{ left: x(band.p90) }}>P90 {pct(band.p90)}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="chip chip-warn">{cls}</span><span className="text-sm text-ink-2">The loss is normal. The cap was not. The engine flags limits that hurt the karigar as well as losses that hurt the jeweller.</span></div>
          </section>
        </div>

        <section className="card-ink flex flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-semibold">Live transcript</h2>
            <span className="chip !border-white/20 !bg-white/10 !text-ivory"><ShieldCheck size={13} />Numeric Grounding Guard on</span>
            <button onClick={() => { setShown(0); setPlaying(true); }} className="btn btn-gold ml-auto !min-h-12"><Play size={18} />{shown ? "Replay" : "Start the session"}</button>
          </div>
          <div className="mt-4 flex-1 space-y-4">
            {shown === 0 && !playing && <p className="py-10 text-center text-ivory/60">Press Start. Each agent may only call its own allow-listed tools, and may only quote numbers those tools returned.</p>}
            {script.slice(0, shown).map((m, i) => {
              const w = WHO[m.agent], g = groundingGuard(m.text, facts);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white/[0.07] p-4">
                  <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: w.color }}><w.icon size={18} /></span><div><div className="font-bold leading-tight">{w.name}</div><div className="text-[11px] text-ivory/60">{w.for}</div></div></div>
                  <div className="num mt-2 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-[11px] text-gold-2"><Wrench size={12} />{m.tool}</div>
                  <p className="mt-2 text-[15px] leading-relaxed text-ivory/95">{m.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {m.cites.map((c) => <Link key={c} href="/ledger" className="num rounded-full border border-gold/50 px-2 py-0.5 text-[11px] font-bold text-gold-2 hover:bg-gold/20">{c}</Link>)}
                    <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-bold ${g.ok ? "text-emerald-300" : "text-red-300"}`}><ShieldCheck size={12} />{g.ok ? "all numbers grounded" : `blocked: ${g.violations.join(", ")}`}</span>
                  </div>
                </motion.div>
              );
            })}
            {playing && shown < script.length && <div className="flex items-center gap-2 px-2 text-ivory/60"><span className="wave"><i /><i /><i /></span>{WHO[script[shown].agent].name} is checking the ledger…</div>}
            <div ref={end} />

            <div className="rounded-2xl border border-dashed border-white/20 p-3">
              <button onClick={() => setInject((v) => !v)} className="flex min-h-11 items-center gap-2 text-sm font-bold text-ivory/80"><Bug size={16} />Demo: inject a hallucinated number</button>
              <AnimatePresence>{inject && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 rounded-xl bg-red-500/15 p-3 text-sm"><div className="flex items-center gap-2 font-bold text-red-300"><Ban size={15} />Message blocked before anyone saw it</div><p className="mt-1 text-ivory/80 line-through">{hallucinated}</p><p className="mt-1 text-xs text-ivory/60">Not in any tool result this run: <b className="num">{blocked.violations.join(", ")}</b>. Logged to agent_runs and regenerated.</p></div>
                </motion.div>)}</AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {(shown >= script.length || settled) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-ivory p-4 text-ink">
                <div className="flex items-center gap-2 font-display text-lg font-semibold"><Scale className="text-gold-deep" />Proposal · needs both signatures</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white p-2"><div className="text-xs text-ink-3">Cap</div><div className="num font-bold"><s className="text-ink-3">{pct(250)}%</s> → {pct(offer.capBp)}%</div></div><div className="rounded-xl bg-white p-2"><div className="text-xs text-ink-3">Rafiq owes</div><div className="num font-bold"><s className="text-ink-3">{grams(r.excessFine)}</s> → {grams(offer.karigarOwes)} g</div></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-bold">Read-back before signing:</span><Speak text={readback("hi")} /><span className="text-xs text-ink-3">(Rafiq hears it in Hindi{lang === "en" ? "" : ""})</span></div>
                <p className="mt-2 text-[15px] text-ink-2">{readback("hi")}</p>
                {settled ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-verdigris/15 p-3 font-bold text-verdigris"><PartyPopper size={20} />SETTLEMENT_SIGNED is in the chain. <Link href="/ledger" className="underline">See the new link</Link></div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button disabled={kSigned} onClick={() => sign("karigar")} className="btn btn-yes">{kSigned ? <><Check size={18} />Rafiq signed</> : <>Rafiq: हाँ</>}</button>
                    <button disabled={jSigned} onClick={() => sign("jeweller")} className="btn btn-gold">{jSigned ? <><Check size={18} />Mehta signed</> : <>Mehta: approve</>}</button>
                  </div>
                )}
                <p className="mt-2 text-xs text-ink-3">If either side rejects twice, the case goes to a Panch (a human both trust). Agents cannot sign, edit history, or move gold or money.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
      <p className="mt-4 text-xs text-ink-3">Demo mode: agent wording is a recorded fixture so the session is repeatable on stage; every figure in it is computed live by the engine from the entries cited, and checked by the guard you see.</p>
    </div>
  );
}
