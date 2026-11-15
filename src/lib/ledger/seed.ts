import { draft, finalize, signInto, type EventBody, type EventType, type Job, type LedgerEvent, type Payload } from "./engine";
import type { BookRow, HistoryRow } from "./analytics";
import { PURITY, rng } from "./units";

// Everything here is seeded DEMO data. Rates, wastage norms and stage times are config values, not field facts.

export type Karigar = { id: string; name: string; nameLocal: string; lang: "bn" | "hi"; city: string; since: number; tier: string };

export const KARIGARS: Karigar[] = [
  { id: "bablu", name: "Bablu Maity", nameLocal: "বাবলু মাইতি", lang: "bn", city: "Medinipur → Jaipur", since: 2011, tier: "Master" },
  { id: "rafiq", name: "Rafiq Ali", nameLocal: "रफ़ीक़ अली", lang: "hi", city: "Jaipur", since: 2015, tier: "Senior" },
  { id: "suresh", name: "Suresh Soni", nameLocal: "सुरेश सोनी", lang: "hi", city: "Jaipur", since: 2018, tier: "Senior" },
];

export const DESIGN_CLASSES: Record<string, string> = {
  HAAR_22K: "22K heavy haar / necklace",
  BANGLE_22K: "22K bangles / kada",
  RING_18K: "18K rings / studded",
};

export const DAY = 86_400_000;

/** Jewellery names as a karigar would say them, so a Hindi or Bengali voice reads them naturally. */
const ITEM_NAMES: Record<string, { hi: string; bn: string }> = {
  "Bridal haar + earrings": { hi: "ब्राइडल हार और झुमके", bn: "ব্রাইডাল হার আর দুল" },
  "Baby kada": { hi: "बच्चे का कड़ा", bn: "বাচ্চার বালা" },
  "Nath": { hi: "नथ", bn: "নথ" },
  "Jhumka pair": { hi: "झुमकों की जोड़ी", bn: "ঝুমকো জোড়া" },
  "Mangalsutra": { hi: "मंगलसूत्र", bn: "মঙ্গলসূত্র" },
  "Bangles (set of 6)": { hi: "चूड़ियाँ (6 का सेट)", bn: "চুড়ি (6টার সেট)" },
  "Choker set": { hi: "चोकर सेट", bn: "চোকার সেট" },
  "Temple haar": { hi: "टेम्पल हार", bn: "টেম্পল হার" },
  "Rani haar": { hi: "रानी हार", bn: "রানি হার" },
  "Kada pair": { hi: "कड़ों की जोड़ी", bn: "বালা জোড়া" },
  "Cocktail ring": { hi: "कॉकटेल अंगूठी", bn: "ককটেল আংটি" },
};
export const itemName = (item: string, lang: "en" | "hi" | "bn") => (lang === "en" ? item : ITEM_NAMES[item]?.[lang] ?? item);

// z(q) via a logistic approximation of the normal quantile: good to a few percent, and exactly 0 at the median.
const z = (q: number) => Math.log(q / (1 - q)) / 1.702;

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ~14 months, 120 closed jobs. Loss is drawn by quantile so each class has a stable, known-shape band. */
export function seedHistory(): HistoryRow[] {
  const r = rng(1042);
  const spec: [string, number, number, number, number][] = [
    // class, n, median bp, spread below, spread above
    ["HAAR_22K", 41, 380, 70, 62],
    ["BANGLE_22K", 40, 210, 45, 50],
    ["RING_18K", 39, 290, 55, 60],
  ];
  const rows: HistoryRow[] = [];
  let id = 880;
  for (const [designClass, n, mid, below, above] of spec) {
    const losses = shuffle(Array.from({ length: n }, (_, i) => {
      const zz = z((i + 0.5) / n);
      return Math.round(mid + zz * (zz < 0 ? below : above));
    }), r);
    for (let i = 0; i < n; i++) {
      rows.push({ id: `J-${id++}`, karigarId: KARIGARS[Math.floor(r() * 3)].id, designClass, lossBp: losses[i], onTime: r() < 0.9, payDays: 0, fineMg: 40_000 + Math.floor(r() * 200) * 1000 });
    }
  }
  const pay = shuffle(Array.from({ length: rows.length }, (_, i) => Math.max(2, Math.round(11 + 5 * z((i + 0.5) / rows.length)))), r);
  rows.forEach((row, i) => (row.payDays = pay[i]));
  return rows;
}

export type Seed = {
  chain: LedgerEvent[]; pending: LedgerEvent[]; jobs: Job[]; history: HistoryRow[];
  babluBook: BookRow[]; weddingTs: number; now: number; nextEventNo: number;
};

export function eventId(n: number) {
  return "E-" + String(n).padStart(4, "0");
}

export function buildSeed(now = Date.now()): Seed {
  const chain: LedgerEvent[] = [];
  let n = 1;
  const today = new Date(now); today.setHours(9, 0, 0, 0);
  const t0 = today.getTime();
  const K22 = PURITY.K22;

  const add = (daysAgo: number, type: EventType, jobId: string, karigarId: string, payload: Payload, legacy = false) => {
    const body: EventBody = { id: eventId(n++), type, jobId, karigarId, ts: t0 - daysAgo * DAY + n * 60_000, payload, ...(legacy ? { legacy: true } : {}) };
    const e = draft(body);
    signInto(e, "jeweller");
    if (!legacy) signInto(e, "karigar");
    return finalize(chain, e);
  };

  const jobs: Job[] = [
    { id: "J-1012", karigarId: "suresh", item: "Kada pair", designClass: "BANGLE_22K", purityBp: K22, capBp: 250, policy: "CAP_ONLY", status: "SETTLED" },
    { id: "J-1015", karigarId: "rafiq", item: "Rani haar", designClass: "HAAR_22K", purityBp: K22, capBp: 400, policy: "CAP_ONLY", status: "SETTLED" },
    { id: "J-1017", karigarId: "bablu", item: "Choker set", designClass: "HAAR_22K", purityBp: K22, capBp: 400, policy: "CAP_ONLY", status: "SETTLED" },
    { id: "J-1019", karigarId: "bablu", item: "Bangles (set of 6)", designClass: "BANGLE_22K", purityBp: K22, capBp: 300, policy: "CAP_ONLY", status: "RETURNED" },
    { id: "J-1040", karigarId: "bablu", item: "Mangalsutra", designClass: "HAAR_22K", purityBp: K22, capBp: 400, policy: "CAP_ONLY", status: "RETURNED" },
    { id: "J-1041", karigarId: "suresh", item: "Cocktail ring", designClass: "RING_18K", purityBp: PURITY.K18, capBp: 350, policy: "CAP_ONLY", status: "OPEN" },
    { id: "J-1042", karigarId: "bablu", item: "Bridal haar + earrings", designClass: "HAAR_22K", purityBp: K22, capBp: 300, policy: "CAP_ONLY", status: "OPEN", customer: "Aarti" },
    { id: "J-1043", karigarId: "rafiq", item: "Temple haar", designClass: "HAAR_22K", purityBp: K22, capBp: 250, policy: "CAP_ONLY", status: "RETURNED" },
    { id: "J-1044", karigarId: "bablu", item: "Jhumka pair", designClass: "RING_18K", purityBp: K22, capBp: 350, policy: "CAP_ONLY", status: "OPEN" },
    { id: "J-1045", karigarId: "bablu", item: "Nath", designClass: "RING_18K", purityBp: K22, capBp: 350, policy: "CAP_ONLY", status: "OPEN" },
    { id: "J-1046", karigarId: "bablu", item: "Baby kada", designClass: "BANGLE_22K", purityBp: K22, capBp: 300, policy: "CAP_ONLY", status: "OPEN" },
  ];

  const closed = (daysAgo: number, jobId: string, k: string, issue: number, fin: number, scrap: number, labour: number, paidAfter: number) => {
    add(daysAgo, "ISSUE", jobId, k, { netMg: issue, purityBp: K22 });
    add(daysAgo - 9, "RECEIVE_FINISHED", jobId, k, { netMg: fin, purityBp: K22 });
    add(daysAgo - 9, "RECEIVE_SCRAP", jobId, k, { netMg: scrap, purityBp: 8500 });
    add(daysAgo - 9, "LABOUR_DUE", jobId, k, { amountPaise: labour, promisedDays: 7 });
    add(daysAgo - 9, "SETTLEMENT_SIGNED", jobId, k, { note: "Within agreed cap" });
    add(daysAgo - 9 - paidAfter, "PAYMENT_MADE", jobId, k, { amountPaise: labour });
  };
  closed(74, "J-1012", "suresh", 80_000, 76_900, 1_900, 9_600_00, 12);
  closed(66, "J-1015", "rafiq", 180_000, 170_600, 4_800, 21_000_00, 10);
  closed(58, "J-1017", "bablu", 140_000, 132_300, 4_100, 17_500_00, 13);

  // J-1019 came in from the jeweller's old notebook: single-signed, flagged. Bablu's own book says 118.520.
  add(44, "ISSUE", "J-1019", "bablu", { netMg: 125_000, purityBp: K22 }, true);
  add(36, "RECEIVE_FINISHED", "J-1019", "bablu", { netMg: 118_250, purityBp: K22 }, true);
  add(36, "RECEIVE_SCRAP", "J-1019", "bablu", { netMg: 2_900, purityBp: 8500 }, true);

  // J-1040: delivered, labour promised in 7 days, still unpaid 19 days later (Scenario E).
  add(30, "ISSUE", "J-1040", "bablu", { netMg: 60_000, purityBp: K22 });
  add(19, "RECEIVE_FINISHED", "J-1040", "bablu", { netMg: 56_900, purityBp: K22 });
  add(19, "RECEIVE_SCRAP", "J-1040", "bablu", { netMg: 1_300, purityBp: 8500 });
  add(19, "LABOUR_DUE", "J-1040", "bablu", { amountPaise: 18_500_00, promisedDays: 7 });

  add(9, "ISSUE", "J-1041", "suresh", { netMg: 40_000, purityBp: PURITY.K18 });

  // J-1043: Rafiq, a 2.50% cap on a heavy haar (Scenario B).
  add(16, "AGREEMENT_SET", "J-1043", "rafiq", { capBp: 250, policy: "CAP_ONLY" });
  add(16, "ISSUE", "J-1043", "rafiq", { netMg: 100_000, purityBp: K22 });
  add(3, "RECEIVE_FINISHED", "J-1043", "rafiq", { netMg: 93_100, purityBp: K22 });
  add(3, "RECEIVE_SCRAP", "J-1043", "rafiq", { netMg: 3_000, purityBp: 8000 });
  add(2, "DISPUTE_OPENED", "J-1043", "rafiq", { note: "Karigar contests the excess-loss claim" });

  add(7, "ISSUE", "J-1044", "bablu", { netMg: 32_000, purityBp: K22 });
  add(6, "ISSUE", "J-1045", "bablu", { netMg: 12_500, purityBp: K22 });
  add(5, "ISSUE", "J-1046", "bablu", { netMg: 18_000, purityBp: K22 });

  // J-1042: agreement is written down; the gold issue is recorded live in the demo by Bablu's voice.
  add(1, "AGREEMENT_SET", "J-1042", "bablu", { capBp: 300, policy: "CAP_ONLY", item: "Bridal haar + earrings" });

  // Bablu's own notebook: identical to the ledger except the J-1019 return.
  const babluBook: BookRow[] = chain
    .filter((e) => e.karigarId === "bablu" && (e.type === "ISSUE" || e.type === "RECEIVE_FINISHED" || e.type === "RECEIVE_SCRAP"))
    .map((e) => ({ jobId: e.jobId, type: e.type as BookRow["type"], netMg: e.jobId === "J-1019" && e.type === "RECEIVE_FINISHED" ? 118_520 : e.payload.netMg!, purityBp: e.payload.purityBp! }));

  return { chain, pending: [], jobs, history: seedHistory(), babluBook, weddingTs: t0 + 12 * DAY, now, nextEventNo: n };
}
