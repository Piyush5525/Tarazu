"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BadgeIndianRupee, CalendarHeart, Check, FileSignature, Hourglass, Info, PackageCheck, Stamp, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DemoNote, Grams, Guide, PageHead, Ring } from "@/components/ui";
import { payClocks, useFacts } from "@/lib/facts";
import { useT } from "@/lib/i18n";
import { classify, fairBand, simulateSchedule } from "@/lib/ledger/analytics";
import { daySeal, holdingFine, reconcile, type LedgerEvent } from "@/lib/ledger/engine";
import { DESIGN_CLASSES, KARIGARS } from "@/lib/ledger/seed";
import { grams, pct, rupees } from "@/lib/ledger/units";
import { useStore } from "@/lib/store";

const what = (e: LedgerEvent) =>
  e.type === "ADJUSTMENT" ? `Correction +${grams(e.payload.fineMg ?? 0)} g fine (ref ${e.payload.refEventId})`
  : e.type === "SETTLEMENT_SIGNED" ? `Settlement at ${pct(e.payload.capBp ?? 0)}% cap, karigar owes ${grams(e.payload.fineMg ?? 0)} g fine`
  : e.type === "PAYMENT_MADE" ? `Labour paid ${rupees(e.payload.amountPaise ?? 0)}`
  : `${e.type.replace("_", " ")} ${grams(e.payload.netMg ?? 0)} g @ ${pct(e.payload.purityBp ?? 0)}%`;

export default function JewellerPage() {
  const t = useT();
  const { chain, pending, jobs, history, signPending, propose, rebalance, setRebalance } = useStore();
  const f = useFacts();
  const [seal, setSeal] = useState<{ root: string; count: number; day: string } | null>(null);

  const out = KARIGARS.reduce((a, k) => a + holdingFine(k.id, jobs, chain), 0);
  const forMe = pending.filter((p) => p.sigKarigar && !p.sigJeweller);
  const forKarigar = pending.filter((p) => !p.sigKarigar);
  const disputes = jobs.filter((j) => j.status === "RETURNED" && chain.some((e) => e.jobId === j.id && e.type === "DISPUTE_OPENED")).length;
  const bride = jobs.find((j) => j.id === "J-1042")!;
  const brideRecon = reconcile(bride, chain);
  const returnPending = pending.some((p) => p.jobId === "J-1042" && p.type === "RECEIVE_FINISHED");
  const plus = [1, 2].map((d) => simulateSchedule({ daysAvailable: 12 + d, karigarLoad: 4, split: rebalance === "accepted" }).onTimeBp);

  const countersign = (id: string) => {
    signPending(id, "jeweller");
    const c = useStore.getState().chain;
    setSeal(daySeal(c, c[c.length - 1].ts));
  };

  return (
    <div>
      <PageHead kicker="Mehta Jewellers · Johari Bazaar, Jaipur" title={t({ en: "Jeweller Console", hi: "सेठ की मेज़", bn: "মালিকের টেবিল" })} sub={t({ en: "Every number here is computed by the ledger engine from co-signed entries.", hi: "यहाँ का हर अंक दोनों के दस्तख़त वाली एंट्री से इंजन निकालता है।", bn: "এখানকার প্রতিটা সংখ্যা দুজনের সই-করা এন্ট্রি থেকে ইঞ্জিন বের করে।" })} />

      <Guide steps={[
        { en: "Countersign entries your karigars have already signed.", hi: "जिन एंट्री पर कारीगर दस्तख़त कर चुका है, उन पर अपने दस्तख़त करो।", bn: "কারিগর যে এন্ট্রিতে সই করেছে, তাতে নিজের সই দাও।" },
        { en: "Check the wedding order. If it is below 80%, share the work.", hi: "शादी का ऑर्डर देखो। 80% से कम हो तो काम बाँटो।", bn: "বিয়ের অর্ডার দেখো। 80%-এর কম হলে কাজ ভাগ করো।" },
        { en: "Pay labour that has turned red, and settle flagged jobs.", hi: "जो मज़दूरी लाल हो गई है वह चुकाओ, और निशान लगे काम निपटाओ।", bn: "যে মজুরি লাল হয়েছে তা মেটাও, আর চিহ্নিত কাজ মিটিয়ে ফেলো।" },
      ]} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { icon: Users, label: "Gold out with karigars", v: <Grams mg={out} /> },
          { icon: PackageCheck, label: "Open orders", v: jobs.filter((j) => j.status === "OPEN").length },
          { icon: FileSignature, label: "Awaiting your signature", v: forMe.length, hot: forMe.length > 0 },
          { icon: AlertTriangle, label: "Open disputes", v: disputes, hot: disputes > 0 },
          { icon: BadgeIndianRupee, label: "Your payer score (median days)", v: f.payerDays },
        ].map((k, i) => (
          <div key={i} className={`card p-4 ${k.hot ? "!border-gold border-2" : ""} ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
            <k.icon size={20} className="text-gold-deep" />
            <div className="num mt-1 text-3xl font-bold">{k.v}</div>
            <div className="text-xs font-semibold text-ink-3">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <section className="card p-5">
          <h2 className="flex items-center gap-2 text-2xl font-semibold"><Stamp className="text-bahi" />Countersign queue</h2>
          <p className="text-sm text-ink-3">Pending entries are visible to both sides and excluded from every balance. They expire in 24h.</p>
          {forMe.length + forKarigar.length === 0 && <div className="mt-4 rounded-2xl bg-ivory-2/70 p-6 text-center text-ink-3"><Check className="mx-auto mb-1" />Nothing waiting. Record gold from <Link className="font-bold text-bahi underline" href="/karigar">the karigar&apos;s book</Link> to see an entry arrive.</div>}
          <AnimatePresence>
            {forMe.map((e) => (
              <motion.div key={e.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold bg-gold-2/15 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="chip chip-bahi">{e.id}</span><span className="chip">{e.jobId}</span><span className="chip chip-ok"><UserCheck size={13} />{KARIGARS.find((k) => k.id === e.karigarId)?.name} signed</span></div>
                  <div className="mt-1 font-bold">{what(e)}</div>
                </div>
                <button onClick={() => countersign(e.id)} className="btn btn-gold"><Stamp size={20} />Countersign</button>
              </motion.div>
            ))}
          </AnimatePresence>
          {forKarigar.map((e) => (
            <div key={e.id} className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-white/60 p-4"><Hourglass className="text-gold-deep" /><div><div className="font-bold">{what(e)}</div><div className="text-sm text-ink-3">{e.id} · {e.jobId} · waiting for {KARIGARS.find((k) => k.id === e.karigarId)?.name} to confirm on his phone</div></div></div>
          ))}
          <AnimatePresence>
            {seal && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-ink mt-4 p-4">
                <div className="flex items-center gap-2 font-bold text-gold-2"><Stamp size={18} />Day Seal updated · {seal.day} · {seal.count} entries</div>
                <div className="num mt-1 break-all text-xs text-ivory/80">{seal.root}</div>
                <div className="mt-1 text-xs text-ivory/60">Merkle root of today&apos;s final entries. Both parties receive the same seal. <Link href="/ledger" className="underline">Open the ledger</Link></div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="card p-5" data-tara="guardian">
          <h2 className="flex items-center gap-2 text-2xl font-semibold"><CalendarHeart className="text-terracotta" />Deadline Guardian</h2>
          <p className="text-sm text-ink-3">Aarti&apos;s wedding · J-1042 · {f.daysToWedding} days left · stage: setting → polish → hallmark (2 working days) → delivery</p>
          <div className="mt-3 flex items-center gap-5">
            <Ring bp={f.sim.onTimeBp} label="on time" />
            <div className="text-sm">
              <div className={`chip ${f.sim.onTimeBp < 8000 ? "chip-warn" : "chip-ok"}`}>{f.sim.onTimeBp < 8000 ? "Below 80%. Act now." : "Protected"}</div>
              <div className="mt-2 text-ink-2">{f.sim.runs.toLocaleString()} seeded simulations<br />typical finish: day <b className="num">{f.sim.p50Days}</b>, slow case: day <b className="num">{f.sim.p90Days}</b></div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <div className="font-bold">1. Move the earrings to Suresh Soni</div>
              <div className="text-sm text-ink-2">Bablu has 4 open orders; Suresh has capacity. Never reassigned silently: Suresh must accept.</div>
              {rebalance === "none" && <button onClick={() => setRebalance("requested")} className="btn btn-ink mt-3 w-full">Ask Suresh</button>}
              {rebalance === "requested" && <button onClick={() => setRebalance("accepted")} className="btn btn-yes mt-3 w-full"><Check size={20} />On Suresh&apos;s phone: “हाँ, मैं ले लूँगा”</button>}
              {rebalance === "accepted" && <div className="chip chip-ok mt-3"><Check size={14} />Accepted by Suresh. Simulation re-run.</div>}
            </div>
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <div className="font-bold">2. Tell the customer early, with date options</div>
              <div className="mt-1 text-sm text-ink-2">Delivery one day later: <b className="num">{Math.round(plus[0] / 100)}%</b> · two days later: <b className="num">{Math.round(plus[1] / 100)}%</b></div>
              <Link href="/track" className="mt-2 inline-block text-sm font-bold text-bahi underline">See what Aarti sees</Link>
            </div>
          </div>
          <DemoNote>Stage durations are demo configuration values, not field measurements.</DemoNote>
        </section>
      </div>

      <section className="card mt-5 p-5">
        <h2 className="text-2xl font-semibold">Karigars</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {KARIGARS.map((k) => {
            const clocks = payClocks(chain, k.id, f.now);
            const paying = pending.some((p) => p.type === "PAYMENT_MADE" && p.karigarId === k.id);
            return (
              <div key={k.id} className="rounded-2xl border border-line bg-white/70 p-4">
                <div className="flex items-center gap-3"><span className="gold-fill grid h-12 w-12 place-items-center rounded-full font-display text-xl font-semibold">{k.name[0]}</span><div><div className="font-bold">{k.name}</div><div className="text-xs text-ink-3">{k.nameLocal} · {k.tier} · since {k.since}</div></div></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><div className="text-xs text-ink-3">Holding (fine)</div><Grams mg={holdingFine(k.id, jobs, chain)} className="text-lg font-bold" /></div><div><div className="text-xs text-ink-3">Open jobs</div><div className="num text-lg font-bold">{jobs.filter((j) => j.karigarId === k.id && j.status === "OPEN").length}</div></div></div>
                {clocks.map((c) => (
                  <div key={c.eventId} className={`mt-3 rounded-xl p-3 text-sm ${c.late ? "bg-terracotta/10" : "bg-ivory-2"}`}>
                    <div className={`font-bold ${c.late ? "text-terracotta" : ""}`}>{rupees(c.amountPaise)} labour · {c.jobId} · day {c.elapsedDays} of {c.promisedDays}</div>
                    <button disabled={paying} onClick={() => propose("PAYMENT_MADE", c.jobId, k.id, { amountPaise: c.amountPaise, note: "mock UPI" }, "jeweller")} className="btn btn-ink mt-2 w-full !min-h-12">{paying ? "Waiting for karigar to confirm receipt" : "Pay now (mock UPI)"}</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">Orders &amp; reconciliation</h2>
          <button disabled={brideRecon.issuedFine === 0 || brideRecon.finishedFine > 0 || returnPending} onClick={() => { propose("RECEIVE_FINISHED", "J-1042", "bablu", { netMg: 238_400, purityBp: 9160 }, "jeweller"); propose("RECEIVE_SCRAP", "J-1042", "bablu", { netMg: 7_100, purityBp: 8500 }, "jeweller"); }} className="btn btn-ghost !min-h-12 text-sm">
            <PackageCheck size={18} />Receive J-1042 back (238.400 g + 7.100 g scrap)
          </button>
        </div>
        <div className="scroll-x mt-3">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">{["Job", "Karigar", "Item", "Issued", "Finished", "Scrap", "Loss", "Cap", "Excess", "Fairness", ""].map((h) => <th key={h} className="px-2 py-2 font-bold">{h}</th>)}</tr></thead>
            <tbody>
              {jobs.slice().reverse().map((j) => {
                const r = reconcile(j, chain);
                const band = fairBand(history, j.designClass);
                const cls = r.finishedFine > 0 ? classify(r.lossBp, r.capBp, band) : null;
                return (
                  <tr key={j.id} className="border-b border-line/60">
                    <td className="num px-2 py-3 font-bold">{j.id}</td>
                    <td className="px-2">{KARIGARS.find((k) => k.id === j.karigarId)?.name}</td>
                    <td className="px-2">{j.item}<div className="text-xs text-ink-3">{DESIGN_CLASSES[j.designClass]}</div></td>
                    <td className="num px-2">{grams(r.issuedFine)}</td>
                    <td className="num px-2">{r.finishedFine ? grams(r.finishedFine + r.adjustFine) : "—"}</td>
                    <td className="num px-2">{r.scrapFine ? grams(r.scrapFine) : "—"}</td>
                    <td className="num px-2">{r.finishedFine ? `${grams(r.lossFine)} (${pct(r.lossBp)}%)` : "—"}</td>
                    <td className="num px-2">{pct(r.capBp)}%</td>
                    <td className={`num px-2 font-bold ${r.finishedFine && r.excessFine > 0 ? "text-terracotta" : "text-verdigris"}`}>{r.finishedFine ? grams(r.excessFine) : "—"}</td>
                    <td className="px-2">{cls && <span className={`chip ${cls === "WITHIN_BAND" ? "chip-ok" : "chip-warn"}`}>{cls}</span>}</td>
                    <td className="px-2">{j.status === "RETURNED" && cls === "CAP_UNREALISTIC" && <Link href="/agents" className="font-bold text-bahi underline">Resolve</Link>}{j.status === "SETTLED" && <span className="chip chip-ok">Settled</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-3"><Info size={14} className="mt-0.5 shrink-0" />All weights are fine (purity-adjusted) grams. Informational: job-work is a taxable service, and metal retained beyond actual loss may be treated as consideration. Rates are configuration, nothing is filed automatically. Verify with a CA.</p>
      </section>
    </div>
  );
}
