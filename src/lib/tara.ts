import type { Lang } from "./store";
import type { Facts } from "./facts";
import { grams } from "./ledger/units";
import type { L } from "./i18n";

/**
 * Tara's offline brain. No key, no network: it matches what was said (Hindi, Bengali, English, or
 * Hindi/Bengali typed in Latin letters) to an intent and answers ONLY from numbers the ledger engine computed.
 * She speaks to someone who may not read: short sentences, everyday words, one idea at a time.
 */
export type Reply = { say: string; go?: string; spot?: string; chips?: string[]; setLang?: Lang; tour?: boolean; unknown?: boolean };
export type Ctx = { lang: Lang; path: string; facts: Facts };

const rs = (paise: number) => Math.round(paise / 100).toLocaleString("en-IN");
const pick = (lang: Lang, s: L) => s[lang];

export const PAGE_HELP: Record<string, L> = {
  "/": {
    en: "This is the home page. Tarazu is one gold book that both the karigar and the jeweller sign. Tap the scale to play with it. To see your own account, press Mera Khata below.",
    hi: "यह पहला पन्ना है। तराज़ू एक ऐसी सोने की बही है जिस पर कारीगर और सेठ, दोनों के दस्तख़त होते हैं। तराज़ू को छूकर देखो। अपना हिसाब देखने के लिए नीचे मेरा खाता दबाओ।",
    bn: "এটা প্রথম পাতা। তরাজু হলো এমন একটা সোনার খাতা, যেখানে কারিগর আর মালিক দুজনেই সই করে। দাঁড়িপাল্লাটা ছুঁয়ে দেখো। নিজের হিসাব দেখতে নিচে আমার খাতা টিপো।",
  },
  "/karigar": {
    en: "This is your own book. On top is the gold you are holding. Below are your jobs and the money you are owed. Press the big microphone to tell me what gold you received. Nothing is saved until you say yes.",
    hi: "यह तुम्हारा अपना खाता है। सबसे ऊपर वह सोना है जो अभी तुम्हारे पास है। नीचे तुम्हारे काम और तुम्हारी मज़दूरी है। बड़ा माइक दबाकर बताओ कि कितना सोना मिला। जब तक तुम हाँ नहीं बोलोगे, कुछ भी पक्का नहीं होगा।",
    bn: "এটা তোমার নিজের খাতা। সবার উপরে আছে এখন তোমার কাছে কত সোনা। নিচে তোমার কাজ আর পাওনা মজুরি। বড় মাইক টিপে বলো কত সোনা পেলে। তুমি হ্যাঁ না বললে কিছুই পাকা হবে না।",
  },
  "/jeweller": {
    en: "This is the shop owner's desk. It shows every karigar, the gold out with each, and entries waiting for the owner's signature. The owner cannot change an entry after both have signed.",
    hi: "यह सेठ जी की मेज़ है। यहाँ हर कारीगर, उसके पास कितना सोना है, और कौन-सी एंट्री सेठ के दस्तख़त का इंतज़ार कर रही है, सब दिखता है। दोनों के दस्तख़त के बाद सेठ भी एंट्री नहीं बदल सकता।",
    bn: "এটা মালিকের টেবিল। এখানে প্রত্যেক কারিগর, কার কাছে কত সোনা, আর কোন এন্ট্রি মালিকের সইয়ের অপেক্ষায়, সব দেখা যায়। দুজনের সইয়ের পর মালিকও এন্ট্রি বদলাতে পারে না।",
  },
  "/agents": {
    en: "This is the meeting room. One helper speaks for the karigar, one for the jeweller, and a neutral one finds a fair middle. They only suggest. You and the jeweller decide.",
    hi: "यह पंचायत का कमरा है। एक सहायक कारीगर की तरफ़ से बोलता है, एक सेठ की तरफ़ से, और तीसरा बीच का सही रास्ता निकालता है। ये सिर्फ़ सुझाव देते हैं। फ़ैसला तुम और सेठ करते हो।",
    bn: "এটা বৈঠকের ঘর। একজন সহায়ক কারিগরের হয়ে কথা বলে, একজন মালিকের হয়ে, আর তৃতীয়জন মাঝামাঝি ন্যায্য পথ বের করে। ওরা শুধু পরামর্শ দেয়। সিদ্ধান্ত নাও তুমি আর মালিক।",
  },
  "/ledger": {
    en: "This is the big book. Every entry is a link in a chain. If anyone secretly changes an old entry, that link turns red and everyone can see it.",
    hi: "यह बड़ी बही है। हर एंट्री ज़ंजीर की एक कड़ी है। अगर कोई चुपके से पुरानी एंट्री बदले, तो वह कड़ी लाल हो जाती है और सबको दिख जाती है।",
    bn: "এটা বড় খাতা। প্রতিটা এন্ট্রি শিকলের একটা কড়া। কেউ চুপিচুপি পুরনো এন্ট্রি বদলালে সেই কড়া লাল হয়ে যায়, সবাই দেখতে পায়।",
  },
  "/track": {
    en: "This page is for the customer. It shows how far the wedding jewellery has come and how sure we are it will be ready in time. It never shows gold weights.",
    hi: "यह पन्ना ग्राहक के लिए है। इसमें दिखता है कि शादी का गहना कहाँ तक बना है और समय पर तैयार होने का कितना भरोसा है। इसमें सोने का वज़न नहीं दिखता।",
    bn: "এই পাতা খদ্দেরের জন্য। বিয়ের গয়না কতদূর হলো আর সময়মতো হবে কি না, তা দেখায়। এখানে সোনার ওজন দেখা যায় না।",
  },
  "/passport": {
    en: "This is your trust passport. It is your record of honest work. You choose what to show, and to whom. A bank or a new jeweller can scan the code only if you allow it.",
    hi: "यह तुम्हारा भरोसा पासपोर्ट है। यह तुम्हारे ईमानदार काम का रिकॉर्ड है। क्या दिखाना है और किसे, यह तुम तय करते हो। बैंक या नया सेठ कोड तभी देख सकता है जब तुम हाँ बोलो।",
    bn: "এটা তোমার ভরসা পাসপোর্ট। এটা তোমার সৎ কাজের রেকর্ড। কী দেখাবে আর কাকে, তুমি ঠিক করো। ব্যাংক বা নতুন মালিক কোড তখনই দেখতে পারে, যখন তুমি হ্যাঁ বলো।",
  },
  "/demo": {
    en: "This page plays the whole story step by step. Press Next to move forward.",
    hi: "यह पन्ना पूरी कहानी एक-एक क़दम में दिखाता है। आगे बढ़ने के लिए अगला दबाओ।",
    bn: "এই পাতা পুরো গল্পটা ধাপে ধাপে দেখায়। এগোতে পরেরটা টিপো।",
  },
};

type Intent = { re: RegExp; run: (c: Ctx) => Reply };

const INTENTS: Intent[] = [
  { // language switch
    re: /\bhindi\b|हिंदी|हिन्दी/i,
    run: () => ({ setLang: "hi", say: "ठीक है, अब मैं हिंदी में बात करूँगी।" }),
  },
  { re: /bangla|bengali|বাংলা/i, run: () => ({ setLang: "bn", say: "ঠিক আছে, এখন থেকে বাংলায় কথা বলব।" }) },
  { re: /\benglish\b|अंग्रेज़ी|ইংরেজি/i, run: () => ({ setLang: "en", say: "Sure, I will speak English now." }) },

  { // books do not match
    re: /hisab alag|hisaab alag|alag hai|galat|mismatch|not match|don'?t match|wrong|differ|हिसाब अलग|अलग है|ग़लत|गलत|মিলছে না|মেলে না|ভুল|আলাদা|গরমিল/i,
    run: (c) => ({
      go: "/karigar?do=mismatch", spot: "mismatch",
      say: pick(c.lang, {
        en: "Do not worry. I will put your notebook next to the big book and find the exact entry where they split. Press the red button, My count is different.",
        hi: "घबराओ मत। मैं तुम्हारी कॉपी को बड़ी बही के साथ रखकर ठीक वही एंट्री ढूँढूँगी जहाँ से हिसाब अलग हुआ। लाल बटन दबाओ, मेरा हिसाब अलग है।",
        bn: "চিন্তা কোরো না। আমি তোমার খাতা বড় খাতার পাশে রেখে ঠিক সেই এন্ট্রি খুঁজে দেব, যেখান থেকে হিসাব আলাদা হয়েছে। লাল বোতাম টিপো, আমার হিসাব আলাদা।",
      }),
    }),
  },
  { // record gold received
    re: /sona mila|gold (received|got)|mila hai|record (the |my )?gold|likh ?(do|lo)|सोना मिला|मिला है|लिखो|दर्ज|সোনা পেলাম|পেয়েছি|লেখো|\d+\s*(g\b|gram|ग्राम|গ্রাম)/i,
    run: (c) => ({
      go: "/karigar", spot: "mic",
      say: pick(c.lang, {
        en: "To write down gold you received, press the big microphone and say it like this: today I got 250 gram 22 carat gold. I will read it back. It is saved only after you say yes.",
        hi: "मिला हुआ सोना लिखने के लिए बड़ा माइक दबाओ और ऐसे बोलो: आज ढाई सौ ग्राम बाईस कैरेट सोना मिला। मैं पढ़कर सुनाऊँगी। तुम्हारे हाँ बोलने के बाद ही लिखा जाएगा।",
        bn: "পাওয়া সোনা লিখতে বড় মাইক টিপে এভাবে বলো: আজ আড়াইশো গ্রাম বাইশ ক্যারেট সোনা পেলাম। আমি পড়ে শোনাব। তুমি হ্যাঁ বললে তবেই লেখা হবে।",
      }),
    }),
  },
  { // money
    re: /paisa|paise|payment|money|majdoori|mazdoori|labour|wage|kab milega|पैसा|पैसे|मज़दूरी|मजदूरी|भुगतान|টাকা|মজুরি|পাওনা|পেমেন্ট/i,
    run: (c) => {
      const p = c.facts.clocks[0];
      if (!p) return { go: "/karigar", spot: "pay", say: pick(c.lang, { en: "No money is pending for you right now.", hi: "अभी तुम्हारा कोई पैसा बाक़ी नहीं है।", bn: "এখন তোমার কোনো টাকা বাকি নেই।" }) };
      return {
        go: "/karigar", spot: "pay",
        say: pick(c.lang, {
          en: `You are owed ${rs(p.amountPaise)} rupees for job ${p.jobId}. It was promised in ${p.promisedDays} days. ${p.elapsedDays} days have passed${p.late ? ", so it is late" : ""}. This shop usually pays in ${c.facts.payerDays} days. I have marked it red for the owner.`,
          hi: `काम ${p.jobId} के ${rs(p.amountPaise)} रुपये तुम्हें मिलने हैं। वादा ${p.promisedDays} दिन का था। ${p.elapsedDays} दिन हो गए${p.late ? ", यानी देर हो चुकी है" : ""}। यह दुकान आम तौर पर ${c.facts.payerDays} दिन में पैसा देती है। मैंने सेठ के लिए इसे लाल कर दिया है।`,
          bn: `কাজ ${p.jobId}-এর ${rs(p.amountPaise)} টাকা তোমার পাওনা। কথা ছিল ${p.promisedDays} দিনে দেবে। ${p.elapsedDays} দিন হয়ে গেছে${p.late ? ", মানে দেরি হয়েছে" : ""}। এই দোকান সাধারণত ${c.facts.payerDays} দিনে টাকা দেয়। মালিকের জন্য আমি এটা লাল করে দিয়েছি।`,
        }),
      };
    },
  },
  { // my gold
    re: /sona|gold|kitna|how much|balance|सोना|कितना|সোনা|কত/i,
    run: (c) => ({
      go: "/karigar", spot: "gold",
      say: pick(c.lang, {
        en: `Right now you are holding ${grams(c.facts.holdingMg)} grams of pure gold, across ${c.facts.openJobs.length} open jobs. Entries still waiting for a signature are not counted.`,
        hi: `अभी तुम्हारे पास ${grams(c.facts.holdingMg)} ग्राम खरा सोना है, ${c.facts.openJobs.length} चालू कामों में। जिन एंट्री पर अभी दस्तख़त बाक़ी हैं, वे इसमें नहीं गिनी गईं।`,
        bn: `এখন তোমার কাছে ${grams(c.facts.holdingMg)} গ্রাম খাঁটি সোনা আছে, ${c.facts.openJobs.length}টা চালু কাজে। যে এন্ট্রিতে এখনো সই বাকি, সেগুলো এতে ধরা হয়নি।`,
      }),
    }),
  },
  { // passport / loan
    re: /passport|loan|karz|karza|udhaar|bank|पासपोर्ट|क़र्ज़|कर्ज|लोन|बैंक|পাসপোর্ট|ঋণ|লোন|ব্যাংক/i,
    run: (c) => ({ go: "/passport", spot: "passport", say: pick(c.lang, PAGE_HELP["/passport"]) }),
  },
  { // wedding / deadline
    re: /shaadi|shadi|wedding|deadline|late|time par|kab tak|date|शादी|समय|देर|तारीख़|तारीख|বিয়ে|সময়|দেরি|তারিখ/i,
    run: (c) => ({
      go: "/track", spot: "ontime",
      say: pick(c.lang, {
        en: `Aarti's wedding is in ${c.facts.daysToWedding} days. The chance of finishing on time is ${Math.round(c.facts.sim.onTimeBp / 100)} percent right now. If it drops, I suggest sharing part of the work. Nobody is moved without saying yes.`,
        hi: `आरती की शादी ${c.facts.daysToWedding} दिन में है। समय पर पूरा होने का भरोसा अभी ${Math.round(c.facts.sim.onTimeBp / 100)} प्रतिशत है। अगर यह घटे, तो मैं काम बाँटने का सुझाव देती हूँ। बिना हाँ के किसी का काम नहीं बदला जाता।`,
        bn: `আরতির বিয়ে ${c.facts.daysToWedding} দিন পরে। সময়মতো শেষ হওয়ার ভরসা এখন ${Math.round(c.facts.sim.onTimeBp / 100)} শতাংশ। এটা কমলে আমি কাজ ভাগ করার পরামর্শ দিই। হ্যাঁ না বললে কারও কাজ বদলানো হয় না।`,
      }),
    }),
  },
  { // safety
    re: /safe|secure|dhokha|cheat|badal|change|edit|chori|धोखा|सुरक्षित|बदल|चोरी|ঠক|নিরাপদ|বদল|চুরি/i,
    run: (c) => ({
      go: "/ledger", spot: "chain",
      say: pick(c.lang, {
        en: "Your book is safe. An entry becomes final only when you and the jeweller both sign. After that nobody can change it, not even the jeweller. If someone tries, the chain turns red.",
        hi: "तुम्हारा खाता सुरक्षित है। एंट्री तभी पक्की होती है जब तुम और सेठ दोनों दस्तख़त करो। उसके बाद कोई उसे नहीं बदल सकता, सेठ भी नहीं। कोई कोशिश करे तो ज़ंजीर लाल हो जाती है।",
        bn: "তোমার খাতা নিরাপদ। এন্ট্রি তখনই পাকা হয়, যখন তুমি আর মালিক দুজনেই সই করো। তারপর কেউ সেটা বদলাতে পারে না, মালিকও না। কেউ চেষ্টা করলে শিকল লাল হয়ে যায়।",
      }),
    }),
  },
  { // wastage / fairness
    re: /wastage|ghat|ghaat|chhijat|loss|fair|घट|छीजत|घाट|নষ্ট|ঘাটতি|ক্ষয়/i,
    run: (c) => ({
      go: "/agents", spot: "band",
      say: pick(c.lang, {
        en: "Wastage is the gold lost while working. Tarazu looks at many past jobs to find what loss is normal. If the limit you were given is too tight, I say so, and a fair middle is offered for both to sign.",
        hi: "छीजत वह सोना है जो काम करते समय घट जाता है। तराज़ू पुराने बहुत से काम देखकर बताता है कि कितनी छीजत आम है। अगर तुम्हें दी गई सीमा बहुत कम है, तो मैं बोलती हूँ, और बीच का सही हिसाब दोनों के दस्तख़त के लिए रखा जाता है।",
        bn: "ক্ষয় হলো কাজের সময় যে সোনা কমে যায়। তরাজু আগের অনেক কাজ দেখে বলে, কতটা ক্ষয় স্বাভাবিক। তোমাকে দেওয়া সীমা খুব কম হলে আমি বলি, আর মাঝামাঝি ন্যায্য হিসাব দুজনের সইয়ের জন্য রাখা হয়।",
      }),
    }),
  },
  { re: /tour|ghuma|dikhao sab|show me around|सब दिखाओ|घुमाओ|ঘুরিয়ে|সব দেখাও/i, run: (c) => ({ tour: true, say: pick(c.lang, { en: "Come, I will show you around.", hi: "चलो, मैं सब दिखाती हूँ।", bn: "চলো, আমি সব ঘুরিয়ে দেখাই।" }) }) },
  { re: /home|ghar|shuru|घर|शुरू|বাড়ি|শুরু/i, run: (c) => ({ go: "/", say: pick(c.lang, PAGE_HELP["/"]) }) },
  { re: /khata|mera hisab|my account|my book|खाता|আমার খাতা|খাতা/i, run: (c) => ({ go: "/karigar", say: pick(c.lang, PAGE_HELP["/karigar"]) }) },
  { re: /seth|jeweller|jeweler|malik|dukan|shop|सेठ|दुकान|मालिक|মালিক|দোকান/i, run: (c) => ({ go: "/jeweller", say: pick(c.lang, PAGE_HELP["/jeweller"]) }) },
  { re: /bahi|ledger|chain|zanjeer|बही|ज़ंजीर|শিকল|বড় খাতা/i, run: (c) => ({ go: "/ledger", spot: "chain", say: pick(c.lang, PAGE_HELP["/ledger"]) }) },
  { // what is this page
    re: /yeh kya|ye kya|kya hai|what is this|this page|samjha|explain|help|madad|यह क्या|ये क्या|क्या है|समझा|मदद|এটা কী|কী এটা|বোঝাও|সাহায্য/i,
    run: (c) => ({ say: pick(c.lang, PAGE_HELP[c.path] ?? PAGE_HELP["/"]) }),
  },
  { re: /^(hi|hello|hey|namaste|namaskar|नमस्ते|नमस्कार|নমস্কার|হ্যালো)(\s|$|[,.!])/i, run: (c) => ({ say: greeting(c.lang) }) },
  { re: /thank|shukriya|dhanyavad|धन्यवाद|शुक्रिया|ধন্যবাদ/i, run: (c) => ({ say: pick(c.lang, { en: "Happy to help. Call me any time.", hi: "ख़ुशी हुई। जब चाहो बुला लेना।", bn: "ভালো লাগল। যখন খুশি ডেকো।" }) }) },
];

export const greeting = (lang: Lang) =>
  pick(lang, {
    en: "Hello, I am Tara. I will help you use this. Press the microphone and ask me anything, in your own words.",
    hi: "नमस्ते, मैं तारा हूँ। मैं इसे चलाने में तुम्हारी मदद करूँगी। माइक दबाओ और अपनी बोली में कुछ भी पूछो।",
    bn: "নমস্কার, আমি তারা। এটা চালাতে আমি তোমাকে সাহায্য করব। মাইক টিপে নিজের ভাষায় যা খুশি জিজ্ঞেস করো।",
  });

export const CHIPS: { id: string; label: L; ask: string }[] = [
  { id: "page", label: { en: "What is this page?", hi: "यह पन्ना क्या है?", bn: "এই পাতাটা কী?" }, ask: "what is this page" },
  { id: "gold", label: { en: "How much gold do I have?", hi: "मेरे पास कितना सोना है?", bn: "আমার কাছে কত সোনা?" }, ask: "sona kitna" },
  { id: "pay", label: { en: "When do I get paid?", hi: "पैसा कब मिलेगा?", bn: "টাকা কবে পাব?" }, ask: "paisa kab milega" },
  { id: "diff", label: { en: "My count is different", hi: "मेरा हिसाब अलग है", bn: "আমার হিসাব আলাদা" }, ask: "hisab alag hai" },
  { id: "safe", label: { en: "Is my book safe?", hi: "क्या मेरा खाता सुरक्षित है?", bn: "আমার খাতা কি নিরাপদ?" }, ask: "is it safe" },
  { id: "tour", label: { en: "Show me around", hi: "सब घुमाकर दिखाओ", bn: "সব ঘুরিয়ে দেখাও" }, ask: "tour" },
];

export function brain(text: string, c: Ctx): Reply {
  const s = text.trim();
  for (const i of INTENTS) if (i.re.test(s)) return i.run(c);
  return {
    unknown: true,
    say: pick(c.lang, {
      en: "Sorry, I did not catch that. You can ask about your gold, your money, or say: my count is different.",
      hi: "माफ़ करना, मैं समझ नहीं पाई। तुम अपने सोने, अपने पैसे के बारे में पूछ सकते हो, या बोलो: मेरा हिसाब अलग है।",
      bn: "মাফ করো, বুঝতে পারলাম না। তুমি তোমার সোনা বা টাকার কথা জিজ্ঞেস করতে পারো, অথবা বলো: আমার হিসাব আলাদা।",
    }),
  };
}

export const TOUR: { go: string; spot?: string }[] = [
  { go: "/" }, { go: "/karigar", spot: "gold" }, { go: "/ledger", spot: "chain" }, { go: "/agents" }, { go: "/track", spot: "ontime" }, { go: "/passport", spot: "passport" },
];

/** A compact, grounded snapshot for the optional free LLM. It may quote these numbers and no others. */
export function snapshot(c: Ctx) {
  const p = c.facts.clocks[0];
  return {
    user: c.facts.who.name, page: c.path, holding_grams_fine: grams(c.facts.holdingMg), open_jobs: c.facts.openJobs.map((j) => `${j.id} ${j.item}`),
    labour_due: p ? { job: p.jobId, rupees: rs(p.amountPaise), promised_days: p.promisedDays, elapsed_days: p.elapsedDays } : null,
    shop_median_days_to_pay: c.facts.payerDays, entries_waiting_for_my_signature: c.facts.toSign,
    wedding_in_days: c.facts.daysToWedding, on_time_percent: Math.round(c.facts.sim.onTimeBp / 100),
  };
}
