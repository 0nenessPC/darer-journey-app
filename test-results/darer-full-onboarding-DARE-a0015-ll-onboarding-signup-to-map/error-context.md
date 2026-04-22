# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: darer-full-onboarding.spec.js >> DARER Journey >> full onboarding: signup to map
- Location: test\darer-full-onboarding.spec.js:26:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Shadow of Fear').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText('Shadow of Fear').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: ⚠️
  - generic [ref=e5]: SOMETHING WENT WRONG
  - generic [ref=e6]: The journey hit an unexpected obstacle. Your data is safe — refreshing will resume from your last saved point.
  - generic [ref=e8]: PixelBtn is not defined
  - button "REFRESH →" [ref=e9] [cursor=pointer]
```

# Test source

```ts
  1   | // @ts-check
  2   | import { test, expect } from '@playwright/test';
  3   | 
  4   | const APP_URL = process.env.DARER_TEST_URL || 'https://darer-journey-app.vercel.app';
  5   | const TEST_EMAIL = `test.priya.${Date.now()}@gmail.com`;
  6   | const TEST_PASSWORD = 'PriyaTest2026!';
  7   | 
  8   | // Helpers
  9   | const emailInput = (page) => page.locator('input[type="text"], input:not([type="password"]):not([type="hidden"])').first();
  10  | const pwInput = (page) => page.locator('input[type="password"]');
  11  | 
  12  | // Screen-specific button click — waits for the button, clicks it
  13  | async function btn(page, text, timeout = 15000) {
  14  |   const b = page.locator('button').filter({ hasText: new RegExp(text, 'i') }).first();
  15  |   await expect(b).toBeVisible({ timeout });
  16  |   await b.click();
  17  |   await page.waitForTimeout(1500);
  18  | }
  19  | 
  20  | // Screen assertion — fails if not visible
  21  | async function screen(page, text, timeout = 20000) {
> 22  |   await expect(page.getByText(text).first()).toBeVisible({ timeout });
      |                                              ^ Error: expect(locator).toBeVisible() failed
  23  | }
  24  | 
  25  | test.describe('DARER Journey', () => {
  26  |   test('full onboarding: signup to map', async ({ page }) => {
  27  |     console.log(`\n🎮 Test user: ${TEST_EMAIL}`);
  28  | 
  29  |     // ═══ MOCK AI calls ═══
  30  |     await page.route('**/api/qwen-chat', async (route) => {
  31  |       const req = JSON.parse(route.request().postData() || '{}');
  32  |       const sys = (req.systemPrompt || '').toLowerCase();
  33  |       const userMsgs = req.messages || [];
  34  |       let reply;
  35  |       // Intake — trigger Shadow Summary based on message content keywords
  36  |       // Primary: detect completion signals in the user's last message
  37  |       // Fallback: use call counter to prevent infinite loops
  38  |       // NOTE: Only count calls that have actual user messages (skip the init call with no users)
  39  |       const hasUserMsgs = userMsgs.some(m => m.role === 'user' || m.role === 'user_input');
  40  |       if (!hasUserMsgs) {
  41  |         // This is the init call — reset the counter so we start fresh
  42  |         page.__intakeCall = 0;
  43  |       }
  44  |       const intakeCall = page.__intakeCall || 0;
  45  |       if (hasUserMsgs) {
  46  |         page.__intakeCall = intakeCall + 1;
  47  |       }
  48  |       // Narrow condition: match ONLY the actual Intake screen prompt, not Shadow Lore pt2
  49  |       // Intake prompt starts with: "The hero's name is..." (not "You are Dara")
  50  |       // Shadow Lore pt2 starts with: "You are Dara — the Soul Companion..."
  51  |       const isIntake = sys.includes("the hero's name is") || sys.includes('ready to look into its eyes') || sys.includes('5 to 10 minutes');
  52  |       if (isIntake) {
  53  |         console.log(`  🎯 Intake matched! hasUserMsgs=${hasUserMsgs}, msgCount=${userMsgs.length}`);
  54  |         console.log(`  🔍 FULL sysPrompt: "${(req.systemPrompt || '').substring(0, 500)}"`);
  55  |         // Extract the last user message text to check for completion signals
  56  |         const lastUserMsg = [...userMsgs].reverse().find(m => m.role === 'user' || m.role === 'user_input');
  57  |         const lastUserText = (lastUserMsg?.text || '').toLowerCase();
  58  | 
  59  |         // Completion keywords that signal the user is ready for the Shadow Summary
  60  |         const completionKeywords = [
  61  |           'want to stop', 'want to feel', 'want to change', 'just want to',
  62  |           'want to be', 'tired of avoiding', 'ready to', 'enough',
  63  |           'feel comfortable', 'stop avoiding',
  64  |         ];
  65  |         const isComplete = completionKeywords.some(kw => lastUserText.includes(kw));
  66  | 
  67  |         // Fallback: if we've exceeded a reasonable number of exchanges, force summary
  68  |         const maxExchanges = 8;
  69  |         const shouldSummarize = isComplete || intakeCall >= maxExchanges;
  70  | 
  71  |         const intakeQuestions = [
  72  |           "Hey, I'm Dara — which means courage. Where does the Shadow show up most in your daily life?",
  73  |           "I hear you. Speaking up is tough. When the Shadow has you in its territory, where do you feel it in your body?",
  74  |           "That tightness is real — your body's alarm system. What do you usually do when those feelings hit? Do you push through, or find a way to escape?",
  75  |           "Using your phone as a shield makes sense — it gives you cover. But it also keeps you from connecting. How does the Shadow affect the things you actually want to do?",
  76  |           "That's a real cost. Those are the moments that matter. If you could change one thing about how the Shadow controls your choices, what would it look like?",
  77  |           "That's the goal right there. I'm starting to see the full picture of how the Shadow operates in your life. Let me piece it all together...",
  78  |         ];
  79  | 
  80  |         if (shouldSummarize) {
  81  |           reply = "THE SHADOW'S TRUE NATURE:\n\nWHERE IT APPEARS: Your Shadow dominates the territory of speaking up — in class, in groups, when meeting new people. It tells you that your words aren't worth hearing, that you'll sound boring or wrong.\n\nWHAT STORMS IT STIRS: Your body reacts before your mind can catch up — tight chest, racing thoughts, the urge to grab your phone and disappear. Your Inner Storm amplifies every imagined judgment into a threat.\n\nHOW IT KEEPS YOU TRAPPED: You use avoidance as armor — staying quiet, staying invisible, staying safe. But safety is the cage. Every time you don't speak up, the Shadow grows stronger. You want connection, but the Shadow won't let you risk it.";
  82  |         } else {
  83  |           reply = intakeQuestions[Math.min(intakeCall, intakeQuestions.length - 1)];
  84  |         }
  85  |       } else if (sys.includes('shadow') && (sys.includes('summary') || sys.includes('true nature')) && sys.includes('reveal')) {
  86  |         reply = "YOUR SHADOW — THE INFINITE TRAP\n\nYour Shadow claims social evaluation — speaking in class, meeting new people. The Inner Storm whispers your accent marks you different. Your Escape? Standing at edges, phone as shield.";
  87  |       } else if (sys.includes('d.a.r.e.r') && (sys.includes('framework') || sys.includes('strategy') || sys.includes('weapon'))) {
  88  |         reply = "The DARER Strategy:\n\nD — Decide\nA — Allow\nR — Rise\nE — Engage\nR — Repeat";
  89  |       } else if (sys.includes('pre-boss') || sys.includes('boss battle')) {
  90  |         reply = "I'm with you. Remember the DARER strategy.";
  91  |       } else if (sys.includes('micro-exposure') && sys.includes('training') && sys.includes('first')) {
  92  |         reply = JSON.stringify([
  93  |           { name: "The Smiler", text: "Make eye contact and smile at a stranger", icon: "😊", where: "Anywhere", time: "5 seconds", suds: 1 },
  94  |           { name: "The Greeter", text: "Say hello to someone you don't know", icon: "👋", where: "Walking past", time: "10 seconds", suds: 1 },
  95  |           { name: "The Nod", text: "Give a small nod to someone nearby", icon: "🙂", where: "Elevator", time: "5 seconds", suds: 2 },
  96  |         ]);
  97  |       } else if (sys.includes('exposure') && sys.includes('boss') && sys.includes('generate')) {
  98  |         reply = JSON.stringify([
  99  |           { id: "b1", name: "The Cashier", desc: "Ask a store clerk a question", difficulty: 2, xp: 50 },
  100 |           { id: "b2", name: "The Introducer", desc: "Introduce yourself to someone new", difficulty: 4, xp: 100 },
  101 |           { id: "b3", name: "The Presenter", desc: "Share an opinion in a small group", difficulty: 5, xp: 150 },
  102 |         ]);
  103 |       } else if (sys.includes('values') && sys.includes('generate')) {
  104 |         reply = JSON.stringify([
  105 |           { id: "v1", text: "Reach out and build new friendships", icon: "🤝", domain: "friendships" },
  106 |           { id: "v2", text: "Feel a sense of belonging in a group", icon: "💜", domain: "friendships" },
  107 |           { id: "v3", text: "Show the people I love how much they mean to me", icon: "❤️", domain: "intimacy" },
  108 |           { id: "v4", text: "Spend quality time with people I care about", icon: "🔥", domain: "friendships" },
  109 |           { id: "v5", text: "Be someone others can trust and count on", icon: "🌟", domain: "friendships" },
  110 |           { id: "v6", text: "Open up and let people really know me", icon: "🤗", domain: "intimacy" },
  111 |           { id: "v7", text: "Speak up and share what I think and feel", icon: "🗣", domain: "expression" },
  112 |           { id: "v8", text: "Share my ideas confidently at work or school", icon: "💡", domain: "employment" },
  113 |           { id: "v9", text: "Enjoy social events without dreading them", icon: "🎉", domain: "friendships" },
  114 |           { id: "v10", text: "Take on challenges that help me grow", icon: "🏔", domain: "growth" },
  115 |           { id: "v11", text: "Be respected and confident at work or school", icon: "⭐", domain: "achievement" },
  116 |           { id: "v12", text: "Contribute and help people around me", icon: "🌍", domain: "community" },
  117 |         ]);
  118 |       } else {
  119 |         reply = "I understand. Tell me more.";
  120 |       }
  121 |       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply }) });
  122 |     });
```