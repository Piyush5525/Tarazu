import { canonical, merkleRoot, sha256Hex, sign, verify } from "./crypto";
import { fineMg, mulBp, ratioBp } from "./units";

export type EventType =
  | "AGREEMENT_SET" | "ISSUE" | "RECEIVE_FINISHED" | "RECEIVE_SCRAP" | "ADJUSTMENT"
  | "LABOUR_DUE" | "PAYMENT_MADE" | "DISPUTE_OPENED" | "SETTLEMENT_SIGNED";

export type Payload = {
  netMg?: number; purityBp?: number; fineMg?: number; capBp?: number; policy?: "CAP_ONLY" | "ALLOWANCE_PAID";
  amountPaise?: number; promisedDays?: number; note?: string; refEventId?: string; item?: string;
};

export type EventBody = { id: string; type: EventType; jobId: string; karigarId: string; ts: number; payload: Payload; legacy?: boolean };

export type LedgerEvent = EventBody & {
  status: "PENDING" | "FINAL";
  sigKarigar?: string;
  sigJeweller?: string;
  seq: number; // position in the chain once FINAL, -1 while pending
  prevHash: string;
  hash: string;
};

export const JEWELLER = "mehta";
export const GENESIS = sha256Hex("tarazu-genesis");

const bodyOf = (e: EventBody): EventBody => ({ id: e.id, type: e.type, jobId: e.jobId, karigarId: e.karigarId, ts: e.ts, payload: e.payload, legacy: e.legacy });
export const messageOf = (e: EventBody) => canonical(bodyOf(e));
export const hashOf = (prev: string, e: EventBody, sigA = "", sigB = "") => sha256Hex(prev + messageOf(e) + sigA + sigB);

/** A draft: visible to both sides, in nobody's balance. */
export function draft(body: EventBody, signedBy?: "karigar" | "jeweller"): LedgerEvent {
  const e: LedgerEvent = { ...body, status: "PENDING", seq: -1, prevHash: "", hash: "" };
  if (signedBy) signInto(e, signedBy);
  return e;
}

export function signInto(e: LedgerEvent, who: "karigar" | "jeweller") {
  const m = messageOf(e);
  if (who === "karigar") e.sigKarigar = sign(e.karigarId, m);
  else e.sigJeweller = sign(JEWELLER, m);
}

/** Append to the chain. Refuses unless both signatures verify (legacy imports carry the jeweller's only, and are flagged). */
export function finalize(chain: LedgerEvent[], e: LedgerEvent): LedgerEvent {
  const m = messageOf(e);
  const kOk = !!e.sigKarigar && verify(e.karigarId, m, e.sigKarigar);
  const jOk = !!e.sigJeweller && verify(JEWELLER, m, e.sigJeweller);
  if (e.legacy ? !jOk : !(kOk && jOk)) throw new Error(`finalize(${e.id}): needs both valid signatures`);
  const prevHash = chain.length ? chain[chain.length - 1].hash : GENESIS;
  const done: LedgerEvent = { ...e, status: "FINAL", seq: chain.length, prevHash, hash: hashOf(prevHash, e, e.sigKarigar, e.sigJeweller) };
  chain.push(done);
  return done;
}

export type ChainCheck = { ok: boolean; brokenAt: number | null; reason?: "link" | "content" | "signature" };

export function verifyChain(chain: LedgerEvent[], checkSignatures = true): ChainCheck {
  let prev = GENESIS;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    if (e.prevHash !== prev) return { ok: false, brokenAt: i, reason: "link" };
    if (hashOf(prev, e, e.sigKarigar, e.sigJeweller) !== e.hash) return { ok: false, brokenAt: i, reason: "content" };
    if (checkSignatures) {
      const m = messageOf(e);
      if (!e.sigJeweller || !verify(JEWELLER, m, e.sigJeweller)) return { ok: false, brokenAt: i, reason: "signature" };
      if (!e.legacy && (!e.sigKarigar || !verify(e.karigarId, m, e.sigKarigar))) return { ok: false, brokenAt: i, reason: "signature" };
    }
    prev = e.hash;
  }
  return { ok: true, brokenAt: null };
}

export const dayKey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Day Seal: Merkle root of one day's FINAL event hashes. */
export function daySeal(chain: LedgerEvent[], ts: number) {
  const day = dayKey(ts);
  const leaves = chain.filter((e) => dayKey(e.ts) === day).map((e) => e.hash);
  return { day, count: leaves.length, root: merkleRoot(leaves) };
}

export type Job = {
  id: string; karigarId: string; item: string; designClass: string; purityBp: number; capBp: number;
  policy: "CAP_ONLY" | "ALLOWANCE_PAID"; status: "OPEN" | "RETURNED" | "SETTLED"; customer?: string;
};

export type Recon = {
  issuedFine: number; finishedFine: number; scrapFine: number; adjustFine: number;
  lossFine: number; lossBp: number; capBp: number; capFine: number; excessFine: number; karigarOwes: number;
  eventIds: string[];
};

export const eventFine = (e: Pick<LedgerEvent, "payload">) => e.payload.fineMg ?? fineMg(e.payload.netMg ?? 0, e.payload.purityBp ?? 0);

/**
 * issued_fine = finished_fine + scrap_fine + loss_fine. Only FINAL events count.
 * ADJUSTMENT carries a signed fine delta credited as returned gold (a compensating entry, never an edit).
 */
export function reconcile(job: Pick<Job, "id" | "capBp" | "policy">, chain: LedgerEvent[], capBpOverride?: number): Recon {
  let issuedFine = 0, finishedFine = 0, scrapFine = 0, adjustFine = 0;
  const eventIds: string[] = [];
  for (const e of chain) {
    if (e.jobId !== job.id || e.status !== "FINAL") continue;
    if (e.type === "ISSUE") issuedFine += eventFine(e);
    else if (e.type === "RECEIVE_FINISHED") finishedFine += eventFine(e);
    else if (e.type === "RECEIVE_SCRAP") scrapFine += eventFine(e);
    else if (e.type === "ADJUSTMENT") adjustFine += e.payload.fineMg ?? 0;
    else continue;
    eventIds.push(e.id);
  }
  const capBp = capBpOverride ?? job.capBp;
  const lossFine = issuedFine - finishedFine - scrapFine - adjustFine;
  const capFine = mulBp(issuedFine, capBp);
  const excessFine = lossFine - capFine;
  const karigarOwes = job.policy === "ALLOWANCE_PAID" ? excessFine : Math.max(excessFine, 0);
  return { issuedFine, finishedFine, scrapFine, adjustFine, lossFine, lossBp: ratioBp(lossFine, issuedFine), capBp, capFine, excessFine, karigarOwes, eventIds };
}

/** Gold a karigar is holding right now: issued minus returned, across jobs still open. */
export function holdingFine(karigarId: string, jobs: Job[], chain: LedgerEvent[]): number {
  let total = 0;
  for (const j of jobs) {
    if (j.karigarId !== karigarId || j.status !== "OPEN") continue;
    const r = reconcile(j, chain);
    total += r.issuedFine - r.finishedFine - r.scrapFine - r.adjustFine;
  }
  return total;
}

export type Viewer = { role: "jeweller" } | { role: "karigar"; id: string };

/** Access rule in one place: a karigar only ever receives his own rows. */
export function visibleTo<T extends { karigarId: string }>(viewer: Viewer, rows: T[]): T[] {
  return viewer.role === "jeweller" ? rows : rows.filter((r) => r.karigarId === viewer.id);
}
