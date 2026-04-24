import { useState, useEffect, useRef, useCallback } from "react";
import { loadProgress, NDA_VERSION } from "./utils/supabase";
import { buildHeroContext } from "./utils/aiHelper.jsx";
import NdaAgreementScreen from "./components/NdaAgreementScreen.jsx";
import { C, SYS, DEFAULT_ARMORY, ONBOARDING, FONT_LINK } from "./constants/gameData";
import { PixelText, HPBar, TypingDots, DialogBox, OnboardingProgress } from "./components/shared.jsx";
import BossBattle from "./screens/BossBattle.jsx";
import TutorialBattle from "./screens/TutorialBattle.jsx";
import GameMap from "./components/GameMap.jsx";
import HeroProfile from "./components/HeroProfile.jsx";
import ExposureSortScreen from "./screens/ExposureSortScreen.jsx";
import CharacterCreate from "./screens/CharacterCreate.jsx";
import ValuesScreen from "./screens/ValuesScreen.jsx";
import AskDaraChat from "./components/AskDaraChat.jsx";
import PsychoEdScreen from "./screens/PsychoEdScreen.jsx";
import JourneyMapPreview from "./screens/JourneyMapPreview.jsx";
import PracticeSession from "./components/PracticeSession.jsx";
import DARERStrategy from "./screens/DARERStrategy.jsx";
import GameArmory from "./screens/GameArmory.jsx";
import LoginScreen from "./screens/LoginScreen.jsx";
import GameIntro from "./screens/GameIntro.jsx";
import ShadowLore from "./screens/ShadowLore.jsx";
import IntakeScreen from "./screens/IntakeScreen.jsx";
import AddExposureModal from "./components/AddExposureModal.jsx";
import AddManualEntryForm from "./components/AddManualEntryForm.jsx";
import LadderScreen from "./components/LadderScreen.jsx";
import ShadowReveal from "./screens/ShadowReveal.jsx";
import ArmoryScreen from "./screens/ArmoryScreen.jsx";
import DeleteConfirm from "./components/DeleteConfirm.jsx";
import FeedbackModal from "./components/FeedbackModal.jsx";
import { useAppState } from "./hooks/useAppState.jsx";
import { useBossHandlers } from "./hooks/useBossHandlers.jsx";
import { useCompletionHandlers } from "./hooks/useCompletionHandlers.jsx";

// ============ MAIN APP ============
export default function DARERQuest() {
  const {
    screen, setScreen, setScreenRaw,
    screenHistory, setScreenHistory,
    hero, setHero,
    quest, setQuest,
    battleHistory, setBattleHistory,
    activeBoss, setActiveBoss,
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

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      {/* Global back button — shown on all screens except login and map */}
      {!["login", "map", "battle"].includes(screen) && screenHistory.length > 0 && (
        <button onClick={goBack} style={{
          position: "absolute", top: ONBOARDING.some(s => s.key === screen) ? 68 : 12, left: 8, zIndex: 100,
          background: "#1A1218CC", border: "1px solid #5C3A50",
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          backdropFilter: "blur(4px)",
        }}>
          <PixelText size={7} color={C.grayLt}>? BACK</PixelText>
        </button>
      )}
      {screen === "login" && !authReady && (
        <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.mapBg }}>
          <link href={FONT_LINK} rel="stylesheet" />
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
        <button onClick={handleLogout} style={{
          position: "absolute", top: ONBOARDING.some(s => s.key === screen) ? 68 : 12, right: 8, zIndex: 100,
          background: "#1A1218CC", border: "1px solid #5C3A50",
          borderRadius: 6, padding: "6px 12px", cursor: "pointer",
          backdropFilter: "blur(4px)",
        }}>
          <PixelText size={7} color={C.grayLt}>LOGOUT</PixelText>
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
      {screen === "intro" && <GameIntro onComplete={() => setScreen("character")} obState={getOBState("intro", { slide: 0 })} setOBState={(s) => setOBState("intro", s)} />}
      {screen === "character" && <CharacterCreate initialName="" darerId={hero.darerId} onComplete={handleCharacterComplete} obState={getOBState("character", { name: "", nameConfirmed: false })} setOBState={(s) => setOBState("character", s)} />}
      {screen === "mapPreview" && <JourneyMapPreview heroName={hero.name} onContinue={() => setScreen("values")} obState={getOBState("mapPreview", { scrollPos: 0, phase: "intro" })} setOBState={(s) => setOBState("mapPreview", s)} />}
      {screen === "values" && <ValuesScreen heroName={hero.name} onComplete={(cards, text) => {
        setHero(h => ({ ...h, values: cards, valuesText: text }));
        setScreen("shadowLore");
      }} obState={getOBState("values", { step: "default", values: [], guideAnswers: [], guideStep: 0 })} setOBState={(s) => setOBState("values", s)} />}
      {/* === FULL CLINICAL FLOW === */}
      {/* shadowLore ? psychoed ? shadowLorePost ? intake ? shadowReveal ? darerStrategy ? tutorial ? exposureSort */}
      {screen === "shadowLore" && <ShadowLore heroName={hero.name} onPsychoed={() => setScreen("psychoed")} onReady={() => setScreen("intake")} obState={getOBState("shadowLore", { step: 0 })} setOBState={(s) => setOBState("shadowLore", s)} />}
      {screen === "psychoed" && <PsychoEdScreen heroName={hero.name} heroValues={hero.values || []} onContinue={() => setScreen("shadowLorePost")} obState={getOBState("psychoed", { step: 0 })} setOBState={(s) => setOBState("psychoed", s)} />}
      {screen === "shadowLorePost" && <ShadowLore heroName={hero.name} initialStep={2} onPsychoed={() => {}} onReady={() => setScreen("intake")} obState={getOBState("shadowLorePost", { step: 2 })} setOBState={(s) => setOBState("shadowLorePost", s)} />}
      {screen === "intake" && <IntakeScreen heroName={hero.name} hero={hero} quest={quest} onComplete={handleIntakeComplete} obState={getOBState("intake", { chatHistory: [] })} setOBState={(s) => setOBState("intake", s)} />}
      {screen === "shadowReveal" && <ShadowReveal heroName={hero.name} shadowText={shadowText} onContinue={() => setScreen("darerStrategy")} obState={getOBState("shadowReveal", { revealed: false })} setOBState={(s) => setOBState("shadowReveal", s)} />}
      {screen === "darerStrategy" && <DARERStrategy heroName={hero.name} shadowText={shadowText} heroValues={hero.values || []} onContinue={() => setScreen("armoryIntro")} obState={getOBState("darerStrategy", { step: 0 })} setOBState={(s) => setOBState("darerStrategy", s)} />}
      {screen === "armoryIntro" && <ArmoryScreen heroName={hero.name} onContinue={() => setScreen("tutorial")} obState={getOBState("armoryIntro", { step: "intro" })} setOBState={(s) => setOBState("armoryIntro", s)} />}
      {screen === "tutorial" && <TutorialBattle heroName={hero.name} hero={hero} quest={quest} shadowText={shadowText} heroValues={hero.values || []} heroStrengths={hero.strengths || []} heroCoreValues={hero.coreValues || []} onComplete={handleTutorialComplete} obState={getOBState("tutorial", { step: 0 })} setOBState={(s) => setOBState("tutorial", s)} />}
      {screen === "exposureSort" && <ExposureSortScreen hero={hero} shadowText={shadowText} onComplete={(bosses) => {
        setQuest(q => ({ ...q, bosses, goal: hero.values?.[0]?.text || q.goal }));
        setScreen("map");
      }} obState={getOBState("exposureSort", { currentCard: 0, accepted: [], rejected: [], done: false })} setOBState={(s) => setOBState("exposureSort", s)} />}
      {/* === END CLINICAL FLOW === */}
      {screen === "map" && <GameMap quest={quest} hero={hero} battleHistory={battleHistory} onSelectBoss={b => {
        setOBState("battle", {});
        setActiveBoss(b);
        setScreen("battle");
      }} onViewProfile={() => setScreen("profile")} onArmory={() => setScreen("armory")} onLadder={() => setScreen("ladder")} onAddExposure={() => setAddMode("menu")} onAchieveBoss={handleAchieveBoss} onDeleteBoss={handleDeleteBoss} justAddedBossId={justAddedBossId} />}
      {screen === "battle" && activeBoss && <BossBattle boss={activeBoss} quest={quest} hero={hero} shadowText={shadowText} battleHistory={battleHistory} onVictory={handleBossVictory} onRetreat={() => { setActiveBoss(null); setScreen("map"); }} setActiveBoss={setActiveBoss} setScreen={setScreen} obState={getOBState("battle", { phase: "prep", prepStep: 0, prepAnswers: { value: "", allow: "", rise: "" }, suds: { before: 50, during: 60, after: 30 }, outcome: null })} setOBState={(s) => setOBState("battle", s)} />}
      {screen === "profile" && <HeroProfile hero={hero} quest={quest} battleHistory={battleHistory} onBack={() => setScreen("map")} setScreen={setScreen} />}
      {screen === "armory" && <GameArmory hero={hero} setHero={setHero} setScreen={setScreen} onBack={() => setScreen("map")} />}
      {screen === "ladder" && <LadderScreen hero={hero} quest={quest} setScreen={setScreen} onBack={() => setScreen("map")} />}

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
  );
}
