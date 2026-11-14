// All weights are integer milligrams, purity is basis points, money is paise.
// No floating point enters the ledger: every function here is integer-in, integer-out.

export const PURITY = { K24: 9999, K22: 9160, K18: 7500, K14: 5850 } as const;

/** round_half_up(a × bp / 10000) for non-negative integers. */
export function mulBp(a: number, bp: number): number {
  if (!Number.isInteger(a) || !Number.isInteger(bp) || a < 0 || bp < 0) throw new Error("mulBp: non-negative integers only");
  return Math.floor((a * bp + 5000) / 10000);
}

/** Fine (pure) gold in mg for a net weight at a purity. */
export const fineMg = (netMg: number, purityBp: number) => mulBp(netMg, purityBp);

/** part/whole as basis points, half-up on the magnitude. */
export function ratioBp(part: number, whole: number): number {
  if (whole <= 0) return 0;
  const sign = part < 0 ? -1 : 1;
  return sign * Math.floor((Math.abs(part) * 20000 + whole) / (2 * whole));
}

/** 229000 -> "229.000" (always three decimals, grams). */
export function grams(mg: number): string {
  const sign = mg < 0 ? "-" : "";
  const a = Math.abs(mg);
  return `${sign}${Math.floor(a / 1000)}.${String(a % 1000).padStart(3, "0")}`;
}

/** 380 -> "3.80" */
export const pct = (bp: number, digits = 2) => (bp / 100).toFixed(digits);

export const rupees = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

/** Deterministic RNG (mulberry32) for seeds and simulations. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
