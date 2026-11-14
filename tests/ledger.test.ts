import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { fineMg, mulBp, grams, PURITY } from "@/lib/ledger/units";
import { draft, finalize, reconcile, signInto, verifyChain, visibleTo, daySeal, holdingFine, type LedgerEvent, type EventBody } from "@/lib/ledger/engine";
import { classify, fairBand, findDivergence, groundingGuard, median, proposeAtMedian, simulateSchedule } from "@/lib/ledger/analytics";
import { buildSeed } from "@/lib/ledger/seed";

const seed = buildSeed(new Date("2026-11-14T10:00:00").getTime());
let n = 9000;
function push(chain: LedgerEvent[], body: Omit<EventBody, "id" | "ts">) {
  const e = draft({ ...body, id: "T-" + n++, ts: seed.now });
  signInto(e, "karigar"); signInto(e, "jeweller");
  return finalize(chain, e);
}

describe("units", () => {
  it("fine weight rounds half up", () => {
    expect(fineMg(250_000, 9160)).toBe(229_000);
    expect(fineMg(238_400, 9160)).toBe(218_374); // 218374.4
    expect(fineMg(93_100, 9160)).toBe(85_280); // 85279.6
    expect(mulBp(5, 5000)).toBe(3); // 2.5 -> 3
    expect(grams(229_000)).toBe("229.000");
    expect(grams(-2_279)).toBe("-2.279");
  });
});

describe("golden scenarios", () => {
  it("A: clean job J-1042", () => {
    const chain: LedgerEvent[] = [];
    const j = { id: "A", capBp: 300, policy: "CAP_ONLY" as const };
    push(chain, { type: "ISSUE", jobId: "A", karigarId: "bablu", payload: { netMg: 250_000, purityBp: PURITY.K22 } });
    push(chain, { type: "RECEIVE_FINISHED", jobId: "A", karigarId: "bablu", payload: { netMg: 238_400, purityBp: PURITY.K22 } });
    push(chain, { type: "RECEIVE_SCRAP", jobId: "A", karigarId: "bablu", payload: { netMg: 7_100, purityBp: 8500 } });
    const r = reconcile(j, chain);
    expect(r).toMatchObject({ issuedFine: 229_000, capFine: 6_870, finishedFine: 218_374, scrapFine: 6_035, lossFine: 4_591, excessFine: -2_279, karigarOwes: 0 });
    expect(r.lossBp).toBe(200); // 2.005% -> 2.00
  });

  it("B: Rafiq J-1043, cap below the fair band", () => {
    const job = seed.jobs.find((j) => j.id === "J-1043")!;
    const r = reconcile(job, seed.chain);
    expect(r).toMatchObject({ issuedFine: 91_600, capFine: 2_290, finishedFine: 85_280, scrapFine: 2_400, lossFine: 3_920, excessFine: 1_630, karigarOwes: 1_630 });
    expect(r.lossBp).toBe(428);
    const band = fairBand(seed.history, "HAAR_22K");
    expect(band.p50).toBe(380);
    expect(band.p10).toBeGreaterThanOrEqual(280); expect(band.p10).toBeLessThanOrEqual(300);
    expect(band.p90).toBeGreaterThanOrEqual(450); expect(band.p90).toBeLessThanOrEqual(470);
    expect(classify(r.lossBp, r.capBp, band)).toBe("CAP_UNREALISTIC");
    expect(proposeAtMedian(r.issuedFine, r.lossFine, band)).toEqual({ capBp: 380, capFine: 3_481, karigarOwes: 439 });
  });

  it("C: divergence finder pinpoints J-1019", () => {
    const d = findDivergence(seed.chain, "bablu", seed.babluBook)!;
    expect(d.jobId).toBe("J-1019");
    expect(d.type).toBe("RECEIVE_FINISHED");
    expect(d.ledgerNetMg).toBe(118_250); expect(d.bookNetMg).toBe(118_520);
    expect(d.deltaNetMg).toBe(270); expect(d.deltaFineMg).toBe(247);
    expect(d.causes).toEqual(expect.arrayContaining(["TRANSPOSITION", "LEGACY_SINGLE_SIGNED"]));
  });

  it("D: wedding at risk, rebalance lifts it", () => {
    const before = simulateSchedule({ daysAvailable: 12, karigarLoad: 4, split: false });
    const after = simulateSchedule({ daysAvailable: 12, karigarLoad: 4, split: true });
    expect(before.runs).toBeGreaterThanOrEqual(2000);
    expect(before.onTimeBp).toBeGreaterThan(5000); expect(before.onTimeBp).toBeLessThan(7000);
    expect(after.onTimeBp).toBeGreaterThan(8500);
    expect(simulateSchedule({ daysAvailable: 12, karigarLoad: 4, split: false })).toEqual(before); // deterministic
  });

  it("E: payer score is about 11 days", () => {
    const m = median(seed.history.map((h) => h.payDays));
    expect(m).toBeGreaterThanOrEqual(10); expect(m).toBeLessThanOrEqual(12);
  });
});

describe("dual-witness chain", () => {
  it("seed chain verifies, and a Day Seal exists", () => {
    expect(verifyChain(seed.chain)).toEqual({ ok: true, brokenAt: null });
    expect(daySeal(seed.chain, seed.chain[0].ts).root).toMatch(/^[0-9a-f]{64}$/);
  });
  it("refuses to finalize with one signature", () => {
    const e = draft({ id: "X-1", type: "ISSUE", jobId: "J-1042", karigarId: "bablu", ts: seed.now, payload: { netMg: 1000, purityBp: 9160 } }, "karigar");
    expect(() => finalize([], e)).toThrow();
  });
  it("tampering with any stored event is detected at that event", () => {
    const copy = seed.chain.map((e) => ({ ...e, payload: { ...e.payload } }));
    copy[7].payload.netMg = (copy[7].payload.netMg ?? 0) + 500;
    expect(verifyChain(copy)).toMatchObject({ ok: false, brokenAt: 7 });
  });
  it("pending events are excluded from balances", () => {
    const job = seed.jobs.find((j) => j.id === "J-1042")!;
    const p = draft({ id: "X-2", type: "ISSUE", jobId: "J-1042", karigarId: "bablu", ts: seed.now, payload: { netMg: 250_000, purityBp: 9160 } }, "karigar");
    expect(reconcile(job, [...seed.chain, p]).issuedFine).toBe(0);
  });
  it("karigar A cannot read karigar B", () => {
    const mine = visibleTo({ role: "karigar", id: "bablu" }, seed.chain);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((e) => e.karigarId === "bablu")).toBe(true);
    expect(visibleTo({ role: "karigar", id: "bablu" }, seed.jobs).some((j) => j.karigarId === "rafiq")).toBe(false);
  });
});

describe("conservation", () => {
  it("issued = finished + scrap + loss, and holdings never go negative, for any valid sequence", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ issue: fc.integer({ min: 1_000, max: 500_000 }), back: fc.integer({ min: 0, max: 10_000 }), scrapShare: fc.integer({ min: 0, max: 10_000 }), purity: fc.constantFrom(9160, 7500, 9999, 5850) }), { minLength: 1, maxLength: 6 }),
        (steps) => {
          const chain: LedgerEvent[] = [];
          const job = { id: "P", karigarId: "bablu", item: "", designClass: "", purityBp: 9160, capBp: 300, policy: "CAP_ONLY" as const, status: "OPEN" as const };
          let lotFine = 0;
          for (const s of steps) {
            push(chain, { type: "ISSUE", jobId: "P", karigarId: "bablu", payload: { netMg: s.issue, purityBp: s.purity } });
            const f = fineMg(s.issue, s.purity);
            lotFine += f;
            const returned = mulBp(f, s.back), scrap = mulBp(returned, s.scrapShare);
            push(chain, { type: "RECEIVE_FINISHED", jobId: "P", karigarId: "bablu", payload: { fineMg: returned - scrap } });
            push(chain, { type: "RECEIVE_SCRAP", jobId: "P", karigarId: "bablu", payload: { fineMg: scrap } });
          }
          const r = reconcile(job, chain);
          const held = holdingFine("bablu", [job], chain);
          return r.issuedFine === lotFine && r.finishedFine + r.scrapFine + r.lossFine === lotFine && held >= 0 && held + r.finishedFine + r.scrapFine === lotFine && verifyChain(chain, false).ok;
        },
      ),
      { numRuns: 1000 },
    );
  }, 120_000);
});

describe("numeric grounding guard", () => {
  it("passes grounded text and blocks a hallucinated number", () => {
    const facts = ["3.920", "4.28", "2.50", "3.80", "0.439", 41];
    expect(groundingGuard("Loss on J-1043 was 3.920 g (4.28%), cap 2.50%. Median P50 is 3.80% over 41 jobs.", facts).ok).toBe(true);
    const bad = groundingGuard("Rafiq owes 0.512 g.", facts);
    expect(bad.ok).toBe(false);
    expect(bad.violations).toEqual(["0.512"]);
  });
});
