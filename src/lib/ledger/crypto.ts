import * as ed from "@noble/ed25519";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils";

// Synchronous Ed25519. Demo signing: keys are derived from a fixed label and held in the app.
// Production would use device-bound keys / eSign. The verification code is real.
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

export const sha256Hex = (s: string) => bytesToHex(sha256(utf8ToBytes(s)));

/** Canonical JSON: sorted keys, no whitespace. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  const o = v as Record<string, unknown>;
  return (
    "{" +
    Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(o[k]))
      .join(",") +
    "}"
  );
}

const keyCache = new Map<string, { priv: Uint8Array; pub: string }>();
export function demoKey(partyId: string) {
  let k = keyCache.get(partyId);
  if (!k) {
    const priv = sha256(utf8ToBytes("tarazu-demo-key:" + partyId));
    k = { priv, pub: bytesToHex(ed.getPublicKey(priv)) };
    keyCache.set(partyId, k);
  }
  return k;
}

export const sign = (partyId: string, message: string) => bytesToHex(ed.sign(utf8ToBytes(message), demoKey(partyId).priv));

export function verify(partyId: string, message: string, sigHex: string): boolean {
  try {
    return ed.verify(hexToBytes(sigHex), utf8ToBytes(message), hexToBytes(demoKey(partyId).pub));
  } catch {
    return false;
  }
}

/** Merkle root over hex leaves (last leaf duplicated on odd levels). */
export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return sha256Hex("");
  let level = leaves.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) next.push(sha256Hex(level[i] + (level[i + 1] ?? level[i])));
    level = next;
  }
  return level[0];
}
