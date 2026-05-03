import React, { useState, useEffect, useRef } from 'react';
import { useAIChat, generateFollowUpExposures } from '../utils/chat';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { supabase } from '../utils/supabase';
import { saveArmoryPractice } from '../utils/supabase';
import { C, PIXEL_FONT, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, DialogBox, TypingDots } from '../components/shared';
import BottomNav from '../components/BottomNav';
import CelebrationOverlay from '../components/CelebrationOverlay';
import DecidePhase from '../components/DARER/DecidePhase';
import RepeatPhase from '../components/DARER/RepeatPhase';
import AllowFields from '../components/DARER/AllowFields';
import SUDSSlider from '../components/DARER/SUDSSlider';
import SUDSComparison from '../components/DARER/SUDSComparison';
import ReflectionQuestions from '../components/DARER/ReflectionQuestions';
import DebriefFreeText from '../components/DARER/DebriefFreeText';
import RisePhase from '../components/DARER/RisePhase';
import { useDARERFlow } from '../hooks/useDARERFlow';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';

function BattleTypewriterBubble({ text, muted, voice }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Start speech simultaneously with text render
  useEffect(() => {
    if (muted || !text || !voice?.speak) return;
    voice.speak(text, { speed: 0.9 });
  }, [text, muted, voice]);

  // Track speaking state from hook
  useEffect(() => {
    setIsSpeaking(!!voice?.isSpeaking);
  }, [voice?.isSpeaking]);

  return (
    <div
      style={{
        maxWidth: '82%',
        padding: '10px 12px',
        borderRadius: 4,
        background: C.cardBg,
        border: `2px solid ${isSpeaking ? C.teal : C.mutedBorder}`,
        boxShadow: isSpeaking ? `0 0 8px ${C.teal}40` : 'none',
      }}
    >
      <PixelText size={8} color={C.cream} style={{ display: 'block', whiteSpace: 'pre-wrap' }}>
        {text}
      </PixelText>
      {isSpeaking && (
        <PixelText size={6} color={C.teal} style={{ display: 'block', marginTop: 4, opacity: 0.8 }}>
          🔊 speaking
        </PixelText>
      )}
    </div>
  );
}

export default function BossBattle({
  boss,
  quest,
  hero,
  onVictory,
  onRetreat,
  setActiveBoss,
  setScreen,
  onBank,
  obState = {},
  setOBState,
  shadowText = '',
  battleHistory = [],
}) {
  const [phase, setPhase] = useState(obState.phase || 'prep');
  const [prepStep, setPrepStep] = useState(obState.prepStep ?? 0);
  const [prepAnswers, setPrepAnswers] = useState(
    obState.prepAnswers || { value: '', allow: '', rise: '' },
  );
  const [suds, setSuds] = useState(obState.suds || { before: 50, during: 60, after: 30 });
  const [outcome, setOutcome] = useState(obState.outcome || null);
  const [selectedRepeat, setSelectedRepeat] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [battleVoiceMode, setBattleVoiceMode] = useState(true);
  const [victoryVoiceMode, setVictoryVoiceMode] = useState(false);
  const chatRef = useRef(null);

  // Engagement loot: proof of completion
  const [showOutcome, setShowOutcome] = useState(false);
  const [lootText, setLootText] = useState('');
  const [lootImage, setLootImage] = useState(null);

  // Track the furthest D.A.R.E.R. step the user has reached (so they can go back but not skip ahead)
  const [maxPrepReached, setMaxPrepReached] = useState(0);
  const advancePrepStep = (to) => {
    const next = typeof to === 'function' ? to(prepStep) : to;
    setPrepStep(to);
    if (next > maxPrepReached) setMaxPrepReached(next);
  };

  // Shared DARER flow state (Decide, Allow, Rise, Engage fields + voice)
  const flow = useDARERFlow({ obState, setOBState });

  // Save armory practice data to Supabase
  const handlePracticeComplete = async (practiceData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && practiceData?.toolId) {
      await saveArmoryPractice(user.id, practiceData);
    }
  };

  // Post-battle celebration state
  const [celebration, setCelebration] = useState(null);
  const handleBattleResult = async (outcome, details) => {
    const result = await onVictory(outcome, details);
    if (result) {
      setCelebration(result);
    }
  };

  // Auto-speak Dara's encouragement when Decide section appears (motivational interviewing: express empathy, build self-efficacy)
  const decideSpoken = useRef(false);
  useEffect(() => {
    if (phase === 'prep' && prepStep === 0 && !decideSpoken.current) {
      decideSpoken.current = true;
      flow.voice.speak(
        `${hero.name}, this battle is yours to face. The fear is real, but so is your strength. What matters to you most about facing this? That "why" — that's your anchor.`,
        { speed: 0.9 },
      );
    }
  }, [phase, prepStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset internal state when a new boss is selected (fixes stale state from batched React updates)
  const lastBossIdRef = useRef(null);
  useEffect(() => {
    if (boss?.id && boss.id !== lastBossIdRef.current) {
      lastBossIdRef.current = boss.id;
      setPhase('prep');
      setPrepStep(0);
      setPrepAnswers({ value: '', allow: '', rise: '' });
      setSuds({ before: 50, during: 60, after: 30 });
      setOutcome(null);
      setSelectedRepeat('');
      setMaxPrepReached(0);
      decideSpoken.current = false;
      flow.resetFlow();
    }
  }, [boss?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist battle progress so resume-anywhere survives refresh/close
  useEffect(() => {
    if (!setOBState) return;
    setOBState({
      phase,
      prepStep,
      prepAnswers,
      suds,
      outcome,
      riseSubStep: flow.riseSubStep,
      exposureWhen: flow.exposureWhen,
      exposureWhere: flow.exposureWhere,
      exposureArmory: flow.exposureArmory,
      exposureScheduledTime: flow.exposureScheduledTime,
      engageSubStep: flow.engageSubStep,
      engageFreeText: flow.engageFreeText,
      fearedHappened: flow.fearedHappened,
      fearedSeverity: flow.fearedSeverity,
      madeItThrough: flow.madeItThrough,
      allowFearful: flow.allowFearful,
      allowLikelihood: flow.allowLikelihood,
      allowSeverity: flow.allowSeverity,
      allowCanHandle: flow.allowCanHandle,
      allowFearShowing: flow.allowFearShowing,
      allowPhysicalSensations: flow.allowPhysicalSensations,
      allowCustomSensation: flow.allowCustomSensation,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    phase,
    prepStep,
    prepAnswers,
    suds,
    outcome,
    flow.riseSubStep,
    flow.exposureWhen,
    flow.exposureWhere,
    flow.exposureArmory,
    flow.exposureScheduledTime,
    flow.engageSubStep,
    flow.engageFreeText,
    flow.fearedHappened,
    flow.fearedSeverity,
    flow.madeItThrough,
    flow.allowFearful,
    flow.allowLikelihood,
    flow.allowSeverity,
    flow.allowCanHandle,
    flow.allowFearShowing,
    flow.allowPhysicalSensations,
    flow.allowCustomSensation,
    setOBState,
  ]);

  const heroContext = buildHeroContext(hero, quest, shadowText, battleHistory);
  const battleChat = useAIChat(
    SYS.battle,
    `${heroContext}\n\nBOSS: "${boss.name}" — ${boss.desc}. The hero is fighting this boss RIGHT NOW in real life. Reference their strengths, values, and past battles when relevant.`,
  );
  const victoryChat = useAIChat(
    SYS.victory,
    `${heroContext}\n\nThe hero just completed a battle. Reference their actual strengths, values, and progress when celebrating.`,
  );

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [battleChat.messages, victoryChat.messages, battleChat.typing, victoryChat.typing]);

  const heroStrength = hero.coreValues?.[0]?.word || hero.values?.[0]?.text || 'courage';

  // D.A.R.E.R. prep steps (VITAL framework underneath)
  const darerSteps = [
    {
      letter: 'D',
      title: 'DECIDE',
      subtitle: 'Why this battle matters',
      color: C.goalGold,
      icon: '🏰',
    },
    {
      letter: 'A',
      title: 'ALLOW',
      subtitle: 'Make space for the storm',
      color: C.hpGreen,
      icon: '🌊',
    },
    {
      letter: 'R',
      title: 'RISE',
      subtitle: 'Ground yourself and observe',
      color: C.teal,
      icon: '👁',
    },
    { letter: 'E', title: 'ENGAGE', subtitle: 'Step into the arena', color: C.bossRed, icon: '⚔️' },
    {
      letter: 'R',
      title: 'REPEAT',
      subtitle: 'Rewire through repetition',
      color: C.hpGreen,
      icon: '🔁',
    },
  ];

  const startBattle = () => {
    setPhase('battle');
    const prepSummary = `D.A.R.E.R. prep: Decide="${prepAnswers.value}" Allow="${prepAnswers.allow}" Rise="${prepAnswers.rise}"`;
    battleChat.init(
      `The hero is NOW facing "${boss.name}" (${boss.desc}) in real life. Their prep: ${prepSummary}. Send a brief battle cry referencing their value and grounding anchor. 1-2 sentences.`,
    );
  };

  const finishBattle = () => {
    const dmg = outcome === 'victory' ? 100 : outcome === 'partial' ? 50 : 10;
    setPhase('result');
    victoryChat.init(
      `BOSS: "${boss.name}" — ${boss.desc}.\nOutcome: ${outcome}\nSUDS before: ${suds.before}, peak: ${suds.during}, after: ${suds.after}\nValue: "${prepAnswers.value}"\nDamage dealt: ${dmg}HP\nCelebrate, reference their value, and reflect on feared-vs-actual outcome. 2-3 sentences.`,
    );
  };

  // Generate follow-up exposure variations based on outcome
  const generateRepeatOptions = async () => {
    const opts = await generateFollowUpExposures({
      currentText: `${boss.name} — ${boss.desc}`,
      outcome,
      why: prepAnswers.value,
    });
    flow.setRepeatOptions(opts);
  };

  // Trigger repeat generation when user reaches the REPEAT step
  useEffect(() => {
    if (phase === 'repeat' && flow.repeatOptions.length === 0) {
      generateRepeatOptions();
    }
  }, [phase]);

  const handleSend = async (chat, textOverride) => {
    const t = (textOverride || chatInput).trim();
    if (!t) return;
    setChatInput('');
    await chat.sendMessage(t);
  };

  const activeChat = phase === 'battle' ? battleChat : victoryChat;

  // Auto-speak AI replies when voice mode is on
  const spokenIndices = useRef({ battle: -1, victory: -1 });
  useEffect(() => {
    const phaseKey = phase === 'result' ? 'victory' : 'battle';
    if (!battleVoiceMode) return;
    const msgs = activeChat.messages;
    if (msgs.length === 0) return;
    const lastIdx = msgs.length - 1;
    const last = msgs[lastIdx];
    if (last?.role === 'assistant' && lastIdx > spokenIndices.current[phaseKey]) {
      spokenIndices.current[phaseKey] = lastIdx;
      flow.voice.speak(last.text, { speed: 0.9 });
    }
  }, [activeChat.messages, battleVoiceMode, phase]);

  // Cancel speech on unmount or phase change
  useEffect(() => {
    return () => {
      flow.voice.cancelSpeech();
    };
  }, [phase]);

  // Auto-append voice transcript to loot text when user finishes speaking on loot screen
  useEffect(() => {
    if (
      phase === 'result' &&
      flow.engageSubStep === 0.5 &&
      flow.voice.transcript &&
      !flow.voice.isListening
    ) {
      setLootText((prev) => (prev ? prev + ' ' + flow.voice.transcript : flow.voice.transcript));
      flow.voice.resetTranscript();
    }
  }, [flow.voice.transcript, flow.voice.isListening, phase, flow.engageSubStep]);

  // Auto-append voice transcript to decide custom input when user finishes speaking
  useEffect(() => {
    if (phase === 'prep' && prepStep === 0 && flow.voice.transcript && !flow.voice.isListening) {
      flow.setDecideCustom((prev) =>
        prev ? prev + ' ' + flow.voice.transcript : flow.voice.transcript,
      );
      flow.voice.resetTranscript();
    }
  }, [flow.voice.transcript, flow.voice.isListening, phase, prepStep]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.mapBg }}>
      {/* Boss header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `2px solid ${C.mutedBorder}`,
          background:
            phase === 'battle'
              ? C.bossRed + '15'
              : phase === 'repeat'
                ? C.hpGreen + '10'
                : C.cardBg,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 6,
          }}
        >
          <PixelText
            size={7}
            color={phase === 'battle' ? C.bossRed : phase === 'repeat' ? C.hpGreen : C.goldMd}
          >
            {phase === 'prep'
              ? '⚔ PREPARING FOR BATTLE'
              : phase === 'battle'
                ? '🔥 BATTLE IN PROGRESS'
                : phase === 'log'
                  ? '📋 BATTLE LOG'
                  : phase === 'repeat'
                    ? '🔁 REPEAT THE EXPOSURE'
                    : '🎉 BATTLE COMPLETE'}
          </PixelText>
          <PixelText size={7} color={C.subtleText}>
            LV.{boss.level || boss.difficulty}
          </PixelText>
        </div>
        <PixelText size={10} color={C.cream}>
          {boss.name}
        </PixelText>
        <div style={{ marginTop: 4 }}>
          <PixelText size={7} color={C.subtleText}>
            {boss.desc}
          </PixelText>
        </div>
      </div>

      {/* D.A.R.E.R. progress bar — always visible, clickable to navigate */}
      <div
        role="navigation"
        aria-label="DARER phase navigation"
        style={{ padding: '8px 16px 0', background: C.cardBg }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {(() => {
            const currentStepIndex =
              phase === 'repeat' ? 4 : phase === 'result' ? 4 : phase === 'battle' ? 3 : prepStep;
            return darerSteps.map((vs, i) => {
              const canClick = i <= maxPrepReached;
              const isCurrent = i === currentStepIndex;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!canClick) return;
                    if (i <= 3) {
                      setPhase('prep');
                      setPrepStep(i);
                    } else if (i === 3 && phase !== 'battle') {
                      setPhase('battle');
                    } else if (i === 4) {
                      setPhase(phase === 'result' ? 'result' : 'repeat');
                    }
                  }}
                  aria-current={isCurrent ? 'step' : undefined}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    textAlign: 'center',
                    borderRadius: 4,
                    cursor: canClick ? 'pointer' : 'default',
                    background:
                      i < currentStepIndex
                        ? vs.color + '20'
                        : isCurrent
                          ? vs.color + '10'
                          : C.cardBg,
                    border: isCurrent ? `2px solid ${vs.color}60` : '2px solid transparent',
                    opacity: canClick ? 1 : 0.4,
                  }}
                >
                  <PixelText size={10} color={vs.color}>
                    {vs.letter}
                  </PixelText>
                  <div>
                    <PixelText size={5} color={C.subtleText}>
                      {vs.title}
                    </PixelText>
                  </div>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* === PREP PHASE: D.A.R.E.R. Framework === */}
      {phase === 'prep' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 80px' }}>
          {(() => {
            const vs = darerSteps[prepStep];

            // DECIDE step — extracted shared component
            if (prepStep === 0) {
              const pickValues =
                hero.values && hero.values.length
                  ? hero.values
                  : hero.coreValues && hero.coreValues.length
                    ? hero.coreValues
                    : [];
              return (
                <DecidePhase
                  label={vs}
                  entityName={boss.name}
                  values={pickValues}
                  selectedVals={flow.decideSelectedVals}
                  setSelectedVals={flow.setDecideSelectedVals}
                  customText={flow.decideCustom}
                  setCustomText={flow.setDecideCustom}
                  onNext={(why) => {
                    setPrepAnswers((pa) => ({ ...pa, value: why }));
                    advancePrepStep((s) => s + 1);
                  }}
                  showVoiceInput
                  voice={flow.voice}
                />
              );
            }

            // RISE step — extracted shared component
            if (prepStep === 2)
              return (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{vs.icon}</span>
                    <div>
                      <PixelText size={10} color={vs.color} style={{ display: 'block' }}>
                        {vs.title}
                      </PixelText>
                      <PixelText size={6} color={C.subtleText}>
                        {vs.subtitle}
                      </PixelText>
                    </div>
                  </div>
                  <RisePhase
                    riseSubStep={flow.riseSubStep}
                    setRiseSubStep={flow.setRiseSubStep}
                    exposureWhen={flow.exposureWhen}
                    setExposureWhen={flow.setExposureWhen}
                    exposureScheduledTime={flow.exposureScheduledTime}
                    setExposureScheduledTime={flow.setExposureScheduledTime}
                    exposureWhere={flow.exposureWhere}
                    setExposureWhere={flow.setExposureWhere}
                    exposureArmory={flow.exposureArmory}
                    setExposureArmory={flow.setExposureArmory}
                    selectedArmoryTool={flow.selectedArmoryTool}
                    setSelectedArmoryTool={flow.setSelectedArmoryTool}
                    hero={hero}
                    sudsValue={suds.before}
                    setSudsValue={(v) => setSuds((s) => ({ ...s, before: v }))}
                    onNext={() => advancePrepStep((s) => s + 1)}
                    showBackButton={true}
                    onBack={() => flow.setRiseSubStep(flow.riseSubStep - 1)}
                    calendarParams={{
                      title: `DARER: ${boss.name}`,
                      desc: `Face the ${boss.name} exposure: ${boss.desc}. Location: ${flow.exposureWhere || 'TBD'}. Your anchor: ${prepAnswers.value || 'courage'}.`,
                    }}
                    onPracticeComplete={handlePracticeComplete}
                  />
                </div>
              );

            // ALLOW step — Storm interrogation (detailed)
            if (prepStep === 1)
              return (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{vs.icon}</span>
                    <div>
                      <PixelText size={10} color={vs.color} style={{ display: 'block' }}>
                        {vs.title}
                      </PixelText>
                      <PixelText size={6} color={C.subtleText}>
                        {vs.subtitle}
                      </PixelText>
                    </div>
                  </div>
                  <AllowFields
                    allowFearful={flow.allowFearful}
                    setAllowFearful={flow.setAllowFearful}
                    allowLikelihood={flow.allowLikelihood}
                    setAllowLikelihood={flow.setAllowLikelihood}
                    allowSeverity={flow.allowSeverity}
                    setAllowSeverity={flow.setAllowSeverity}
                    allowCanHandle={flow.allowCanHandle}
                    setAllowCanHandle={flow.setAllowCanHandle}
                    allowFearShowing={flow.allowFearShowing}
                    setAllowFearShowing={flow.setAllowFearShowing}
                    allowPhysicalSensations={flow.allowPhysicalSensations}
                    setAllowPhysicalSensations={flow.setAllowPhysicalSensations}
                    allowCustomSensation={flow.allowCustomSensation}
                    setAllowCustomSensation={flow.setAllowCustomSensation}
                    onComplete={() => {
                      setPrepAnswers((pa) => ({
                        ...pa,
                        allow: `Thoughts: "${flow.allowFearful}" Likelihood: ${flow.allowLikelihood}% Severity: ${flow.allowSeverity}/10 Can handle: "${flow.allowCanHandle}" Fear showing: "${flow.allowFearShowing}" Body: [${flow.allowPhysicalSensations.join(', ')}]${flow.allowCustomSensation ? ' — ' + flow.allowCustomSensation : ''}`,
                      }));
                      advancePrepStep((s) => s + 1);
                    }}
                  />
                </div>
              );

            // ENGAGE step — choose: go now or talk to Dara
            if (prepStep === 3)
              return (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{vs.icon}</span>
                    <div>
                      <PixelText size={10} color={vs.color} style={{ display: 'block' }}>
                        {vs.title}
                      </PixelText>
                      <PixelText size={6} color={C.subtleText}>
                        {vs.subtitle}
                      </PixelText>
                    </div>
                  </div>

                  <DialogBox speaker="DARA">
                    <PixelText
                      size={8}
                      color={C.cream}
                      style={{ display: 'block', lineHeight: 1.8 }}
                    >
                      You've prepared. Your value{'\n'}is clear. Your anchor is set.{'\n'}The
                      Shadow's tricks are named.{'\n'}
                      {'\n'}Now — are you ready to{'\n'}step forward?
                    </PixelText>
                  </DialogBox>

                  <PixelBtn
                    onClick={() => {
                      setPhase('result');
                      flow.setEngageSubStep(0);
                    }}
                    color={C.bossRed}
                    textColor={C.cream}
                    style={{ width: '100%', marginTop: 16 }}
                  >
                    ⚔ ENGAGE RIGHT AWAY
                  </PixelBtn>
                  <PixelBtn
                    onClick={() => {
                      setPhase('battle');
                      const prepSummary = `D.A.R.E.R. prep: Decide="${prepAnswers.value}" Allow="${prepAnswers.allow}" Rise="${prepAnswers.rise}"`;
                      battleChat.init(
                        `The hero is NOW facing "${boss.name}" (${boss.desc}) in real life. Their prep: ${prepSummary}. They want to talk before engaging. Ask them how they're feeling right now, what's on their mind, what they need before stepping forward. Be warm and personal. 1-2 sentences.`,
                      );
                    }}
                    color={C.teal}
                    textColor={C.cream}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    💬 TALK TO DARA FIRST
                  </PixelBtn>
                </div>
              );
          })()}
        </div>
      )}

      {/* === BATTLE PHASE: Real-time exposure chat === */}
      {phase === 'battle' && (
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {battleChat.messages.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: 6,
                marginBottom: 8,
              }}
            >
              {m.role === 'assistant' ? (
                <BattleTypewriterBubble text={m.text} muted={!battleVoiceMode} voice={flow.voice} />
              ) : (
                <VoiceMessageBubble
                  isFromVoice={m.fromVoice}
                  style={{
                    maxWidth: '82%',
                    padding: '10px 12px',
                    borderRadius: 4,
                    background: C.plum,
                    border: `2px solid ${C.mutedBorder}`,
                  }}
                >
                  <PixelText
                    size={8}
                    color={C.cream}
                    style={{ display: 'block', whiteSpace: 'pre-wrap' }}
                  >
                    {m.text}
                  </PixelText>
                </VoiceMessageBubble>
              )}
            </div>
          ))}
          {battleChat.typing && <DialogBox speaker="DARA" typing />}
        </div>
      )}

      {/* === E — ENGAGE (post-battle debrief flow) === */}
      {phase === 'result' && (
        <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
          {/* Sub-step 0: Outcome selection — sequential reveal */}
          {flow.engageSubStep === 0 && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                  You stepped into the arena.{'\n'}Whatever happened — you showed{'\n'}up. That
                  matters.
                </PixelText>
              </DialogBox>

              {!showOutcome ? (
                <PixelBtn
                  onClick={() => setShowOutcome(true)}
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  📋 I AM READY TO REPORT
                </PixelBtn>
              ) : (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ marginTop: 14 }}>
                    {[
                      {
                        id: 'victory',
                        label: '⚔ BOSS DEFEATED — I did it!',
                        desc: 'I stayed all the way through',
                      },
                      {
                        id: 'partial',
                        label: '🩹 PARTIAL VICTORY — I went partway',
                        desc: "I didn't finish, but I stayed longer than I usually would",
                      },
                      {
                        id: 'retreat',
                        label: '🛡 STRATEGIC RETREAT — Not this time',
                        desc: "The Storm was too strong, but I'm not giving up",
                      },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setOutcome(opt.id)}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: 8,
                          padding: '14px 12px',
                          borderRadius: 4,
                          border: `2px solid ${outcome === opt.id ? C.goldMd : C.mutedBorder}`,
                          background: outcome === opt.id ? C.goldMd + '12' : C.cardBg,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <PixelText
                          size={7}
                          color={outcome === opt.id ? C.goldMd : C.cream}
                          style={{ display: 'block', lineHeight: 1.5 }}
                        >
                          {opt.label}
                        </PixelText>
                      </button>
                    ))}
                  </div>

                  {outcome && (
                    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                      {/* Animated outcome banner */}
                      <div
                        style={{
                          marginTop: 16,
                          padding: '20px 16px',
                          textAlign: 'center',
                          background:
                            outcome === 'victory'
                              ? C.hpGreen + '15'
                              : outcome === 'partial'
                                ? C.goldMd + '10'
                                : C.bossRed + '10',
                          border: `2px solid ${outcome === 'victory' ? C.hpGreen + '60' : outcome === 'partial' ? C.goldMd + '40' : C.bossRed + '40'}`,
                          borderRadius: 8,
                          animation:
                            outcome === 'victory'
                              ? 'victoryFlash 0.8s ease-out'
                              : outcome === 'partial'
                                ? 'fadeIn 0.5s ease-out'
                                : 'retreatFade 0.5s ease-out',
                        }}
                      >
                        <div style={{ fontSize: 40, marginBottom: 8 }}>
                          {outcome === 'victory' ? '⚔️' : outcome === 'partial' ? '🌟' : '🛡️'}
                        </div>
                        <PixelText
                          size={10}
                          color={
                            outcome === 'victory'
                              ? C.hpGreen
                              : outcome === 'partial'
                                ? C.goldMd
                                : C.bossRed
                          }
                          style={{ display: 'block' }}
                        >
                          {outcome === 'victory'
                            ? 'BOSS DEFEATED'
                            : outcome === 'partial'
                              ? 'PARTIAL VICTORY'
                              : 'STRATEGIC RETREAT'}
                        </PixelText>
                        <PixelText
                          size={7}
                          color={C.grayLt}
                          style={{ display: 'block', marginTop: 4 }}
                        >
                          {outcome === 'victory'
                            ? 'You stayed all the way through'
                            : outcome === 'partial'
                              ? 'Progress, not perfection'
                              : 'The Storm was too strong this time'}
                        </PixelText>
                      </div>
                      <PixelBtn
                        onClick={() => flow.setEngageSubStep(0.5)}
                        color={C.gold}
                        textColor={C.charcoal}
                        style={{ width: '100%', marginTop: 16 }}
                      >
                        🎒 SHOW ME THE LOOT
                      </PixelBtn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Sub-step 0.5: Loot — proof of completion */}
          {flow.engageSubStep === 0.5 && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                  Every battle leaves a mark.{'\n'}
                  {'\n'}
                  Share a moment from this{'\n'}exposure — a photo, a memory, a{'\n'}feeling. This
                  is your loot.
                </PixelText>
              </DialogBox>

              {/* Image upload */}
              <label
                style={{
                  display: 'block',
                  width: '100%',
                  padding: C.padLg,
                  marginTop: 14,
                  border: `2px dashed ${C.mutedBorder}`,
                  borderRadius: 6,
                  background: C.cardBg,
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setLootImage(reader.result);
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                {lootImage ? (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={lootImage}
                      alt="Battle proof"
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6 }}
                    />
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setLootImage(null);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: `${C.cardBg}CC`,
                        border: `1px solid ${C.mutedBorder}`,
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <PixelText size={8} color={C.cream}>
                        ✕
                      </PixelText>
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                    <PixelText size={7} color={C.subtleText}>
                      Tap to upload a photo
                    </PixelText>
                  </div>
                )}
              </label>

              {/* Meaningful moment text + voice */}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={lootText}
                  onChange={(e) => setLootText(e.target.value)}
                  placeholder="Share a meaningful moment — what did you notice, feel, or create?..."
                  rows={3}
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 10,
                    background: C.cardBg,
                    border: `2px solid ${C.mutedBorder}`,
                    borderRadius: 4,
                    color: C.cream,
                    fontSize: 12,
                    fontFamily: PIXEL_FONT,
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.6,
                    boxSizing: 'border-box',
                    WebkitUserSelect: 'text',
                    userSelect: 'text',
                    touchAction: 'auto',
                  }}
                />
                {flow.voice.supported && (
                  <button
                    onClick={() => {
                      if (flow.voice.isListening) {
                        flow.voice.stopListening();
                      } else {
                        flow.voice.startListening();
                      }
                    }}
                    style={{
                      alignSelf: 'flex-end',
                      padding: '6px 12px',
                      background: flow.voice.isListening ? C.plum : C.cardBg,
                      border: `2px solid ${flow.voice.isListening ? C.plumLt : C.teal + '60'}`,
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: flow.voice.isListening ? C.cream : C.grayLt,
                      fontSize: 9,
                      fontFamily: PIXEL_FONT,
                      boxShadow: flow.voice.isListening ? `0 0 8px ${C.plum}80` : 'none',
                    }}
                  >
                    {flow.voice.isListening ? '⏹ STOP' : '🎤 SPEAK'}
                  </button>
                )}
              </div>

              <PixelBtn
                onClick={() => flow.setEngageSubStep(1)}
                color={C.gold}
                textColor={C.charcoal}
                style={{ width: '100%', marginTop: 16 }}
              >
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 1: SUDs after */}
          {flow.engageSubStep === 1 && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                  How intense is the Storm{'\n'}right now? Rate it honestly.
                </PixelText>
              </DialogBox>

              <div style={{ marginTop: 12 }}>
                <PixelText
                  size={7}
                  color={C.subtleText}
                  style={{ display: 'block', marginBottom: 8 }}
                >
                  STORM INTENSITY (after)
                </PixelText>
                <SUDSSlider
                  value={suds.after}
                  onChange={(v) => setSuds((s) => ({ ...s, after: v }))}
                  label="STORM INTENSITY (after)"
                  subtitle="How much distress do you feel right now?"
                  ariaLabel="Distress level after exposure"
                />
              </div>

              <PixelBtn
                onClick={() => flow.setEngageSubStep(2)}
                color={C.gold}
                textColor={C.charcoal}
                style={{ width: '100%', marginTop: 16 }}
              >
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 2: Reflection questions */}
          {flow.engageSubStep === 2 && (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <ReflectionQuestions
                fearedHappened={flow.fearedHappened}
                setFearedHappened={flow.setFearedHappened}
                fearedSeverity={flow.fearedSeverity}
                setFearedSeverity={flow.setFearedSeverity}
                madeItThrough={flow.madeItThrough}
                setMadeItThrough={flow.setMadeItThrough}
              />
              <PixelBtn
                onClick={() => flow.setEngageSubStep(3)}
                disabled={
                  flow.fearedHappened === "No, they didn't happen at all"
                    ? false
                    : !flow.fearedHappened || !flow.fearedSeverity || !flow.madeItThrough
                }
                color={C.gold}
                textColor={C.charcoal}
                style={{ width: '100%', marginTop: 16 }}
              >
                CONTINUE →
              </PixelBtn>
            </div>
          )}

          {/* Sub-step 3: Free text — what did you learn */}
          {flow.engageSubStep === 3 && (
            <DebriefFreeText
              engageFreeText={flow.engageFreeText}
              setEngageFreeText={flow.setEngageFreeText}
              onNext={() => flow.setEngageSubStep(4)}
              voice={flow.voice}
            />
          )}

          {/* Sub-step 4: SUDs comparison + victory chat */}
          {flow.engageSubStep === 4 && (
            <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
              {/* SUDs comparison */}
              <SUDSComparison before={suds.before} after={suds.after} />

              <DialogBox speaker="DARA">
                <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.9 }}>
                  {hero.name}, do you see what{'\n'}happened?{'\n'}
                  {'\n'}
                  The Shadow told you it would be{'\n'}unbearable.{' '}
                  {suds.before > suds.after
                    ? 'But the actual experience was less intense than the fear predicted.'
                    : 'And you survived it.'}
                  {'\n'}
                  {'\n'}
                  {flow.engageFreeText
                    ? `"${flow.engageFreeText}" — that's wisdom earned through action, not just thought.{"\n"}{"\n"}`
                    : ''}
                  This is the D.A.R.E.R. cycle:{'\n'}Decide. Allow. Rise. Engage.{'\n'}Repeat. Every
                  battle weakens{'\n'}the Shadow.{'\n'}
                  {'\n'}
                  But there's one more step before{'\n'}we close — and it's the most{'\n'}important
                  one.
                </PixelText>
              </DialogBox>

              <PixelBtn
                onClick={() => setPhase('repeat')}
                color={C.gold}
                textColor={C.charcoal}
                style={{ width: '100%', marginTop: 12 }}
              >
                THE POWER OF REPEAT →
              </PixelBtn>
            </div>
          )}
        </div>
      )}

      {/* === REPEAT PHASE: AI-generated follow-up exposure options === */}
      {phase === 'repeat' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 80px' }}>
          <RepeatPhase
            outcome={outcome}
            repeatOptions={flow.repeatOptions}
            selectedRepeat={selectedRepeat}
            setSelectedRepeat={setSelectedRepeat}
            onRegenerate={() => {
              setSelectedRepeat('');
              flow.setRepeatOptions([]);
              generateRepeatOptions();
            }}
            onComplete={() =>
              handleBattleResult(outcome, {
                prepAnswers,
                suds,
                exposureWhen: flow.exposureWhen,
                exposureWhere: flow.exposureWhere,
                exposureArmory: flow.exposureArmory,
                exposureScheduledTime: flow.exposureScheduledTime,
                battleMessages: battleChat.messages,
                victoryMessages: victoryChat.messages,
                repeatChoice: selectedRepeat,
                lootImage: lootImage,
                lootText: lootText,
                // Structured fields for normalized battles table
                decideSelectedVals: flow.decideSelectedVals,
                decideCustom: flow.decideCustom,
                allowFearful: flow.allowFearful,
                allowLikelihood: flow.allowLikelihood,
                allowSeverity: flow.allowSeverity,
                allowCanHandle: flow.allowCanHandle,
                allowFearShowing: flow.allowFearShowing,
                allowPhysicalSensations: flow.allowPhysicalSensations,
                allowCustomSensation: flow.allowCustomSensation,
                fearedHappened: flow.fearedHappened,
                fearedSeverity: flow.fearedSeverity,
                madeItThrough: flow.madeItThrough,
                engageFreeText: flow.engageFreeText,
              })
            }
            isLoading={flow.repeatOptions.length === 0}
            readOnly={false}
            loadingLabel="DARA IS FINDING OPTIONS"
            continueLabel="I'M READY TO REPEAT → MISSION COMPLETE"
            heroName={hero.name}
          />
        </div>
      )}

      {/* === CONTROLS (battle phase only) === */}
      {phase === 'battle' && (
        <div style={{ padding: '12px 12px 64px', borderTop: `2px solid ${C.mutedBorder}` }}>
          {/* AI error notification */}
          {battleChat.error && (
            <div
              style={{
                marginBottom: 8,
                padding: C.padSm,
                background: C.bossRed + '20',
                border: `1px solid ${C.bossRed}`,
                borderRadius: 4,
              }}
            >
              <PixelText size={7} color={C.bossRed}>
                {battleChat.error}
              </PixelText>
              <button
                onClick={() => battleChat.reset()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.teal,
                  cursor: 'pointer',
                  marginLeft: 8,
                  textDecoration: 'underline',
                }}
              >
                <PixelText size={7} color={C.teal}>
                  Retry
                </PixelText>
              </button>
            </div>
          )}

          {/* Voice mode toggle */}
          {flow.voice.supported && (
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setBattleVoiceMode((v) => !v)}
                style={{
                  padding: '4px 10px',
                  background: battleVoiceMode ? C.plum + '40' : 'transparent',
                  border: `1px solid ${battleVoiceMode ? C.plumLt : C.gray + '60'}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                  color: battleVoiceMode ? C.plumLt : C.grayLt,
                  fontSize: 9,
                  fontFamily: PIXEL_FONT,
                }}
              >
                {battleVoiceMode ? '🎤 Voice ON' : '🎤 Voice OFF'}
              </button>
            </div>
          )}

          {/* Free text input during battle */}
          {battleVoiceMode && flow.voice.supported ? (
            <VoiceInputBar
              input={chatInput}
              onInputChange={setChatInput}
              onSend={(t) => handleSend(battleChat, t)}
              typing={battleChat.typing}
              disabled={false}
              voice={flow.voice}
              placeholder="Say anything to Dara or tap 🎤..."
            />
          ) : (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatInput.trim()) {
                    handleSend(battleChat);
                    setChatInput('');
                  }
                }}
                placeholder="Say anything to Dara..."
                disabled={battleChat.typing}
                style={{
                  flex: 1,
                  padding: C.padSm,
                  background: C.cardBg,
                  border: `2px solid ${C.mutedBorder}`,
                  borderRadius: 3,
                  color: C.cream,
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <PixelBtn
                onClick={() => {
                  if (chatInput.trim()) {
                    handleSend(battleChat);
                    setChatInput('');
                  }
                }}
                disabled={battleChat.typing || !chatInput.trim()}
              >
                →
              </PixelBtn>
            </div>
          )}
          <PixelBtn
            onClick={() => {
              setPhase('result');
              flow.setEngageSubStep(0);
            }}
            color={C.bossRed}
            textColor={C.cream}
            style={{ width: '100%', marginTop: 8 }}
          >
            ⚔ I'M READY TO ENGAGE
          </PixelBtn>
        </div>
      )}
      <BottomNav
        active={null}
        onNav={(s) => {
          if (s === 'map') onRetreat();
          else if (s === 'bank') onBank();
          else {
            setActiveBoss(null);
            setScreen(s === 'profile' ? 'profile' : s);
          }
        }}
        zIndex={20}
      />

      {/* Post-battle celebration overlay */}
      {celebration && (
        <CelebrationOverlay
          xpEarned={celebration.xpEarned || 0}
          coinsEarned={celebration.coinsEarned || 0}
          lootDrop={celebration.lootDrop}
          achievements={celebration.newAchievements || []}
          playerLevel={celebration.playerLevel || 1}
          prevLevel={celebration.prevLevel || 1}
          streakCount={celebration.streakCount || 0}
          hasLetter={celebration.hasLetter || false}
          weeklyChallengeRewards={celebration.weeklyChallengeRewards || null}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
