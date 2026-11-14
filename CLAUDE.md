# Tarazu — working rules

Shared gold ledger for karigars and jewellers. Hackathon demo; must never break on stage. Full brief: `TARAZU_MASTER_PROMPT.md`.

## Non-negotiables

- **No paid APIs.** Browser speech, offline brain, optional free Gemini key. Keys live in `.env` only.
- **LLMs never do arithmetic or move value.** Every number comes from `src/lib/ledger`. Anything a model says must pass `groundingGuard` against engine output.
- **Ledger is integer-only**: milligrams, basis points, paise. No floats. Rounding is half-up (`mulBp`).
- **Events are append-only.** Corrections are new `ADJUSTMENT` events. Nothing is FINAL without both signatures (legacy imports are single-signed and flagged).
- **Pending events never count in a balance.**
- **A karigar sees only his own account** (`visibleTo`).
- **Never present invented facts as real.** Demo values are labelled; tax notes say "verify with a CA".
- Settlements need both parties. Agents propose; humans approve.

## Karigar-facing UI

Assume the reader may not read. Targets ≥ 48 px, icon plus label, a Listen button on anything he must understand,
read-back before every signature, big green yes / red no, everyday words ("your gold", not "fine weight") in Hindi, Bengali and English.
Lucide icons, not emoji. Every string goes through `useT()` with `en` / `hi` / `bn`.

## Commands

`npm run dev` · `npm test` · `npm run build`. Keep TypeScript on 5.x (Next 15 breaks on 7).
After changing ledger code run `npm test`; after UI changes check 390 px width.
