import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAIChat, callAI, generateFollowUpExposures } from '../utils/chat';
import { logger } from '../utils/logger';
import { buildHeroContext } from '../utils/aiHelper.jsx';
import { C, PIXEL_FONT, SYS } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar, TypingDots, DialogBox } from '../components/shared';
import { useDARERFlow } from '../hooks/useDARERFlow';
import { VoiceInputBar, VoiceMessageBubble } from '../components/VoiceToggle';
import DecidePhase from '../components/DARER/DecidePhase';
import RepeatPhase from '../components/DARER/RepeatPhase';
import AllowFields from '../components/DARER/AllowFields';
import SUDSSlider from '../components/DARER/SUDSSlider';
import SUDSComparison from '../components/DARER/SUDSComparison';
import DebriefFreeText from '../components/DARER/DebriefFreeText';
import RisePhase from '../components/DARER/RisePhase';

// Map emoji name strings to actual emoji characters
const EMOJI_MAP = {
  smile: '😊',
  wave: '👋',
  nod: '🙂',
  greet: '🤝',
  hello: '👋',
  door: '🚪',
  thanks: '🙏',
  chair: '🪑',
  queue: '💬',
  ask: '🗺️',
  seek: '🔍',
  chat: '💬',
  laugh: '😄',
  compliment: '💛',
  help: '🤲',
  look: '👀',
  stand: '🧍',
  sit: '🪑',
  walk: '🚶',
  talk: '🗣',
  star: '⭐',
  heart: '❤️',
  fire: '🔥',
  sparkle: '✨',
  sun: '☀️',
  shield: '🛡️',
  eye: '👁',
  brain: '🧠',
  muscle: '💪',
  lightbulb: '💡',
};

const resolveEmoji = (icon) => {
  if (!icon) return '✨';
  if (icon.length <= 2) return icon; // already an emoji
  return EMOJI_MAP[icon.toLowerCase()] || '✨';
};

export default function TutorialBattle({
  heroName,
  hero,
  quest,
  shadowText,
  heroValues,
  heroStrengths = [],
  heroCoreValues = [],
  onComplete,
  obState = {},
  setOBState,
}) {
  const [phase, setPhase] = useState(obState.phase || 'intro'); // intro, choose, decide, allow, rehearse, rise, waiting, engage, debrief
  const advancePhase = (newPhase) => {
    setPhase(newPhase);
    if (setOBState) setOBState({ phase: newPhase });
  };
  const [chosenExposure, setChosenExposure] = useState(obState.chosenExposure || null);
  const [sudsBefore, setSudsBefore] = useState(obState.sudsBefore ?? 0);
  const [sudsAfter, setSudsAfter] = useState(obState.sudsAfter ?? 0);
  const [rehearsalStep, setRehearsalStep] = useState(0);
  const [allowInput, setAllowInput] = useState('');
  const flow = useDARERFlow({ obState, setOBState });
  const allowFearful = flow.allowFearful;
  const setAllowFearful = flow.setAllowFearful;
  const allowLikelihood = flow.allowLikelihood;
  const setAllowLikelihood = flow.setAllowLikelihood;
  const allowSeverity = flow.allowSeverity;
  const setAllowSeverity = flow.setAllowSeverity;
  const allowCanHandle = flow.allowCanHandle;
  const setAllowCanHandle = flow.setAllowCanHandle;
  const allowFearShowing = flow.allowFearShowing;
  const setAllowFearShowing = flow.setAllowFearShowing;
  const allowPhysicalSensations = flow.allowPhysicalSensations;
  const setAllowPhysicalSensations = flow.setAllowPhysicalSensations;
  const allowCustomSensation = flow.allowCustomSensation;
  const setAllowCustomSensation = flow.setAllowCustomSensation;
  const [engageOutcome, setEngageOutcome] = useState('');
  const engageSubStep = flow.engageSubStep;
  const setEngageSubStep = flow.setEngageSubStep;
  const engageFreeText = flow.engageFreeText;
  const setEngageFreeText = flow.setEngageFreeText;
  const fearedHappened = flow.fearedHappened;
  const setFearedHappened = flow.setFearedHappened;
  const fearedSeverity = flow.fearedSeverity;
  const setFearedSeverity = flow.setFearedSeverity;
  const madeItThrough = flow.madeItThrough;
  const setMadeItThrough = flow.setMadeItThrough;
  const repeatOptions = flow.repeatOptions;
  const setRepeatOptions = flow.setRepeatOptions;
  const riseSubStep = flow.riseSubStep;
  const setRiseSubStep = flow.setRiseSubStep;
  const [decideWhy, setDecideWhy] = useState(obState.decideWhy || '');
  const decideCustom = flow.decideCustom;
  const setDecideCustom = flow.setDecideCustom;
  const decideSelectedVals = flow.decideSelectedVals;
  const setDecideSelectedVals = flow.setDecideSelectedVals;
  const exposureWhen = flow.exposureWhen;
  const setExposureWhen = flow.setExposureWhen;
  const exposureWhere = flow.exposureWhere;
  const setExposureWhere = flow.setExposureWhere;
  const exposureArmory = flow.exposureArmory;
  const setExposureArmory = flow.setExposureArmory;
  const exposureScheduledTime = flow.exposureScheduledTime;
  const setExposureScheduledTime = flow.setExposureScheduledTime;
  const [showAlarmSuggestion, setShowAlarmSuggestion] = useState(false);
  const selectedArmoryTool = flow.selectedArmoryTool;
  const setSelectedArmoryTool = flow.setSelectedArmoryTool;
  const valueName = heroValues?.[0]?.word || heroValues?.[0]?.text || 'courage';

  // AI coach for the rehearsal/coaching moments
  const heroContext = buildHeroContext(hero, quest, shadowText, []);
  const coachChat = useAIChat(
    SYS.preBoss,
    `${heroContext}\n\nTUTORIAL BATTLE: This is the hero's very first exposure — a micro-challenge. Reference their strengths, values, and shadow profile when coaching. Be encouraging and personal.`,
  );
  const chatRef = useRef(null);
  const [coachInput, setCoachInput] = useState('');
  const voice = flow.voice;

  // Auto-speak AI replies
  const spokenIdx = useRef(-1);
  useEffect(() => {
    const msgs = coachChat.messages;
    if (msgs.length === 0) return;
    const lastIdx = msgs.length - 1;
    const last = msgs[lastIdx];
    if (last?.role === 'assistant' && lastIdx > spokenIdx.current) {
      spokenIdx.current = lastIdx;
      voice.speak(last.text, { speed: 0.9 });
    }
  }, [coachChat.messages, voice]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [coachChat.messages, coachChat.typing]);

  // Persist tutorial state to obState for resume-anywhere
  const initRef = useRef(true);
  useEffect(() => {
    if (initRef.current) {
      initRef.current = false;
      return;
    }
    if (!setOBState) return;
    setOBState({
      chosenExposure,
      sudsBefore,
      sudsAfter,
      riseSubStep,
      decideWhy: Array.isArray(decideWhy) ? decideWhy.join('||') : decideWhy,
      exposureWhen,
      exposureWhere,
      exposureArmory,
      engageSubStep,
    });
  }, [
    chosenExposure,
    sudsBefore,
    sudsAfter,
    riseSubStep,
    decideWhy,
    exposureWhen,
    exposureWhere,
    exposureArmory,
    engageSubStep,
    setOBState,
  ]);

  // AI-generated micro-exposures tailored to the user's profile
  const [tutorialExposures, setTutorialExposures] = useState([]);
  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [prevExposureTexts, setPrevExposureTexts] = useState([]);
  const fallbackRoundRef = useRef(0);

  const generateTutorialExposures = async (avoidTexts = []) => {
    setExposuresLoading(true);
    try {
      const shadowsText = shadowText || 'General social anxiety';
      const strengthsText = heroStrengths.length > 0 ? heroStrengths.join(', ') : 'Not specified';
      const valuesText =
        heroCoreValues.length > 0
          ? heroCoreValues.map((v) => v.word || v.text).join(', ')
          : heroValues?.[0]?.text || 'courage';
      const avoidBlock =
        avoidTexts.length > 0
          ? `\n\nPREVIOUSLY SHOWN — DO NOT REPEAT:\n${avoidTexts.map((t) => '❌ ' + t).join('\n')}\n\nGenerate 3 COMPLETELY DIFFERENT exposures from the above.`
          : '';
      const res = await callAI(
        `You are a clinical psychologist designing micro-exposures for someone with social anxiety. Generate exactly 3 very low-SUDS (1-2 out of 10) training exposures for a user's FIRST exposure experience.

User profile:
- Shadow pattern: ${shadowsText}
- Self-identified strengths: ${strengthsText}
- Core value: ${valuesText}${avoidBlock}

Clinical rules:
- SUDS must be 1 or 2 (very gentle, low-stakes micro-actions)
- Each must be completable in 5-15 seconds
- Each must be context-flexible (works in multiple settings)
- Tailor the activities to the user's shadow pattern without being too targeted (this is still a beginner exercise)
- Leverage the user's strengths where possible
- Connect subtly to their core value
- Each activity must be COMPLETELY DIFFERENT from the others and from any previously shown exposures
- Give each a creative RPG-style boss name (1-2 words)
- Include an emoji icon (e.g., 😊👋🙂🤝🚪🙏🪑💬🗺️🔍😄💛🧍🚶🗣⭐❤️🔥💪💡)

CRITICAL: Every activity MUST be a true exposure — meaning it involves intentionally entering a feared social situation to face the fear. DO NOT suggest grounding techniques (5-4-3-2-1, body scan), breathing exercises, mindfulness, relaxation, journaling, or any internal coping strategy. Exposures are outward-facing social actions, not internal regulation techniques. If it doesn't involve interacting with or being observed by other people, it is NOT an exposure.

Return ONLY a JSON array: [{"name":"Boss Name","text":"specific micro-exposure activity","icon":"emoji_name","where":"where to do it","time":"X seconds","suds":1}]
No other text.`,
        [
          {
            role: 'user',
            text: `Generate 3 DIFFERENT training exposures. ${avoidTexts.length > 0 ? 'The user has seen ' + avoidTexts.length + ' already and wants NEW ones.' : 'This is the first batch.'}`,
          },
        ],
      );
      const jsonMatch = res.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length >= 2) {
          const newExposures = parsed.slice(0, 3).map((e, i) => ({
            ...e,
            id: 'tutorial_' + (e.name || 'exp' + i).replace(/\s+/g, '_').toLowerCase(),
            suds: Math.min(2, e.suds || 1),
            time: e.time || '10 seconds',
            icon: e.icon || '✨',
          }));
          // Deduplication: if any new text matches a previously shown text, force fallback
          const allPrev = [...avoidTexts];
          const hasDupe = newExposures.some((ne) =>
            allPrev.some((p) => p.toLowerCase().trim() === ne.text.toLowerCase().trim()),
          );
          if (hasDupe) {
            logger.warn('AI returned duplicate exposures — falling back');
            throw new Error('AI returned duplicates');
          }
          setTutorialExposures(newExposures);
          // Track the texts so next regenerate avoids them
          setPrevExposureTexts((prev) => [...prev, ...newExposures.map((e) => e.text)]);
          setExposuresLoading(false);
          return;
        }
      }
      throw new Error('Parse failed');
    } catch (e) {
      console.error('Tutorial exposure generation failed:', e);
      // Fallback: rotate through different sets
      const fallbackSets = [
        [
          {
            id: 'smile',
            text: 'Make eye contact and smile at a stranger',
            icon: '😊',
            where: 'Anywhere — street, shop, café',
            time: '5 seconds',
            suds: 1,
            name: 'The Smiler',
          },
          {
            id: 'hello',
            text: "Say 'hello' or 'good morning' to someone you don't know",
            icon: '👋',
            where: 'Walking past someone, a cashier, a neighbor',
            time: '10 seconds',
            suds: 1,
            name: 'The Greeter',
          },
          {
            id: 'nod',
            text: 'Give a small nod of acknowledgment to someone nearby',
            icon: '🙂',
            where: 'Elevator, waiting in line, shared space',
            time: '5 seconds',
            suds: 2,
            name: 'The Nod',
          },
        ],
        [
          {
            id: 'wave',
            text: 'Give a friendly wave to someone across the room',
            icon: '👋',
            where: 'Park, grocery store, shared space',
            time: '5 seconds',
            suds: 1,
            name: 'The Waver',
          },
          {
            id: 'door',
            text: 'Hold a door open for someone behind you',
            icon: '🚪',
            where: 'Any entrance — shop, building, elevator',
            time: '10 seconds',
            suds: 1,
            name: 'The Gatekeeper',
          },
          {
            id: 'thanks',
            text: 'Thank a cashier or service worker by name if their badge is visible',
            icon: '🙏',
            where: 'Store, restaurant, pharmacy',
            time: '10 seconds',
            suds: 2,
            name: 'The Gratitude',
          },
        ],
        [
          {
            id: 'chair',
            text: 'Sit in a visible spot and stay there for 30 seconds without looking at your phone',
            icon: '🪑',
            where: 'Café, park bench, waiting area',
            time: '30 seconds',
            suds: 2,
            name: 'The Stillness',
          },
          {
            id: 'queue',
            text: 'Make brief friendly small talk with someone in line',
            icon: '💬',
            where: 'Grocery checkout, coffee shop, ATM line',
            time: '15 seconds',
            suds: 2,
            name: 'The Chatter',
          },
          {
            id: 'ask',
            text: 'Ask a stranger for simple directions you already know',
            icon: '🗺️',
            where: 'Street, mall, campus',
            time: '10 seconds',
            suds: 2,
            name: 'The Seeker',
          },
        ],
      ];
      // Skip fallback sets that overlap with previously shown exposures
      const prevSet = new Set(avoidTexts.map((t) => t.toLowerCase().trim()));
      let startIdx = (fallbackRoundRef.current + 1) % fallbackSets.length;
      let chosenIdx = startIdx;
      for (let i = 0; i < fallbackSets.length; i++) {
        const idx = (startIdx + i) % fallbackSets.length;
        const hasOverlap = fallbackSets[idx].some((e) => prevSet.has(e.text.toLowerCase().trim()));
        if (!hasOverlap) {
          chosenIdx = idx;
          break;
        }
      }
      fallbackRoundRef.current = chosenIdx;
      setTutorialExposures(fallbackSets[chosenIdx]);
      setExposuresLoading(false);
    }
  };

  useEffect(() => {
    generateTutorialExposures();
  }, []);

  // Pre-generate repeat options when user reaches the REPEAT step
  useEffect(() => {
    if (engageSubStep === 6 && repeatOptions.length === 0) {
      generateRepeatOptions();
    }
  }, [engageSubStep]);

  // Generate repeat exposure variations based on outcome
  const generateRepeatOptions = async () => {
    const opts = await generateFollowUpExposures({
      currentText: chosenExposure?.text || 'a micro-exposure',
      outcome: engageOutcome,
      why: decideWhy,
    });
    setRepeatOptions(opts);
  };

  const PhaseLabel = ({ letter, title, active, color }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        padding: '8px 12px',
        borderRadius: 6,
        background: active ? color + '15' : 'transparent',
        border: active ? `2px solid ${color}40` : '2px solid transparent',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          background: active ? color + '25' : C.cardBg,
          border: `2px solid ${active ? color : C.mutedBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PixelText size={12} color={active ? color : C.grayLt}>
          {letter}
        </PixelText>
      </div>
      <div>
        <PixelText size={9} color={active ? color : C.grayLt}>
          {title}
        </PixelText>
        <div>
          <PixelText size={6} color={C.subtleText}>
            {active ? 'ACTIVE' : '—'}
          </PixelText>
        </div>
      </div>
    </div>
  );

  // D.A.R.E.R. mini progress bar — clickable to navigate completed steps
  const phaseNames = ['decide', 'allow', 'rise', 'engage', 'repeat'];
  const phaseIndex =
    phase === 'decide'
      ? 0
      : phase === 'allow' || phase === 'rehearse'
        ? 1
        : phase === 'rise'
          ? 2
          : phase === 'engage'
            ? 3
            : phase === 'repeat'
              ? 4
              : -1;

  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
      {phaseNames.map((pName, i) => {
        const canClick = i <= phaseIndex;
        const isLast = i === 3; // engage is final, no repeat in training
        return (
          <button
            key={i}
            onClick={() => {
              if (canClick && !isLast) advancePhase(pName);
            }}
            style={{
              flex: 1,
              padding: '5px 2px',
              textAlign: 'center',
              borderRadius: 3,
              background:
                i < phaseIndex ? C.hpGreen + '25' : i === phaseIndex ? C.goldMd + '20' : C.cardBg,
              border: `2px solid ${i < phaseIndex ? C.hpGreen : i === phaseIndex ? C.goldMd : C.mutedBorder}`,
              cursor: canClick && !isLast ? 'pointer' : 'default',
              opacity: canClick ? 1 : 0.4,
              transition: 'all 0.3s',
            }}
          >
            <PixelText
              size={7}
              color={i <= phaseIndex ? (i < phaseIndex ? C.hpGreen : C.goldMd) : C.grayLt}
            >
              {pName[0].toUpperCase()}
            </PixelText>
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      style={{ minHeight: '100vh', background: C.mapBg, display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      {phase !== 'intro' && phase !== 'choose' && (
        <div
          style={{
            padding: '10px 16px',
            borderBottom: `2px solid ${C.mutedBorder}`,
            background: C.cardBg,
          }}
        >
          <PixelText size={7} color={C.goldMd}>
            🏕 TRAINING GROUNDS
          </PixelText>
          {chosenExposure && (
            <div style={{ marginTop: 4 }}>
              <PixelText size={7} color={C.cream}>
                {chosenExposure.text}
              </PixelText>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
        {/* === INTRO === */}
        {phase === 'intro' && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.6s ease-out' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏕</div>
            <PixelText size={12} color={C.goldMd} style={{ display: 'block', marginBottom: 6 }}>
              TRAINING GROUNDS
            </PixelText>
            <PixelText size={7} color={C.subtleText} style={{ display: 'block', marginBottom: 20 }}>
              Practice the DARER Strategy � guided by Dara
            </PixelText>

            <DialogBox speaker="DARA">
              <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.9 }}>
                Before you forge your full path,{'\n'}let's try one small battle{'\n'}together.
                {'\n'}
                {'\n'}
                This is your training ground. I'll{'\n'}walk you through every step of{'\n'}the
                D.A.R.E.R. cycle so you know{'\n'}exactly how it works.{'\n'}
                {'\n'}
                The battle is tiny — but the{'\n'}process is real. Ready to see{'\n'}what you're
                made of?
              </PixelText>
            </DialogBox>

            <PixelBtn
              onClick={() => advancePhase('choose')}
              color={C.gold}
              textColor={C.charcoal}
              style={{ width: '100%', marginTop: 12 }}
            >
              SHOW ME THE BATTLES →
            </PixelBtn>
          </div>
        )}

        {/* === CHOOSE MICRO-EXPOSURE === */}
        {phase === 'choose' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <PixelText size={10} color={C.goldMd} style={{ display: 'block', marginBottom: 6 }}>
                CHOOSE YOUR FIRST BATTLE
              </PixelText>
              <PixelText size={7} color={C.subtleText} style={{ display: 'block' }}>
                Pick the one that feels right
              </PixelText>
            </div>

            {exposuresLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <PixelText size={8} color={C.goldMd} style={{ display: 'block', marginBottom: 8 }}>
                  FORGING YOUR TRAINING
                </PixelText>
                <TypingDots />
              </div>
            ) : (
              <>
                {tutorialExposures.map((exp) => {
                  const selected = chosenExposure?.id === exp.id;
                  return (
                    <button
                      key={exp.id}
                      onClick={() => setChosenExposure(exp)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: 14,
                        marginBottom: 8,
                        background: selected ? C.goldMd + '12' : C.cardBg,
                        border: `2px solid ${selected ? C.goldMd : C.mutedBorder}`,
                        borderRadius: 6,
                        cursor: 'pointer',
                        boxShadow: selected ? `0 0 12px ${C.goldMd}15` : 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{resolveEmoji(exp.icon)}</span>
                        <div style={{ flex: 1 }}>
                          <PixelText
                            size={8}
                            color={selected ? C.goldMd : C.cream}
                            style={{ display: 'block', lineHeight: 1.5 }}
                          >
                            {exp.text}
                          </PixelText>
                          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                            <PixelText size={6} color={C.subtleText}>
                              📍 {exp.where}
                            </PixelText>
                          </div>
                          <div style={{ display: 'flex', gap: 10, marginTop: 3 }}>
                            <PixelText size={6} color={C.subtleText}>
                              ⏱ {exp.time}
                            </PixelText>
                            <PixelText size={6} color={C.hpGreen}>
                              SUDs {exp.suds}/10
                            </PixelText>
                          </div>
                        </div>
                        {selected && (
                          <PixelText size={14} color={C.goldMd}>
                            ✓
                          </PixelText>
                        )}
                      </div>
                    </button>
                  );
                })}

                <PixelBtn
                  onClick={() => {
                    if (chosenExposure) {
                      setDecideSelectedVals([]);
                      setDecideCustom('');
                      setDecideWhy('');
                      advancePhase('decide');
                    }
                  }}
                  disabled={!chosenExposure}
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  BEGIN TRAINING →
                </PixelBtn>
                <button
                  onClick={() => generateTutorialExposures(prevExposureTexts)}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: 10,
                    background: 'transparent',
                    border: `1px dashed ${C.mutedBorder}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  <PixelText size={6} color={C.subtleText}>
                    🔄 Generate different training exposures
                  </PixelText>
                </button>
              </>
            )}
          </div>
        )}

        {/* === D — DECIDE === */}
        {phase === 'decide' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <ProgressBar />
            <PhaseLabel letter="D" title="DECIDE" active color={C.goalGold} />
            <DecidePhase
              label={{ icon: '🏰', title: 'DECIDE', subtitle: 'Why this battle matters', color: C.goalGold }}
              entityName={chosenExposure.text}
              values={heroValues || []}
              selectedVals={decideSelectedVals}
              setSelectedVals={setDecideSelectedVals}
              customText={decideCustom}
              setCustomText={setDecideCustom}
              onNext={(why) => {
                setDecideWhy(why);
                advancePhase('allow');
              }}
              showVoiceInput={false}
            />
          </div>
        )}

        {/* === A — ALLOW === */}
        {phase === 'allow' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <ProgressBar />
            <PhaseLabel letter="A" title="ALLOW" active color={C.hpGreen} />
            <AllowFields
              allowFearful={allowFearful}
              setAllowFearful={setAllowFearful}
              allowLikelihood={allowLikelihood}
              setAllowLikelihood={setAllowLikelihood}
              allowSeverity={allowSeverity}
              setAllowSeverity={setAllowSeverity}
              allowCanHandle={allowCanHandle}
              setAllowCanHandle={setAllowCanHandle}
              allowFearShowing={allowFearShowing}
              setAllowFearShowing={setAllowFearShowing}
              allowPhysicalSensations={allowPhysicalSensations}
              setAllowPhysicalSensations={setAllowPhysicalSensations}
              allowCustomSensation={allowCustomSensation}
              setAllowCustomSensation={setAllowCustomSensation}
              onComplete={() => {
                setAllowInput(
                  `Thoughts: "${allowFearful}" Likelihood: ${allowLikelihood}% Severity: ${allowSeverity}/10 Can handle: "${allowCanHandle}" Fear showing: "${allowFearShowing}" Body: [${allowPhysicalSensations.join(', ')}]${allowCustomSensation ? ' — ' + allowCustomSensation : ''}`,
                );
                advancePhase('rise');
              }}
            />
          </div>
        )}

        {/* === R — RISE (plan + SUDs before + go do it) === */}
        {phase === 'rise' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <ProgressBar />
            <PhaseLabel letter="R" title="RISE" active color={C.teal} />
            <RisePhase
              riseSubStep={riseSubStep}
              setRiseSubStep={setRiseSubStep}
              exposureWhen={exposureWhen}
              setExposureWhen={setExposureWhen}
              exposureScheduledTime={exposureScheduledTime}
              setExposureScheduledTime={setExposureScheduledTime}
              exposureWhere={exposureWhere}
              setExposureWhere={setExposureWhere}
              exposureArmory={exposureArmory}
              setExposureArmory={setExposureArmory}
              selectedArmoryTool={selectedArmoryTool}
              setSelectedArmoryTool={setSelectedArmoryTool}
              hero={hero}
              sudsValue={sudsBefore}
              setSudsValue={setSudsBefore}
              onNext={() => advancePhase('engage')}
              showBackButton={false}
              calendarParams={{
                title: `DARER Training: ${chosenExposure?.name || 'Exposure'}`,
                desc: `Face this exposure: ${chosenExposure?.text || chosenExposure?.desc || ''}. Location: ${exposureWhere || 'TBD'}. Your anchor: ${decideWhy || 'courage'}.`,
              }}
            />
          </div>
        )}

        {/* === E — ENGAGE (outcome → SUDs → reflection → debrief) === */}
        {phase === 'engage' && (
          <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            <ProgressBar />
            <PhaseLabel letter="E" title="ENGAGE" active color={C.bossRed} />

            {/* Sub-step 0: Choose engage or talk to Dara */}
            {engageSubStep === 0 && (
              <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease-out' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚔️</div>
                <PixelText
                  size={10}
                  color={C.goldMd}
                  style={{ display: 'block', marginBottom: 16 }}
                >
                  TIME TO FACE THE SHADOW
                </PixelText>

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.9 }}>
                    {heroName}, this is your moment.{'\n'}
                    {'\n'}
                    You've prepared for this — you{'\n'}know why you're doing it, you've{'\n'}felt
                    the Storm and let it be{'\n'}there, and you've chosen your{'\n'}tools.{'\n'}
                    {'\n'}
                    The Shadow will whisper. The{'\n'}Storm will rise. But you are{'\n'}stronger
                    than both.{'\n'}
                    {'\n'}
                    When you're ready — step forward.
                  </PixelText>
                </DialogBox>

                <PixelBtn
                  onClick={() => setEngageSubStep(1)}
                  color={C.bossRed}
                  textColor={C.cream}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  ⚔ ENGAGE RIGHT AWAY
                </PixelBtn>
                <PixelBtn
                  onClick={() => setEngageSubStep(0.5)}
                  color={C.teal}
                  textColor={C.cream}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  💬 TALK TO DARA FIRST
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 0.5: Dara chat before engaging */}
            {engageSubStep === 0.5 && (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                    Of course, {heroName}.{'\n'}
                    {'\n'}
                    Whatever's on your mind —{'\n'}say it. I'm here. No judgment,{'\n'}no rush. What
                    do you need{'\n'}before you step forward?
                  </PixelText>
                </DialogBox>

                {voice.supported ? (
                  <VoiceInputBar
                    input={coachInput}
                    onInputChange={setCoachInput}
                    onSend={async (text) => {
                      const msg = text || coachInput;
                      if (!msg?.trim() || coachChat.typing) return;
                      setCoachInput('');
                      const ok = await coachChat.sendMessage(msg);
                      if (ok && voice.supported) {
                        voice.speak(ok, { speed: 0.9 });
                      }
                    }}
                    typing={coachChat.typing}
                    disabled={false}
                    voice={voice}
                    placeholder="Speak or type — ask Dara anything..."
                  />
                ) : (
                  <textarea
                    value={coachInput}
                    onChange={(e) => setCoachInput(e.target.value)}
                    placeholder="Ask Dara anything — fears, doubts, encouragement..."
                    rows={3}
                    style={{
                      width: '100%',
                      minHeight: 70,
                      padding: 10,
                      marginTop: 14,
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
                    }}
                  />
                )}
                {!voice.supported && (
                  <PixelBtn
                    onClick={async () => {
                      if (!coachInput.trim() || coachChat.typing) return;
                      const msg = coachInput;
                      setCoachInput('');
                      await coachChat.sendMessage(msg);
                    }}
                    disabled={coachChat.typing || !coachInput.trim()}
                    color={C.teal}
                    textColor={C.cream}
                    style={{ width: '100%', marginTop: 8 }}
                  >
                    SEND TO DARA →
                  </PixelBtn>
                )}

                {coachChat.messages.length > 0 && (
                  <div ref={chatRef} style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
                    {coachChat.messages.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '85%',
                            padding: '8px 12px',
                            borderRadius: 4,
                            background: m.role === 'user' ? C.plum : C.cardBg,
                            border: `2px solid ${m.role === 'user' ? C.mutedBorder : C.teal + '40'}`,
                          }}
                        >
                          <PixelText
                            size={7}
                            color={C.cream}
                            style={{ display: 'block', whiteSpace: 'pre-wrap' }}
                          >
                            {m.text}
                          </PixelText>
                        </div>
                      </div>
                    ))}
                    {coachChat.typing && <DialogBox speaker="DARA" typing />}
                  </div>
                )}

                <PixelBtn
                  onClick={() => setEngageSubStep(1)}
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 12 }}
                >
                  I'M READY — LET'S GO →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 1: Outcome selection */}
            {engageSubStep === 1 && (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
                    You stepped into the arena.{'\n'}Whatever happened — you showed{'\n'}up. That
                    matters.{'\n'}
                    {'\n'}
                    How did it go?
                  </PixelText>
                </DialogBox>

                <div style={{ marginTop: 14 }}>
                  {[
                    {
                      id: 'full',
                      label: '✅ I did it — I stayed all the way through',
                      desc: 'I completed the full exposure',
                    },
                    {
                      id: 'partial',
                      label: '🔥 I went partway — faced some of it',
                      desc: "I didn't finish, but I stayed longer than I usually would",
                    },
                    {
                      id: 'tried',
                      label: "💪 I tried but couldn't push through this time",
                      desc: "The Storm was too strong, but I'm not giving up",
                    },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setEngageOutcome(opt.id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginBottom: 8,
                        padding: '14px 12px',
                        borderRadius: 4,
                        border: `2px solid ${engageOutcome === opt.id ? C.goldMd : C.mutedBorder}`,
                        background: engageOutcome === opt.id ? C.goldMd + '12' : C.cardBg,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <PixelText
                        size={7}
                        color={engageOutcome === opt.id ? C.goldMd : C.cream}
                        style={{ display: 'block', lineHeight: 1.5 }}
                      >
                        {opt.label}
                      </PixelText>
                    </button>
                  ))}
                </div>

                <PixelBtn
                  onClick={() => setEngageSubStep(2)}
                  disabled={!engageOutcome}
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  CONTINUE →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 2: SUDs after */}
            {engageSubStep === 2 && (
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
                    value={sudsAfter}
                    onChange={setSudsAfter}
                    label="STORM INTENSITY (after)"
                    subtitle="How much distress do you feel right now?"
                  />
                </div>

                <PixelBtn
                  onClick={() => setEngageSubStep(3)}
                  disabled={!sudsAfter}
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  CONTINUE →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 3: Reflection questions */}
            {engageSubStep === 3 && (
              <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <PixelText
                  size={10}
                  color={C.goldMd}
                  style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}
                >
                  REFLECT ON THE BATTLE
                </PixelText>

                {/* Q1: Did feared consequences happen? */}
                <div style={{ marginBottom: 16 }}>
                  <PixelText
                    size={7}
                    color={C.goldMd}
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    1. Did the consequences you feared actually happen?
                  </PixelText>
                  {[
                    "No, they didn't happen at all",
                    'Some did, but not like I expected',
                    'Yes, they did happen',
                  ].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setFearedHappened(opt);
                        if (opt === "No, they didn't happen at all") {
                          setFearedSeverity('');
                          setMadeItThrough('');
                        }
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginBottom: 6,
                        padding: '10px 14px',
                        borderRadius: 4,
                        border: `2px solid ${fearedHappened === opt ? C.teal : C.mutedBorder}`,
                        background: fearedHappened === opt ? C.teal + '20' : C.cardBg,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <PixelText size={7} color={fearedHappened === opt ? C.teal : C.grayLt}>
                        {opt}
                      </PixelText>
                    </button>
                  ))}
                </div>

                {/* Q2: If it did happen, how severe was it actually? */}
                {fearedHappened && fearedHappened !== "No, they didn't happen at all" && (
                  <div style={{ marginBottom: 16, animation: 'fadeIn 0.3s ease-out' }}>
                    <PixelText
                      size={7}
                      color={C.goldMd}
                      style={{ display: 'block', marginBottom: 8 }}
                    >
                      2. If it did happen — how bad was it really?
                    </PixelText>
                    {[
                      'It was much less severe than I feared',
                      'It was about what I expected',
                      'It was as bad as I feared',
                    ].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setFearedSeverity(opt)}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: 6,
                          padding: '10px 14px',
                          borderRadius: 4,
                          border: `2px solid ${fearedSeverity === opt ? C.teal : C.mutedBorder}`,
                          background: fearedSeverity === opt ? C.teal + '20' : C.cardBg,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <PixelText size={7} color={fearedSeverity === opt ? C.teal : C.grayLt}>
                          {opt}
                        </PixelText>
                      </button>
                    ))}
                  </div>
                )}

                {/* Q3: Even if difficult, did you make it through? */}
                {fearedSeverity && fearedHappened !== "No, they didn't happen at all" && (
                  <div style={{ marginBottom: 16, animation: 'fadeIn 0.3s ease-out' }}>
                    <PixelText
                      size={7}
                      color={C.goldMd}
                      style={{ display: 'block', marginBottom: 8 }}
                    >
                      3. Did you get through it?
                    </PixelText>
                    {[
                      'Yes — I made it through, even if it was hard',
                      "I'm still working on it, but I know I can",
                      'Not this time, but I learned something',
                    ].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setMadeItThrough(opt)}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: 6,
                          padding: '10px 14px',
                          borderRadius: 4,
                          border: `2px solid ${madeItThrough === opt ? C.teal : C.mutedBorder}`,
                          background: madeItThrough === opt ? C.teal + '20' : C.cardBg,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <PixelText size={7} color={madeItThrough === opt ? C.teal : C.grayLt}>
                          {opt}
                        </PixelText>
                      </button>
                    ))}
                  </div>
                )}

                <PixelBtn
                  onClick={() => setEngageSubStep(4)}
                  disabled={
                    fearedHappened === "No, they didn't happen at all"
                      ? false
                      : !fearedHappened || !fearedSeverity || !madeItThrough
                  }
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 16 }}
                >
                  CONTINUE →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 4: Free text — what did you learn */}
            {engageSubStep === 4 && (
              <DebriefFreeText
                engageFreeText={engageFreeText}
                setEngageFreeText={setEngageFreeText}
                onNext={() => setEngageSubStep(5)}
                voice={voice}
              />
            )}

            {/* Sub-step 5: SUDs comparison + debrief (moved from old debrief phase) */}
            {engageSubStep === 5 && (
              <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
                  <PixelText size={12} color={C.goldMd} style={{ display: 'block' }}>
                    FIRST BATTLE COMPLETE!
                  </PixelText>
                  <PixelText
                    size={7}
                    color={C.subtleText}
                    style={{ display: 'block', marginTop: 4 }}
                  >
                    +50 XP EARNED
                  </PixelText>
                </div>

                {/* SUDs comparison */}
                <SUDSComparison before={sudsBefore} after={sudsAfter} />

                <DialogBox speaker="DARA">
                  <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.9 }}>
                    {heroName}, you just completed your{'\n'}first battle. Do you see what{'\n'}
                    happened?{'\n'}
                    {'\n'}
                    The Shadow told you it would be{'\n'}unbearable.{' '}
                    {sudsBefore > sudsAfter
                      ? 'But the actual experience was less intense than the fear predicted.'
                      : 'And you survived it.'}
                    {'\n'}
                    {'\n'}
                    {engageFreeText
                      ? `"${engageFreeText}" — that's wisdom earned through action, not just thought.{"\n"}{"\n"}`
                      : ''}
                    This is the D.A.R.E.R. cycle:{'\n'}Decide. Allow. Rise. Engage.{'\n'}Repeat.
                    Every battle weakens{'\n'}the Shadow.{'\n'}
                    {'\n'}
                    But there's one more step before{'\n'}we close — and it's the most{'\n'}
                    important one.
                  </PixelText>
                </DialogBox>

                <PixelBtn
                  onClick={() => setEngageSubStep(6)}
                  color={C.gold}
                  textColor={C.charcoal}
                  style={{ width: '100%', marginTop: 12 }}
                >
                  THE POWER OF REPEAT →
                </PixelBtn>
              </div>
            )}

            {/* Sub-step 6: REPEAT — psychoeducation + preview of follow-up options */}
            {engageSubStep === 6 && (
              <RepeatPhase
                outcome={engageOutcome}
                repeatOptions={repeatOptions}
                selectedRepeat=""
                setSelectedRepeat={() => {}}
                onRegenerate={null}
                onComplete={() => {
                  if (setOBState) setOBState({ tutorialComplete: true });
                  onComplete();
                }}
                isLoading={repeatOptions.length === 0}
                readOnly
                loadingLabel="🔨 DARA IS FINDING OPTIONS..."
                continueLabel="GOT IT — ON TO THE PATH →"
                heroName={heroName}
              />
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
    </div>
  );
}
