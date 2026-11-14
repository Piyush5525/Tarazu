"use client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BadgeCheck, CalendarHeart, Check, GitCompareArrows, Hammer, Landmark, Mic, Ear, PenLine, Play, Scale, ShieldCheck, Store, Heart, Hand, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { HandCoins, PackageCheck } from "lucide-react";
import { fineMg, grams, pct, ratioBp } from "@/lib/ledger/units";
import { verifyChain } from "@/lib/ledger/engine";
import { useStore } from "@/lib/store";
import { Balance3D, GoldField } from "@/components/three/lazy";
import { GoldJourney, Reveal, Speak, Tilt } from "@/components/ui";
import { useT, type L } from "@/lib/i18n";

const IDEAS: { icon: typeof Scale; href: string; tag: string; title: L; body: L }[] = [
  { icon: PenLine, href: "/ledger", tag: "दोनों साक्षी", title: { en: "Dual-Witness Ledger", hi: "दो गवाहों वाली बही", bn: "দুই সাক্ষীর খাতা" }, body: { en: "An entry is final only when both sign. After that it is locked into a chain nobody can quietly edit.", hi: "एंट्री तभी पक्की जब दोनों दस्तख़त करें। फिर वह ऐसी ज़ंजीर में बँध जाती है जिसे कोई चुपके से नहीं बदल सकता।", bn: "দুজন সই করলে তবেই এন্ট্রি পাকা। তারপর তা এমন শিকলে বাঁধা পড়ে, যা কেউ চুপিচুপি বদলাতে পারে না।" } },
  { icon: GitCompareArrows, href: "/karigar?do=mismatch", tag: "git bisect for gold", title: { en: "Divergence Finder", hi: "हिसाब कहाँ से अलग हुआ", bn: "হিসাব কোথায় আলাদা হলো" }, body: { en: "When two books disagree, it finds the first entry where they split. Seconds, not a month-end fight.", hi: "जब दो बहियाँ न मिलें, तो यह वही पहली एंट्री ढूँढता है जहाँ से फ़र्क़ शुरू हुआ। कुछ पलों में, महीने के झगड़े के बिना।", bn: "দুই খাতা না মিললে এটা সেই প্রথম এন্ট্রি খুঁজে দেয়, যেখান থেকে ফারাক শুরু। কয়েক মুহূর্তে, মাস-শেষের ঝগড়া ছাড়া।" } },
  { icon: Scale, href: "/agents", tag: "P10 · P50 · P90", title: { en: "Wastage Fairness", hi: "छीजत का सही पैमाना", bn: "ক্ষয়ের ন্যায্য মাপ" }, body: { en: "The verbal “4%” is replaced by a band learned from real jobs. It flags caps that are unfair to the karigar too.", hi: "ज़ुबानी “4%” की जगह पुराने कामों से निकला सही दायरा। यह वह सीमा भी पकड़ता है जो कारीगर के साथ नाइंसाफ़ी है।", bn: "মুখের “৪%”-এর জায়গায় আগের কাজ থেকে শেখা ন্যায্য সীমা। কারিগরের প্রতি অন্যায্য সীমাও এটা ধরে।" } },
  { icon: CalendarHeart, href: "/track", tag: "2,000 simulations", title: { en: "Deadline Guardian", hi: "शादी की तारीख़ का पहरेदार", bn: "বিয়ের তারিখের পাহারাদার" }, body: { en: "Works back from the wedding date, through hallmarking, and warns early. No karigar is reassigned without his yes.", hi: "शादी की तारीख़ से पीछे गिनता है, हॉलमार्क समेत, और पहले ही चेताता है। कारीगर की हाँ के बिना काम नहीं बदलता।", bn: "বিয়ের তারিখ থেকে পিছিয়ে গোনে, হলমার্কসহ, আর আগেই সতর্ক করে। কারিগরের হ্যাঁ ছাড়া কাজ বদলায় না।" } },
  { icon: BadgeCheck, href: "/passport", tag: "ULI-style consent", title: { en: "Trust Passport", hi: "भरोसा पासपोर्ट", bn: "ভরসা পাসপোর্ট" }, body: { en: "The karigar owns his record of honest work and can show it to a lender. Jewellers get a payer score too.", hi: "ईमानदार काम का रिकॉर्ड कारीगर का अपना है, जिसे वह बैंक को दिखा सकता है। सेठ का भी भुगतान स्कोर बनता है।", bn: "সৎ কাজের রেকর্ড কারিগরের নিজের, সে তা ব্যাংককে দেখাতে পারে। মালিকেরও পেমেন্ট স্কোর হয়।" } },
];

const ROLES: { icon: typeof Scale; href: string; color: string; title: L; body: L }[] = [
  { icon: Hammer, href: "/karigar", color: "#1f6f5c", title: { en: "I am a karigar", hi: "मैं कारीगर हूँ", bn: "আমি কারিগর" }, body: { en: "See my gold and my money. Speak, don't type.", hi: "मेरा सोना और मेरा पैसा देखो। बोलो, लिखना नहीं।", bn: "আমার সোনা আর টাকা দেখো। বলো, লিখতে হবে না।" } },
  { icon: Store, href: "/jeweller", color: "#8e1b1b", title: { en: "I am a jeweller", hi: "मैं सेठ हूँ", bn: "আমি মালিক" }, body: { en: "Orders, karigar balances, signatures, deadlines.", hi: "ऑर्डर, कारीगरों का हिसाब, दस्तख़त, तारीख़ें।", bn: "অর্ডার, কারিগরের হিসাব, সই, তারিখ।" } },
  { icon: Heart, href: "/track", color: "#c4553b", title: { en: "I am a customer", hi: "मैं ग्राहक हूँ", bn: "আমি খদ্দের" }, body: { en: "Will my wedding jewellery be ready in time?", hi: "क्या मेरा शादी का गहना समय पर बनेगा?", bn: "আমার বিয়ের গয়না কি সময়মতো হবে?" } },
  { icon: Landmark, href: "/passport", color: "#8a6418", title: { en: "I am a lender", hi: "मैं बैंक से हूँ", bn: "আমি ব্যাংক থেকে" }, body: { en: "Verify a karigar's record, with his consent.", hi: "कारीगर की इजाज़त से उसका रिकॉर्ड जाँचो।", bn: "কারিগরের অনুমতি নিয়ে তার রেকর্ড যাচাই করো।" } },
];

export default function HomePage() {
  const t = useT();
  const [pans, setPans] = useState({ left: 6, right: 4 });
  const diff = pans.right - pans.left;
  const level = diff === 0;
  const chain = useStore((s) => s.chain);
  const intact = useMemo(() => verifyChain(chain, false).ok, [chain]);
  // Scenario A, computed by the ledger engine (not typed in)
  const journey = useMemo(() => {
    const issued = fineMg(250_000, 9160), loss = issued - fineMg(238_400, 9160) - fineMg(7_100, 8500);
    return { issued, loss, lossBp: ratioBp(loss, issued) };
  }, []);
  const heroLine = t({ en: "Gold moves on trust. Tarazu makes it move on proof, and gives the weaker side the same book.", hi: "सोना भरोसे पर चलता है। तराज़ू उसे सबूत पर चलाता है, और कमज़ोर पक्ष को भी वही बही देता है।", bn: "সোনা চলে ভরসায়। তরাজু তাকে চালায় প্রমাণে, আর দুর্বল পক্ষকেও একই খাতা দেয়।" });

  return (
    <div className="relative">
      <GoldField />

      {/* HERO */}
      <section className="grid items-center gap-4 pt-2 lg:grid-cols-[1.02fr_1fr] lg:gap-8 lg:pt-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="chip chip-bahi mb-4">दोनों साक्षी · দুই সাক্ষী · both witnesses</span>
          <h1 className="text-[2.6rem] font-semibold sm:text-6xl lg:text-[4.2rem]">
            {t({ en: "The gold ledger", hi: "सोने की वह बही", bn: "সোনার সেই খাতা" })}{" "}
            <span className="gold-text italic">{t({ en: "both sides sign.", hi: "जिस पर दोनों के दस्तख़त हों।", bn: "যাতে দুজনেরই সই।" })}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-2 sm:text-xl">{heroLine}</p>
          <div className="mt-4"><Speak text={heroLine} /></div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/karigar" className="btn btn-gold btn-xl"><Hammer size={22} />{t({ en: "Open my book", hi: "मेरा खाता खोलो", bn: "আমার খাতা খোলো" })}</Link>
            <Link href="/demo" className="btn btn-ink btn-xl"><Play size={20} />{t({ en: "Watch the story", hi: "कहानी देखो", bn: "গল্পটা দেখো" })}</Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-ink-2">
            <span className="chip"><Mic size={14} />{t({ en: "Voice first", hi: "बोलकर चलाओ", bn: "বলে চালাও" })}</span>
            <span className="chip"><ShieldCheck size={14} />{t({ en: "Tamper-evident", hi: "छेड़छाड़ पकड़ में", bn: "কারচুপি ধরা পড়ে" })}</span>
            <span className="chip">हिंदी · বাংলা · English</span>
          </div>
          {/* live figures from the ledger behind this page */}
          <dl className="mt-7 grid max-w-xl grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-paper/70 text-center backdrop-blur">
            {[
              { v: String(chain.length), l: t({ en: "entries, each signed", hi: "एंट्री, हर एक पर दस्तख़त", bn: "এন্ট্রি, প্রতিটায় সই" }) },
              { v: intact ? "100%" : "!", l: t({ en: "of the chain verified", hi: "ज़ंजीर जाँची हुई", bn: "শিকল যাচাই করা" }) },
              { v: "3", l: t({ en: "languages, spoken aloud", hi: "भाषाएँ, बोलकर", bn: "ভাষা, মুখে বলে" }) },
            ].map((s) => (
              <div key={s.l} className="px-2 py-3"><dt className="num gold-text text-2xl font-bold sm:text-3xl">{s.v}</dt><dd className="text-[12px] font-semibold leading-tight text-ink-2 sm:text-sm">{s.l}</dd></div>
            ))}
          </dl>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.15 }} className="relative order-first lg:order-none">
          <Balance3D tilt={diff / 4} leftBeads={pans.left} rightBeads={pans.right} onPan={(side) => setPans((p) => ({ ...p, [side]: Math.min(p[side] + 1, 12) }))} className="h-[300px] w-full sm:h-[520px]" />
          {/* what the scale stands for, floating around it (wide screens only: no room on a phone) */}
          <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 }} className="floaty absolute left-0 top-[26%] flex items-center gap-2 rounded-2xl border border-line bg-paper/90 px-3 py-2 text-sm font-bold shadow-lg backdrop-blur">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-verdigris text-white"><Check size={16} /></span>
              <span>{t({ en: "Karigar signed", hi: "कारीगर के दस्तख़त", bn: "কারিগরের সই" })}<span className="block text-[11px] font-semibold text-ink-3">Bablu Maity</span></span>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.5 }} className="floaty absolute right-0 top-[14%] flex items-center gap-2 rounded-2xl border border-line bg-paper/90 px-3 py-2 text-sm font-bold shadow-lg backdrop-blur" style={{ animationDelay: "1.2s" }}>
              <span className="grid h-8 w-8 place-items-center rounded-full bg-bahi text-white"><Check size={16} /></span>
              <span>{t({ en: "Jeweller signed", hi: "सेठ के दस्तख़त", bn: "মালিকের সই" })}<span className="block text-[11px] font-semibold text-ink-3">Mehta Jewellers</span></span>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.9 }} className="floaty absolute bottom-[30%] right-[2%] flex items-center gap-2 rounded-2xl border border-gold/50 bg-ink px-3 py-2 text-sm font-bold text-ivory shadow-lg" style={{ animationDelay: "2.1s" }}>
              <ShieldCheck size={18} className="text-gold-2" />
              <span>{t({ en: "Locked in the chain", hi: "ज़ंजीर में बंद", bn: "শিকলে আটকানো" })}<span className="num block text-[11px] font-semibold text-ivory/60">{chain.length ? chain[chain.length - 1].hash.slice(0, 14) : ""}…</span></span>
            </motion.div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center">
            <AnimatePresence mode="wait">
              <motion.div key={level ? "ok" : "no"} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`chip ${level ? "chip-ok" : "chip-warn"} px-4 py-2 text-sm shadow-md`}>
                {level ? <><Check size={16} />{t({ en: "Level. Both books agree.", hi: "बराबर। दोनों बहियाँ मिल गईं।", bn: "সমান। দুই খাতা মিলে গেছে।" })}</> : <><Hand size={16} />{t({ en: "Tap the lighter pan to make it level", hi: "हल्के पलड़े को छूकर बराबर करो", bn: "হালকা পাল্লা ছুঁয়ে সমান করো" })}</>}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="-mt-3 grid grid-cols-2 gap-3 text-center text-sm font-bold">
            <div className="card px-3 py-2">{t({ en: "Gold given", hi: "दिया गया सोना", bn: "দেওয়া সোনা" })}<div className="num text-xl gold-text">{pans.left}</div></div>
            <div className="card px-3 py-2">{t({ en: "Came back + scrap + loss", hi: "वापस + चूरा + छीजत", bn: "ফেরত + গুঁড়ো + ক্ষয়" })}<div className="num text-xl gold-text">{pans.right}</div></div>
          </div>
          <button onClick={() => setPans({ left: 6, right: 4 })} className="mx-auto mt-2 flex min-h-12 items-center gap-2 px-4 text-sm font-bold text-ink-3"><RotateCcw size={16} />{t({ en: "Start again", hi: "फिर से", bn: "আবার শুরু" })}</button>
        </motion.div>
      </section>

      {/* ONE JOB, START TO FINISH */}
      <section className="mt-16">
        <Reveal>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-semibold sm:text-4xl">{t({ en: "One job, from gold to signature", hi: "एक काम, सोने से दस्तख़त तक", bn: "একটা কাজ, সোনা থেকে সই পর্যন্ত" })}</h2>
            <span className="chip chip-bahi">{t({ en: "Demo job J-1042", hi: "डेमो काम J-1042", bn: "ডেমো কাজ J-1042" })}</span>
          </div>
          <GoldJourney stops={[
            { icon: <HandCoins size={28} />, title: t({ en: "Gold is given", hi: "सोना दिया गया", bn: "সোনা দেওয়া হলো" }), value: `${grams(250_000)} g`, note: t({ en: `22 carat · ${grams(journey.issued)} g pure`, hi: `22 कैरेट · ${grams(journey.issued)} ग्राम खरा`, bn: `২২ ক্যারেট · ${grams(journey.issued)} গ্রাম খাঁটি` }) },
            { icon: <Hammer size={28} />, title: t({ en: "Karigar makes it", hi: "कारीगर बनाता है", bn: "কারিগর বানায়" }), value: t({ en: "Bridal haar", hi: "ब्राइडल हार", bn: "ব্রাইডাল হার" }), note: t({ en: "limit agreed in writing: 3.00%", hi: "छीजत की सीमा लिखकर तय: 3.00%", bn: "ক্ষয়ের সীমা লিখে ঠিক: 3.00%" }) },
            { icon: <PackageCheck size={28} />, title: t({ en: "It comes back", hi: "वापस आता है", bn: "ফেরত আসে" }), value: `${grams(238_400)} g`, note: t({ en: `+ ${grams(7_100)} g scrap`, hi: `+ ${grams(7_100)} ग्राम चूरा`, bn: `+ ${grams(7_100)} গ্রাম গুঁড়ো` }) },
            { icon: <Scale size={28} />, title: t({ en: "The scale checks", hi: "तराज़ू जाँचता है", bn: "দাঁড়িপাল্লা মেলায়" }), value: `${pct(journey.lossBp)}%`, note: t({ en: `lost ${grams(journey.loss)} g · inside the limit`, hi: `${grams(journey.loss)} ग्राम घटा · सीमा के अंदर`, bn: `${grams(journey.loss)} গ্রাম কমল · সীমার ভেতরে` }) },
            { icon: <PenLine size={28} />, title: t({ en: "Both sign", hi: "दोनों के दस्तख़त", bn: "দুজনের সই" }), value: "2 / 2", note: t({ en: "locked in the chain", hi: "ज़ंजीर में बंद", bn: "শিকলে আটকে গেল" }) },
          ]} />
        </Reveal>
      </section>

      {/* THE HUMAN STORY */}
      <section className="mt-20 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="khata h-full p-6 pl-16 sm:p-8 sm:pl-20">
            <span className="chip chip-bahi">{t({ en: "Demo story", hi: "डेमो कहानी", bn: "ডেমো গল্প" })}</span>
            <p className="mt-4 font-display text-2xl italic leading-snug sm:text-3xl">
              {t({ en: "“The owner's book says 118.250. My notebook says 118.520. Whose word counts?”", hi: "“सेठ जी की बही में 118.250 लिखा है। मेरी कॉपी में 118.520। किसकी बात मानी जाएगी?”", bn: "“মালিকের খাতায় লেখা ১১৮.২৫০। আমার খাতায় ১১৮.৫২০। কার কথা মানা হবে?”" })}
            </p>
            <p className="mt-4 font-bold">— {t({ en: "Bablu Maity, karigar, 14 years at the bench", hi: "बबलू माइती, कारीगर, 14 साल से भट्ठी पर", bn: "বাবলু মাইতি, কারিগর, ১৪ বছর ধরে কাজে" })}</p>
            <p className="mt-3 text-ink-2">{t({ en: "Two digits swapped in one old entry. A quarter gram of gold. A month of silence between two people who have worked together for years.", hi: "एक पुरानी एंट्री में दो अंक आगे-पीछे। चौथाई ग्राम सोना। और बरसों साथ काम करने वाले दो लोगों के बीच महीने भर की चुप्पी।", bn: "একটা পুরনো এন্ট্রিতে দুটো অঙ্ক উল্টে গেছে। সিকি গ্রাম সোনা। আর বছরের পর বছর একসাথে কাজ করা দুজনের মধ্যে এক মাসের নীরবতা।" })}</p>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="grid h-full gap-3">
            {[
              { a: { en: "A notebook only the jeweller holds", hi: "बही सिर्फ़ सेठ के पास", bn: "খাতা শুধু মালিকের কাছে" }, b: { en: "One book, open to both", hi: "एक बही, दोनों के लिए खुली", bn: "এক খাতা, দুজনের জন্য খোলা" } },
              { a: { en: "Wastage agreed by word of mouth", hi: "छीजत ज़ुबानी तय", bn: "ক্ষয় মুখের কথায় ঠিক" }, b: { en: "Written down, backed by data, signed", hi: "लिखी हुई, आँकड़ों पर टिकी, दस्तख़त वाली", bn: "লেখা, তথ্যে ভর করা, সই করা" } },
              { a: { en: "Wedding dates chased by phone", hi: "शादी की तारीख़ फ़ोन पर पूछताछ", bn: "বিয়ের তারিখ নিয়ে ফোনে তাগাদা" }, b: { en: "Early warning, weeks ahead", hi: "हफ़्तों पहले चेतावनी", bn: "কয়েক সপ্তাহ আগেই সতর্কতা" } },
              { a: { en: "Artisans waiting weeks to be paid", hi: "मज़दूरी के लिए हफ़्तों इंतज़ार", bn: "মজুরির জন্য সপ্তাহের পর সপ্তাহ অপেক্ষা" }, b: { en: "A payment clock both can see", hi: "भुगतान की घड़ी, दोनों को दिखती", bn: "পেমেন্টের ঘড়ি, দুজনেই দেখে" } },
            ].map((r, i) => (
              <div key={i} className="card grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-4">
                <span className="text-[15px] text-ink-3 line-through decoration-terracotta/60">{t(r.a)}</span>
                <ArrowRight className="text-gold" />
                <span className="text-[15px] font-bold text-verdigris">{t(r.b)}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* FIVE IDEAS */}
      <section className="mt-24">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold sm:text-5xl">{t({ en: "Every other tool is the jeweller's notebook in software.", hi: "बाक़ी सब सॉफ़्टवेयर सेठ की बही की नक़ल हैं।", bn: "বাকি সব সফটওয়্যার মালিকের খাতারই নকল।" })} <span className="gold-text italic">{t({ en: "This one is shared.", hi: "यह साझी बही है।", bn: "এটা দুজনের খাতা।" })}</span></h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {IDEAS.map((idea, i) => (
            <Reveal key={idea.href} delay={i * 0.06} className={i === 0 ? "lg:col-span-1" : ""}>
              <Tilt>
                <Link href={idea.href} className="card group flex h-full flex-col p-6">
                  <div className="flex items-center justify-between">
                    <span className="gold-fill grid h-14 w-14 place-items-center rounded-2xl text-ink shadow-[var(--shadow-gold)]"><idea.icon size={28} /></span>
                    <span className="num text-xs font-bold text-ink-3">{idea.tag}</span>
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold">{t(idea.title)}</h3>
                  <p className="mt-2 flex-1 text-ink-2">{t(idea.body)}</p>
                  <span className="mt-4 inline-flex items-center gap-2 font-bold text-bahi">{t({ en: "See it", hi: "देखो", bn: "দেখো" })}<ArrowRight size={18} className="transition group-hover:translate-x-1" /></span>
                </Link>
              </Tilt>
            </Reveal>
          ))}
          <Reveal delay={0.3}>
            <div className="card-ink flex h-full flex-col justify-between p-6">
              <p className="font-display text-2xl leading-snug">{t({ en: "Agents propose. Humans approve. The ledger remembers.", hi: "एजेंट सुझाते हैं। इंसान मंज़ूर करते हैं। बही याद रखती है।", bn: "এজেন্ট প্রস্তাব দেয়। মানুষ সম্মতি দেয়। খাতা মনে রাখে।" })}</p>
              <p className="mt-4 text-sm text-ivory/70">{t({ en: "No AI does arithmetic or moves value here. A deterministic engine computes every number.", hi: "यहाँ कोई AI हिसाब नहीं जोड़ता, न सोना या पैसा हिलाता है। हर अंक एक तय इंजन निकालता है।", bn: "এখানে কোনো AI হিসাব কষে না, সোনা বা টাকাও সরায় না। প্রতিটা সংখ্যা বের করে একটা নির্দিষ্ট ইঞ্জিন।" })}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-24">
        <Reveal><h2 className="text-3xl font-semibold sm:text-5xl">{t({ en: "If you can speak, you can use it.", hi: "बोल सकते हो, तो चला सकते हो।", bn: "কথা বলতে পারলেই চালাতে পারবে।" })}</h2></Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { icon: Mic, c: "#1f6f5c", n: "1", title: { en: "Speak", hi: "बोलो", bn: "বলো" }, body: { en: "“Today I got 250 gram 22 carat gold for the haar.”", hi: "“आज ढाई सौ ग्राम बाईस कैरेट सोना मिला, हार के लिए।”", bn: "“আজ আড়াইশো গ্রাম বাইশ ক্যারেট সোনা পেলাম, হারের জন্য।”" } },
            { icon: Ear, c: "#c9a24b", n: "2", title: { en: "Listen", hi: "सुनो", bn: "শোনো" }, body: { en: "It is read back in your language. A big green yes, a big red no.", hi: "तुम्हारी भाषा में पढ़कर सुनाया जाता है। बड़ा हरा हाँ, बड़ा लाल ना।", bn: "তোমার ভাষায় পড়ে শোনানো হয়। বড় সবুজ হ্যাঁ, বড় লাল না।" } },
            { icon: PenLine, c: "#8e1b1b", n: "3", title: { en: "Both sign", hi: "दोनों के दस्तख़त", bn: "দুজনের সই" }, body: { en: "The jeweller countersigns. The link locks. Both get the day's seal.", hi: "सेठ भी दस्तख़त करता है। कड़ी बंद हो जाती है। दोनों को दिन की मुहर मिलती है।", bn: "মালিকও সই করে। কড়া আটকে যায়। দুজনেই দিনের সিল পায়।" } },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <Tilt>
                <div className="card relative h-full overflow-hidden p-6">
                  <span className="absolute -right-2 -top-6 font-display text-[7rem] font-semibold leading-none text-gold/15">{s.n}</span>
                  <span className="grid h-16 w-16 place-items-center rounded-2xl text-white" style={{ background: s.c }}><s.icon size={32} /></span>
                  <h3 className="mt-4 text-2xl font-semibold">{t(s.title)}</h3>
                  <p className="mt-2 text-lg text-ink-2">{t(s.body)}</p>
                </div>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* WHO ARE YOU */}
      <section className="mt-24">
        <Reveal><h2 className="text-3xl font-semibold sm:text-5xl">{t({ en: "Who are you?", hi: "तुम कौन हो?", bn: "তুমি কে?" })}</h2></Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r, i) => (
            <Reveal key={r.href} delay={i * 0.06}>
              <Tilt>
                <Link href={r.href} className="card flex h-full flex-col items-start gap-3 p-6">
                  <span className="grid h-16 w-16 place-items-center rounded-full text-white" style={{ background: r.color }}><r.icon size={30} /></span>
                  <span className="text-2xl font-semibold font-display">{t(r.title)}</span>
                  <span className="text-ink-2">{t(r.body)}</span>
                </Link>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="mt-24 border-t border-line pt-6 text-sm text-ink-3">
        <p>{t({ en: "Hackathon demo. All people, weights, rates, wastage norms and schedules shown are seeded demo values, not real records. Signing is demo signing: production would use device-bound keys or eSign. Tax and regulatory notes are informational only; verify with a CA.", hi: "हैकाथॉन डेमो। यहाँ दिखाए गए सभी लोग, वज़न, दरें, छीजत और तारीख़ें नमूना आँकड़े हैं, असली रिकॉर्ड नहीं। दस्तख़त डेमो दस्तख़त हैं। टैक्स की बातें सिर्फ़ जानकारी के लिए हैं; अपने CA से पूछें।", bn: "হ্যাকাথন ডেমো। এখানে দেখানো সব মানুষ, ওজন, দর, ক্ষয় আর তারিখ নমুনা তথ্য, আসল রেকর্ড নয়। সই ডেমো সই। করের কথা শুধু তথ্যের জন্য; নিজের CA-কে জিজ্ঞেস করুন।" })}</p>
      </footer>
    </div>
  );
}
