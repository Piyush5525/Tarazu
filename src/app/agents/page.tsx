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
  steward: { name: { en: "Jeweller's Steward", hi: "सेठ का सहायक", bn: "মালিকের সহায়ক" }, for: { en: "speaks for Mehta Jewellers", hi: "मेहता ज्वैलर्स की तरफ़ से", bn: "মেহতা জুয়েলার্সের হয়ে" }, color: "#8e1b1b", icon: Store },
  advocate: { name: { en: "Karigar's Advocate", hi: "कारीगर का वकील", bn: "কারিগরের উকিল" }, for: { en: "speaks for Rafiq Ali", hi: "रफ़ीक़ अली की तरफ़ से", bn: "রফিক আলির হয়ে" }, color: "#1f6f5c", icon: Hammer },
  mediator: { name: { en: "Mediator", hi: "पंच", bn: "মধ্যস্থ" }, for: { en: "neutral · sees only entries both have signed", hi: "किसी की तरफ़ नहीं · सिर्फ़ दोनों के दस्तख़त वाली एंट्री देखता है", bn: "কারও পক্ষে নয় · শুধু দুজনের সই-করা এন্ট্রি দেখে" }, color: "#8a6418", icon: Gavel },
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
    { agent: "steward", tool: "get_orders(J-1043)", cites: [...ids("AGREEMENT_SET"), ...ids("ISSUE"), ...ids("RECEIVE_FINISHED"), ...ids("RECEIVE_SCRAP")], text: tr(lang, {
      en: `On J-1043 we issued ${grams(r.issuedFine)} g fine and received ${grams(r.finishedFine)} g finished plus ${grams(r.scrapFine)} g scrap. Loss is ${grams(r.lossFine)} g, that is ${pct(r.lossBp)}%. The agreed cap was ${pct(250)}%, so the excess is ${grams(r.excessFine)} g. We ask Rafiq to make that good.`,
      hi: `J-1043 में हमने ${grams(r.issuedFine)} ग्राम खरा सोना दिया। वापस मिला ${grams(r.finishedFine)} ग्राम तैयार गहना और ${grams(r.scrapFine)} ग्राम चूरा। छीजत ${grams(r.lossFine)} ग्राम हुई, यानी ${pct(r.lossBp)}%। तय सीमा ${pct(250)}% थी, इसलिए ${grams(r.excessFine)} ग्राम ज़्यादा घटा। हम चाहते हैं कि रफ़ीक़ यह भर दे।`,
      bn: `J-1043-এ আমরা ${grams(r.issuedFine)} গ্রাম খাঁটি সোনা দিয়েছি। ফেরত পেয়েছি ${grams(r.finishedFine)} গ্রাম তৈরি গয়না আর ${grams(r.scrapFine)} গ্রাম গুঁড়ো। ক্ষয় ${grams(r.lossFine)} গ্রাম, মানে ${pct(r.lossBp)}%। ঠিক করা সীমা ছিল ${pct(250)}%, তাই ${grams(r.excessFine)} গ্রাম বেশি কমেছে। আমরা চাই রফিক এটা পূরণ করুক।`,
    }) },
    { agent: "advocate", tool: `fair_band(${job.designClass})`, cites: ids("AGREEMENT_SET"), text: tr(lang, {
      en: `Rafiq does not dispute the weights. He disputes the cap. Across ${band.n} past jobs of this design class, loss ran from ${pct(band.p10)}% (P10) to ${pct(band.p90)}% (P90), median ${pct(band.p50)}%. His ${pct(r.lossBp)}% is inside that band. A ${pct(250)}% cap sits below P10: nine jobs in ten would have breached it.`,
      hi: `रफ़ीक़ को वज़न पर कोई एतराज़ नहीं। एतराज़ सीमा पर है। इस तरह के ${band.n} पुराने कामों में छीजत ${pct(band.p10)}% से ${pct(band.p90)}% के बीच रही, आम तौर पर ${pct(band.p50)}%। उसकी ${pct(r.lossBp)}% छीजत इसी दायरे में है। ${pct(250)}% की सीमा इतनी कम है कि दस में से नौ काम इसे पार कर जाते।`,
      bn: `ওজন নিয়ে রফিকের আপত্তি নেই। আপত্তি সীমা নিয়ে। এই ধরনের ${band.n}টা আগের কাজে ক্ষয় ছিল ${pct(band.p10)}% থেকে ${pct(band.p90)}%-এর মধ্যে, সাধারণত ${pct(band.p50)}%। তার ${pct(r.lossBp)}% ক্ষয় এই সীমার ভেতরেই। ${pct(250)}%-এর সীমা এত কম যে দশটার মধ্যে নয়টা কাজই তা পেরিয়ে যেত।`,
    }) },
    { agent: "mediator", tool: "propose_settlement(J-1043)", cites: [...ids("ISSUE"), ...ids("RECEIVE_FINISHED"), ...ids("RECEIVE_SCRAP")], text: tr(lang, {
      en: `Both books agree on every weight, so this is a fairness question, not an accounting one. Class: ${cls}. I propose settling at the median, ${pct(band.p50)}%. That allows ${grams(offer.capFine)} g, and Rafiq owes ${grams(offer.karigarOwes)} g instead of ${grams(r.excessFine)} g. This is a proposal only: it needs both signatures.`,
      hi: `दोनों बहियों में हर वज़न एक जैसा है, इसलिए यह हिसाब का नहीं, इंसाफ़ का सवाल है। मेरा सुझाव: आम छीजत ${pct(band.p50)}% पर निपटारा हो। इससे ${grams(offer.capFine)} ग्राम छीजत मंज़ूर होगी, और रफ़ीक़ को ${grams(r.excessFine)} ग्राम की जगह ${grams(offer.karigarOwes)} ग्राम देना होगा। यह सिर्फ़ सुझाव है: दोनों के दस्तख़त ज़रूरी हैं।`,
      bn: `দুই খাতায় প্রতিটা ওজন এক, তাই এটা হিসাবের নয়, ন্যায্যতার প্রশ্ন। আমার প্রস্তাব: সাধারণ ক্ষয় ${pct(band.p50)}%-এ মিটমাট হোক। তাতে ${grams(offer.capFine)} গ্রাম ক্ষয় মেনে নেওয়া হবে, আর রফিককে ${grams(r.excessFine)} গ্রামের বদলে ${grams(offer.karigarOwes)} গ্রাম দিতে হবে। এটা শুধু প্রস্তাব: দুজনের সই লাগবে।`,
    }) },
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
  const readback = (l: typeof lang) => tr(l, {
    en: `Proposal for job J-1043. The wastage limit changes from ${pct(250)} percent to ${pct(band.p50)} percent. Rafiq gives ${grams(offer.karigarOwes)} grams of pure gold instead of ${grams(r.excessFine)} grams. Do you agree?`,
    hi: `काम J-1043 का प्रस्ताव। छीजत की सीमा ${pct(250)} प्रतिशत से बदलकर ${pct(band.p50)} प्रतिशत होगी। रफ़ीक़ को ${grams(r.excessFine)} ग्राम की जगह ${grams(offer.karigarOwes)} ग्राम खरा सोना देना होगा। क्या तुम राज़ी हो?`,
    bn: `কাজ J-1043-এর প্রস্তাব। ক্ষয়ের সীমা ${pct(250)} শতাংশ থেকে বদলে ${pct(band.p50)} শতাংশ হবে। রফিককে ${grams(r.excessFine)} গ্রামের বদলে ${grams(offer.karigarOwes)} গ্রাম খাঁটি সোনা দিতে হবে। তুমি কি রাজি?`,
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
            <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{t({ en: "The balance", hi: "तराज़ू", bn: "দাঁড়িপাল্লা" })}</h2><span className={`chip ${settled ? "chip-ok" : "chip-warn"}`}>{settled ? <><Check size={14} />{t({ en: "Settled · both signed", hi: "निपट गया · दोनों के दस्तख़त", bn: "মিটে গেছে · দুজনের সই" })}</> : <>{t({ en: "In dispute", hi: "झगड़ा चल रहा है", bn: "বিবাদ চলছে" })}</>}</span></div>
            <Balance3D tilt={settled ? 0 : -0.7} leftBeads={9} rightBeads={settled ? 9 : 7} alert={!settled} sparkles={settled} className="-my-2 h-[270px] w-full" />
            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div><div className="text-xs font-bold text-ink-3">{t({ en: "Gold given (pure)", hi: "दिया गया सोना (खरा)", bn: "দেওয়া সোনা (খাঁটি)" })}</div><Grams mg={r.issuedFine} className="text-xl font-bold" /></div>
              <div><div className="text-xs font-bold text-ink-3">{t({ en: "Came back + scrap + allowed loss", hi: "वापस + चूरा + मंज़ूर छीजत", bn: "ফেরত + গুঁড়ো + অনুমোদিত ক্ষয়" })}</div><Grams mg={r.finishedFine + r.scrapFine + (settled ? offer.capFine : r.capFine)} className="text-xl font-bold" /></div>
            </div>
            <div className="mt-3 rounded-2xl bg-ivory-2/80 p-3 text-center"><div className="text-xs font-bold text-ink-3">{t({ en: "Rafiq has to give", hi: "रफ़ीक़ को देना है", bn: "রফিককে দিতে হবে" })}</div>
              <AnimatePresence mode="wait"><motion.div key={owes} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}><Grams mg={owes} className={`text-4xl font-bold ${settled ? "text-verdigris" : "text-terracotta"}`} /></motion.div></AnimatePresence>
            </div>
          </section>

          <section data-tara="band" className="card p-5">
            <h2 className="text-xl font-semibold">{t({ en: "How much loss is normal?", hi: "कितनी छीजत आम है?", bn: "কতটা ক্ষয় স্বাভাবিক?" })}</h2>
            <p className="text-sm text-ink-3">{DESIGN_CLASSES[job.designClass]} · {t({ en: `learned from ${band.n} finished jobs (demo history)`, hi: `${band.n} पूरे हुए कामों से सीखा (डेमो आँकड़े)`, bn: `${band.n}টা শেষ হওয়া কাজ থেকে শেখা (ডেমো তথ্য)` })}</p>
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
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[{ k: "P10", v: band.p10, n: t({ en: "low", hi: "कम से कम", bn: "কম" }) }, { k: "P50", v: band.p50, n: t({ en: "usual", hi: "आम तौर पर", bn: "সাধারণত" }) }, { k: "P90", v: band.p90, n: t({ en: "high", hi: "ज़्यादा से ज़्यादा", bn: "বেশি" }) }].map((b) => (
                <div key={b.k} className={`rounded-xl px-2 py-1.5 ${b.k === "P50" ? "bg-ink text-ivory" : "bg-verdigris/12 text-ink"}`}>
                  <div className="num text-base font-bold">{pct(b.v)}%</div>
                  <div className="text-[11px] font-semibold opacity-75">{b.k} · {b.n}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="chip chip-warn">{cls}</span><span className="text-sm text-ink-2">{t({ en: "The loss is normal. The limit was not. Tarazu flags limits that hurt the karigar as well as losses that hurt the jeweller.", hi: "छीजत आम है। सीमा ही ग़लत थी। तराज़ू वह सीमा भी पकड़ता है जो कारीगर को नुक़सान दे, और वह छीजत भी जो सेठ को।", bn: "ক্ষয় স্বাভাবিক। সীমাটাই ভুল ছিল। তরাজু সেই সীমাও ধরে যা কারিগরের ক্ষতি করে, আর সেই ক্ষয়ও যা মালিকের।" })}</span></div>
          </section>
        </div>

        <section className="card-ink flex flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-semibold">{t({ en: "The meeting, word for word", hi: "बैठक, शब्द-ब-शब्द", bn: "বৈঠক, কথায় কথায়" })}</h2>
            <span className="chip !border-white/20 !bg-white/10 !text-ivory"><ShieldCheck size={13} />{t({ en: "Number check on", hi: "अंक-जाँच चालू", bn: "সংখ্যা-যাচাই চালু" })}</span>
            <button onClick={() => { setShown(0); setPlaying(true); }} className="btn btn-gold ml-auto !min-h-12"><Play size={18} />{shown ? t({ en: "Replay", hi: "फिर चलाओ", bn: "আবার চালাও" }) : t({ en: "Start the session", hi: "बैठक शुरू करो", bn: "বৈঠক শুরু করো" })}</button>
          </div>
          <div className="mt-4 flex-1 space-y-4">
            {shown === 0 && !playing && <p className="py-10 text-center text-ivory/60">{t({ en: "Press Start. Each agent may use only its own tools, and may only say numbers those tools gave it.", hi: "शुरू दबाओ। हर एजेंट सिर्फ़ अपने औज़ार चला सकता है, और सिर्फ़ वही अंक बोल सकता है जो उन औज़ारों ने दिए।", bn: "শুরু টিপো। প্রত্যেক এজেন্ট শুধু নিজের যন্ত্র চালাতে পারে, আর শুধু সেই সংখ্যাই বলতে পারে যা যন্ত্র দিয়েছে।" })}</p>}
            {script.slice(0, shown).map((m, i) => {
              const w = WHO[m.agent], g = groundingGuard(m.text, facts);
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white/[0.07] p-4">
                  <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full text-white" style={{ background: w.color }}><w.icon size={18} /></span><div><div className="font-bold leading-tight">{t(w.name)}</div><div className="text-[11px] text-ivory/60">{t(w.for)}</div></div></div>
                  <div className="num mt-2 inline-flex items-center gap-1.5 rounded-md bg-black/40 px-2 py-1 text-[11px] text-gold-2"><Wrench size={12} />{m.tool}</div>
                  <p className="mt-2 text-[15px] leading-relaxed text-ivory/95">{m.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {m.cites.map((c) => <Link key={c} href="/ledger" className="num rounded-full border border-gold/50 px-2 py-0.5 text-[11px] font-bold text-gold-2 hover:bg-gold/20">{c}</Link>)}
                    <span className={`ml-auto inline-flex items-center gap-1 text-[11px] font-bold ${g.ok ? "text-emerald-300" : "text-red-300"}`}><ShieldCheck size={12} />{g.ok ? t({ en: "every number checked", hi: "हर अंक जाँचा गया", bn: "প্রতিটা সংখ্যা যাচাই করা" }) : `blocked: ${g.violations.join(", ")}`}</span>
                  </div>
                </motion.div>
              );
            })}
            {playing && shown < script.length && <div className="flex items-center gap-2 px-2 text-ivory/60"><span className="wave"><i /><i /><i /></span>{t(WHO[script[shown].agent].name)} {t({ en: "is checking the book…", hi: "बही देख रहा है…", bn: "খাতা দেখছে…" })}</div>}
            <div ref={end} />

            <div className="rounded-2xl border border-dashed border-white/20 p-3">
              <button onClick={() => setInject((v) => !v)} className="flex min-h-11 items-center gap-2 text-sm font-bold text-ivory/80"><Bug size={16} />{t({ en: "Demo: slip in a made-up number", hi: "डेमो: एक झूठा अंक डालकर देखो", bn: "ডেমো: একটা বানানো সংখ্যা ঢুকিয়ে দেখো" })}</button>
              <AnimatePresence>{inject && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="mt-2 rounded-xl bg-red-500/15 p-3 text-sm"><div className="flex items-center gap-2 font-bold text-red-300"><Ban size={15} />{t({ en: "Stopped before anyone saw it", hi: "किसी के देखने से पहले रोक दिया", bn: "কেউ দেখার আগেই আটকে দেওয়া হলো" })}</div><p className="mt-1 text-ivory/80 line-through">{hallucinated}</p><p className="mt-1 text-xs text-ivory/60">{t({ en: "This number came from no tool:", hi: "यह अंक किसी औज़ार से नहीं आया:", bn: "এই সংখ্যা কোনো যন্ত্র থেকে আসেনি:" })} <b className="num">{blocked.violations.join(", ")}</b>. {t({ en: "Logged and rewritten.", hi: "दर्ज करके दोबारा लिखा गया।", bn: "লিখে রেখে আবার লেখা হলো।" })}</p></div>
                </motion.div>)}</AnimatePresence>
            </div>
          </div>

          <AnimatePresence>
            {(shown >= script.length || settled) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl bg-ivory p-4 text-ink">
                <div className="flex items-center gap-2 font-display text-lg font-semibold"><Scale className="text-gold-deep" />{t({ en: "Proposal · needs both signatures", hi: "प्रस्ताव · दोनों के दस्तख़त चाहिए", bn: "প্রস্তাব · দুজনের সই লাগবে" })}</div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-white p-2"><div className="text-xs text-ink-3">{t({ en: "Wastage limit", hi: "छीजत की सीमा", bn: "ক্ষয়ের সীমা" })}</div><div className="num font-bold"><s className="text-ink-3">{pct(250)}%</s> → {pct(offer.capBp)}%</div></div><div className="rounded-xl bg-white p-2"><div className="text-xs text-ink-3">{t({ en: "Rafiq has to give", hi: "रफ़ीक़ को देना है", bn: "রফিককে দিতে হবে" })}</div><div className="num font-bold"><s className="text-ink-3">{grams(r.excessFine)}</s> → {grams(offer.karigarOwes)} g</div></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm"><span className="font-bold">{t({ en: "Read aloud before signing:", hi: "दस्तख़त से पहले पढ़कर सुनाया जाता है:", bn: "সইয়ের আগে পড়ে শোনানো হয়:" })}</span><Speak text={readback(lang)} /></div>
                <p className="mt-2 text-[15px] text-ink-2">{readback(lang)}</p>
                {settled ? (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-verdigris/15 p-3 font-bold text-verdigris"><PartyPopper size={20} /><span>{t({ en: "Settled. SETTLEMENT_SIGNED is in the chain.", hi: "निपट गया। SETTLEMENT_SIGNED ज़ंजीर में जुड़ गया।", bn: "মিটে গেছে। SETTLEMENT_SIGNED শিকলে যোগ হলো।" })} <Link href="/ledger" className="underline">{t({ en: "See the new link", hi: "नई कड़ी देखो", bn: "নতুন কড়া দেখো" })}</Link></span></div>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button disabled={kSigned} onClick={() => sign("karigar")} className="btn btn-yes">{kSigned ? <><Check size={18} />{t({ en: "Rafiq signed", hi: "रफ़ीक़ ने किया", bn: "রফিক সই করেছে" })}</> : <>{t({ en: "Rafiq: yes", hi: "रफ़ीक़: हाँ", bn: "রফিক: হ্যাঁ" })}</>}</button>
                    <button disabled={jSigned} onClick={() => sign("jeweller")} className="btn btn-gold">{jSigned ? <><Check size={18} />{t({ en: "Mehta signed", hi: "मेहता ने किया", bn: "মেহতা সই করেছে" })}</> : <>{t({ en: "Mehta: approve", hi: "मेहता: मंज़ूर", bn: "মেহতা: রাজি" })}</>}</button>
                  </div>
                )}
                <p className="mt-2 text-xs text-ink-3">{t({ en: "If either side says no twice, the case goes to a Panch, a person both trust. Agents cannot sign, change old entries, or move gold or money.", hi: "अगर कोई दो बार ना कहे, तो मामला पंच के पास जाता है, जिस पर दोनों भरोसा करते हैं। एजेंट न दस्तख़त कर सकते हैं, न पुरानी एंट्री बदल सकते हैं, न सोना या पैसा हिला सकते हैं।", bn: "কেউ দুবার না বললে মামলা যায় পঞ্চের কাছে, যাকে দুজনেই ভরসা করে। এজেন্ট সই করতে, পুরনো এন্ট্রি বদলাতে, বা সোনা-টাকা সরাতে পারে না।" })}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
      <p className="mt-4 text-xs text-ink-3">{t({ en: "Demo: the agents' wording is pre-written so the session repeats exactly on stage. Every number in it is worked out live from the entries shown, and checked.", hi: "डेमो: एजेंटों के शब्द पहले से लिखे हैं ताकि मंच पर हर बार एक जैसा चले। उनका हर अंक दिखाई गई एंट्री से अभी निकाला और जाँचा जाता है।", bn: "ডেমো: এজেন্টদের কথা আগে থেকে লেখা, যাতে মঞ্চে প্রতিবার একই রকম চলে। এর প্রতিটা সংখ্যা দেখানো এন্ট্রি থেকে এখনই বের করে যাচাই করা হয়।" })}</p>
    </div>
  );
}
