# Tarazu — the gold ledger both sides sign

Hackathon build for PS 2.2 (Agentic AI): gold given to karigars for job-work is tracked on trust, and disputes follow.
Tarazu is the shared notebook: co-signed entries, a karigar who can see and contest his own account, neutral
reconciliation, wedding-date protection, and a portable trust record.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ledger unit, golden-scenario and property tests
```

No key is needed. Voice uses the browser's built-in speech (Chrome / Edge / Android Chrome work best).
Optional and free: put a Google AI Studio key in `.env` as `GEMINI_API_KEY` so Tara can answer open questions.

## Screens

| Route | Who | What |
|---|---|---|
| `/` | everyone | 3D balance you can tap, the story, role chooser |
| `/karigar` | karigar | "Mera Khata": gold held, payment clock, voice entry with read-back, "my count is different" |
| `/jeweller` | jeweller | countersign queue, Day Seal, Deadline Guardian, karigars, reconciliation table |
| `/ledger` | both | bahi-khata view, 3D hash chain, tamper demo, Day Seal QR |
| `/agents` | both | Steward vs Advocate vs Mediator, fair band, two-signature settlement |
| `/track` | customer | stage and date confidence, no weights |
| `/passport` | karigar / lender | consent-gated Trust Passport, lender viewer, Payer Score |
| `/demo` | presenter | 3-minute script stepper, reset and reseed |

Tara, the voice helper, sits at the bottom right of every screen (Hindi, Bengali, English).

## Where things live

- `src/lib/ledger/` — pure TypeScript, no UI: `units` (integer mg / bp / paise), `crypto` (SHA-256, Ed25519, Merkle),
  `engine` (events, dual signing, hash chain, reconcile), `analytics` (fair band, divergence finder, Monte-Carlo, grounding guard), `seed`.
- `src/lib/store.ts` — app state; `src/lib/tara.ts` — helper's offline brain; `src/lib/voice.ts` — speech in and out.
- `src/components/three/` — the 3D balance, gold field and chain (react-three-fiber).
- `tests/ledger.test.ts` — golden scenarios A–E, tamper detection, access isolation, conservation property, grounding guard.

See `ASSUMPTIONS.md` for what is real and what is staged, and `PROGRESS.md` for status.
