# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**DARER Journey** — a gamified CBT/ERP (Cognitive Behavioral Therapy / Exposure Response Prevention) web app for social anxiety. Uses an RPG metaphor: exposure challenges are "bosses", coping techniques are "armory tools", and progress is tracked via XP/HP.

- **Stack**: React 18 + Vite 5, no router library (string-based screen state)
- **Backend**: Supabase (auth, `user_progress`, `nda_agreements`, `user_feedback`)
- **AI**: OpenAI Chat Completions (`gpt-5.4-mini`) proxied through `/api/qwen-chat`
- **Voice**: OpenAI Whisper STT (`/api/stt`) + OpenAI TTS (`/api/tts`) with browser `speechSynthesis` fallback
- **Styling**: 100% inline styles + design tokens (`C` object in `src/constants/gameData.js`) + global animations in `src/index.css`
- **Target**: Mobile-first PWA, max 480px width centered

## Commands

```bash
npm run dev              # Start Vite dev server (port 3000)
npm run build            # Production build
npm run preview          # Preview production build

npm run test:e2e         # Playwright E2E: full signup-to-map flow
npm run test:e2e:ui      # Playwright E2E with UI
npm run test:e2e:headed  # Playwright E2E headed browser
npm run test:ai          # AI-powered content quality tests (needs OPENAI_API_KEY)
npm run test:ai:ui       # AI tests with UI
```

Tests use a mobile viewport (420x860), single worker (sequential). The `e2e` test mocks all AI calls via `page.route('**/api/qwen-chat')`. The `ai` tests use DashScope Qwen 3.5 Flash for visual/content assertions and gracefully skip if `DASHSCOPE_API_KEY` is not set.

## Architecture

### State Management — `src/hooks/useAppState.jsx`

Single custom React hook, no external state library. All state is plain `useState`/`useRef`/`useCallback`:

- **`screen` / `screenHistory`** — string-based routing with back-stack. Navigation is `setScreen("next-screen")` which pushes current screen onto history. `goBack()` pops from stack.
- **`hero`** — character data (name, stats, values, strengths, traits, armory, coreValues)
- **`quest`** — bosses array and goal string
- **`battleHistory`** — array of past battle records
- **`onboardingState`** — per-screen ephemeral state keyed by screen name (`obState`/`setOBState` pattern)
- **`isAuthenticated`** — Supabase auth state

**Auto-save**: Every state change triggers a throttled (2s) `saveProgress()` to Supabase `user_progress` table (upsert on `user_id`). Also saves on `beforeunload` and `visibilitychange`.

**Resume logic**: After login, the app checks Supabase for saved progress and routes accordingly (map if bosses exist, exposureSort if tutorial complete, last saved screen, or intro for new users).

### App Component — `src/App.jsx`

`DARERQuest` is a single large component that:
- Consumes everything from `useAppState` + `useBossHandlers` + `useCompletionHandlers`
- Renders screens via conditional matching: `screen === "intro" && <GameIntro ... />`
- Wraps in a `maxWidth: 480` container
- Provides global Back button, Logout button, and Feedback modal overlay

### Screen Navigation Flow

```
login → nda → intro → character → values → shadowLore → psychoed → shadowLorePost
→ intake → shadowReveal → values (second pass) → darerStrategy → armoryIntro
→ tutorial → exposureSort → map ↔ battle (loop)
```

Profile, armory, and ladder screens are accessible via bottom nav from map/battle.

### API Layer

**Chat/AI** (`src/utils/chat.js`):
- `callAI(systemPrompt, messages, maxTokens, timeoutMs)` — POST to `/api/qwen-chat`, retries 3x with 1.5s pause, 45s timeout
- `useAIChat(systemPrompt, ctx)` — React hook wrapping `callAI`, maintains message history via `useRef`

**Hero Context** (`src/utils/aiHelper.jsx`):
- `buildHeroContext(hero, quest, shadowText, battleHistory)` — serializes hero data into compact string (~300-500 chars) for AI prompts

**Supabase** (`src/utils/supabase.js`):
- `saveProgress`, `loadProgress`, `saveNdaAgreement`, `checkNdaAgreed`, `saveFeedback`

**System Prompts** (`src/constants/gameData.js`):
- `SYS.intake`, `SYS.battle`, `SYS.victory`, `SYS.preBoss` — AI system prompts for different contexts

**Dev Proxies** (`vite.config.js`): All three are dev-only (via `configureServer`):
- `/api/qwen-chat` — POST proxy to OpenAI Chat Completions (`gpt-5.4-mini`)
- `/api/stt` — multipart/form-data proxy to OpenAI Whisper (`whisper-1`)
- `/api/tts` — JSON proxy to OpenAI Audio Speech (`tts-1`, voice `nova`)

### Key Hooks

| Hook | Purpose |
|------|---------|
| `useAppState` | Central state: auth, routing, hero/quest data, auto-save |
| `useBossHandlers` | Boss CRUD on map: delete, achieve/mark defeated |
| `useCloudVoice` | Cloud voice I/O: STT via `/api/stt`, TTS via `/api/tts`, browser fallback |
| `useCompletionHandlers` | Callbacks for character/intake/boss/tutorial completion |
| `useTypewriter` | Character-by-character text reveal at ~12 chars/sec (synced with TTS) |
| `useVoiceRecorder` | Browser-native voice I/O (SpeechRecognition + speechSynthesis) |

### Shared UI Primitives

`PixelText` (pixel-font text), `PixelBtn` (styled button), `DialogBox` (speech-bubble container), `HPBar`, `TypingDots`, `TypewriterBubble` (text reveal + TTS sync), `VoiceInputBar`, `VoiceInputField`.

### Styling

- **Design tokens**: `C` object in `src/constants/gameData.js` (e.g., `C.plum`, `C.goldMd`, `C.mapBg`, `C.bossRed`)
- **Global CSS**: `src/index.css` has reset + `fadeIn`/`fearPulse` keyframes only
- **Fonts**: `Press Start 2P` (pixel) + `DM Sans` (body) — loaded via Google Fonts `<link>` injected dynamically
- **All component styling is inline** `style={{}}` using tokens from `C`

### Notable Conventions

1. **`obState`/`setOBState` pattern**: Each screen gets its own ephemeral state slice via `getOBState("screenName", defaults)` and `setOBState("screenName", partial)`. This state persists to Supabase, enabling resume-after-refresh.
2. **Multi-step screens**: Most screens use internal `step`/`phase` state to manage sub-screens (e.g., BossBattle: `prep` → `battle` → `log` → `result`).
3. **AI error resilience**: All AI calls have 3-attempt retry, graceful fallback strings, and UI error states with retry buttons. Failed messages are removed from chat history.
4. **Dual TTS**: `TypewriterBubble` syncs text reveal with TTS pace. IntakeScreen uses cloud TTS; BossBattle uses browser `speechSynthesis` for instant response.
5. **NDA gating**: Before the main flow, users must agree to an NDA (versioned, stored in `nda_agreements` table). E2E tests pre-insert the NDA via Supabase REST API to skip this screen.

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (publishable)
- `OPENAI_API_KEY` — OpenAI key (used by dev proxy for chat + TTS)
- `OPENAI_WHISPER_API_KEY` — OpenAI key for Whisper STT (falls back to `OPENAI_API_KEY`)
- `DASHSCOPE_API_KEY` — DashScope key (used by `test/ai-tester.js` for Qwen 3.5 Flash visual/content assessments)
- `DARER_TEST_URL` — Optional override for E2E test target URL (defaults to `http://localhost:3000`)

## Test Infrastructure

- `test/darer-full-onboarding.spec.js` — Full onboarding E2E (signup → intro → character → values → shadow lore → psychoed → intake → shadow reveal → DARER → armory → tutorial → exposure sort → map → resume). Mocks all AI calls.
- `test/ai-tester.js` — AI assertion utility: `aiAssert`, `aiAssess`, `aiAssessText`, `quickSignup`, `setupMockAI`, `btn`, `screen`. Uses DashScope Qwen 3.5 Flash with vision. Gracefully skips when `DASHSCOPE_API_KEY` is not set.
- `test/ai-smoke.spec.js` — AI-powered visual smoke tests for critical screens (9/12 passing).
- `test/ai-content-quality.spec.js` — AI content quality tests for AI-generated content (values, exposures, bosses, intake responses, shadow summary). All 5 passing.
- `test/screenshots/` — Directory for test screenshots.

---

## Session: 2026-04-29 — AI Testing Agent

### Completed
- **Created `test/ai-tester.js`** — reusable AI assertion utility with `aiAssert` (visual + throw on fail), `aiAssess` (visual + return JSON), `aiAssessText` (text-only evaluation), plus test helpers (`quickSignup`, `setupMockAI`, `btn`, `screen`). Uses `gpt-4o-mini` with vision. Gracefully skips when `OPENAI_API_KEY` is not set.
- **Created `test/ai-smoke.spec.js`** — 7 visual smoke tests that navigate to critical screens (login, GameIntro, CharacterCreate name entry, Meet Dara, Values cards, Shadow Lore, PsychoEd), take screenshots, and validate with AI that the UI renders cleanly and content is coherent.
- **Created `test/ai-content-quality.spec.js`** — 5 content quality tests that evaluate AI-generated content (values, exposures, bosses, intake responses, shadow summary) against therapeutic criteria using `aiAssessText`. Scores 1-5, logs issues.
- **Updated `playwright.config.js`** — split into two projects: `e2e` (existing full onboarding) and `ai` (new AI tests, 120s timeout).
- **Updated `package.json`** — added `test:ai` and `test:ai:ui` scripts. Updated existing `test:e2e` scripts to use `--project e2e`.
- **Created `CLAUDE.md`** — this file.

### Session: 2026-04-29 (afternoon) — AI Model Switch + Test Fixes

- **Switched AI testing from OpenAI to DashScope (Qwen 3.5 Flash)**
  - Added `DASHSCOPE_API_KEY` to `.env`
  - Updated `test/ai-tester.js` to use DashScope compatible-mode endpoint with `qwen3.5-flash`
  - Added `dotenv` dev dependency; imported it in `playwright.config.js` to load `.env` vars
- **Fixed NDA consent screen blocking tests** — added Supabase REST API pre-insert in `signupAndLogin` helper
- **Fixed unique email per test** — each `signupAndLogin` now generates a fresh email (prevents resume-from-saved-state issues)
- **Fixed stale button text selectors** — `"I'M READY, DARA"` → `"BEGIN JOURNEY"` (label changed in app)
- **Fixed navigation flow to match current app routing** — `handleCharacterComplete` routes directly to `shadowLore` (no core values step). Updated Shadow Lore and PsychoEd tests to go straight to F.E.A.R. screen. Rewrote Values test to navigate full flow: `shadowLore → psychoed → intake → shadowReveal → values`.

**Results**: 9/12 tests passing. 5 content quality tests pass with AI scores. 4/7 smoke tests pass. 3 remaining failures involve navigating the async intake chat (Send → AI reply → Finish flow).

### Session: 2026-04-29 (evening) — Intake Chat Fixes + Lore Update + Voice Switch

- **Fixed 2 of 3 remaining smoke test failures** (6/7 smoke tests now passing):
  - Send button: changed selector from `hasText: /send/i` → `hasText: '→'` (last match). The actual button is just an arrow.
  - No Finish button exists: IntakeScreen auto-transitions when AI reply contains `"SHADOW'S TRUE NATURE"`. Updated mock to detect user messages (`msgs.length > 1`) and return shadow summary text that triggers auto-transition.
  - Navigation path: intake → `screen('THE SHADOW\'S TRUE NATURE')` (ShadowReveal) → `btn('THE JOURNEY CONTINUES')` → ValuesScreen (`'WHY BECOME A DARER'` intro step).
  - PsychoEd has 6 slides (0-5), not 2: need 5× NEXT + 1× CONTINUE to exit.
  - Added `page.context().clearCookies()` + `localStorage.clear()` in `signupAndLogin` to prevent test state bleed.
  - Intake input selector: changed from `textarea, input[type="text"]` → `input[placeholder*="Speak to Dara"]` (VoiceInputBar).
  - ShadowLore step 0: added second `btn('CONTINUE')` click (step 0 F.E.A.R. intro → step 1 Dara dialog).
  - *Remaining failure*: Values test — intake auto-transition timing (sends message, AI returns mock, but typewriter/TTS sync delays the shadow summary detection).
- **Updated ShadowLore step 0 lore** — replaced narrator voice with Dara's direct address to the hero. Uses `DialogBox` component, references `{heroName}`, flows naturally from Meet Dara screen.
- **Switched IntakeScreen from cloud STT to browser-native** — changed `useCloudVoice({ useCloud: true })` → `useCloudVoice({ useCloud: false })`. Eliminates Whisper API round-trip lag. Browser `SpeechRecognition` streams results in real-time. Also uses browser `speechSynthesis` for TTS (matches BossBattle setup).

### Session: 2026-04-29 (night) — Pushed to GitHub

- **Pushed app changes** — committed and pushed `package.json`, `package-lock.json`, `playwright.config.js`, `playwright-report/index.html`, `.claude/settings.local.json` (test config split, dotenv, AI infra). AI test files remain local/untracked.
- **Pushed lore update** — `src/screens/ShadowLore.jsx` step 0 now spoken by Dara.
- **Pushed voice switch** — `src/screens/IntakeScreen.jsx` uses browser STT/TTS for instant response.

### Session: 2026-04-29 (late night) — D.A.R.E.R. Restructure + Armory Fix + AI Test Infra Pushed

- **`src/screens/BossBattle.jsx`** — restructured D.A.R.E.R. steps to match TutorialBattle's sub-step flow:
  - **RISE (prep)** — 4 sub-steps: WHEN+WHERE combined → CALENDAR REMINDER → ARMORY → SUDs before
  - **ENGAGE (result)** — 6 sub-steps: outcome → SUDs after → 3 sequential reflection Qs → free text → SUDs comparison ("THE SHADOW LIED") → **functional REPEAT**
  - REPEAT step: AI generates 3 follow-up exposure variations based on outcome (harder if victory, easier if retreat, creative "I FEEL LUCKY" option). User selects one, choice passed to `onVictory()` with `repeatChoice` field. Fully interactive (unlike TutorialBattle's read-only preview).
- **`src/screens/TutorialBattle.jsx`** — REPEAT step converted to read-only preview: psychoeducation card + faded non-interactive suggestions + "GOT IT — ON TO THE PATH →" button. Prevents trial users from getting stuck in a repeat loop.
- **`src/screens/ArmoryScreen.jsx`** — breathing practice reduced from 5 min to 3 min (`practiceDuration: 180`).
- **AI test infra** — `test/ai-tester.js`, `test/ai-smoke.spec.js`, `test/ai-content-quality.spec.js`, `CLAUDE.md` all pushed to `main`.
- Build verified: `npx vite build` passes cleanly (111 modules, 588 KB).

### Session: 2026-04-30 — TutorialBattle RISE Restructure + D.A.R.E.R. Progress Bar

- **`src/screens/BossBattle.jsx`** (previous session, continued):
  - **RISE sub-step 0** restructured: WHEN options → `<input type="time">` picker → inline "SET CALENDAR REMINDER →" button (opens Google Calendar) → WHERE input, all on one screen
  - Removed old separate sub-step 1 (calendar reminder screen), renumbered ARMORY from 2→1, SUDs from 3→2
  - **D.A.R.E.R. progress bar**: Added 5th "R" (Repeat) step, made all letters clickable for navigation between completed/accessible prep steps
  - **Decide section**: Multi-select value cards with `decideSelectedVals` array + separate `decideCustom` input, combined on submit with `"; "` join
  - **Allow section**: Progressive multi-question flow — fearful thoughts textarea → likelihood slider (0-100%, dynamic color) → severity slider (0-10, dynamic color) → can-handle buttons → fear-showing buttons → physical sensation tags (multi-select)
  - Removed "HOW LOUD IS THE SHADOW" slider
  - Removed quick action buttons from battle/engage phase
  - Repeat extracted as its own `phase === "repeat"` block (was embedded in engage sub-step 5)
  - Slider dynamic colors: green ≤33%, amber ≤66%, red >66%
- **`src/screens/TutorialBattle.jsx`** — RISE section restructured to match BossBattle:
  - `riseSubStep 0`: Combined WHEN + TIME + WHERE on one screen with inline time picker and calendar reminder button
  - Removed old separate `riseSubStep 1` (calendar reminder screen)
  - Renumbered ARMORY from sub-step 2→1, SUDs from sub-step 3→2
  - All `setRiseSubStep` calls updated to new numbering
  - TutorialBattle's REPEAT step remains a read-only preview within engage sub-step 6 (intentionally different from BossBattle's interactive repeat)
- Build verified: `npx vite build` passes cleanly (1.13s).

### Session: 2026-04-30 (continued) — Allow Validation, Armory Sync, Practice Integration, SUDs Colors, Reflection Skip

- **Allow section — all fields required before proceeding** (`BossBattle.jsx`, `TutorialBattle.jsx`):
  - Added 6-field validation gate: `allowFearful` (textarea), `allowLikelihood` (slider 0-100%), `allowSeverity` (slider 0-10), `allowCanHandle` (buttons), `allowFearShowing` (buttons), `allowPhysicalSensations` (multi-select tags)
  - Progressive disclosure: each field appears only after the previous one is filled
  - Continue button disabled until all 6 fields are complete
  - Added "Nothing significant — my body feels fine" option to physical sensations list
  - Added custom sensation input for manual entry

- **Armory tool display synced with `hero.armory`** (`BossBattle.jsx`, `TutorialBattle.jsx`):
  - Replaced hardcoded tool list with dynamic rendering from `hero.armory` array
  - Only unlocked tools (`t.unlocked === true`) shown as clickable buttons in RISE armory step
  - Locked tools displayed as grayed-out previews with lock icon (opacity 0.5, pointerEvents: "none")
  - Tool selection stores `selectedArmoryTool` for practice prompt

- **Practice prompt after armory selection** (`BossBattle.jsx`):
  - RISE sub-step 2: After selecting an armory tool, prompt "Do you want to practice this skill now?" with YES → SKIP buttons
  - RISE sub-step 2.5: `PracticeSession` launches with the selected tool
  - `PracticeSession.onComplete` or `onQuit` returns to sub-step 3 (SUDs before)
  - "Trust strategy alone" button skips practice prompt, goes directly to SUDs

- **SUDs sliders — dynamic color + subtitle** (`BossBattle.jsx`, `TutorialBattle.jsx`):
  - Added subtitle "How much distress do you feel right now?" to SUDs before/after screens
  - Slider track color changes based on value: green (≤33), amber (34-66), red (>66)
  - Same dynamic color applied to the numeric percentage display

- **ENGAGE step — two-path engagement** (`BossBattle.jsx`, `TutorialBattle.jsx`):
  - Added two buttons: "ENGAGE RIGHT AWAY" (jumps to outcome/result) and "TALK TO DARA FIRST" (enters battle chat)
  - Battle chat phase replaced BATTLE COMPLETE/RETREAT with single "I'M READY TO ENGAGE" button
  - New engage sub-step 0.5 for Dara chat before outcome selection

- **Reflection questions — conditional skip** (`BossBattle.jsx`, `TutorialBattle.jsx`):
  - Q2 ("How severe was it actually?") hidden when Q1 answer is "No, they didn't happen at all"
  - Q3 ("Did you get through it?") also hidden when Q1 answer is "No, they didn't happen at all"
  - Selecting "No" clears `fearedSeverity` and `madeItThrough` state to prevent stale values
  - Continue button auto-enabled when Q1 is "No" (no further answers required)

- **`src/components/PracticeSession.jsx` — timer/phase bug fix**:
  - Fixed breathing exercise stuck on "BREATHE IN" — original code had `setTimer` nested inside `setBreathPhase`, but outer setter always returned same value causing React to bail out
  - Rewrote using useEffect pattern: interval increments `timer` independently, separate useEffect watches `timer` + `breathPhase` to detect phase transitions and advance
  - Applied same pattern to grounding, allowing, and values practice timers
  - Simplified `togglePause` to flip boolean flag; useEffect handles pause/resume via dependency restart

### Pending / Next Steps
- **Fix remaining Values test** — intake auto-transition timing with typewriter/TTS sync delay.
- **BossBattle prep/visual smoke test** — navigate to a boss on the map, enter prep phase, validate DARER steps layout. New engage flow has sequential reveals (I AM READY TO REPORT → outcome → SHOW ME THE LOOT → loot upload) — tests must account for this multi-step flow.
- **TutorialBattle coach chat voice test** — verify VoiceInputBar appears and AI replies auto-speak in TutorialBattle engage sub-step 0.5.
- **Loot upload test** — BossBattle engage sub-step 0.5 has image picker + textarea; E2E tests need to handle file upload or skip image selection.
- **IntakeScreen real-AI visual test** — run intake chat with real AI responses, validate chat UI, typewriter bubbles, TTS.
- **Visual regression baseline** — store approved screenshots as baselines to detect layout regressions.

### Session: 2026-05-01 (test update) — E2E Test Synced with App Changes

- **`test/darer-full-onboarding.spec.js`** — updated to match current app state:
  - **Decide phase** — now requires selecting at least one value card before proceeding (was read-only). Button: "I DECIDE → NEXT: ALLOW". Screen text "YOUR DECISION" → "DECIDE" phase label.
  - **Allow phase** — replaced single textarea with 6-field progressive form: fearful thoughts textarea → likelihood slider (0-100%) → severity slider (0-10) → can-handle buttons → fear-showing buttons → physical sensation tags (multi-select). Button: "I'M ALLOWING IT → NEXT: RISE".
  - **Rehearse phase** — eliminated (merged into Allow phase).
  - **RISE sub-steps** — WHEN+WHERE combined on one screen, "LOCK IT IN →" button requires both fields. Armory shows dynamic `hero.armory` tools. Practice prompt with YES/SKIP.
  - **SUDs before/after** — 1-10 button grid → 0-100 range slider. Set via `page.evaluate()` with native setter + input/change events.
  - **Engage sub-step 0** — "ENGAGE RIGHT AWAY" (skip Dara chat) or "TALK TO DARA FIRST" (voice chat). Outcome selection → CONTINUE.
  - **Engage sub-steps 1-6** — outcome → SUDs slider (0-100) → reflection Q1-Q3 (conditional skip) → free text → SUDs comparison ("FIRST BATTLE COMPLETE") → REPEAT preview → "GOT IT — ON TO THE PATH →".
- **`CLAUDE.md`** — testing agent docs updated with 2026-05-01 changes and testing impact summary.

### Session: 2026-05-01 (evening) — Engagement Overhaul, Voice Consistency, Bottom Nav Fix, TutorialBattle Parity

- **`src/screens/BossBattle.jsx`**:
  - **Engage sub-step 0 redesign** — sequential reveal flow: Dara's message → "I AM READY TO REPORT" button → 3 outcome options appear → user selects → "SHOW ME THE LOOT" button → sub-step 0.5 (proof upload area with image + text)
  - **Engage sub-step 0.5 (Loot)** — new proof upload with image picker (base64 via FileReader) + text input for meaningful moments. No validation required to proceed (CONTINUE always enabled).
  - **Decide voice encouragement** — auto-speaks motivational interviewing message when prepStep === 0 (empathy + self-efficacy + anchor framing). Uses `decideSpoken` ref to prevent re-speaking on re-renders.
  - **DebriefFreeText component** — extracted sub-step 3 with auto-TTS (Dara speaks the question on mount) + VoiceInputBar for spoken reflection + textarea fallback.
  - **Fixed `heroName` not defined** → changed to `hero.name` in post-battle Dara speech (line ~1209)
  - **battleVoiceMode default** → `false` → `true` so Dara auto-speaks in battle phase
  - **RISE sub-step 0 validation** — WHERE field now required: `disabled={!exposureWhen || !exposureWhere.trim()}`
  - **Q3 text simplified** — "Even though it was difficult — did you get through it?" → "Did you get through it?"
  - **Bottom nav fix** — `position: fixed, left: 50%, translateX(-50%), width: 100%` → `left: 0, right: 0, maxWidth: 480, margin: 0 auto` (prevents overflow on wide screens)

- **`src/screens/TutorialBattle.jsx`**:
  - **SUDs before/after** — replaced 1-10 button grid with 0-100 range slider (matches BossBattle). Default `sudsBefore`/`sudsAfter` from `null` → `0`.
  - **Rise dialog** — "The rehearsal is done. You've felt the Storm..." → "You're ready. The Storm may strike, but you've already decided what matters." (removed incorrect rehearsal reference)
  - **Progress bar** — 4 steps → 5 steps (D, A, R, E, R) with clickable navigation. "repeat" phase added but engage (index 3) is non-clickable as final step.
  - **Voice/TTS** — added `useCloudVoice` hook, auto-speak AI replies in coach chat, VoiceInputBar in coach chat (sub-step 0.5) when `voice.supported`, textarea fallback otherwise.
  - **RISE sub-step 0 validation** — WHERE field now required (same as BossBattle)
  - **Q3 text simplified** — same as BossBattle

- **`src/components/PracticeSession.jsx`**:
  - **Breathing duration selector** — 1min / 2min / 3min / 5min options (minimum 60s) with `elapsed` timer tracking
  - **Running display** — shows elapsed/total time instead of "Cycle 1/1"
  - **Fixed template literal syntax error** — stray quote in ternary broke build

- **`src/components/GameMap.jsx`** — bottom nav centered with `left: 0, right: 0, maxWidth: 480, margin: 0 auto`
- **`src/components/HeroProfile.jsx`** — same bottom nav fix
- **`src/components/LadderScreen.jsx`** — same bottom nav fix
- **`src/screens/ExposureBankScreen.jsx`** — same bottom nav fix

- **`src/components/AskDaraChat.jsx`** — added missing `useCloudVoice` import (fixed "useCloudVoice is not defined" error)

- **`src/screens/ValuesScreen.jsx`** — intro lore tightened from ~95 to ~55 words, 8→3 paragraphs

- Build verified: `npx vite build` passes cleanly (1.17s)

### Testing Impact Summary (2026-05-01 changes)

**Selectors that changed — tests must update:**

| Feature | Old | New |
|---------|-----|-----|
| BossBattle Engage start | outcome buttons visible immediately | Click `📋 I AM READY TO REPORT` first |
| BossBattle Engage proceed | `setEngageSubStep(1)` on outcome click | Select outcome → click `🎒 SHOW ME THE LOOT` |
| BossBattle new sub-step | none | `engageSubStep === 0.5` = loot upload (image + text) |
| SUDs (both battles) | 1-10 button grid, values 1-10 | Range slider 0-100 |
| SUDs defaults | `null` | `0` |
| TutorialBattle coach chat | textarea + SEND button always visible | VoiceInputBar when supported, textarea+SEND fallback |
| RISE WHEN+WHERE | only WHEN required | Both WHEN and WHERE required |
| Q3 reflection text | "Even though it was difficult — did you get through it?" | "Did you get through it?" |
| Bottom nav position | `left: 50%, translateX(-50%)` | `left: 0, right: 0, maxWidth: 480, margin: 0 auto` |

**Voice behavior changes:**
- BossBattle: `battleVoiceMode` defaults to `true` → Dara auto-speaks on battle mount
- BossBattle engage sub-step 3: DebriefFreeText auto-speaks question on mount
- TutorialBattle: AI coach chat replies auto-speak via `voice.speak()`
- All use browser `speechSynthesis` (not cloud TTS)

### Session: 2026-05-01 (late night) — AI Smoke Test Fixes (12/12 passing)

**`test/ai-smoke.spec.js`** — fixed remaining Values card selection test failure (now 12/12 passing):
- **Intake mock detection** — changed from `sys.includes('Soul Companion')` (also matched Shadow Lore) → `sys.includes("5 to 10 minutes") || sys.includes("the hero's name is")` (unique to intake prompt)
- **Intake flow simplified** — removed manual intake chat interaction (fill input + click send). Mock returns shadow summary on every intake call → auto-transitions directly to ShadowReveal. Test now: click "I'M READY, DARA" → wait for ShadowReveal → navigate to Values
- **`force: true`** added to send button click in case overlay interferes (kept for robustness)
- **Screenshot** — changed to `fullPage: true` to capture full values grid
- **Send button selector** — uses `hasText: '→'` with `.last()` to get the intake send button (not modal's SEND)

**Results**: 12/12 tests passing (7 smoke + 5 content quality)

### Session: 2026-05-02 — AI Test Flakiness Fixes (12/12 stable)

**`test/ai-smoke.spec.js`** — fixed flaky AI visual assertions that passed sometimes and failed on re-run:
- **GameIntro assertion** — AI flagged "STEP 1/11" (overall onboarding progress) vs "5 dots" (carousel slides within GameIntro) as inconsistent. Added context explaining the two counters serve different purposes.
- **Meet Dara assertion** — AI flagged "TestHero" (test signup name) as unedited placeholder text. Added context that "TestHero" is expected test data, not a placeholder.
- **Values card assertion** — AI kept failing because `fullPage: true` screenshots got cropped in the AI's viewport view. Removed `fullPage: true`, simplified assertion to only check visible elements (header, cards grid, subtitle). Removed references to "THESE MATTER TO ME" button (intentionally hidden until 2+ values selected by design) and "Select at least 2 values" text (off-screen on mobile).
- **Values timeout** — extended test timeout to 180s (from default 120s) since this test has the longest navigation path.

**Results**: 12/12 tests passing consistently across 3 consecutive full-suite runs.
