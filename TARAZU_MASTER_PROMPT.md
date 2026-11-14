# TARAZU — Master Build Prompt for Claude Code

> Paste this whole file into Claude Code as the first message, or save it as `BUILD_PROMPT.md` in the repo root and say: **"Read BUILD_PROMPT.md fully, then execute Phase 0."**
> Working name: **Tarazu** (तराज़ू / দাঁড়িপাল্লা = the balance scale). Rename freely.

---

## 0. How you (Claude Code) must operate

You are the lead engineer AND product designer on a hackathon team. The goal is to **win**. Judges will see a live demo, a repo, and maybe a deck. Optimise for, in this order:

1. A **working end-to-end demo** that never breaks on stage.
2. One **unmistakably original idea** (Section 3) that judges remember an hour later.
3. **Real agentic depth** — agents that do distinct jobs, negotiate, and are bounded by guardrails (not a chatbot with a fancy name).
4. **Visual and UX polish** at a level that looks like a funded startup, built for people with low digital literacy.

Rules of engagement:

- Work in **vertical slices**. Commit after each slice. The app must run (`npm run dev`) at all times.
- Start with **Phase 0** (Section 12): create `CLAUDE.md` (distil the non-negotiables below), `ASSUMPTIONS.md`, `PROGRESS.md`. Ask me **at most 3 questions** and only if truly blocked (API keys, deadline, team stack). Otherwise decide, document the decision in `ASSUMPTIONS.md`, and keep moving.
- **Never present invented facts as real.** Gold rates, labour rates, wastage norms, and tax treatment in the app are **clearly labelled demo/config values**. Regulation notes must say "verify with a CA".
- Before building any UI, use the **`ui-ux-pro-max`** and **`frontend-design`** skills if installed to generate the design system from Section 10. Do not ship default-shadcn-looking screens.
- After each phase: run tests, run the demo path with Playwright, update `PROGRESS.md`, and tell me what works, what is faked, and what is next.
- If an external API (LLM, Sarvam, WhatsApp, UPI) is unavailable, **fall back to recorded fixtures** so the demo still works. Build a `DEMO_MODE` flag from day one.

---

## 1. The problem (from the hackathon brief — Agentic AI, PS 2.2)

**Gold given to karigars (artisan goldsmiths) for job-work is tracked on trust, and disputes follow.**

- Jewellers issue gold **by weight** and receive finished pieces back with **agreed wastage**. Tracking issue, return, wastage, deadlines and payments across many karigars and custom orders is **manual** → losses, disputes, missed delivery dates, late payment to artisans.
- Who lives with it: karigars (small workshops/home, working for several jewellers at once) and jewellers juggling custom orders across many karigars. Also in the picture: jewellers' counter staff, karigars' helpers, **customers with fixed occasion dates (weddings)**, and **refiners** who recover gold from workshop scrap.
- Today: notebook or slip for issues, wastage agreed verbally, deadlines chased by phone, accounts squared at month end.
- Costs: unexplained gold losses, relationships soured by disputes, missed wedding dates, artisans waiting weeks to be paid.
- Hard parts: **accuracy at the level of weight**, an **audit trail both parties accept**, and **fairness to the artisan, who has less power**.
- **Boundaries (treat as hard product requirements):**
  1. **Settlements go to BOTH parties for approval.**
  2. **Each karigar has full access to his own account.**
- Field questions the brief wants answered: how gold is issued/recorded and who holds the record; how wastage is agreed and how often disputed; what happens when a piece is late for a wedding; how long a karigar waits to be paid; what a karigar does when the jeweller's number differs from his; how many karigars/open orders a shop handles at once.
- "Following the money": *a karigar with a clean record of delivered work looks very different to anyone deciding whether to trust him.* → The brief hints at **portable reputation / credit**.

---

## 2. Research findings you must design around

1. **Incumbent software is the jeweller's notebook in software.** Jewellery ERPs (Joolet, Gehna, JewelACC, GoClixy, etc.) include karigar modules for issue/receive, wastage and job cards — but they are *jeweller-side systems of record*. The karigar is a ledger line in someone else's database. From public marketing, none emphasise: co-signed entries, karigar-side access/contest, neutral reconciliation, or portable reputation. **That is the gap.**
2. **Wastage is a legal and tax fault line, not just a social one.** Indian tax tribunal cases repeatedly turn on whether claimed wastage is backed by issue/receipt records; weak records get wastage disallowed. A GST ruling (West Bengal AAR, *In re Aabhushan Jewellers*, as summarised in a 2026 guide) treats metal retained by a karigar beyond actual loss as non-monetary consideration for the job-work service. → **Wastage rules must be written down per agreement, and the evidence must be audit-ready.** (Show as an informational note only; "verify with a CA".)
3. **Purity (touch) disputes are real.** Reporting describes karigars topping up impure "24K" metal from their own gold without compensation. → Record **purity at issue** as a first-class field, with a photo/assay reference, and make fine-weight (purity-adjusted) the unit of account.
4. **Karigars are mostly migrant Bengali artisans with falling volumes** (reports: monthly work per karigar dropping from ~500 g to ~100 g at Mumbai's Zaveri Bazaar). They are price-takers, low on bargaining power, often low on digital literacy. → **Voice-first, Bengali/Hindi, WhatsApp-style, no app install, big touch targets.**
5. **India's credit rails now accept "alternate data".** RBI's Unified Lending Interface (ULI) is consent-based digital public infrastructure; it already uses data like **milk-collection records to finance dairy farmers**. → *Gold-delivery records can do for karigars what milk-pouring records do for dairy farmers.* This is the "Following the money" answer and a killer pitch line.
6. **Voice tech for Indic languages is production-grade.** Sarvam's Saaras (STT) covers 22 Indian languages plus English incl. Hindi and Bengali, handles code-mixed speech; Bulbul does TTS. REST STT is capped at 30-second clips; use batch/WebSocket for longer.
7. **Reconciliation logic is standard and testable:** gold issued = finished pieces + recoverable scrap + agreed wastage (+ refiner recovery), each evidenced from issue/return records. We turn this into a deterministic engine.
8. **Hallmarking (BIS/HUID)** is a real step before delivery for hallmarkable jewellery → the deadline planner must include a hallmark leg.

---

## 3. The product: Tarazu — "the gold ledger both sides sign"

**One-line positioning:** *Every other tool is the jeweller's notebook in software. Tarazu is the shared notebook both sides sign — with agents that argue fairly, catch the exact entry where two books split, protect the wedding date, and turn an artisan's honest work into a portable trust record.*

### The five signature ideas (this is what makes us different — build ALL of P0)

1. **Dual-Witness Ledger ("दोनों साक्षी").** Every gold movement is an event that becomes FINAL only when **both** parties countersign (voice-PIN/OTP confirm in demo). Append-only, hash-chained (SHA-256), Ed25519 signatures, corrections are *new* events, never edits. A **Day Seal** (Merkle root of the day's events) is sent to both parties. *Tamper-evident without blockchain buzzwords.*
2. **Divergence Finder — "git bisect for gold".** When the karigar says "mera hisab alag hai", the Mediator agent aligns the karigar's version (his notebook photo or voice recital) against the ledger and **pinpoints the first event where the two books diverged**, with a plain-language explanation (e.g. transposed digits `118.250 ↔ 118.520`, or a legacy single-signed import). Resolution takes seconds instead of a month-end fight.
3. **Wastage Fairness Engine.** Replace the verbal "4%" with a **data-backed fair band** (P10/P50/P90 loss by design class, purity, karigar tier) learned from the ledger. It flags *unrealistically tight caps* (which hurt the karigar) as well as *anomalous losses* (which hurt the jeweller). Settlement proposals show the evidence and require both signatures.
4. **Deadline Guardian ("wedding-date protection").** Customer's occasion date → backward schedule across stages (design → casting → setting → polish → **hallmark** → delivery) per karigar load and history; **Monte-Carlo on-time probability**; proactive alerts; rebalancing proposals that respect karigar capacity and **never silently reassign** (karigar must accept).
5. **Trust Passport (two-sided reputation).** Karigar-owned, consent-gated, verifiable record of delivered work (volume, on-time %, wastage vs fair band, dispute outcomes, **payment wait experienced**). Shareable by QR to a lender (ULI-style consent flow, mocked) or a new jeweller. **Reputation runs both ways:** jewellers get a **Payer Score** (median days-to-pay) visible to karigars. *No black-box single credit number.*

### Design principles (non-negotiable)

- **LLMs never do arithmetic or move value.** A deterministic engine computes every number. Agents *propose*; humans *approve*; the ledger *records*.
- **Numeric Grounding Guard:** every number in any agent message must appear in a tool result from the same run (with event IDs cited). Otherwise the message is blocked/regenerated. Log violations.
- **Asymmetric power is a feature requirement:** karigar gets his own Advocate agent, full account access, and read-back in his language before he signs anything.
- **Agents are bounded:** they cannot sign on anyone's behalf, cannot edit history, cannot send money. Every action is audit-logged (`agent_runs`).

---

## 4. Users, surfaces, channels

| Persona | Surface | Notes |
|---|---|---|
| **Jeweller / owner** (Mehta Jewellers, Johari Bazaar, Jaipur) | **Jeweller Console** (desktop web) | Orders, karigar balances, Deadline Guardian, disputes, settlements, Payer Score |
| **Counter staff** | Console (limited role) | Can draft issues; owner countersigns above a weight threshold |
| **Karigar** (e.g., Bablu Maity — Bengali; Rafiq Ali; Suresh Soni) | **WhatsApp-style chat + "Mera Khata" PWA** | Voice-first; Bengali/Hindi/English toggle; 48px+ targets; read-back via TTS; offline-tolerant queue |
| **Customer** (Aarti — wedding on a fixed date) | Public **order tracker** link | Shows stage + date confidence; **no gold-weight data exposed** |
| **Lender / new jeweller** | **Passport viewer** (public, consent token) | Mock ULI-style consent API |
| **Refiner** (P2) | Simple intake page | Assay report → fine gold credited |

Channel abstraction: `ChannelAdapter` interface. Implement **SimulatorChannel** (in-app WhatsApp lookalike; P0). Stretch: Twilio WhatsApp Sandbox or Meta Cloud API test number (P2). Voice: **Sarvam Saaras STT + Bulbul TTS**, fallback to browser Web Speech API, fallback to recorded fixtures.

---

## 5. Domain model & accounting rules (get these exactly right)

**Units.** Store weights as **integer milligrams**. Purity as **basis points** (22K = 9160, 24K = 9999 or 9950 configurable, 18K = 7500, 14K = 5850). Money as integer paise. **No floating point anywhere in the ledger.**

**Fine weight (mg)** = `round_half_up(net_weight_mg × purity_bp / 10000)`. Document the rounding rule; unit-test it.

**Reconciliation identity per job:**

```
issued_fine
  = finished_fine + scrap_fine + refiner_credited_fine + loss_fine
loss_pct      = loss_fine / issued_fine
cap_fine      = round_half_up(issued_fine × wastage_cap_bp / 10000)
excess_fine   = loss_fine − cap_fine          (signed)
```

**Wastage policy is an explicit per-agreement field** (most disputes plausibly start because nobody wrote it down — validate in the field-questions slide):
- `CAP_ONLY`: loss up to the cap is borne by the jeweller; karigar owes `max(excess, 0)`.
- `ALLOWANCE_PAID`: cap is paid to the karigar in gold; karigar's net position = `excess` (negative → jeweller owes karigar).

**Event types:** `AGREEMENT_SET`, `ISSUE`, `RECEIVE_FINISHED`, `RECEIVE_SCRAP`, `SEND_TO_REFINER`, `REFINER_CREDIT`, `WASTAGE_WRITE_OFF`, `ADJUSTMENT` (compensating, never edit), `LABOUR_DUE`, `PAYMENT_MADE`, `DISPUTE_OPENED`, `SETTLEMENT_PROPOSED`, `SETTLEMENT_SIGNED`, `LEGACY_IMPORT` (single-signed; visually flagged).

**Event lifecycle:** `DRAFT` (by Scribe or human) → `PENDING_COUNTERSIGN` (visible, excluded from balances, expires in 24h) → `FINAL` (both signatures valid, appended to chain). `hash = SHA256(prev_hash ‖ canonical_json(payload) ‖ sig_a ‖ sig_b)`. Canonical JSON = sorted keys, no whitespace. DB trigger forbids UPDATE/DELETE on `events`.

**Day Seal:** Merkle root over the day's FINAL event hashes → shown to both parties, exportable as QR/PDF.

**Conservation property (must be property-tested):** for each metal lot, Σ fine balances across all holders is constant under any valid event sequence.

**Signing (honest labelling):** per-party Ed25519 keys (`@noble/ed25519`, `@noble/hashes`), server-held for the demo, UI label "Demo signing — production uses device-bound keys / eSign". Verification code is real.

**Tax/regulatory notes (info chips only, config-driven):** job-work service treated at a configurable GST rate; BIS hallmarking/HUID step modelled as a scheduling stage. Never auto-file anything.

---

## 6. Multi-agent architecture

Use the **Anthropic SDK (`@anthropic-ai/sdk`) tool-use** with an **explicit, typed orchestrator** (state machine + event bus) — robust and Vercel-deployable. (Optional stretch: expose the ledger tools as an **MCP server** `tarazu-ledger` so any MCP client can query a karigar's account; or build agents with the Claude Agent SDK `@anthropic-ai/claude-agent-sdk` subagents if you prefer — do not let this block the core.)

Model IDs (env-overridable; verify against current docs at build time): `claude-sonnet-5-5` (default), `claude-opus-5-5` (Mediator only), `claude-haiku-5-5` (routing/classification).

| Agent | Acts for | Model | Tools (allow-list) | Must NOT |
|---|---|---|---|---|
| **Scribe** | Whoever is speaking | Sonnet (vision) + Sarvam STT | `transcribe_audio`, `read_notebook_photo`, `read_scale_photo`, `draft_event` | Commit events; guess weights it can't read (must ask) |
| **Ledger Engine** | Nobody (deterministic code) | — | Pure functions: fine-weight, reconcile, balances, hash-chain, merkle | Use an LLM |
| **Karigar's Advocate** | The karigar | Sonnet | `get_my_account`, `explain_entry`, `fair_band`, `open_dispute_draft`, `speak_back` (TTS) | Sign for him; reveal jeweller-private data |
| **Jeweller's Steward** | The jeweller | Sonnet | `get_orders`, `get_karigar_load`, `propose_agreement`, `request_reassign` | Pressure karigar; edit history |
| **Mediator (neutral)** | The relationship | Opus | `diff_books`, `find_divergence`, `get_final_events` (FINAL only), `propose_settlement`, `escalate_to_panch` | See pending/private notes; finalise anything |
| **Deadline Guardian** | The order/customer date | Sonnet + Monte-Carlo code | `simulate_schedule`, `suggest_rebalance`, `notify` | Reassign without karigar acceptance |
| **Passport Issuer** (P1) | The karigar (owner) | Sonnet + deterministic scoring | `compute_profile`, `issue_credential`, `manage_consent` | Share without live consent; output a single opaque score |
| **Payments Watcher** (P1) | Both | Haiku | `payment_clock`, `nudge`, `mock_upi_payout` | Move real money |

**Interaction protocol (visible in the "Agent Room" UI — this is a demo highlight):**
Example *wastage renegotiation for a new job*: Steward proposes 3.0% → Advocate counters with the data-backed fair median for that design class → Mediator posts a reasoned middle proposal with evidence links → both humans get a **read-back in their language** → each approves or rejects → `SETTLEMENT_SIGNED`. If either rejects twice → `escalate_to_panch` (human trusted third party; stub the flow).

**Guardrails:** Numeric Grounding Guard; per-agent tool allow-lists enforced in code; every run logged (`agent_runs`: prompt hash, tool calls, cost, latency); prompt-injection hygiene (treat OCR'd notebook text and user messages as data, never instructions); deterministic temperature/seeds for demo paths.

---

## 7. Feature spec & acceptance criteria

### P0 — the demo spine (ship all)

**F1 Dual-Witness Ledger core**
AC: events cannot be updated/deleted (trigger + test); tampering with any stored event is detected by `verifyChain()` and shown in Ledger Explorer as a red break; `PENDING_COUNTERSIGN` events excluded from balances; fine-weight and reconciliation unit tests incl. rounding edge cases; conservation property test (fast-check, ≥1000 runs).

**F2 Karigar channel (WhatsApp-style)**
AC: karigar can say/type "Aaj 250 gram 22 carat sona mila Mehta ji se, haar ke liye" (Hindi/Bengali/English, code-mixed) → Scribe drafts `ISSUE` → bot reads back in his language via TTS and shows big **✅ haan / ❌ na** → his confirm = karigar signature → jeweller countersign request appears. Works from the simulator with recorded-audio fixtures when offline.

**F3 Scribe multimodal intake**
AC: (a) voice → draft; (b) **photo of handwritten khata page** → structured rows (sample images generated for demo, incl. Bengali-numeral/handwriting-font variants); (c) **photo of scale display** → weight; if OCR weight ≠ typed weight, block and ask. Every draft shows confidence and highlights uncertain fields; Scribe must ask rather than guess.

**F4 Divergence Finder (Mediator)**
AC: given the ledger and a notebook photo/voice recital, returns the **earliest diverging event**, the delta (net and fine mg), a likely cause class (`TRANSPOSITION`, `MISSING_ENTRY`, `LEGACY_SINGLE_SIGNED`, `PURITY_MISMATCH`, `ROUNDING`), and a plain-language explanation in the karigar's language; proposes an `ADJUSTMENT` for both to sign. Golden test = Scenario C below.

**F5 Wastage Fairness + Settlement**
AC: per design class computes P10/P50/P90 loss % from history; classifies a job as `WITHIN_BAND`, `ANOMALOUS_HIGH`, or `CAP_UNREALISTIC`; Mediator proposes a settlement with evidence; both parties see it in their language; settlement needs **two signatures**. Golden test = Scenario B.

**F6 Deadline Guardian**
AC: backward schedule incl. **hallmark leg**; seeded Monte-Carlo (≥2,000 runs, deterministic seed) gives on-time probability; alert when < 80%; at least two ranked actions (e.g., split a sub-component to a karigar with capacity; early customer message with revised-date options); karigar must accept any reassignment. Golden test = Scenario D.

**F7 Surfaces**
AC: Jeweller Console, Karigar "Mera Khata" PWA + chat, **Agent Room** (live agent conversation transcript with cited event IDs), **Ledger Explorer** (bahi-khata-styled page with chain visual, Day Seal, break detection), Customer tracker. **Karigar can see only his own account** (RLS + API tests proving karigar A cannot read karigar B).

**F8 Demo Mode**
AC: `/demo` route with a scripted scenario stepper (keyboard shortcuts), one-click **reset & reseed**, fixture fallbacks for all external APIs, a visible "LIVE / FIXTURE" indicator for presenter only.

### P1 (after P0 is solid)

- **F9 Trust Passport:** signed JSON credential + QR; field-level consent toggles; revoke; lender viewer with a mock ULI-style consent token endpoint; explainable profile (no single opaque number); disputes resolved in karigar's favour never count against him; minimum-data threshold before issuing.
- **F10 Payment clocks + Payer Score:** payment promise per delivery, countdown visible to both, escalation nudges, mock UPI payout; jeweller's median days-to-pay shown to karigars.
- **F11 Day Seal PDF/QR export** and **Audit pack** (one-click PDF: events, signatures, reconciliation, wastage evidence) — framed as "ready for your CA/auditor".
- **F12 Hindi/Bengali TTS read-back** polish and language auto-detect.

### P2 (only if time remains)

Refiner intake + `REFINER_CREDIT`; real WhatsApp (Twilio sandbox / Meta Cloud API); BLE scale integration; MCP server `tarazu-ledger`; Panch (human mediator) workflow; multi-jeweller karigars (one karigar working for several jewellers — consolidated own-view across jewellers).

---

## 8. Seed data & golden scenarios (build tests from these; derive all numbers in code)

Characters: **Mehta Jewellers** (Johari Bazaar, Jaipur); karigars **Bablu Maity** (Bengali), **Rafiq Ali**, **Suresh Soni**; customer **Aarti** (wedding date = *today + 12 days*, generate relative to now). Generate ≥14 months of history (≈120 jobs across design classes) with a **seeded RNG**; fair-band for class "22K heavy haar/necklace" must come out ≈ P10 2.9% / P50 3.8% / P90 4.6%.

**Scenario A — clean job (Bablu, J-1042, bridal haar).**
Issue net 250.000 g @ 22K (9160 bp) → fine **229,000 mg**. Cap 3.00% → **6,870 mg**. Returned: finished net 238.400 g @22K → **218,374 mg**; scrap net 7.100 g @85.00% → **6,035 mg**. Accounted 224,409 → **loss 4,591 mg (2.005%)**; excess **−2,279 mg** (within cap).

**Scenario B — excess-loss dispute (Rafiq, J-1043).**
Issue net 100.000 g @22K → **91,600 mg**. Cap 2.50% → **2,290 mg**. Returned: finished net 93.100 g → **85,280 mg**; scrap net 3.000 g @80% → **2,400 mg**. Loss **3,920 mg (4.28%)**; excess **1,630 mg** (CAP_ONLY → Rafiq "owes" 1.630 g fine). Fairness Engine: loss is **within the fair band** but the 2.5% cap is **below P10** → class `CAP_UNREALISTIC`. Mediator proposes meeting at fair median 3.8% → cap **3,481 mg** → Rafiq owes **439 mg**. Both sign (or escalate to Panch).

**Scenario C — books don't match (Bablu, month-end gap 247 mg fine).**
Legacy job J-1019 `RECEIVE_FINISHED`: ledger (imported from jeweller's notebook, single-signed) says net **118.250 g @22K**; Bablu's notebook says **118.520 g**. Δ net 270 mg → Δ fine **247 mg**. Divergence Finder must return J-1019, cause `TRANSPOSITION` + `LEGACY_SINGLE_SIGNED`, explain in Bengali/Hindi, and propose an `ADJUSTMENT` for both to sign.

**Scenario D — wedding at risk (Aarti, J-1042 pendant-set stage).**
Bablu has 4 open orders; stage = setting; hallmark leg 2 working days + 1 day delivery buffer. Seeded simulation should land **well under 80% on-time** (target ≈ 55–65%); the best rebalance (move earrings sub-order to Suresh, who has capacity) should lift it **above 85%**. Compute, don't hard-code; tests assert ranges.

**Scenario E — late pay.** Bablu's delivered job J-1040: labour due, promised in 7 days, **19 days elapsed** → payment clock red; Mehta Jewellers' **Payer Score** (median days-to-pay across karigars ≈ 11) is visible to all karigars.

Also generate: 2 synthetic handwritten-notebook images (Hindi/Bengali, with the J-1019 transposition) and 2 synthetic scale-display photos, via canvas/SVG + handwriting/seven-segment fonts, stored in `/fixtures`.

---

## 9. The 3-minute demo script (build the app so this path is flawless)

1. **(0:00)** Hero: animated Balance. Line: *"Gold moves on trust. Tarazu makes it move on proof — and gives the weaker side the same book."*
2. **(0:20)** Bablu (Bengali, voice note in the chat simulator): issue recorded → read-back → ✅ → Mehta countersigns → **Day Seal** appears.
3. **(0:50)** "Mera hisab alag hai": Bablu uploads his notebook photo → **Divergence Finder** pinpoints J-1019, `118.250 ↔ 118.520`, explains in Bengali → both sign the adjustment.
4. **(1:20)** Rafiq's job: Fairness Engine shows the **cap was below the P10 band** → **Agent Room**: Steward vs Advocate vs Mediator → proposal → both approve.
5. **(1:50)** Aarti's wedding: **Deadline Guardian** alert (≈60% on-time) → one-tap rebalance accepted by Suresh → ≈90%.
6. **(2:20)** Bablu's **Trust Passport**: QR → lender view (consent-gated) → *"Milk-collection data finances dairy farmers through ULI. Gold-delivery data should do the same for karigars."* Payer Score flips the power dynamic.
7. **(2:50)** Close: *"Agents propose. Humans approve. The ledger remembers."*

---

## 10. Design system (designer-led team — this must look premium)

**Concept:** *Craft meets fintech.* Warm, trustworthy, un-intimidating. Cultural anchor = the **bahi-khata** (red cloth-bound ledger). Signature motif = **the Balance**: the reconciliation view is a scale — left pan *issued fine gold*, right pan *finished + scrap + loss*; the beam tilts with the difference and **settles level** when balanced. Use it in the hero, Ledger Explorer, and settlement approval.

**Tokens (adjust via the skill, keep intent):**
- Ivory `#F6F1E7` (bg), Ink `#15130F` (text), Gold `#C9A24B`→`#E6C56E` (accent gradient), Verdigris `#1F6F5C` (balanced/trust/OK), Terracotta `#C4553B` (alert/dispute), Bahi-red `#8E1B1B` (ledger accents), paper-grain texture overlay at 3–5%.
- Type: **Fraunces** (display), **Plus Jakarta Sans** or **Inter** (UI), **JetBrains Mono** with tabular numerals for weights (always 3 decimals in grams), **Noto Sans Bengali** + **Noto Sans Devanagari** (never fall back to tofu).
- Motion: Framer Motion (or GSAP) — scale tilt, gold-bead transfer between pans, chain-link "snap" when an event becomes FINAL. Respect `prefers-reduced-motion`.
- Accessibility & literacy: min 48px targets, icon+label always, voice read-back on every confirm, high contrast, numerals shown in user's script option, no jargon in karigar UI (say "tumhara sona / তোমার সোনা", not "fine weight").
- Karigar UI is **calm and large**; Jeweller Console is **dense and scannable**; Agent Room is **transcript-like with citation chips** (event IDs clickable).

**Asset brief (I will generate and drop into `/public/assets`; use placeholders until then, named exactly):**
- `hero-balance.webp` — hero image: antique brass jeweller's balance with two hammered gold pans on warm ivory, soft studio light, tiny gold beads mid-transfer, shallow depth of field, editorial luxury, no text.
- `khata-paper-texture.webp` — subtle ivory ledger paper grain with faint red ruled lines.
- `karigar-bench.webp` — ink-line illustration of a goldsmith at a bench, single gold accent colour.
- `empty-*.svg` — empty states (no jobs, no disputes, passport not yet issued).
- `og-image.png` — 1200×630 social card.
- `logo-tarazu.svg` — provided (balance mark).

---

## 11. Tech stack, repo layout, environment

- **Next.js 15 (App Router) + TypeScript (strict)**, Tailwind, shadcn/ui (heavily restyled), Framer Motion, Zod, Vitest, fast-check, Playwright.
- **Supabase** (Postgres + Row-Level Security + Realtime). Append-only trigger on `events`. If Supabase is unavailable, fall back to SQLite/Drizzle behind a repository interface.
- LLM: `@anthropic-ai/sdk` (tool use, structured outputs via Zod schemas). Voice: Sarvam API (`SARVAM_API_KEY`). Crypto: `@noble/ed25519`, `@noble/hashes`.
- Deploy: Vercel (preview URL for judges) + a local `docker`-free fallback (`npm run demo`).

```
/apps/web                Next.js app (console, karigar PWA, tracker, passport viewer, /demo)
/packages/ledger         pure TS: money, fine-weight, reconcile, events, hash-chain, merkle, signing
/packages/agents         orchestrator, agent defs, tool schemas, Numeric Grounding Guard
/packages/channels       ChannelAdapter, SimulatorChannel, (Twilio/Meta stubs)
/packages/voice          Sarvam STT/TTS clients + fixtures
/packages/sim            Monte-Carlo deadline simulator, fairness stats
/fixtures                audio, notebook photos, scale photos, recorded LLM responses
/docs                    ARCHITECTURE.md (mermaid), DEMO_SCRIPT.md, PITCH.md, QA_PREP.md
```

`.env.example`: `ANTHROPIC_API_KEY`, `SARVAM_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_MODE=true`, `MODEL_DEFAULT`, `MODEL_MEDIATOR`, `MODEL_FAST`.

**Tests that must exist:** ledger unit + property tests; golden scenarios A–E; RLS isolation (karigar A cannot read karigar B); chain-tamper detection; Numeric Grounding Guard (inject a hallucinated number → blocked); Playwright run of the full 3-minute demo path; performance budget for the karigar PWA (LCP < 2.5s on throttled 4G).

---

## 12. Phases (execute in order; commit + report after each)

- **Phase 0 — Foundations:** repo, `CLAUDE.md`, `ASSUMPTIONS.md`, `PROGRESS.md`, design tokens (via skills), `.env.example`, CI scripts. Ask ≤3 blocking questions.
- **Phase 1 — Ledger core (F1):** `/packages/ledger` complete with tests, schema + RLS + trigger, seed generator, Scenarios A/B numbers asserted.
- **Phase 2 — Surfaces skeleton (F7):** Console, Karigar chat simulator + PWA, Ledger Explorer with chain visual, auth roles. Dual signing flow working with the simulator.
- **Phase 3 — Scribe + voice (F2, F3):** voice → draft → read-back → confirm; notebook/scale photo reading with fixtures.
- **Phase 4 — Mediator (F4, F5):** Divergence Finder, Fairness Engine, settlement flow, Agent Room.
- **Phase 5 — Deadline Guardian (F6)** + customer tracker.
- **Phase 6 — Demo Mode (F8)**, Numeric Grounding Guard hardening, end-to-end Playwright of the demo script, polish pass on motion and copy.
- **Phase 7 — P1:** Trust Passport + lender viewer, payment clocks + Payer Score, audit pack.
- **Phase 8 — Pitch pack:** `ARCHITECTURE.md` with mermaid diagrams, `DEMO_SCRIPT.md`, `PITCH.md` (60-sec + 3-min versions), `QA_PREP.md` (below), README with screenshots, a "field questions" appendix mapping each of the brief's six questions to the feature that answers it.

---

## 13. Pitch & judge Q&A (keep answers consistent with the product)

- **Why not blockchain?** We need tamper-*evidence* and two-party consent, not a decentralised currency. Hash-chain + dual signatures + Day Seals deliver that with lower cost, no wallets, and works for a karigar on WhatsApp.
- **How are you different from jewellery ERPs?** They are the jeweller's system of record. We are the *shared* record: co-signed, karigar-accessible, neutrally reconciled, and portable as reputation.
- **LLM hallucination?** Agents never compute or commit. Deterministic engine + Numeric Grounding Guard + human countersign.
- **Why would jewellers adopt?** Fewer disputes, audit-ready wastage evidence, wedding-date protection, and access to better karigars who prefer fair counterparties (Payer Score).
- **Why would karigars adopt?** Own their account, speak in their language, get paid-clock visibility, and earn a portable Trust Passport.
- **Privacy?** Karigar owns his passport; field-level consent; revocable; purpose-limited (design to Indian DPDP Act principles; no legal-compliance claim in the demo).
- **Business model?** Jeweller subscription + per-settlement; lender/credit partner referral fees; karigars never pay.
- **Fairness risks of scoring?** No opaque score; disputes resolved in karigar's favour don't count against him; counterparty-attested data only; minimum-data threshold.

---

## 14. Definition of done

The 3-minute demo runs end-to-end 10 times in a row in `DEMO_MODE` with zero manual intervention; all golden tests pass; the karigar can only ever see his own account; every number shown by an agent is traceable to event IDs; the UI looks designed, not generated.

**Begin with Phase 0 now.**
