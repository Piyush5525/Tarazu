# Progress

## Works (verified 2026-11-14)

- `npm test`: 13 tests pass — golden scenarios A–E, one-signature refusal, tamper detection, pending excluded from balances, karigar isolation, conservation property (1,000 runs), grounding guard.
- `next build` passes. A scripted browser run of the demo path passed 14/14 checks with no page errors:
  voice-sample issue → read-back → karigar yes → pending not in balance → jeweller countersign → Day Seal →
  divergence finder (J-1019, 118.250 vs 118.520, 0.247 g) → adjustment signed by both →
  Deadline Guardian 60% → 92% after Suresh accepts → Agent Room, three grounded turns → settlement at 0.439 g →
  tamper detected and restored → passport shared and verified in lender view → Tara answers from ledger numbers.
- No horizontal overflow at 390 px or 1366 px on any of the 8 screens.

## Not verified

- Real microphone input and spoken output (headless browser has neither). The code paths are the standard Web Speech API; test on the demo phone in Chrome. Bengali voice availability depends on the device.
- 3D performance on a low-end phone (screenshots were software-rendered).
- Tara's Gemini path worked in the UI on `gemini-3.5-flash-lite` (~2 s, Hindi and English, passed the grounding guard). The larger free models timed out or returned 503 during testing, so free-tier availability on demo day is not guaranteed; the offline brain takes over automatically.

## Not built (from the master prompt)

Supabase + RLS + trigger, Sarvam STT/TTS, real LLM agents with tool allow-lists, notebook/scale photo OCR,
audit-pack PDF, Playwright suite checked into the repo, refiner intake, WhatsApp, MCP server, Panch workflow, pitch docs.

## Next

1. Rehearse on the actual demo phone; pick the language with the best installed voice.
2. Wire a real model behind the Agent Room (tools already exist as pure functions).
3. Pitch pack: `DEMO_SCRIPT.md`, `PITCH.md`, `QA_PREP.md`.
