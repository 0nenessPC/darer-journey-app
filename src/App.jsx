import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { loadProgress, NDA_VERSION } from "./utils/supabase";
import { buildHeroContext } from "./utils/aiHelper.jsx";
import NdaAgreementScreen from "./components/NdaAgreementScreen.jsx";
import { C, SYS, DEFAULT_ARMORY, ONBOARDING, DM_SANS_FONT } from "./constants/gameData";
import { PixelText, HPBar, TypingDots, DialogBox, OnboardingProgress } from "./components/shared.jsx";
import GameMap from "./components/GameMap.jsx";
import HeroProfile from "./components/HeroProfile.jsx";
import AskDaraChat from "./components/AskDaraChat.jsx";
import AddExposureModal from "./components/AddExposureModal.jsx";
import AddManualEntryForm from "./components/AddManualEntryForm.jsx";
import LadderScreen from "./components/LadderScreen.jsx";
import DeleteConfirm from "./components/DeleteConfirm.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";
import { useAppState } from "./hooks/useAppState.jsx";
import { useBossHandlers } from "./hooks/useBossHandlers.jsx";
import { useCompletionHandlers } from "./hooks/useCompletionHandlers.jsx";

// Code-split lazy-loaded screens
const BossBattle = lazy(() => import("./screens/BossBattle.jsx"));
const TutorialBattle = lazy(() => import("./screens/TutorialBattle.jsx"));
const ExposureSortScreen = lazy(() => import("./screens/ExposureSortScreen.jsx"));
const ExposureBankScreen = lazy(() => import("./screens/ExposureBankScreen.jsx"));
const CharacterCreate = lazy(() => import("./screens/CharacterCreate.jsx"));
const ValuesScreen = lazy(() => import("./screens/ValuesScreen.jsx"));
const PsychoEdScreen = lazy(() => import("./screens/PsychoEdScreen.jsx"));
const DARERStrategy = lazy(() => import("./screens/DARERStrategy.jsx"));
const LoginScreen = lazy(() => import("./screens/LoginScreen.jsx"));
const GameIntro = lazy(() => import("./screens/GameIntro.jsx"));
const ShadowLore = lazy(() => import("./screens/ShadowLore.jsx"));
const IntakeScreen = lazy(() => import("./screens/IntakeScreen.jsx"));
const ShadowReveal = lazy(() => import("./screens/ShadowReveal.jsx"));
const ArmoryScreen = lazy(() => import("./screens/ArmoryScreen.jsx"));

// ============ MAIN APP ============
export default function DARERQuest() {
  const {
    screen, setScreen, setScreenRaw,
    screenHistory, setScreenHistory,
    hero, setHero,
    quest, setQuest,
    battleHistory, setBattleHistory,
    activeBoss, setActiveBoss,
    focusedBoss, setFocusedBoss,
    isAuthenticated, setIsAuthenticated,
    authReady,
    onboardingState, setOnboardingState,
    shadowText, setShadowText,
    setOBState, getOBState, goBack,
    handleLogin, handleNdaComplete, handleLogout,
  } = useAppState();

  // Local UI state (not part of app state)
  const [addMode, setAddMode] = useState(null);
  const [pendingDeleteBoss, setPendingDeleteBoss] = useState(null);
  const [justAddedBossId, setJustAddedBossId] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // --- Boss management handlers ---
  const { handleDeleteBoss, confirmDeleteBoss, handleAchieveBoss } = useBossHandlers({
    pendingDeleteBoss, setPendingDeleteBoss, activeBoss, setActiveBoss, setQuest, quest, hero,
  });

  // --- Completion handlers (character, intake, boss victory, tutorial) ---
  const { handleCharacterComplete, handleIntakeComplete, handleBossVictory, handleTutorialComplete } = useCompletionHandlers({
    hero, quest, activeBoss, battleHistory,
    setHero, setQuest, setActiveBoss, setScreen, setShadowText, setBattleHistory,
  });

  // --- Fast-forward: populate mock hero data, skip onboarding → tutorial ---
  const handleFastForward = useCallback(() => {
    if (!import.meta.env.DEV) return;
    const heroName = hero.darerId;
    const mockStats = { courage: 3, resilience: 3, openness: 3 };
    const mockCoreValues = [
      { id: "a8", word: "Connection", desc: "Being fully present with others in what I'm doing", icon: "🔗", dim: "openness" },
      { id: "a10", word: "Courage", desc: "Being brave and persisting in the face of fear", icon: "⚔️", dim: "courage" },
      { id: "a11", word: "Curiosity", desc: "Being open-minded, interested, willing to explore", icon: "🔍", dim: "openness" },
    ];
    const mockValues = [
      { id: "v1", text: "I want to feel comfortable being myself around others", icon: "🌟" },
      { id: "v2", text: "I want to speak up in groups without feeling paralyzed", icon: "🗣" },
      { id: "v3", text: "I want to build genuine friendships", icon: "❤" },
    ];
    const mockShadow = `The hero experiences moderate to severe social anxiety across multiple domains. Primary fears include: being judged negatively in social situations, speaking in groups due to fear of appearing incompetent, authority figures and feeling scrutinized, eating in public due to fear of being watched. Coping strategies are predominantly avoidant: avoiding social gatherings and parties, staying quiet in group conversations, using phone as distraction, limiting eye contact. Core belief is "If people see the real me, they'll think I'm awkward and weird." Physical symptoms include racing heart, blushing, and stomach tightness in social situations. Currently experiencing significant functional impact: avoiding workplace social events, rarely initiating conversations, feeling exhausted after social interactions. The hero's shadow manifests as a harsh inner critic that amplifies perceived social threats and minimizes positive social evidence.`;

    setHero(h => ({
      ...h,
      name: heroName,
      darerId: heroName,
      stats: mockStats,
      strengths: [mockCoreValues[0].word, mockCoreValues[1].word, mockCoreValues[2].word],
      coreValues: mockCoreValues,
      values: mockValues,
      valuesText: mockValues.map(v => v.text).join(". "),
      traits: [
        { type: "challenge", text: "Fear of being judged negatively in social situations" },
        { type: "challenge", text: "Avoiding group conversations and social gatherings" },
        { type: "challenge", text: "Difficulty speaking up in meetings and groups" },
        { type: "challenge", text: "Fear of authority figures and feeling scrutinized" },
        { type: "challenge", text: "Discomfort eating in public settings" },
      ],
      sads: 65,
    }));
    setShadowText(mockShadow);
    setQuest(q => ({ ...q, goal: mockValues[0].text }));

    // Mark all intermediate screens as complete so resume skips them
    setOnboardingState({
      shadowLore: { step: 99 },
      psychoed: { step: 99 },
      shadowLorePost: { step: 99 },
      shadowReveal: { revealed: true },
      values: { step: "complete" },
      darerStrategy: { step: 99 },
      armoryIntro: { step: "complete" },
    });

    // Skip tutorial directly, land on exposureSort
    setScreen("exposureSort");
  }, [hero.darerId, setHero, setShadowText, setQuest, setOnboardingState, setScreen]);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: DM_SANS_FONT, position: "relative" }}>
      {/* Screen transition wrapper — re-mounts on screen change for fade animation */}
      <div key={screen} style={{ animation: "screenFadeIn 0.25s ease-out" }}>
      {/* Global back button — shown on all screens except login and map */}
      {!["login", "map", "battle", "bank"].includes(screen) && screenHistory.length > 0 && (
        <button onClick={goBack} aria-label="Go back" style={{
          position: "absolute", top: ONBOARDING.some(s => s.key === screen) ? 68 : 12, left: 8, zIndex: 100,
          background: `${C.cardBg}CC`, border: "1px solid ${C.mutedBorder}",
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          backdropFilter: "blur(4px)",
        }}>
          <PixelText size={7} color={C.subtleText}>? BACK</PixelText>
        </button>
      )}
      {screen === "login" && !authReady && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.mapBg }}>
          <PixelText size={10} color={C.goldMd}>Checking for existing hero...</PixelText>
        </div>
      )}
      {screen === "login" && authReady && <LoginScreen onLogin={handleLogin} />}
      {isAuthenticated && screen === "nda" && (
        <NdaAgreementScreen
          heroName={hero.name}
          darerId={hero.darerId}
          onAgree={handleNdaComplete}
          onDecline={handleLogout}
          onSigned={() => setScreen("intro")}
        />
      )}
      {isAuthenticated && screen !== "login" && screen !== "nda" && (
        <button onClick={handleLogout} aria-label="Log out" style={{
          position: "absolute", top: ONBOARDING.some(s => s.key === screen) ? 68 : 12, right: 8, zIndex: 100,
          background: `${C.cardBg}CC`, border: "1px solid ${C.mutedBorder}",
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}>
          <PixelText size={7} color={C.subtleText}>LOGOUT</PixelText>
        </button>
      )}
      {/* Feedback button — floating bottom-right on all authenticated screens */}
      {isAuthenticated && screen !== "login" && screen !== "nda" && (
        <button
          onClick={() => setShowFeedback(true)}
          style={{
            position: "fixed", bottom: 16, right: 16, zIndex: 998,
            background: C.charcoal, border: `2px solid ${C.plum}`,
            borderRadius: "50%", width: 36, height: 36,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          }}
          title="Report an issue"
        >
          <PixelText size={8} color={C.goldMd}>?</PixelText>
        </button>
      )}
      {/* Onboarding progress bar — shown from intro through training ground */}
      <OnboardingProgress screen={screen} />
      <div style={{ paddingTop: ONBOARDING.some(s => s.key === screen) ? 56 : 0 }}>
      <Suspense fallback={
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.mapBg }}>
          <PixelText size={10} color={C.goldMd}>Loading...</PixelText>
        </div>
      }>
      {screen === "intro" && <GameIntro onComplete={() => setScreen("character")} obState={getOBState("intro", { slide: 0 })} setOBState={(s) => setOBState("intro", s)} />}
      {screen === "character" && <CharacterCreate initialName="" darerId={hero.darerId} onComplete={handleCharacterComplete} onFastForward={handleFastForward} obState={getOBState("character", { name: "", nameConfirmed: false })} setOBState={(s) => setOBState("character", s)} />}
      {screen === "values" && <ValuesScreen heroName={hero.name} onComplete={(cards, text) => {
        setHero(h => ({ ...h, values: cards, valuesText: text }));
        setScreen("darerStrategy");
      }} obState={getOBState("values", { step: "default", values: [], guideAnswers: [], guideStep: 0 })} setOBState={(s) => setOBState("values", s)} />}
      {/* === REORDERED CLINICAL FLOW === */}
      {/* mapPreview → shadowLore → psychoed → shadowLorePost → intake → shadowReveal → values → darerStrategy → tutorial → exposureSort */}
      {screen === "shadowLore" && <ShadowLore heroName={hero.name} onPsychoed={() => setScreen("psychoed")} onReady={() => setScreen("intake")} obState={getOBState("shadowLore", { step: 0 })} setOBState={(s) => setOBState("shadowLore", s)} />}
      {screen === "psychoed" && <PsychoEdScreen heroName={hero.name} heroValues={hero.values || []} onContinue={() => setScreen("shadowLorePost")} obState={getOBState("psychoed", { step: 0 })} setOBState={(s) => setOBState("psychoed", s)} />}
      {screen === "shadowLorePost" && <ShadowLore heroName={hero.name} initialStep={1} onPsychoed={() => {}} onReady={() => setScreen("intake")} obState={getOBState("shadowLorePost", { step: 1 })} setOBState={(s) => setOBState("shadowLorePost", s)} />}
      {screen === "intake" && <IntakeScreen heroName={hero.name} hero={hero} quest={quest} onComplete={handleIntakeComplete} obState={getOBState("intake", { chatHistory: [] })} setOBState={(s) => setOBState("intake", s)} />}
      {screen === "shadowReveal" && <ShadowReveal heroName={hero.name} shadowText={shadowText} onContinue={() => setScreen("values")} obState={getOBState("shadowReveal", { revealed: false })} setOBState={(s) => setOBState("shadowReveal", s)} />}
      {screen === "darerStrategy" && <DARERStrategy heroName={hero.name} shadowText={shadowText} heroValues={hero.values || []} onContinue={() => setScreen("armoryIntro")} obState={getOBState("darerStrategy", { step: 0 })} setOBState={(s) => setOBState("darerStrategy", s)} />}
      {screen === "armoryIntro" && <ArmoryScreen heroName={hero.name} onContinue={() => setScreen("tutorial")} obState={getOBState("armoryIntro", { step: "intro" })} setOBState={(s) => setOBState("armoryIntro", s)} />}
      {screen === "tutorial" && <TutorialBattle heroName={hero.name} hero={hero} quest={quest} shadowText={shadowText} heroValues={hero.values || []} heroStrengths={hero.strengths || []} heroCoreValues={hero.coreValues || []} onComplete={handleTutorialComplete} obState={getOBState("tutorial", { step: 0 })} setOBState={(s) => setOBState("tutorial", s)} />}
      {screen === "exposureSort" && <ExposureSortScreen hero={hero} shadowText={shadowText} onComplete={(bosses) => {
        setQuest(q => ({ ...q, bosses, goal: hero.values?.[0]?.text || q.goal }));
        const firstBoss = bosses.length > 0 ? bosses[0] : null;
        if (firstBoss) setFocusedBoss(firstBoss);
        setScreen("map");
      }} obState={getOBState("exposureSort", { currentCard: 0, accepted: [], rejected: [], done: false })} setOBState={(s) => setOBState("exposureSort", s)} />}
      {/* === END CLINICAL FLOW === */}
      {screen === "map" && <GameMap quest={quest} hero={hero} battleHistory={battleHistory} onSelectBoss={b => {
        setOBState("battle", { phase: "prep", prepStep: 0, prepAnswers: { value: "", allow: "", rise: "" }, suds: { before: 50, during: 60, after: 30 }, outcome: null, riseSubStep: 0 });
        // Restore HP for repeat attempts on defeated bosses
        const battleBoss = b.defeated ? { ...b, hp: b.maxHp || 100 } : b;
        setActiveBoss(battleBoss);
        setScreen("battle");
      }} onViewProfile={() => setScreen("profile")} onLadder={() => setScreen("ladder")} onBank={() => setScreen("bank")} focusedBoss={focusedBoss} setFocusedBoss={setFocusedBoss} onAddExposure={() => setAddMode("menu")} onAchieveBoss={handleAchieveBoss} onDeleteBoss={handleDeleteBoss} justAddedBossId={justAddedBossId} />}
      {screen === "battle" && activeBoss && <BossBattle key={activeBoss.id} boss={activeBoss} quest={quest} hero={hero} shadowText={shadowText} battleHistory={battleHistory} onVictory={handleBossVictory} onRetreat={() => { setActiveBoss(null); setScreen("map"); }} setActiveBoss={setActiveBoss} setScreen={setScreen} onBank={() => setScreen("bank")} obState={getOBState("battle", { phase: "prep", prepStep: 0, prepAnswers: { value: "", allow: "", rise: "" }, suds: { before: 50, during: 60, after: 30 }, outcome: null })} setOBState={(s) => setOBState("battle", s)} />}
      {screen === "bank" && <ExposureBankScreen quest={quest} hero={hero} focusedBoss={focusedBoss} setFocusedBoss={setFocusedBoss} onBack={() => setScreen("map")} onAchieveBoss={handleAchieveBoss} onDeleteBoss={handleDeleteBoss} />}
      {screen === "profile" && <HeroProfile hero={hero} setHero={setHero} quest={quest} battleHistory={battleHistory} onBack={() => setScreen("map")} setScreen={setScreen} />}
      {screen === "ladder" && <LadderScreen hero={hero} quest={quest} setScreen={setScreen} onBack={() => setScreen("map")} />}
      </Suspense>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirm
        boss={pendingDeleteBoss}
        onConfirm={confirmDeleteBoss}
        onCancel={() => setPendingDeleteBoss(null)}
      />

      {/* Add Exposure Modal — menu */}
      {addMode === "menu" && (
        <AddExposureModal
          onClose={() => setAddMode(null)}
          onManualEntry={() => setAddMode("manual")}
          onAskDara={() => setAddMode("ask-dara")}
        />
      )}

      {/* Add Exposure Modal — Ask Dara chat */}
      {addMode === "ask-dara" && (
        <AskDaraChat
          onClose={() => setAddMode(null)}
          heroContext={buildHeroContext(hero, quest, shadowText, battleHistory)}
          onSubmit={(data) => {
            const id = `custom_${Date.now()}`;
            const newBoss = {
              id,
              name: data.name,
              desc: data.desc,
              difficulty: data.difficulty,
              defeated: false,
              hp: 100,
              maxHp: 100,
              isCustom: true,
            };
            setQuest(q => ({ ...q, bosses: [...q.bosses, newBoss] }));
            setJustAddedBossId(id);
            setTimeout(() => setJustAddedBossId(null), 3000);
            setAddMode(null);
          }}
          onFallback={() => setAddMode("manual")}
        />
      )}

      {/* Add Exposure Modal — manual entry form */}
      {addMode === "manual" && (
        <AddManualEntryForm
          onClose={() => setAddMode(null)}
          onSubmit={(data) => {
            const id = `custom_${Date.now()}`;
            const newBoss = {
              id,
              name: data.name,
              desc: data.desc,
              difficulty: data.difficulty,
              defeated: false,
              hp: 100,
              maxHp: 100,
              isCustom: true,
            };
            setQuest(q => ({ ...q, bosses: [...q.bosses, newBoss] }));
            setJustAddedBossId(id);
            setTimeout(() => setJustAddedBossId(null), 3000);
            setAddMode(null);
          }}
        />
      )}

      {/* Feedback Modal */}
      {showFeedback && (
        <FeedbackModal
          screen={screen}
          hero={{ name: hero.name, darerId: hero.darerId, quest }}
          onClose={() => setShowFeedback(false)}
        />
      )}
      </div>
      </div>
    </div>
  );
}
