"use client";
import { motion } from "framer-motion";
import { Check, Gem, Heart, PackageCheck, PenTool, ShieldCheck, Sparkles, Stamp, Flame, EyeOff } from "lucide-react";
import { PageHead, Ring, Speak, Tilt } from "@/components/ui";
import { useFacts } from "@/lib/facts";
import { useT, type L } from "@/lib/i18n";
import { useStore } from "@/lib/store";

const STAGES: { icon: typeof Gem; label: L }[] = [
  { icon: PenTool, label: { en: "Design", hi: "डिज़ाइन", bn: "নকশা" } },
  { icon: Flame, label: { en: "Casting", hi: "ढलाई", bn: "ঢালাই" } },
  { icon: Gem, label: { en: "Setting", hi: "जड़ाई", bn: "পাথর বসানো" } },
  { icon: Sparkles, label: { en: "Polish", hi: "पॉलिश", bn: "পালিশ" } },
  { icon: Stamp, label: { en: "Hallmark", hi: "हॉलमार्क", bn: "হলমার্ক" } },
  { icon: PackageCheck, label: { en: "Delivery", hi: "डिलीवरी", bn: "ডেলিভারি" } },
];
const CURRENT = 2;

export default function TrackPage() {
  const t = useT();
  const f = useFacts();
  const { weddingTs, rebalance, lang } = useStore();
  const p = Math.round(f.sim.onTimeBp / 100);
  const safe = f.sim.onTimeBp >= 8000;
  const date = new Date(weddingTs).toLocaleDateString(lang === "hi" ? "hi-IN" : lang === "bn" ? "bn-IN" : "en-IN", { day: "numeric", month: "long", year: "numeric" });
  const said = safe
    ? t({ en: `Good news, Aarti. Your bridal set is at the setting stage. We are ${p} percent sure it will be ready before your wedding, ${f.daysToWedding} days from now.`, hi: `ख़ुशख़बरी, आरती। आपका ब्राइडल सेट जड़ाई में है। ${f.daysToWedding} दिन बाद आपकी शादी से पहले तैयार होने का ${p} प्रतिशत भरोसा है।`, bn: `সুখবর, আরতি। আপনার ব্রাইডাল সেট এখন পাথর বসানোর ধাপে। ${f.daysToWedding} দিন পরে আপনার বিয়ের আগে তৈরি হওয়ার ভরসা ${p} শতাংশ।` })
    : t({ en: `Aarti, your bridal set is at the setting stage. Right now we are ${p} percent sure it will be ready in time. That is lower than we like, so the shop has already been alerted and is rearranging work.`, hi: `आरती, आपका ब्राइडल सेट जड़ाई में है। अभी समय पर तैयार होने का भरोसा ${p} प्रतिशत है। यह कम है, इसलिए दुकान को पहले ही ख़बर कर दी गई है और काम दोबारा बाँटा जा रहा है।`, bn: `আরতি, আপনার ব্রাইডাল সেট এখন পাথর বসানোর ধাপে। এখন সময়মতো তৈরি হওয়ার ভরসা ${p} শতাংশ। এটা কম, তাই দোকানকে আগেই জানানো হয়েছে, কাজ নতুন করে ভাগ হচ্ছে।` });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHead kicker={t({ en: "Order tracker · for the customer", hi: "ऑर्डर ट्रैकर · ग्राहक के लिए", bn: "অর্ডার ট্র্যাকার · খদ্দেরের জন্য" })} title={t({ en: "Aarti's bridal set", hi: "आरती का ब्राइडल सेट", bn: "আরতির ব্রাইডাল সেট" })} sub="Mehta Jewellers · J-1042" right={<Speak text={said} />} />

      <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]">
        <Tilt>
          <section className="card relative h-full overflow-hidden p-6 text-center">
            <div className="shimmer absolute inset-0 opacity-40" />
            <Heart className="mx-auto text-terracotta" size={34} fill="currentColor" />
            <div className="mt-2 text-sm font-bold uppercase tracking-widest text-ink-3">{t({ en: "Wedding day", hi: "शादी का दिन", bn: "বিয়ের দিন" })}</div>
            <div className="font-display text-2xl font-semibold">{date}</div>
            <motion.div key={f.daysToWedding} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="num gold-text mt-3 text-8xl font-bold leading-none">{f.daysToWedding}</motion.div>
            <div className="text-lg font-bold text-ink-2">{t({ en: "days to go", hi: "दिन बाक़ी", bn: "দিন বাকি" })}</div>
          </section>
        </Tilt>

        <section data-tara="ontime" className="card p-6">
          <div className="flex items-center gap-5">
            <Ring bp={f.sim.onTimeBp} size={148} label={t({ en: "on time", hi: "समय पर", bn: "সময়মতো" })} />
            <div>
              <span className={`chip ${safe ? "chip-ok" : "chip-warn"} px-3 py-1.5 text-sm`}>{safe ? <><ShieldCheck size={15} />{t({ en: "Date protected", hi: "तारीख़ सुरक्षित", bn: "তারিখ সুরক্ষিত" })}</> : t({ en: "At risk. Shop alerted.", hi: "ख़तरा। दुकान को ख़बर है।", bn: "ঝুঁকি। দোকান জানে।" })}</span>
              <p className="mt-2 text-lg">{said}</p>
            </div>
          </div>
          {rebalance === "accepted" && <div className="chip chip-ok mt-4 px-3 py-2 text-sm"><Check size={15} />{t({ en: "A second artisan has taken the earrings so both pieces move together.", hi: "दूसरे कारीगर ने झुमके ले लिए हैं, ताकि दोनों गहने साथ-साथ बनें।", bn: "আরেকজন কারিগর দুল নিয়েছে, যাতে দুটো গয়না একসাথে এগোয়।" })}</div>}
        </section>
      </div>

      <section className="card mt-5 p-6">
        <h2 className="text-2xl font-semibold">{t({ en: "Where it is now", hi: "अभी कहाँ तक पहुँचा", bn: "এখন কোথায়" })}</h2>
        <ol className="mt-6 grid grid-cols-3 gap-y-6 sm:grid-cols-6">
          {STAGES.map((s, i) => {
            const done = i < CURRENT, now = i === CURRENT;
            return (
              <li key={i} className="relative flex flex-col items-center text-center">
                {i > 0 && <span className={`absolute right-1/2 top-7 hidden h-1 w-full -translate-y-1/2 sm:block ${i <= CURRENT ? "bg-verdigris" : "bg-line"}`} />}
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.08, type: "spring" }} className={`relative z-10 grid h-14 w-14 place-items-center rounded-full border-4 border-paper ${done ? "bg-verdigris text-white" : now ? "gold-fill pulse-ring text-ink" : "bg-line text-ink-3"}`}>{done ? <Check size={26} /> : <s.icon size={24} />}</motion.span>
                <span className={`mt-2 text-sm font-bold ${now ? "text-gold-deep" : done ? "text-verdigris" : "text-ink-3"}`}>{t(s.label)}</span>
                {now && <span className="text-xs text-ink-3">{t({ en: "now", hi: "अभी", bn: "এখন" })}</span>}
              </li>
            );
          })}
        </ol>
        <p className="mt-6 flex items-start gap-2 text-sm text-ink-3"><EyeOff size={16} className="mt-0.5 shrink-0" />{t({ en: "This page never shows gold weights, karigar accounts or prices. Hallmarking (BIS/HUID) is a planned step before delivery.", hi: "इस पन्ने पर सोने का वज़न, कारीगर का हिसाब या दाम कभी नहीं दिखता। डिलीवरी से पहले हॉलमार्क (BIS/HUID) तय क़दम है।", bn: "এই পাতায় সোনার ওজন, কারিগরের হিসাব বা দাম কখনো দেখা যায় না। ডেলিভারির আগে হলমার্ক (BIS/HUID) একটা নির্ধারিত ধাপ।" })}</p>
      </section>
    </div>
  );
}
