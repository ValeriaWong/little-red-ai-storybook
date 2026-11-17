# Little Red Riding Hood — On-Device AI Storybook

An offline-first interactive storybook for kids (ages 3–8), built with
**Firebase AI Logic hybrid inference** for
[#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com/)
($30,000, deadline **Dec 1, 2026 06:00 CST**).

Devpost draft: https://devpost.com/software/little-red-riding-hood-on-device-ai-storybook

## What it is

A web storybook of *Little Red Riding Hood* (Grimm's "Little Red-Cap", 1812 —
public domain; this is an original English adaptation of the v5 script).
The child makes five little choices — a gift for Grandma, what to tell the
wolf, which road to take, whether to listen at the door, how to call for
help — and the story branches into **one of four endings**, following the
v5 determination rule: **C2** (did she hear the wolf slip up at the door) ×
**R** (was the big reveal shown during the questions) × **H** (shout for the
hunter / ring the bell). No bad endings, no failing: fear is answered by
stepping back and asking a grown-up for help.

The AI feature is **"Continue the story with AI"**: on any scene, the
storyteller continues the story in 2–3 short, gentle sentences. Every AI
answer shows a chip — **📱 On device** (Gemini Nano, offline, in Chrome) or
**☁️ Cloud** (Gemini) — read straight from the response's `inferenceSource`.

## Firebase AI Logic — API verified from the official docs (2026-11-17)

All calls below were verified against firebase.google.com/docs (not blogs):

| What | Verified API | Doc |
|---|---|---|
| Setup (Web) | `npm install firebase`; `initializeApp(config)`; `getAI(app, { backend: new GoogleAIBackend() })` | [get-started](https://firebase.google.com/docs/ai-logic/get-started) |
| Hybrid model | `getGenerativeModel(ai, { mode: InferenceMode.PREFER_ON_DEVICE, inCloudParams: { model, generationConfig }, onDeviceParams: { createOptions } })` | [hybrid-on-device-inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference) |
| Modes | `PREFER_ON_DEVICE` (on-device, else cloud fallback) · `ONLY_ON_DEVICE` · `PREFER_IN_CLOUD` · `ONLY_IN_CLOUD` | [configuration-options](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options) |
| On-device init | `model.initializeDeviceModel(cb)` — after a user interaction, before the first `generateContent()` | [hybrid-on-device-inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference) |
| Which path answered | `result.response.inferenceSource` → `ON_DEVICE` or `IN_CLOUD` (JS SDK v12.5.0+) | [configuration-options](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options) |
| Cloud fallback model | Default is **`gemini-3.5-flash-lite`** (JS SDK v13.0.0+); overridable via `inCloudParams.model` | [configuration-options](https://firebase.google.com/docs/ai-logic/hybrid/web/configuration-options) |
| Text generation | `await model.generateContent(prompt)` → `result.response.text()` (single-turn only on-device; no chat) | [generate-text](https://firebase.google.com/docs/ai-logic/generate-text) |
| Image generation | **Imagen shut down 2026-08-17** — use Nano Banana: `getGenerativeModel(ai, { model: "gemini-3.1-flash-image", generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] } })` | [generate-images-gemini](https://firebase.google.com/docs/ai-logic/generate-images-gemini) |
| App Check (Web) | Guided setup auto-enforces App Check for AI Logic. Local dev: set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before `initializeAppCheck`; register the printed debug token in the console (Security > App Check > Apps > Manage debug tokens) | [get-started](https://firebase.google.com/docs/ai-logic/get-started) |
| Billing | Firebase AI Logic itself is free. The Gemini Developer API **free tier needs no billing account** — the Firebase project stays on the **no-cost Spark plan**. (Some models, especially preview and media-generating models, might require billing.) | [pricing](https://firebase.google.com/docs/ai-logic/pricing) |
| On-device requirements | Chrome Desktop 139+, Firebase AI Logic SDK v12.5.0+ (this project uses **firebase 13.4.0**), flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` | [hybrid-on-device-inference](https://firebase.google.com/docs/ai-logic/hybrid-on-device-inference) |

On-device limitations (from the docs): single-turn text generation only
(no multi-turn chat), text-only or text+image (JPEG/PNG) input, structured
output supported; Gemini Live API, server prompt templates, and `countTokens`
are not available for hybrid implementations.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the Firebase web config (see below)
npm run dev            # http://localhost:5173
npm test               # vitest — story engine tests (all 4 endings, card rules)
npm run build          # tsc + vite build -> dist/
```

### Firebase config (placeholder — fill in Nov 19)

The Firebase project does not exist yet. The quota account for Sprint 2 was
requested Nov 17 and is expected **Nov 19, 2026** (valid ~4 days). When it
arrives:

1. Create the Firebase project in the console (or add Firebase to the
   provisioned Google Cloud project), choose the **Gemini Developer API**
   provider (no cost to start), and let the guided AI Logic workflow set up
   the APIs. It auto-enforces App Check — for local dev, use the debug
   provider (see `src/firebase.ts`): the debug token printed in the console
   must be registered under Security > App Check > Apps > Manage debug tokens.
2. Copy the web config into `.env` (see `.env.example`). **Never commit
   `.env`** — it is gitignored. The web config values (apiKey etc.) are
   public identifiers, not secrets, but keep them out of the repo anyway.
3. Flip `IMAGE_GENERATION_ENABLED` to `true` in `src/firebase.ts` to enable
   the "Draw a new picture" hook (Nano Banana `gemini-3.1-flash-image`).
   It is off until the quota account arrives, because the pricing docs flag
   media-generating models as possibly needing billing.

**Without a Firebase config the app still runs the full story.** AI buttons
show a clear "Firebase not connected yet" state instead of crashing.

### On-device inference in the browser

On-device (Gemini Nano) works in Chrome Desktop 139+ with the flag
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled. The
first "Continue the story" tap calls `initializeDeviceModel()` (user
activation required) and starts the model download in the background if
needed; until it is ready, requests fall back to the cloud automatically.

## Story structure

- `src/story/story.ts` — the v5 story in English: cover, Act 0, B1 gift,
  B2 wolf, B3 fork, interlude, B4 doorway, B5 doorstep (question cards),
  4 endings (E-A1/E-S1/E-A2/E-S2), reunion, "Today's little adventure" recap.
- `src/story/engine.ts` — the state machine. Enforces the v5 rules: at most
  two different question cards before help; re-asking the same card doesn't
  count; the second card plays the big reveal (R=1); C2/R are snapshotted
  the first time the player calls for help, and later content never changes
  that run's ending.
- `src/components/StoryPlayer.tsx` — the player: one "Start the story",
  choices inside the story, 4 endings, footer controls (read aloud via the
  browser's speech synthesis, replay from the fork, start over).
- `src/components/AiPanel.tsx` — "Continue the story with AI" + the
  (currently disabled) "Draw a new picture" hook, with the On device / Cloud chip.
- `src/firebase.ts` — Firebase init, App Check debug, hybrid + image models.
- `src/ai.ts` — `continueStory()` / `generateSceneImage()`, graceful
  degradation when Firebase is not configured.
- `public/images/` — 19 keyframe illustrations (9:16, ~4 MB total), prepared
  by `scripts/prepare-images.py` from the storybook project's keyframes
  (Gemini 9:16 keyframes + 3:2 frames center-cropped to 9:16).

## Submission checklist (Devpost)

- [x] Devpost registration + project draft (jobtowq)
- [x] Public repo, Apache-2.0 license (this repo — push to GitHub next)
- [x] Firebase AI Logic actually called in code (`src/ai.ts`, `src/firebase.ts`)
- [ ] Firebase project connected (Nov 19, quota account)
- [ ] Demo video ≤ 3 min on YouTube (record after the AI path works)
- [ ] Text description + hosted project link
- [ ] Final submit by **Dec 1, 2026 06:00 CST**

## Known scope risks for the Dec 1 deadline

1. **Quota account timing** — the account is expected Nov 19 and valid
   ~4 days (to ~Nov 23). If identity verification is slow, the AI path can
   only be tested late; the story works without it, but the demo video needs
   a working AI call. Mitigation: record the demo as soon as the account
   lands; keep the no-config fallback clean.
2. **On-device availability** — Gemini Nano needs Chrome Desktop 139+ and a
   multi-hundred-MB model download; the demo machine must have the flag on
   and the model pre-downloaded. Mitigation: the cloud fallback is automatic,
   and the chip shows honestly which path answered.
3. **Image generation billing** — Nano Banana may need billing even on the
   Gemini Developer API free tier (per the pricing docs). The hook stays
   disabled until the quota account is confirmed working.
4. **Demo video** — not yet recorded; needs a real AI call + a 3-minute
   script. Budget a day for it.
5. **Age tiers** — the scaffold plays the 5–6 default flow. The 3–4
   simplified flow and 7–8 clue-comparison from the v5 script are not
   implemented (documented future work, not required for the demo).

## License

Apache-2.0 — see `LICENSE`. Story text is an original adaptation of Grimm's
"Little Red-Cap" (1812, public domain). Illustrations are original AI
keyframes made for this project.
