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

### Pending / Next Steps
- **Fix remaining Values test** — intake auto-transition timing with typewriter/TTS sync delay.
- **BossBattle prep/visual smoke test** — navigate to a boss on the map, enter prep phase, validate DARER steps layout.
- **IntakeScreen real-AI visual test** — run intake chat with real AI responses, validate chat UI, typewriter bubbles, TTS.
- **Visual regression baseline** — store approved screenshots as baselines to detect layout regressions.
