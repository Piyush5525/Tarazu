"use client";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BadgeIndianRupee, CalendarHeart, Check, FileSignature, Hourglass, Info, PackageCheck, Stamp, UserCheck, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DemoNote, Grams, Guide, PageHead, Ring } from "@/components/ui";
import { payClocks, useFacts } from "@/lib/facts";
import { tr, useT } from "@/lib/i18n";
import { classify, fairBand, simulateSchedule } from "@/lib/ledger/analytics";
import { daySeal, holdingFine, reconcile, type LedgerEvent } from "@/lib/ledger/engine";
import { DESIGN_CLASSES, itemName, KARIGARS } from "@/lib/ledger/seed";
import { grams, pct, rupees } from "@/lib/ledger/units";
import { useStore, type Lang } from "@/lib/store";

/** One line describing a pending entry, in the reader's language. */
const what = (e: LedgerEvent, lang: Lang) => {
  const g = grams(e.payload.netMg ?? 0), f = grams(e.payload.fineMg ?? 0), p = pct(e.payload.purityBp ?? 0);
  switch (e.type) {
    case "ADJUSTMENT": return tr(lang, { en: `Correction: +${f} g pure (ref ${e.payload.refEventId})`, hi: `सुधार: +${f} ग्राम खरा (देखो ${e.payload.refEventId})`, bn: `সংশোধন: +${f} গ্রাম খাঁটি (দেখো ${e.payload.refEventId})` });
    case "SETTLEMENT_SIGNED": return tr(lang, { en: `Settlement at ${pct(e.payload.capBp ?? 0)}% limit; karigar gives ${f} g pure`, hi: `${pct(e.payload.capBp ?? 0)}% सीमा पर निपटारा; कारीगर ${f} ग्राम खरा देगा`, bn: `${pct(e.payload.capBp ?? 0)}% সীমায় মিটমাট; কারিগর ${f} গ্রাম খাঁটি দেবে` });
    case "PAYMENT_MADE": return tr(lang, { en: `Labour paid ${rupees(e.payload.amountPaise ?? 0)}`, hi: `मज़दूरी दी ${rupees(e.payload.amountPaise ?? 0)}`, bn: `মজুরি দেওয়া ${rupees(e.payload.amountPaise ?? 0)}` });
    case "ISSUE": return tr(lang, { en: `Gold given: ${g} g @ ${p}%`, hi: `सोना दिया: ${g} ग्राम @ ${p}%`, bn: `সোনা দেওয়া: ${g} গ্রাম @ ${p}%` });
    case "RECEIVE_FINISHED": return tr(lang, { en: `Finished piece back: ${g} g @ ${p}%`, hi: `तैयार गहना वापस: ${g} ग्राम @ ${p}%`, bn: `তৈরি গয়না ফেরত: ${g} গ্রাম @ ${p}%` });
    case "RECEIVE_SCRAP": return tr(lang, { en: `Scrap back: ${g} g @ ${p}%`, hi: `चूरा वापस: ${g} ग्राम @ ${p}%`, bn: `গুঁড়ো ফেরত: ${g} গ্রাম @ ${p}%` });
    default: return `${e.type.replaceAll("_", " ")} ${g} g`;
  }
};

export default function JewellerPage() {
  const t = useT();
  const { chain, pending, jobs, history, signPending, propose, rebalance, setRebalance, lang } = useStore();
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
          { icon: Users, label: t({ en: "Gold out with karigars", hi: "कारीगरों के पास सोना", bn: "কারিগরদের কাছে সোনা" }), v: <Grams mg={out} /> },
          { icon: PackageCheck, label: t({ en: "Open orders", hi: "चालू ऑर्डर", bn: "চালু অর্ডার" }), v: jobs.filter((j) => j.status === "OPEN").length },
          { icon: FileSignature, label: t({ en: "Waiting for your signature", hi: "आपके दस्तख़त बाक़ी", bn: "আপনার সই বাকি" }), v: forMe.length, hot: forMe.length > 0 },
          { icon: AlertTriangle, label: t({ en: "Open disputes", hi: "चालू झगड़े", bn: "চলতি বিবাদ" }), v: disputes, hot: disputes > 0 },
          { icon: BadgeIndianRupee, label: t({ en: "Your payer score: usual days to pay", hi: "आपका भुगतान स्कोर: आम तौर पर कितने दिन में", bn: "আপনার পেমেন্ট স্কোর: সাধারণত কত দিনে" }), v: f.payerDays },
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
          <h2 className="flex items-center gap-2 text-2xl font-semibold"><Stamp className="text-bahi" />{t({ en: "Entries to countersign", hi: "दस्तख़त के लिए एंट्री", bn: "সইয়ের জন্য এন্ট্রি" })}</h2>
          <p className="text-sm text-ink-3">{t({ en: "Both sides can see a pending entry, but it counts in no balance until both have signed. It expires in 24 hours.", hi: "अधूरी एंट्री दोनों को दिखती है, पर दोनों के दस्तख़त तक किसी हिसाब में नहीं गिनी जाती। 24 घंटे में ख़त्म हो जाती है।", bn: "অসম্পূর্ণ এন্ট্রি দুজনেই দেখে, কিন্তু দুজনের সই না হলে কোনো হিসাবে ধরা হয় না। 24 ঘণ্টায় শেষ হয়ে যায়।" })}</p>
          {forMe.length + forKarigar.length === 0 && <div className="mt-4 rounded-2xl bg-ivory-2/70 p-6 text-center text-ink-3"><Check className="mx-auto mb-1" />{t({ en: "Nothing is waiting. When a karigar records gold, it appears here.", hi: "अभी कुछ बाक़ी नहीं। कारीगर सोना दर्ज करेगा तो यहाँ दिखेगा।", bn: "এখন কিছু বাকি নেই। কারিগর সোনা লিখলে এখানে দেখা যাবে।" })}<br /><Link className="inline-flex min-h-11 items-center font-bold text-bahi underline" href="/karigar">{t({ en: "Open the karigar's book", hi: "कारीगर का खाता खोलो", bn: "কারিগরের খাতা খোলো" })}</Link></div>}
          <AnimatePresence>
            {forMe.map((e) => (
              <motion.div key={e.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border-2 border-gold bg-gold-2/15 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="chip chip-bahi">{e.id}</span><span className="chip">{e.jobId}</span><span className="chip chip-ok"><UserCheck size={13} />{KARIGARS.find((k) => k.id === e.karigarId)?.name} {t({ en: "signed", hi: "ने दस्तख़त किए", bn: "সই করেছে" })}</span></div>
                  <div className="mt-1 font-bold">{what(e, lang)}</div>
                </div>
                <button onClick={() => countersign(e.id)} data-act="countersign" className="btn btn-gold w-full sm:w-auto"><Stamp size={20} />{t({ en: "Countersign", hi: "दस्तख़त करो", bn: "সই করো" })}</button>
              </motion.div>
            ))}
          </AnimatePresence>
          {forKarigar.map((e) => (
            <div key={e.id} className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-white/60 p-4"><Hourglass className="text-gold-deep" /><div><div className="font-bold">{what(e, lang)}</div><div className="text-sm text-ink-3">{e.id} · {e.jobId} · {t({ en: `waiting for ${KARIGARS.find((k) => k.id === e.karigarId)?.name} to say yes on his phone`, hi: `${KARIGARS.find((k) => k.id === e.karigarId)?.name} की फ़ोन पर हाँ का इंतज़ार`, bn: `${KARIGARS.find((k) => k.id === e.karigarId)?.name}-এর ফোনে হ্যাঁ-র অপেক্ষা` })}</div></div></div>
          ))}
          <AnimatePresence>
            {seal && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-ink mt-4 p-4">
                <div className="flex items-center gap-2 font-bold text-gold-2"><Stamp size={18} />{t({ en: "Day Seal updated", hi: "दिन की मुहर बदली", bn: "দিনের সিল বদলেছে" })} · {seal.day} · {seal.count} {t({ en: "entries", hi: "एंट्री", bn: "এন্ট্রি" })}</div>
                <div className="num mt-1 break-all text-xs text-ivory/80">{seal.root}</div>
                <div className="mt-1 text-xs text-ivory/60">{t({ en: "One code for all of today's entries. Both sides get the same seal.", hi: "आज की सारी एंट्री का एक कोड। दोनों को एक ही मुहर मिलती है।", bn: "আজকের সব এন্ট্রির একটা কোড। দুজনেই একই সিল পায়।" })} <Link href="/ledger" className="underline">{t({ en: "Open the ledger", hi: "बही खोलो", bn: "খাতা খোলো" })}</Link></div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="card p-5" data-tara="guardian">
          <h2 className="flex items-center gap-2 text-2xl font-semibold"><CalendarHeart className="text-terracotta" />{t({ en: "Wedding date guard", hi: "शादी की तारीख़ का पहरा", bn: "বিয়ের তারিখের পাহারা" })}</h2>
          <p className="text-sm text-ink-3">{t({ en: `Aarti's wedding · J-1042 · ${f.daysToWedding} days left · still to do: setting → polish → hallmark (2 working days) → delivery`, hi: `आरती की शादी · J-1042 · ${f.daysToWedding} दिन बाक़ी · बाक़ी काम: जड़ाई → पॉलिश → हॉलमार्क (2 कामकाजी दिन) → डिलीवरी`, bn: `আরতির বিয়ে · J-1042 · ${f.daysToWedding} দিন বাকি · বাকি কাজ: পাথর বসানো → পালিশ → হলমার্ক (2 কাজের দিন) → ডেলিভারি` })}</p>
          <div className="mt-3 flex items-center gap-5">
            <Ring bp={f.sim.onTimeBp} label="on time" />
            <div className="text-sm">
              <div className={`chip whitespace-nowrap ${f.sim.onTimeBp < 8000 ? "chip-warn" : "chip-ok"}`}>{f.sim.onTimeBp < 8000 ? t({ en: "At risk. Act now.", hi: "ख़तरा। अभी कुछ करो।", bn: "ঝুঁকি। এখনই কিছু করো।" }) : t({ en: "Protected", hi: "सुरक्षित", bn: "সুরক্ষিত" })}</div>
              <div className="mt-2 text-ink-2">{t({ en: `worked out ${f.sim.runs.toLocaleString()} times`, hi: `${f.sim.runs.toLocaleString()} बार हिसाब लगाया`, bn: `${f.sim.runs.toLocaleString()} বার হিসাব করা` })}<br />{t({ en: "usually ready by day", hi: "आम तौर पर तैयार, दिन", bn: "সাধারণত তৈরি, দিন" })} <b className="num">{f.sim.p50Days}</b>, {t({ en: "slow case day", hi: "देर हुई तो दिन", bn: "দেরি হলে দিন" })} <b className="num">{f.sim.p90Days}</b></div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <div className="font-bold">1. {t({ en: "Give the earrings to Suresh Soni", hi: "झुमके सुरेश सोनी को दो", bn: "দুল সুরেশ সোনিকে দাও" })}</div>
              <div className="text-sm text-ink-2">{t({ en: "Bablu has 4 open orders; Suresh has time. Nobody is moved silently: Suresh must say yes.", hi: "बबलू के पास 4 काम हैं; सुरेश के पास समय है। चुपके से काम नहीं बदलता: सुरेश की हाँ ज़रूरी है।", bn: "বাবলুর হাতে 4টা কাজ; সুরেশের সময় আছে। চুপিচুপি কাজ বদলায় না: সুরেশের হ্যাঁ লাগবে।" })}</div>
              {rebalance === "none" && <button onClick={() => setRebalance("requested")} data-act="ask-suresh" className="btn btn-ink mt-3 w-full">{t({ en: "Ask Suresh", hi: "सुरेश से पूछो", bn: "সুরেশকে জিজ্ঞেস করো" })}</button>}
              {rebalance === "requested" && <button onClick={() => setRebalance("accepted")} className="btn btn-yes mt-3 w-full"><Check size={20} />{t({ en: "On Suresh's phone: “Yes, I'll take it”", hi: "सुरेश के फ़ोन पर: “हाँ, मैं ले लूँगा”", bn: "সুরেশের ফোনে: “হ্যাঁ, আমি নেব”" })}</button>}
              {rebalance === "accepted" && <div className="chip chip-ok mt-3"><Check size={14} />{t({ en: "Suresh said yes. Worked out again.", hi: "सुरेश ने हाँ कहा। फिर से हिसाब लगाया।", bn: "সুরেশ হ্যাঁ বলেছে। আবার হিসাব হলো।" })}</div>}
            </div>
            <div className="rounded-2xl border border-line bg-white/70 p-4">
              <div className="font-bold">2. {t({ en: "Tell the customer early, with other dates", hi: "ग्राहक को पहले बताओ, दूसरी तारीख़ों के साथ", bn: "খদ্দেরকে আগে জানাও, অন্য তারিখসহ" })}</div>
              <div className="mt-1 text-sm text-ink-2">{t({ en: "One day later", hi: "एक दिन बाद", bn: "এক দিন পরে" })}: <b className="num">{Math.round(plus[0] / 100)}%</b> · {t({ en: "two days later", hi: "दो दिन बाद", bn: "দুই দিন পরে" })}: <b className="num">{Math.round(plus[1] / 100)}%</b></div>
              <Link href="/track" className="mt-1 inline-flex min-h-11 items-center text-sm font-bold text-bahi underline">{t({ en: "See what Aarti sees", hi: "आरती को क्या दिखता है, देखो", bn: "আরতি কী দেখে, দেখো" })}</Link>
            </div>
          </div>
          <DemoNote>{t({ en: "Stage times are demo settings, not field measurements.", hi: "काम के दिन डेमो के लिए तय हैं, असली नाप नहीं।", bn: "কাজের দিন ডেমোর জন্য ঠিক করা, আসল মাপ নয়।" })}</DemoNote>
        </section>
      </div>

      <section className="card mt-5 p-5">
        <h2 className="text-2xl font-semibold">{t({ en: "Your karigars", hi: "आपके कारीगर", bn: "আপনার কারিগররা" })}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {KARIGARS.map((k) => {
            const clocks = payClocks(chain, k.id, f.now);
            const paying = pending.some((p) => p.type === "PAYMENT_MADE" && p.karigarId === k.id);
            return (
              <div key={k.id} className="rounded-2xl border border-line bg-white/70 p-4">
                <div className="flex items-center gap-3"><span className="gold-fill grid h-12 w-12 place-items-center rounded-full font-display text-xl font-semibold">{k.name[0]}</span><div><div className="font-bold">{k.name}</div><div className="text-xs text-ink-3">{k.nameLocal} · {k.tier} · since {k.since}</div></div></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><div className="text-xs text-ink-3">{t({ en: "Gold with him (pure)", hi: "उसके पास सोना (खरा)", bn: "তার কাছে সোনা (খাঁটি)" })}</div><Grams mg={holdingFine(k.id, jobs, chain)} className="text-lg font-bold" /></div><div><div className="text-xs text-ink-3">{t({ en: "Open jobs", hi: "चालू काम", bn: "চালু কাজ" })}</div><div className="num text-lg font-bold">{jobs.filter((j) => j.karigarId === k.id && j.status === "OPEN").length}</div></div></div>
                {clocks.map((c) => (
                  <div key={c.eventId} className={`mt-3 rounded-xl p-3 text-sm ${c.late ? "bg-terracotta/10" : "bg-ivory-2"}`}>
                    <div className={`font-bold ${c.late ? "text-terracotta" : ""}`}>{rupees(c.amountPaise)} {t({ en: "labour", hi: "मज़दूरी", bn: "মজুরি" })} · {c.jobId} · {t({ en: `day ${c.elapsedDays} of ${c.promisedDays}`, hi: `${c.promisedDays} में से ${c.elapsedDays}वाँ दिन`, bn: `${c.promisedDays}-এর মধ্যে ${c.elapsedDays} নম্বর দিন` })}</div>
                    <button disabled={paying} onClick={() => propose("PAYMENT_MADE", c.jobId, k.id, { amountPaise: c.amountPaise, note: "mock UPI" }, "jeweller")} className="btn btn-ink mt-2 w-full !min-h-12">{paying ? t({ en: "Waiting for him to confirm", hi: "उसकी हाँ का इंतज़ार", bn: "তার হ্যাঁ-র অপেক্ষা" }) : t({ en: "Pay now (demo UPI)", hi: "अभी चुकाओ (डेमो UPI)", bn: "এখনই দাও (ডেমো UPI)" })}</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">{t({ en: "Every order, weighed", hi: "हर ऑर्डर का हिसाब", bn: "প্রতিটা অর্ডারের হিসাব" })}</h2>
          <button disabled={brideRecon.issuedFine === 0 || brideRecon.finishedFine > 0 || returnPending} onClick={() => { propose("RECEIVE_FINISHED", "J-1042", "bablu", { netMg: 238_400, purityBp: 9160 }, "jeweller"); propose("RECEIVE_SCRAP", "J-1042", "bablu", { netMg: 7_100, purityBp: 8500 }, "jeweller"); }} className="btn btn-ghost !min-h-12 text-sm">
            <PackageCheck size={18} />{t({ en: "Receive J-1042 back (238.400 g + 7.100 g scrap)", hi: "J-1042 वापस लो (238.400 ग्राम + 7.100 ग्राम चूरा)", bn: "J-1042 ফেরত নাও (238.400 গ্রাম + 7.100 গ্রাম গুঁড়ো)" })}
          </button>
        </div>
        <div className="scroll-x mt-3">
          <table className="w-full min-w-[900px] text-sm [&_td]:whitespace-nowrap [&_td]:py-2.5">
            <thead><tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">{[
              { en: "Job", hi: "काम", bn: "কাজ" }, { en: "Karigar", hi: "कारीगर", bn: "কারিগর" }, { en: "Item", hi: "गहना", bn: "গয়না" },
              { en: "Given", hi: "दिया", bn: "দেওয়া" }, { en: "Came back", hi: "वापस", bn: "ফেরত" }, { en: "Scrap", hi: "चूरा", bn: "গুঁড়ো" },
              { en: "Loss", hi: "छीजत", bn: "ক্ষয়" }, { en: "Limit", hi: "सीमा", bn: "সীমা" }, { en: "Over limit", hi: "सीमा से ज़्यादा", bn: "সীমার বেশি" },
              { en: "Fairness", hi: "इंसाफ़", bn: "ন্যায্যতা" }, { en: "", hi: "", bn: "" },
            ].map((h, k) => <th key={k} className="whitespace-nowrap px-2 py-2 font-bold">{t(h)}</th>)}</tr></thead>
            <tbody>
              {jobs.slice().reverse().map((j) => {
                const r = reconcile(j, chain);
                const band = fairBand(history, j.designClass);
                const cls = r.finishedFine > 0 ? classify(r.lossBp, r.capBp, band) : null;
                return (
                  <tr key={j.id} className="border-b border-line/60">
                    <td className="num px-2 py-3 font-bold">{j.id}</td>
                    <td className="px-2">{KARIGARS.find((k) => k.id === j.karigarId)?.name}</td>
                    <td className="px-2">{itemName(j.item, lang)}<div className="text-xs text-ink-3">{DESIGN_CLASSES[j.designClass]}</div></td>
                    <td className="num px-2">{grams(r.issuedFine)}</td>
                    <td className="num px-2">{r.finishedFine ? grams(r.finishedFine + r.adjustFine) : "—"}</td>
                    <td className="num px-2">{r.scrapFine ? grams(r.scrapFine) : "—"}</td>
                    <td className="num px-2">{r.finishedFine ? `${grams(r.lossFine)} (${pct(r.lossBp)}%)` : "—"}</td>
                    <td className="num px-2">{pct(r.capBp)}%</td>
                    <td className={`num px-2 font-bold ${r.finishedFine && r.excessFine > 0 ? "text-terracotta" : "text-verdigris"}`}>{r.finishedFine ? grams(r.excessFine) : "—"}</td>
                    <td className="px-2">{cls && <span className={`chip ${cls === "WITHIN_BAND" ? "chip-ok" : "chip-warn"}`}>{cls}</span>}</td>
                    <td className="px-2">{j.status === "RETURNED" && cls === "CAP_UNREALISTIC" && <Link href="/agents" className="font-bold text-bahi underline">{t({ en: "Resolve", hi: "निपटाओ", bn: "মেটাও" })}</Link>}{j.status === "SETTLED" && <span className="chip chip-ok">{t({ en: "Settled", hi: "निपटा", bn: "মিটেছে" })}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-3"><Info size={14} className="mt-0.5 shrink-0" />{t({ en: "All weights are pure-gold grams. For information only: job-work is a taxable service, and gold kept beyond actual loss may be treated as payment. Rates are settings; nothing is filed automatically. Verify with a CA.", hi: "सारे वज़न खरे सोने के ग्राम में हैं। सिर्फ़ जानकारी के लिए: जॉब-वर्क पर टैक्स लगता है, और असली छीजत से ज़्यादा रखा सोना मेहनताना माना जा सकता है। दरें सेटिंग हैं; कुछ भी अपने-आप फ़ाइल नहीं होता। अपने CA से पूछें।", bn: "সব ওজন খাঁটি সোনার গ্রামে। শুধু তথ্যের জন্য: জব-ওয়ার্কে কর লাগে, আর আসল ক্ষয়ের বেশি রাখা সোনা পারিশ্রমিক ধরা হতে পারে। হার সেটিং মাত্র; কিছুই নিজে থেকে ফাইল হয় না। নিজের CA-কে জিজ্ঞেস করুন।" })}</p>
      </section>
    </div>
  );
}
