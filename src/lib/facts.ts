"use client";
import { useMemo } from "react";
import { useStore } from "./store";
import { holdingFine, reconcile, visibleTo, type LedgerEvent } from "./ledger/engine";
import { median, simulateSchedule } from "./ledger/analytics";
import { DAY, KARIGARS } from "./ledger/seed";

export type PayClock = { eventId: string; jobId: string; amountPaise: number; promisedDays: number; elapsedDays: number; late: boolean };

/** Unpaid labour: every LABOUR_DUE without a later PAYMENT_MADE on the same job. */
export function payClocks(chain: LedgerEvent[], karigarId: string, now: number): PayClock[] {
  const paid = new Set(chain.filter((e) => e.type === "PAYMENT_MADE").map((e) => e.jobId));
  return chain
    .filter((e) => e.type === "LABOUR_DUE" && e.karigarId === karigarId && !paid.has(e.jobId))
    .map((e) => {
      const elapsedDays = Math.floor((now - e.ts) / DAY), promisedDays = e.payload.promisedDays ?? 7;
      return { eventId: e.id, jobId: e.jobId, amountPaise: e.payload.amountPaise ?? 0, promisedDays, elapsedDays, late: elapsedDays > promisedDays };
    });
}

/** The numbers Tara and the karigar screens speak from. Computed by the engine, never typed in. */
export function useFacts() {
  const { chain, jobs, history, pending, weddingTs, rebalance, me, ready } = useStore();
  return useMemo(() => {
    const now = Date.now();
    const who = KARIGARS.find((k) => k.id === me) ?? KARIGARS[0];
    const myJobs = visibleTo({ role: "karigar", id: me }, jobs);
    const openJobs = myJobs.filter((j) => j.status === "OPEN");
    const holdingMg = holdingFine(me, jobs, chain);
    const clocks = payClocks(chain, me, now);
    const payerDays = median(history.map((h) => h.payDays));
    const toSign = pending.filter((p) => p.karigarId === me && !p.sigKarigar).length;
    const daysToWedding = Math.max(0, Math.round((weddingTs - now) / DAY));
    const bablu = jobs.filter((j) => j.karigarId === "bablu" && j.status === "OPEN").length;
    const sim = ready ? simulateSchedule({ daysAvailable: 12, karigarLoad: Math.max(bablu, 1), split: rebalance === "accepted" }) : { runs: 0, onTimeBp: 0, p50Days: 0, p90Days: 0 };
    const jobRecon = (id: string) => { const j = jobs.find((x) => x.id === id); return j ? reconcile(j, chain) : null; };
    return { now, who, myJobs, openJobs, holdingMg, clocks, payerDays, toSign, daysToWedding, sim, jobRecon };
  }, [chain, jobs, history, pending, weddingTs, rebalance, me, ready]);
}

export type Facts = ReturnType<typeof useFacts>;
