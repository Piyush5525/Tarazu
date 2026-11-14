import { eventFine, type LedgerEvent } from "./engine";
import { fineMg, mulBp, rng } from "./units";

/* ---------- Wastage Fairness ---------- */

export type HistoryRow = { id: string; karigarId: string; designClass: string; lossBp: number; onTime: boolean; payDays: number; fineMg: number };
export type Band = { n: number; p10: number; p50: number; p90: number };

/** Linear-interpolated percentile over integers (basis points), rounded half-up. */
export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
}

export function fairBand(history: HistoryRow[], designClass: string): Band {
  const xs = history.filter((h) => h.designClass === designClass).map((h) => h.lossBp).sort((a, b) => a - b);
  return { n: xs.length, p10: percentile(xs, 0.1), p50: percentile(xs, 0.5), p90: percentile(xs, 0.9) };
}

export type FairClass = "WITHIN_BAND" | "ANOMALOUS_HIGH" | "CAP_UNREALISTIC";

/** A loss above P90 hurts the jeweller; a cap below P10 hurts the karigar. Both get flagged. */
export function classify(lossBp: number, capBp: number, band: Band): FairClass {
  if (lossBp > band.p90) return "ANOMALOUS_HIGH";
  if (capBp < band.p10) return "CAP_UNREALISTIC";
  return "WITHIN_BAND";
}

/** Settlement at the fair median: what the karigar owes if the cap were P50. */
export function proposeAtMedian(issuedFine: number, lossFine: number, band: Band) {
  const capFine = mulBp(issuedFine, band.p50);
  return { capBp: band.p50, capFine, karigarOwes: Math.max(lossFine - capFine, 0) };
}

export const median = (xs: number[]) => percentile(xs.slice().sort((a, b) => a - b), 0.5);

/* ---------- Divergence Finder ("git bisect for gold") ---------- */

export type BookRow = { jobId: string; type: "ISSUE" | "RECEIVE_FINISHED" | "RECEIVE_SCRAP"; netMg: number; purityBp: number };
export type Cause = "TRANSPOSITION" | "MISSING_ENTRY" | "LEGACY_SINGLE_SIGNED" | "PURITY_MISMATCH" | "ROUNDING";
export type Divergence = {
  eventId: string; jobId: string; type: string; ledgerNetMg: number; bookNetMg: number | null;
  deltaNetMg: number; deltaFineMg: number; causes: Cause[]; purityBp: number;
};

const digits = (n: number) => String(n).split("").sort().join("");

/** Walk the karigar's FINAL weight events in order and return the first one his own book disagrees with. */
export function findDivergence(chain: LedgerEvent[], karigarId: string, book: BookRow[]): Divergence | null {
  const used = new Set<number>();
  for (const e of chain) {
    if (e.karigarId !== karigarId || e.status !== "FINAL") continue;
    if (e.type !== "ISSUE" && e.type !== "RECEIVE_FINISHED" && e.type !== "RECEIVE_SCRAP") continue;
    const net = e.payload.netMg ?? 0, purity = e.payload.purityBp ?? 0;
    const i = book.findIndex((r, k) => !used.has(k) && r.jobId === e.jobId && r.type === e.type);
    if (i < 0) {
      return { eventId: e.id, jobId: e.jobId, type: e.type, ledgerNetMg: net, bookNetMg: null, deltaNetMg: -net, deltaFineMg: -eventFine(e), causes: ["MISSING_ENTRY", ...(e.legacy ? (["LEGACY_SINGLE_SIGNED"] as Cause[]) : [])], purityBp: purity };
    }
    used.add(i);
    const r = book[i];
    if (r.netMg === net && r.purityBp === purity) continue;
    const causes: Cause[] = [];
    if (r.netMg !== net && digits(r.netMg) === digits(net)) causes.push("TRANSPOSITION");
    if (r.purityBp !== purity) causes.push("PURITY_MISMATCH");
    if (r.netMg !== net && Math.abs(r.netMg - net) <= 1) causes.push("ROUNDING");
    if (e.legacy) causes.push("LEGACY_SINGLE_SIGNED");
    return {
      eventId: e.id, jobId: e.jobId, type: e.type, ledgerNetMg: net, bookNetMg: r.netMg,
      deltaNetMg: r.netMg - net, deltaFineMg: fineMg(r.netMg, r.purityBp) - fineMg(net, purity), causes, purityBp: purity,
    };
  }
  return null;
}

/* ---------- Deadline Guardian (seeded Monte-Carlo) ---------- */

export type SimInput = { daysAvailable: number; karigarLoad: number; split: boolean; seed?: number; runs?: number };
export type SimResult = { runs: number; onTimeBp: number; p50Days: number; p90Days: number };

const tri = (r: () => number, a: number, c: number, b: number) => {
  const u = r(), f = (c - a) / (b - a);
  return u < f ? a + Math.sqrt(u * (b - a) * (c - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - c));
};

/**
 * Remaining legs for a bridal set at the setting stage, in days:
 * queue (grows with the karigar's open orders) -> necklace setting -> earrings setting -> polish -> hallmark (2 working days) -> delivery buffer (1).
 * With `split`, the earrings go to a second karigar with capacity and run in parallel.
 * Stage durations are demo config values, not field measurements.
 */
export function simulateSchedule({ daysAvailable, karigarLoad, split, seed = 20261114, runs = 2000 }: SimInput): SimResult {
  const r = rng(seed);
  const totals: number[] = [];
  let onTime = 0;
  const extra = Math.max(karigarLoad - 1, 0);
  for (let i = 0; i < runs; i++) {
    const queue = tri(r, 0.2 * extra, 0.45 * extra, 0.9 * extra);
    const necklace = tri(r, 2, 3, 4.5);
    const earrings = tri(r, 1.5, 2.2, 3.5);
    const polish = tri(r, 0.5, 1, 2);
    const hallmark = tri(r, 2, 2, 3.5);
    // a split set must be brought back together and matched: that costs a little time too
    const making = split ? Math.max(queue + necklace, tri(r, 0, 0.4, 1) + earrings) + tri(r, 0.5, 1, 2.5) : queue + necklace + earrings;
    const total = making + polish + hallmark + 1;
    totals.push(total);
    if (total <= daysAvailable) onTime++;
  }
  totals.sort((a, b) => a - b);
  const at = (p: number) => Math.round(totals[Math.floor((runs - 1) * p)] * 10) / 10;
  return { runs, onTimeBp: Math.round((onTime * 10000) / runs), p50Days: at(0.5), p90Days: at(0.9) };
}

/* ---------- Numeric Grounding Guard ---------- */

/** Every number an agent says must appear in the facts its tools returned. IDs (J-1043, E-0012) are not numbers. */
export function groundingGuard(text: string, facts: (string | number)[]): { ok: boolean; violations: string[] } {
  const norm = (s: string) => s.replace(/,/g, "").replace(/^0+(?=\d)/, "").replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
  const allowed = new Set(facts.map((f) => norm(String(f))));
  const stripped = text.replace(/\b[A-Z]{1,3}-\d+\b/g, " ").replace(/\bP(10|50|90)\b/g, " ").replace(/\b(22|24|18|14)\s?K\b/gi, " ");
  const found = stripped.match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  const violations = found.filter((n) => !allowed.has(norm(n)));
  return { ok: violations.length === 0, violations };
}
