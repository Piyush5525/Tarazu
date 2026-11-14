"use client";
import { create } from "zustand";
import { draft, finalize, signInto, type EventBody, type EventType, type Job, type LedgerEvent, type Payload } from "./ledger/engine";
import type { BookRow, HistoryRow } from "./ledger/analytics";
import { buildSeed, eventId } from "./ledger/seed";

export type Lang = "en" | "hi" | "bn";
export type Who = "karigar" | "jeweller";

type State = {
  ready: boolean;
  lang: Lang;
  me: string; // which karigar is "logged in" on the karigar surface
  chain: LedgerEvent[];
  pending: LedgerEvent[];
  jobs: Job[];
  history: HistoryRow[];
  babluBook: BookRow[];
  weddingTs: number;
  nextNo: number;
  tamper: { index: number; original: LedgerEvent } | null;
  rebalance: "none" | "requested" | "accepted";
  lastFinal: string | null; // id of the event that most recently became FINAL (drives the chain "snap")
  init: () => void;
  reset: () => void;
  setLang: (l: Lang) => void;
  setMe: (id: string) => void;
  propose: (type: EventType, jobId: string, karigarId: string, payload: Payload, signedBy?: Who) => string;
  signPending: (id: string, who: Who) => void;
  rejectPending: (id: string) => void;
  tamperWith: (index: number) => void;
  repair: () => void;
  setRebalance: (r: State["rebalance"]) => void;
  autoRead: boolean; // "read every screen to me": each page speaks its own summary when it opens
  setAutoRead: (on: boolean) => void;
};

const savedLang = (): Lang => {
  try {
    const l = localStorage.getItem("tarazu-lang");
    if (l === "hi" || l === "bn" || l === "en") return l;
  } catch {}
  return "hi";
};

export const useStore = create<State>((set, get) => {
  const load = () => {
    const s = buildSeed();
    set({ ready: true, chain: s.chain, pending: [], jobs: s.jobs, history: s.history, babluBook: s.babluBook, weddingTs: s.weddingTs, nextNo: s.nextEventNo, tamper: null, rebalance: "none", lastFinal: null });
  };
  return {
    ready: false, lang: "hi", me: "bablu", chain: [], pending: [], jobs: [], history: [], babluBook: [], weddingTs: 0, nextNo: 1,
    tamper: null, rebalance: "none", lastFinal: null,
    autoRead: false,
    setAutoRead: (autoRead) => { try { localStorage.setItem("tarazu-autoread", autoRead ? "1" : ""); } catch {} set({ autoRead }); },
    init: () => {
      if (get().ready) return;
      let autoRead = false;
      try { autoRead = localStorage.getItem("tarazu-autoread") === "1"; } catch {}
      set({ lang: savedLang(), autoRead });
      load();
    },
    reset: load,
    setLang: (lang) => { try { localStorage.setItem("tarazu-lang", lang); } catch {} set({ lang }); },
    setMe: (me) => set({ me }),

    /** Create a draft that both sides can see. Nothing enters a balance until both have signed. */
    propose: (type, jobId, karigarId, payload, signedBy) => {
      const s = get();
      const body: EventBody = { id: eventId(s.nextNo), type, jobId, karigarId, ts: Date.now(), payload };
      set({ pending: [...s.pending, draft(body, signedBy)], nextNo: s.nextNo + 1 });
      return body.id;
    },

    signPending: (id, who) => {
      const s = get();
      const e = s.pending.find((p) => p.id === id);
      if (!e) return;
      const signed: LedgerEvent = { ...e };
      signInto(signed, who);
      if (signed.sigKarigar && signed.sigJeweller) {
        const chain = s.chain.slice();
        finalize(chain, signed);
        let jobs = s.jobs;
        if (signed.type === "SETTLEMENT_SIGNED") jobs = jobs.map((j) => (j.id === signed.jobId ? { ...j, status: "SETTLED" as const, capBp: signed.payload.capBp ?? j.capBp } : j));
        if (signed.type === "RECEIVE_FINISHED") jobs = jobs.map((j) => (j.id === signed.jobId && j.status === "OPEN" ? { ...j, status: "RETURNED" as const } : j));
        set({ chain, jobs, pending: s.pending.filter((p) => p.id !== id), lastFinal: signed.id });
      } else {
        set({ pending: s.pending.map((p) => (p.id === id ? signed : p)) });
      }
    },

    rejectPending: (id) => set({ pending: get().pending.filter((p) => p.id !== id) }),

    /** Demo only: silently change a stored weight, the way an edited notebook would. verifyChain() catches it. */
    tamperWith: (index) => {
      const s = get();
      if (s.tamper || !s.chain[index]) return;
      const original = s.chain[index];
      const chain = s.chain.slice();
      chain[index] = { ...original, payload: { ...original.payload, netMg: (original.payload.netMg ?? 0) - 1500 } };
      set({ chain, tamper: { index, original } });
    },
    repair: () => {
      const s = get();
      if (!s.tamper) return;
      const chain = s.chain.slice();
      chain[s.tamper.index] = s.tamper.original;
      set({ chain, tamper: null });
    },
    setRebalance: (rebalance) => set({ rebalance }),
  };
});
