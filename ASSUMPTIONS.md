# Assumptions and decisions

Decisions taken without asking, so the build kept moving. Change any of them freely.

## Stack

- **Single Next.js 15 app** instead of the monorepo in the master prompt. The ledger is still a pure, UI-free module (`src/lib/ledger`) and can be lifted into a package later.
- **No database.** State lives in the browser (zustand) and is reseeded on reload. Supabase, RLS and the append-only trigger are not built. The access rule exists as one function (`visibleTo`) with a test; hash-chain verification is what makes edits detectable.
- **No paid APIs** (owner's instruction). Removed the Anthropic SDK. Speech in and out is the browser's Web Speech API. Tara's open-question answers use Google's free Gemini tier if `GEMINI_API_KEY` is set, and the offline brain otherwise. Sarvam is not used.
- **TypeScript pinned to 5.9**: Next 15 could not read `tsconfig` paths under TypeScript 7.
- Default Gemini model is `gemini-3.5-flash-lite` (answered in ~3 s when tested on 2026-11-14; `gemini-2.5-flash` is retired for new keys and `gemini-3.8-flash` timed out). The route falls through a short list on 404/429/503/timeout.

## Honest labels

- All people, weights, rates, wastage norms, stage durations and payment days are **seeded demo values**.
- **Signing is demo signing**: Ed25519 keys are derived from fixed labels and held in the app. Hashing and verification are real.
- **Agent Room wording is a fixture** so the session repeats exactly on stage. Every number in it is computed live and passed through the Numeric Grounding Guard. No LLM runs the three agents.
- Scribe is a deterministic parser over the speech transcript. It refuses to draft when weight or carat is missing. Notebook-photo and scale-photo reading are not built; the "notebook" in the divergence demo is seeded data drawn as a page.
- UPI payout, lender viewer and ULI consent are mocks. Tax notes are informational: verify with a CA.

## Domain choices

- Scenario A/D overlap in the brief (J-1042 is both "returned" and "at the setting stage"). Here J-1042's gold issue is recorded live by voice, and its return is a button in the Jeweller Console using Scenario A's numbers.
- Fair-band history is 120 closed jobs kept as summary rows (not chain events) so the phone does not sign ~1,000 entries at load. The chain holds 35 seeded events.
- Settlement proposal uses the class median (P50). An `ADJUSTMENT` carries a signed fine-gold delta credited as returned gold.
- Monte-Carlo: triangular stage durations, 2,000 runs, fixed seed. A split order adds a "bring the set back together" step.
