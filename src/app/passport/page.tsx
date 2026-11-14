"use client";
import { motion } from "framer-motion";
import { BadgeCheck, Ban, Eye, EyeOff, Landmark, RotateCw, Share2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { PageHead, Speak } from "@/components/ui";
import { useFacts } from "@/lib/facts";
import { useT, type L } from "@/lib/i18n";
import { fairBand, median } from "@/lib/ledger/analytics";
import { canonical, sha256Hex, sign, verify } from "@/lib/ledger/crypto";
import { JEWELLER } from "@/lib/ledger/engine";
import { grams } from "@/lib/ledger/units";
import { useStore } from "@/lib/store";

const MIN_JOBS = 10; // no passport on thin data

export default function PassportPage() {
  const t = useT();
  const { history, chain, me, lang } = useStore();
  const f = useFacts();
  const [flip, setFlip] = useState(false);
  const [shared, setShared] = useState(false);
  const [view, setView] = useState<"me" | "lender">("me");
  const [qr, setQr] = useState("");

  const profile = useMemo(() => {
    const mine = history.filter((h) => h.karigarId === me);
    const within = mine.filter((h) => h.lossBp <= fairBand(history, h.designClass).p90).length;
    const disputes = chain.filter((e) => e.karigarId === me && e.type === "DISPUTE_OPENED").length;
    return {
      jobs: mine.length,
      goldHandled: grams(mine.reduce((a, h) => a + h.fineMg, 0)),
      onTimePct: mine.length ? Math.round((mine.filter((h) => h.onTime).length * 100) / mine.length) : 0,
      withinBandPct: mine.length ? Math.round((within * 100) / mine.length) : 0,
      disputesAgainst: 0, // disputes resolved in the karigar's favour, or still open, never count against him
      disputesOpen: disputes,
      payWaitDays: median(mine.map((h) => h.payDays)),
    };
  }, [history, chain, me]);

  const FIELDS: { key: keyof typeof profile; label: L; value: string }[] = [
    { key: "jobs", label: { en: "Jobs delivered", hi: "पूरे किए काम", bn: "শেষ করা কাজ" }, value: String(profile.jobs) },
    { key: "goldHandled", label: { en: "Pure gold handled", hi: "कितना खरा सोना सँभाला", bn: "কত খাঁটি সোনা সামলেছে" }, value: `${profile.goldHandled} g` },
    { key: "onTimePct", label: { en: "Delivered on time", hi: "समय पर दिया", bn: "সময়মতো দিয়েছে" }, value: `${profile.onTimePct}%` },
    { key: "withinBandPct", label: { en: "Wastage within fair band", hi: "छीजत सही दायरे में", bn: "ক্ষয় ন্যায্য সীমায়" }, value: `${profile.withinBandPct}%` },
    { key: "disputesAgainst", label: { en: "Disputes decided against him", hi: "उसके ख़िलाफ़ गए झगड़े", bn: "তার বিপক্ষে যাওয়া বিবাদ" }, value: String(profile.disputesAgainst) },
    { key: "payWaitDays", label: { en: "Days he usually waits to be paid", hi: "मज़दूरी के लिए आम इंतज़ार (दिन)", bn: "মজুরির জন্য সাধারণ অপেক্ষা (দিন)" }, value: String(profile.payWaitDays) },
  ];
  const [consent, setConsent] = useState<Record<string, boolean>>({ jobs: true, goldHandled: false, onTimePct: true, withinBandPct: true, disputesAgainst: true, payWaitDays: false });

  // The credential: only consented fields, signed by the karigar (owner) and attested by the counterparty.
  const cred = useMemo(() => {
    const claims = Object.fromEntries(FIELDS.filter((x) => consent[x.key]).map((x) => [x.key, profile[x.key]]));
    const body = canonical({ subject: f.who.name, issuer: "Tarazu demo", purpose: "credit-assessment", claims });
    const sigOwner = sign(me, body), sigAttest = sign(JEWELLER, body);
    return { body, claims, sigOwner, sigAttest, id: sha256Hex(body).slice(0, 12), valid: verify(me, body, sigOwner) && verify(JEWELLER, body, sigAttest) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consent, profile, me, f.who.name]);

  useEffect(() => { QRCode.toDataURL(`tarazu-passport:${cred.id}:${cred.sigOwner.slice(0, 32)}`, { margin: 1, width: 260, color: { dark: "#15130F", light: "#FBF8F1" } }).then(setQr).catch(() => {}); }, [cred]);

  const enough = profile.jobs >= MIN_JOBS;
  const said = t({
    en: `This is your trust passport. You have delivered ${profile.jobs} jobs. ${profile.onTimePct} percent were on time. You decide which lines a bank can see. Turn a line off and it is hidden.`,
    hi: `यह तुम्हारा भरोसा पासपोर्ट है। तुमने ${profile.jobs} काम पूरे किए हैं। ${profile.onTimePct} प्रतिशत समय पर। बैंक कौन-सी लाइन देखे, यह तुम तय करते हो। लाइन बंद करो तो वह छिप जाती है।`,
    bn: `এটা তোমার ভরসা পাসপোর্ট। তুমি ${profile.jobs}টা কাজ শেষ করেছ। ${profile.onTimePct} শতাংশ সময়মতো। ব্যাংক কোন লাইন দেখবে, তুমি ঠিক করো। লাইন বন্ধ করলে সেটা লুকিয়ে যায়।`,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHead kicker="Trust Passport · भरोसा पासपोर्ट" title={t({ en: "Honest work, made portable", hi: "ईमानदार काम, जो साथ चलता है", bn: "সৎ কাজ, যা সাথে চলে" })}
        sub={t({ en: "Milk-collection records already finance dairy farmers through consent-based lending rails. Gold-delivery records can do the same for karigars.", hi: "दूध जमा करने के रिकॉर्ड पर डेयरी किसानों को पहले से क़र्ज़ मिलता है। सोने की डिलीवरी के रिकॉर्ड पर कारीगरों को भी मिल सकता है।", bn: "দুধ জমার রেকর্ড দেখে দুগ্ধচাষিরা আগে থেকেই ঋণ পায়। সোনা ডেলিভারির রেকর্ড দেখে কারিগররাও পেতে পারে।" })} right={<Speak text={said} />} />

      <div className="mb-5 inline-flex rounded-full border border-line bg-white/70 p-1">
        {(["me", "lender"] as const).map((v) => <button key={v} onClick={() => setView(v)} className={`flex min-h-12 items-center gap-2 rounded-full px-5 font-bold ${view === v ? "bg-ink text-ivory" : "text-ink-2"}`}>{v === "me" ? <><BadgeCheck size={18} />{t({ en: "Karigar's view", hi: "कारीगर की नज़र", bn: "কারিগরের চোখে" })}</> : <><Landmark size={18} />{t({ en: "Lender's view", hi: "बैंक की नज़र", bn: "ব্যাংকের চোখে" })}</>}</button>)}
      </div>

      {view === "me" ? (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <div data-tara="passport">
            <div className="persp mx-auto max-w-[400px]">
              <button onClick={() => setFlip((x) => !x)} className={`flip relative block aspect-[1.58] w-full text-left ${flip ? "flipped" : ""}`} aria-label="Flip the passport">
                <div className="flip-face absolute inset-0 overflow-hidden rounded-[24px] p-6 text-ink shadow-2xl" style={{ background: "linear-gradient(135deg,#f4dc95 0%,#d2a94e 45%,#9c7220 100%)" }}>
                  <div className="shimmer absolute inset-0 opacity-60" />
                  <div className="relative flex items-center justify-between"><span className="font-display text-xl font-semibold">Tarazu · Trust Passport</span><Image src="/assets/logo-tarazu.svg" alt="" width={44} height={44} /></div>
                  <div className="relative mt-8 font-display text-3xl font-semibold">{lang === "en" ? f.who.name : f.who.nameLocal}</div>
                  <div className="relative text-sm font-semibold opacity-80">{f.who.tier} karigar · since {f.who.since} · {f.who.city}</div>
                  <div className="num relative mt-6 flex items-end justify-between text-xs font-bold"><span>ID {cred.id}</span><span className="inline-flex items-center gap-1"><RotateCw size={13} />{t({ en: "tap to flip", hi: "पलटने के लिए छुओ", bn: "উল্টাতে ছোঁও" })}</span></div>
                </div>
                <div className="flip-face flip-back absolute inset-0 grid place-items-center rounded-[24px] border border-line bg-paper p-4 shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {qr && <img src={qr} alt="Passport QR code" className="h-[78%] w-auto rounded-lg" />}
                  <span className="text-xs font-bold text-ink-3">{t({ en: "Scan works only while you allow it", hi: "स्कैन तभी चलेगा जब तक तुम इजाज़त दो", bn: "যতক্ষণ তুমি অনুমতি দাও, ততক্ষণই স্ক্যান চলবে" })}</span>
                </div>
              </button>
            </div>
            {!enough && <p className="chip chip-warn mt-4">Fewer than {MIN_JOBS} delivered jobs: passport not issued yet.</p>}
            <button onClick={() => setShared((s) => !s)} disabled={!enough} className={`btn btn-xl mt-5 w-full ${shared ? "btn-no" : "btn-gold"}`}>{shared ? <><Ban size={22} />{t({ en: "Stop sharing (revoke)", hi: "दिखाना बंद करो", bn: "দেখানো বন্ধ করো" })}</> : <><Share2 size={22} />{t({ en: "Allow a lender to see it", hi: "बैंक को देखने दो", bn: "ব্যাংককে দেখতে দাও" })}</>}</button>
            <p className="mt-2 text-center text-sm text-ink-3">{shared ? t({ en: "Sharing is on. Check the lender's view.", hi: "दिखाना चालू है। बैंक की नज़र देखो।", bn: "দেখানো চালু। ব্যাংকের চোখে দেখো।" }) : t({ en: "Nobody can see it right now.", hi: "अभी कोई नहीं देख सकता।", bn: "এখন কেউ দেখতে পারে না।" })}</p>
          </div>

          <section className="card p-5">
            <h2 className="text-2xl font-semibold">{t({ en: "You choose what is shown", hi: "क्या दिखेगा, तुम चुनो", bn: "কী দেখা যাবে, তুমি বাছো" })}</h2>
            <p className="text-sm text-ink-3">{t({ en: "No single secret score. Plain facts, each one switchable.", hi: "कोई छिपा हुआ एक नंबर नहीं। सीधी बातें, हर एक को चालू-बंद कर सकते हो।", bn: "কোনো গোপন একটা নম্বর নয়। সোজা তথ্য, প্রতিটা চালু-বন্ধ করা যায়।" })}</p>
            <div className="mt-3 divide-y divide-line">
              {FIELDS.map((x) => (
                <label key={x.key} className="flex min-h-[64px] cursor-pointer items-center gap-3 py-2">
                  <span className="flex-1"><span className="block font-bold">{t(x.label)}</span><span className="num text-xl font-bold gold-text">{x.value}</span></span>
                  <span className="text-ink-3">{consent[x.key] ? <Eye size={20} /> : <EyeOff size={20} />}</span>
                  <input type="checkbox" className="peer sr-only" checked={!!consent[x.key]} onChange={() => setConsent((c) => ({ ...c, [x.key]: !c[x.key] }))} />
                  <span className="relative h-9 w-16 shrink-0 rounded-full bg-line transition peer-checked:bg-verdigris peer-focus-visible:ring-4 peer-focus-visible:ring-gold after:absolute after:left-1 after:top-1 after:h-7 after:w-7 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-7" />
                </label>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-ivory-2/80 p-4">
              <div className="font-bold">{t({ en: "It runs both ways", hi: "यह दोनों तरफ़ चलता है", bn: "এটা দুই দিকেই চলে" })}</div>
              <p className="text-ink-2">{t({ en: `Payer Score: Mehta Jewellers pays in a median of ${f.payerDays} days. Every karigar can see it before taking work.`, hi: `भुगतान स्कोर: मेहता ज्वैलर्स औसतन ${f.payerDays} दिन में पैसा देते हैं। काम लेने से पहले हर कारीगर यह देख सकता है।`, bn: `পেমেন্ট স্কোর: মেহতা জুয়েলার্স গড়ে ${f.payerDays} দিনে টাকা দেয়। কাজ নেওয়ার আগে প্রত্যেক কারিগর এটা দেখতে পারে।` })}</p>
            </div>
          </section>
        </div>
      ) : (
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="card mx-auto max-w-2xl p-6">
          <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-ivory"><Landmark /></span><div><div className="font-display text-xl font-semibold">Lender viewer</div><div className="text-xs text-ink-3">Mock ULI-style consent flow · purpose: credit assessment</div></div></div>
          {!shared ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-line p-8 text-center"><Ban className="mx-auto text-terracotta" size={36} /><div className="mt-2 text-xl font-bold">No active consent</div><p className="text-ink-3">The karigar has not shared his passport, or has revoked it. Nothing is readable.</p></div>
          ) : (
            <>
              <div className={`chip mt-5 px-3 py-1.5 text-sm ${cred.valid ? "chip-ok" : "chip-warn"}`}><ShieldCheck size={15} />{cred.valid ? "Signatures verified: owner + counterparty attestation" : "Signature check failed"}</div>
              <div className="mt-4 text-2xl font-display font-semibold">{f.who.name}</div>
              <dl className="mt-3 divide-y divide-line">
                {FIELDS.map((x) => (
                  <div key={x.key} className="flex items-center justify-between py-3">
                    <dt className="text-ink-2">{x.label.en}</dt>
                    <dd className="num font-bold">{consent[x.key] ? x.value : <span className="inline-flex items-center gap-1 text-ink-3"><EyeOff size={14} />withheld by owner</span>}</dd>
                  </div>
                ))}
              </dl>
              <div className="num mt-3 break-all rounded-xl bg-ivory-2 p-3 text-[11px] text-ink-3">credential {cred.id} · sig {cred.sigOwner.slice(0, 40)}…</div>
              <p className="mt-3 text-xs text-ink-3">Counterparty-attested data only. Disputes resolved in the karigar&apos;s favour never count against him. No opaque score is produced. Demo; no real lender or ULI connection.</p>
            </>
          )}
        </motion.section>
      )}
    </div>
  );
}
