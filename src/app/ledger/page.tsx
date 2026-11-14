"use client";
import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2, Hourglass, PenLine, ShieldAlert, Stamp, Undo2, UserCheck } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { Chain3D } from "@/components/three/lazy";
import { Guide, PageHead, Speak } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { daySeal, eventFine, verifyChain } from "@/lib/ledger/engine";
import { KARIGARS } from "@/lib/ledger/seed";
import { grams, pct, rupees } from "@/lib/ledger/units";
import { useStore } from "@/lib/store";

const WINDOW = 9;

export default function LedgerPage() {
  const t = useT();
  const { chain, pending, tamper, tamperWith, repair, lastFinal } = useStore();
  const check = useMemo(() => verifyChain(chain), [chain]);
  const seal = useMemo(() => (chain.length ? daySeal(chain, chain[chain.length - 1].ts) : null), [chain]);
  const [qr, setQr] = useState("");
  useEffect(() => { if (seal) QRCode.toDataURL(`tarazu-day-seal:${seal.day}:${seal.root}`, { margin: 1, width: 220, color: { dark: "#15130F", light: "#FBF8F1" } }).then(setQr).catch(() => {}); }, [seal]);

  const start = Math.max(0, chain.length - WINDOW);
  const shown = chain.slice(start);
  const brokenInWindow = check.brokenAt === null ? null : Math.max(0, check.brokenAt - start);
  const tamperTarget = chain.length - 5; // a weight entry a few links back, so the break and its aftermath are both visible
  const said = check.ok
    ? t({ en: `The chain has ${chain.length} entries. Every link is intact and every signature is valid.`, hi: `ज़ंजीर में ${chain.length} एंट्री हैं। हर कड़ी सही-सलामत है और हर दस्तख़त असली है।`, bn: `শিকলে ${chain.length}টা এন্ট্রি আছে। প্রতিটা কড়া অটুট, প্রতিটা সই আসল।` })
    : t({ en: `Warning. Entry number ${(check.brokenAt ?? 0) + 1} was changed after it was signed. The chain is broken there.`, hi: `चेतावनी। एंट्री नंबर ${(check.brokenAt ?? 0) + 1} दस्तख़त के बाद बदली गई है। ज़ंजीर वहीं टूटी है।`, bn: `সতর্কতা। ${(check.brokenAt ?? 0) + 1} নম্বর এন্ট্রি সইয়ের পরে বদলানো হয়েছে। শিকল ওখানেই ভেঙেছে।` });

  return (
    <div>
      <PageHead kicker="बही-खाता · Ledger Explorer" title={t({ en: "The book that remembers", hi: "वह बही जो सब याद रखती है", bn: "যে খাতা সব মনে রাখে" })}
        sub={t({ en: "Append-only. Each entry is hashed with the one before it and signed by both parties. Corrections are new lines, never edits.", hi: "इसमें सिर्फ़ जोड़ा जाता है। हर एंट्री पिछली से बँधी है और दोनों के दस्तख़त वाली है। सुधार नई लाइन होता है, काट-छाँट नहीं।", bn: "এতে শুধু যোগ হয়। প্রতিটা এন্ট্রি আগেরটার সাথে বাঁধা, দুজনের সই-করা। সংশোধন মানে নতুন লাইন, কাটাকুটি নয়।" })}
        right={<Speak text={said} />} />

      <Guide steps={[
        { en: "Each gold ring is one entry, locked to the one before it.", hi: "हर सुनहरी कड़ी एक एंट्री है, पिछली से बँधी हुई।", bn: "প্রতিটা সোনালি কড়া একটা এন্ট্রি, আগেরটার সাথে বাঁধা।" },
        { en: "Press “secretly edit” to see what happens to a changed entry.", hi: "“चुपके से बदलो” दबाकर देखो, बदली हुई एंट्री का क्या होता है।", bn: "“চুপিচুপি বদলাও” টিপে দেখো, বদলানো এন্ট্রির কী হয়।" },
        { en: "The Day Seal is one code for the whole day. Both sides get it.", hi: "दिन की मुहर पूरे दिन का एक कोड है। दोनों को मिलता है।", bn: "দিনের সিল হলো সারাদিনের একটা কোড। দুজনেই পায়।" },
      ]} />
      <section data-tara="chain" className={`card overflow-hidden p-4 ${check.ok ? "" : "!border-terracotta border-2"}`}>
        <div className="flex flex-wrap items-center gap-3">
          {check.ok
            ? <span className="chip chip-ok px-4 py-2 text-sm"><CheckCircle2 size={16} />{t({ en: "Chain intact", hi: "ज़ंजीर सही-सलामत", bn: "শিকল অটুট" })} · {chain.length} · SHA-256 + Ed25519</span>
            : <motion.span initial={{ scale: 0.8 }} animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="chip chip-warn px-4 py-2 text-sm"><AlertOctagon size={16} />{t({ en: "Tampering detected at entry", hi: "छेड़छाड़ पकड़ी गई, एंट्री", bn: "কারচুপি ধরা পড়েছে, এন্ট্রি" })} #{(check.brokenAt ?? 0) + 1} ({chain[check.brokenAt ?? 0]?.id}) · {check.reason}</motion.span>}
          <div className="ml-auto">
            {tamper
              ? <button onClick={repair} className="btn btn-yes !min-h-12"><Undo2 size={18} />{t({ en: "Restore the true entry", hi: "असली एंट्री वापस लाओ", bn: "আসল এন্ট্রি ফিরিয়ে আনো" })}</button>
              : <button onClick={() => tamperWith(tamperTarget)} className="btn btn-ghost !min-h-12"><ShieldAlert size={18} className="text-terracotta" />{t({ en: "Demo: secretly edit an old weight", hi: "डेमो: चुपके से पुराना वज़न बदलो", bn: "ডেমো: চুপিচুপি পুরনো ওজন বদলাও" })}</button>}
          </div>
        </div>
        <div className="mx-auto max-w-[820px]"><Chain3D links={shown.map((e) => ({ id: e.id, legacy: e.legacy }))} brokenAt={brokenInWindow} newest={lastFinal} className="h-[170px] w-full" />
        <div className="grid px-[5%] text-center text-[10px] font-bold text-ink-3 sm:text-xs" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
          {shown.map((e, i) => <span key={e.id} className={`num ${brokenInWindow !== null && i === brokenInWindow ? "text-terracotta" : ""}`}>{e.id.slice(2)}</span>)}
        </div></div>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
        <section className="khata scroll-x p-4 pl-14">
          {pending.length > 0 && (
            <div className="mb-3 rounded-xl border border-dashed border-gold bg-gold-2/20 p-3 text-sm">
              <div className="flex items-center gap-2 font-bold"><Hourglass size={16} />{pending.length} {t({ en: "pending, not in the chain or any balance yet", hi: "एंट्री अधूरी, अभी ज़ंजीर या हिसाब में नहीं", bn: "এন্ট্রি বাকি, এখনো শিকলে বা হিসাবে নেই" })}</div>
              {pending.map((p) => <div key={p.id} className="num mt-1 text-xs">{p.id} · {p.jobId} · {p.type} · {p.sigKarigar ? "karigar ✓" : "karigar …"} · {p.sigJeweller ? "jeweller ✓" : "jeweller …"}</div>)}
            </div>
          )}
          <table className="w-full min-w-[760px] text-[13px]">
            <thead><tr className="text-left text-xs uppercase tracking-wide text-bahi">{["#", "Entry", "Job", "What", "Karigar", "Net g", "Fine g", "Signed", "Hash"].map((h) => <th key={h} className="px-1.5 pb-[18px] font-extrabold">{h}</th>)}</tr></thead>
            <tbody>
              {chain.slice().reverse().map((e) => {
                const broken = check.brokenAt !== null && e.seq === check.brokenAt, after = check.brokenAt !== null && e.seq > check.brokenAt;
                return (
                  <tr key={e.id} className={`h-[44px] ${broken ? "bg-terracotta/20 font-bold text-terracotta" : after ? "text-ink-3" : ""}`}>
                    <td className="num px-1.5">{e.seq + 1}</td>
                    <td className="num px-1.5 font-bold">{e.id}</td>
                    <td className="num px-1.5">{e.jobId}</td>
                    <td className="px-1.5">{e.type.replaceAll("_", " ").toLowerCase()}{e.legacy && <span className="chip chip-warn ml-1 !py-0 !text-[10px]">legacy · 1 signature</span>}</td>
                    <td className="px-1.5">{KARIGARS.find((k) => k.id === e.karigarId)?.name.split(" ")[0]}</td>
                    <td className="num px-1.5">{e.payload.netMg !== undefined ? grams(e.payload.netMg) : e.payload.amountPaise ? rupees(e.payload.amountPaise) : e.payload.capBp ? `cap ${pct(e.payload.capBp)}%` : ""}</td>
                    <td className="num px-1.5">{e.payload.netMg !== undefined || e.payload.fineMg !== undefined ? grams(eventFine(e)) : ""}</td>
                    <td className="px-1.5"><span className="inline-flex items-center gap-1">{e.sigKarigar ? <UserCheck size={15} className="text-verdigris" /> : <span className="text-terracotta">—</span>}<Stamp size={15} className="text-bahi" /></span></td>
                    <td className="num px-1.5 text-[11px] text-ink-3">{e.hash.slice(0, 10)}…</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <aside className="space-y-5">
          <div className="card p-5 text-center">
            <div className="flex items-center justify-center gap-2 font-display text-xl font-semibold"><Stamp className="text-bahi" />Day Seal</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {qr && <img src={qr} alt="Day Seal QR code" width={180} height={180} className="mx-auto mt-3 rounded-xl border border-line" />}
            <div className="mt-2 text-sm font-bold">{seal?.day} · {seal?.count} {t({ en: "entries", hi: "एंट्री", bn: "এন্ট্রি" })}</div>
            <div className="num mt-1 break-all text-[11px] text-ink-3">{seal?.root}</div>
            <p className="mt-2 text-xs text-ink-3">{t({ en: "Merkle root of the day's final entries, sent to both parties. If either book is changed later, the seal no longer matches.", hi: "दिन भर की पक्की एंट्री की मुहर, दोनों को भेजी जाती है। बाद में कोई बही बदले तो मुहर नहीं मिलेगी।", bn: "সারাদিনের পাকা এন্ট্রির সিল, দুজনকেই পাঠানো হয়। পরে কোনো খাতা বদলালে সিল আর মিলবে না।" })}</p>
          </div>
          <div className="card p-5 text-sm">
            <div className="flex items-center gap-2 font-bold"><PenLine size={16} />{t({ en: "Honest labels", hi: "साफ़ बात", bn: "সোজা কথা" })}</div>
            <p className="mt-1 text-ink-2">Demo signing: per-party Ed25519 keys are held in this app. Production would use device-bound keys or eSign. Hashing and signature verification are real and run in your browser.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
