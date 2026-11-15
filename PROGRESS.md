# Progress

## Works (verified 2026-11-14)

- `npm test`: 13 tests pass — golden scenarios A–E, one-signature refusal, tamper detection, pending excluded from balances, karigar isolation, conservation property (1,000 runs), grounding guard.
- `next build` passes. A scripted browser run of the demo path passed 14/14 checks with no page errors:
  voice-sample issue → read-back → karigar yes → pending not in balance → jeweller countersign → Day Seal →
  divergence finder (J-1019, 118.250 vs 118.520, 0.247 g) → adjustment signed by both →
  Deadline Guardian 60% → 92% after Suresh accepts → Agent Room, three grounded turns → settlement at 0.439 g →
  tamper detected and restored → passport shared and verified in lender view → Tara answers from ledger numbers.
- No horizontal overflow at 390 px or 1366 px on any of the 8 screens.

## Second pass (2026-11-14)

- Tara is now a 3D character (blinks, follows the pointer, talks, tilts when listening). No language buttons: she answers in the language of each message (script, then romanised-word detection; Gemini returns its own language code for open questions).
- Hands-free: once the microphone is allowed, saying "Tara" opens her from any screen; the rest of the sentence is the question, and she keeps listening about 11 s for a follow-up. Toggle is the ear icon in her header.
- Gemini replies can carry a route, so open questions navigate too (only to known routes).
- `/demo` is an auto-playing 7-scene film (narration optional); the click-path moved into collapsible presenter notes.
- Guide strips ("what to do here") on karigar, jeweller, ledger and agent screens; "one job" journey on the home page.
- Checked in a browser: typed Hinglish, Bengali and English each got a reply in the matching language; a wedding question in Hindi navigated to `/track`; no page errors; no overflow at 390 px.

Limits to know: speech recognition must be told a language before it listens, so Tara listens in the language last used (Hindi mode also picks up English). To move to Bengali by voice, say "Bangla" once or type a Bengali message. Wake-word listening needs Chrome/Edge, an open tab, and uses the browser's online speech service.

## Third pass: phone audit and voice (2026-11-14)

- Audited all 8 screens at 360 px (Hindi) and 390 px (Bengali) with a script that looks for off-screen elements, clipped text, overlapping text and small tap targets. Fixed: Tara's panel/button covering content (now a full-screen chat on phones; button is smaller, tucks to the edge while scrolling, introduces herself once per visit), demo scene overflowing its stage, colliding fair-band labels, cramped persona row, guide strip layout, small links, desktop nav wrapping.
- Demo: pausing the film now stops the narration as well.
- Ledger: signature verification runs just after the screen draws instead of blocking it.
- New: say yes / no aloud after a read-back (buttons still work); "say it again" and "speak slowly" to Tara; "Read every screen to me" mode (header on desktop, More menu on phones); gold shown as a row of 10-gram coins; Tara waves when she introduces herself; phone vibrates on signing.
- Hero: floating signature cards around the scale (wide screens), live figures strip.
- Re-ran the scripted demo path: 14/14, no page errors.

## Fourth pass (2026-11-15)

- Agent Room conversation, labels and read-back now in Hindi / Bengali / English; Shop table headings, pending-entry lines, deadline card and notes translated. Jewellery names have local forms, so a Hindi or Bengali voice reads them naturally.
- Voice logic tested with a simulated microphone and speaker (browser speech APIs replaced by test doubles): 22/22 — wake word from another screen, answer + navigation, follow-up without the name, "say it again", "speak slowly", English and Bengali switching, ordinary talk ignored, ear on/off, read-back then spoken "haan" signs and "nahi" cancels, missing carat asked not guessed, demo pause silences narration, read-to-me on each screen.
- Phone walkthrough: 360 px Hindi 30/30; 412 px English 29/30 (the one miss was a timing artefact while Tara's panel animated open; the screenshot right after shows it full-screen). Desktop demo path 14/14. Unit tests 13/13. No page errors in any run.

What the simulated test cannot show: real recognition accuracy (accents, noise, Bengali support on a given phone), whether the device has a Hindi/Bengali voice installed, and the browser's microphone permission prompt.

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
