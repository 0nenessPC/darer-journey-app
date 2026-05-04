import React, { useState, useEffect, useCallback, useRef } from 'react';
import { z } from 'zod';
import { C, DM_SANS_FONT } from '../constants/gameData';
import { PixelText, PixelBtn, DialogBox, TypingDots } from '../components/shared';
import { callAI } from '../utils/chat';
import { logger } from '../utils/logger';
import VoiceInputField from '../components/VoiceInputField';
import { useCloudVoice } from '../hooks/useCloudVoice';
import { validateAIResponse, ValueSchema } from '../utils/aiSchemas';

function ValuesTypewriterText({ text }) {
  return (
    <PixelText size={8} color={C.cream} style={{ display: 'block', lineHeight: 1.8 }}>
      {text}
    </PixelText>
  );
}

export default function ValuesScreen({ heroName, onComplete }) {
  const [step, setStep] = useState('intro');
  const [values, setValues] = useState([]);
  const [freeText, setFreeText] = useState('');
  const [guideStep, setGuideStep] = useState(0);
  const [guideAnswers, setGuideAnswers] = useState(['', '', '']);
  const [generatedValues, setGeneratedValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [allCards, setAllCards] = useState(null);
  const guideVoice = useCloudVoice({ useCloud: false });
  const guideSpokenRef = useRef({});

  // Speak Dara's question + hint on each guide step
  useEffect(() => {
    if (step !== 'guide') return;
    const key = `${guideStep}`;
    if (guideSpokenRef.current[key]) return;
    guideSpokenRef.current[key] = true;
    const p = GUIDE_PROMPTS[guideStep];
    const fullText = `${p.question} ${p.hint}`;
    guideVoice.speak(fullText, { voice: 'nova', speed: 0.9 });
  }, [step, guideStep]);

  // Cancel guide speech when leaving the guide screen
  useEffect(() => {
    if (step !== 'guide') guideVoice.cancelSpeech();
  }, [step]);

  // Outcome-oriented values informed by Behavioral Activation life areas
  // (Lejuez et al., BATD-R) and DBT Wise Mind Values (Linehan/Rathus & Miller, 2015)
  // Weighted toward social/relational domains for social anxiety population
  const DEFAULT_CARDS = [
    { id: 'v1', text: 'Reach out and build new friendships', icon: '🤝', domain: 'friendships' },
    { id: 'v2', text: 'Feel a sense of belonging in a group', icon: '💜', domain: 'friendships' },
    {
      id: 'v3',
      text: 'Show the people I love how much they mean to me',
      icon: '❤️',
      domain: 'intimacy',
    },
    {
      id: 'v4',
      text: 'Spend quality time with people I care about',
      icon: '🔥',
      domain: 'friendships',
    },
    {
      id: 'v5',
      text: 'Be someone others can trust and count on',
      icon: '🌟',
      domain: 'friendships',
    },
    { id: 'v6', text: 'Open up and let people really know me', icon: '🤗', domain: 'intimacy' },
    {
      id: 'v7',
      text: 'Speak up and share what I think and feel',
      icon: '🗣',
      domain: 'expression',
    },
    {
      id: 'v8',
      text: 'Share my ideas confidently at work or school',
      icon: '💡',
      domain: 'employment',
    },
    {
      id: 'v9',
      text: 'Enjoy social events without dreading them',
      icon: '🎉',
      domain: 'friendships',
    },
    { id: 'v10', text: 'Take on challenges that help me grow', icon: '🏔', domain: 'growth' },
    {
      id: 'v11',
      text: 'Be respected and confident at work or school',
      icon: '⭐',
      domain: 'achievement',
    },
    { id: 'v12', text: 'Contribute and help people around me', icon: '🌍', domain: 'community' },
  ];

  const VALUE_CARDS = allCards || DEFAULT_CARDS;

  // Guided exploration prompts (inspired by DBT values experiments, Rathus & Miller 2015)
  const GUIDE_PROMPTS = [
    {
      question:
        'Imagine someone is telling the story of your best moments with other people — your highlights in social life. What would they describe?',
      hint: 'A time you connected with someone, made a friend laugh, felt like you belonged, or showed up as the real you...',
    },
    {
      question:
        'Think about someone whose social life you admire. What is it about the way they connect with others that you wish you had?',
      hint: "Maybe they're effortlessly warm, or they speak their mind, or they walk into any room like they belong...",
    },
    {
      question:
        'If the Shadow vanished tomorrow and fear no longer controlled how you showed up around people — what would change?',
      hint: 'Who would you reach out to? What would you say yes to? How would your relationships be different?',
    },
  ];

  const updateGuideAnswer = (text) => {
    setGuideAnswers((prev) => {
      const next = [...prev];
      next[guideStep] = text;
      return next;
    });
  };

  // Extract and validate JSON array from AI response
  const extractJsonArray = (text) => {
    return (
      validateAIResponse(
        text,
        z.array(z.object({ text: z.string(), icon: z.string().optional() })),
      ) || null
    );
  };

  const generateValuesFromAnswers = async () => {
    setLoadingValues(true);
    try {
      const res = await callAI(
        `You are a values counselor for a social anxiety RPG game. Based on what the user shared about what matters to them, generate exactly 3 personalized value statements. Each should be an outcome-oriented value (what they want in life, not how they want to behave). Keep each to 8 words or fewer. Return ONLY a JSON array like: [{"text":"value text","icon":"emoji"}]. No other text.`,
        [
          {
            role: 'user',
            text: `Here is what the user shared:\n1. Social highlights: "${guideAnswers[0]}"\n2. Social qualities they admire: "${guideAnswers[1]}"\n3. What they'd do without fear: "${guideAnswers[2]}"`,
          },
        ],
      );
      // Guard against API fallback responses ("..." or "Dara gathers her thoughts...")
      if (!res || res === '...' || res.includes('Dara gathers')) {
        logger.warn('[ValuesScreen] AI call failed (API error), showing default cards');
        setStep('cards');
        return;
      }
      const parsed = extractJsonArray(res);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const newCards = parsed.slice(0, 3).map((v, i) => ({
          id: 'vg' + i,
          text: v.text,
          icon: v.icon || '💫',
          domain: 'personal',
          generated: true,
        }));
        setGeneratedValues(newCards);
        setAllCards((prev) => [...newCards, ...DEFAULT_CARDS]);
        setValues([]);
        setStep('cards');
        return;
      }
      logger.warn('[ValuesScreen] AI response not usable, falling back to default cards');
      setStep('cards');
    } catch (e) {
      console.error('[ValuesScreen] generateValuesFromAnswers error:', e);
      setStep('cards');
    } finally {
      setLoadingValues(false);
    }
  };

  const toggleValue = (v) => {
    setValues((prev) =>
      prev.includes(v.id)
        ? prev.filter((x) => x !== v.id)
        : prev.length < 5
          ? [...prev, v.id]
          : prev,
    );
  };

  const addCustomValue = () => {
    const trimmed = freeText.trim();
    if (!trimmed || values.length >= 5) return;
    const newId = 'vc' + Date.now();
    const newCard = { id: newId, text: trimmed, icon: '✨', domain: 'personal', generated: true };
    setAllCards((prev) => [
      ...(prev || DEFAULT_CARDS).filter((v) => !v.generated),
      newCard,
      ...(prev || DEFAULT_CARDS).filter((v) => v.generated && v.id !== newId),
    ]);
    setValues((prev) => [...prev, newId]);
    setFreeText('');
  };

  const selectedCards = VALUE_CARDS.filter((v) => values.includes(v.id));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.mapBg,
        padding: '20px 20px 32px',
        overflowY: 'auto',
      }}
    >
      {/* INTRO — Dara asks the question */}
      {step === 'intro' && (
        <div style={{ animation: 'fadeIn 0.6s ease-out' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏰</div>
            <PixelText size={11} color={C.goalGold} style={{ display: 'block', marginBottom: 8 }}>
              WHY BECOME A DARER?
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <ValuesTypewriterText
              text={`${heroName}, you've seen your Shadow's trap — the territory it claims, the storm it stirs, the escapes it feeds on. It thrived in the dark, counting on you never looking.

Now you can see it. So the question is: what will you do about it?

This path won't be easy — but what is worth fighting for? Not goals you "should" have. What truly matters to you. Why are you here?`}
            />
          </DialogBox>

          <PixelBtn
            onClick={() => setStep('cards')}
            color={C.gold}
            textColor={C.charcoal}
            style={{ width: '100%', marginTop: 12 }}
          >
            LET ME SHOW YOU →
          </PixelBtn>
        </div>
      )}

      {/* CARDS — Select values that resonate */}
      {step === 'cards' && (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <PixelText
            size={10}
            color={C.goalGold}
            style={{ display: 'block', textAlign: 'center', marginBottom: 6 }}
          >
            WHAT MATTERS MOST?
          </PixelText>
          <PixelText
            size={7}
            color={C.grayLt}
            style={{ display: 'block', textAlign: 'center', marginBottom: 16 }}
          >
            Choose up to 5 that speak to you.
          </PixelText>

          {/* Dara's picks label — only if generated values exist */}
          {generatedValues.length > 0 && (
            <PixelText size={7} color={C.plumMd} style={{ display: 'block', marginBottom: 8 }}>
              ✨ DARA'S PICKS FOR YOU
            </PixelText>
          )}

          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}
          >
            {VALUE_CARDS.map((v, i) => {
              const active = values.includes(v.id);
              const isGenerated = v.generated;
              const showDivider = generatedValues.length > 0 && i === generatedValues.length;
              return (
                <div key={v.id} style={{ display: 'contents' }}>
                  {showDivider && (
                    <div style={{ gridColumn: '1 / -1', padding: '8px 0 4px' }}>
                      <PixelText size={7} color={C.grayLt}>
                        ALL VALUES
                      </PixelText>
                    </div>
                  )}
                  <button
                    onClick={() => toggleValue(v)}
                    style={{
                      padding: '14px 10px',
                      background: active
                        ? C.goalGold + '15'
                        : isGenerated
                          ? C.plumMd + '08'
                          : 'C.cardBg',
                      border: `2px solid ${active ? C.goalGold : isGenerated ? C.plumMd + '60' : C.mutedBorder}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      textAlign: 'center',
                      boxShadow: active
                        ? `0 0 12px ${C.goalGold}20`
                        : isGenerated
                          ? `0 0 8px ${C.plumMd}15`
                          : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{v.icon}</div>
                    <PixelText
                      size={7}
                      color={active ? C.goalGold : isGenerated ? C.plumMd : C.grayLt}
                    >
                      {v.text}
                    </PixelText>
                    {isGenerated && !active && (
                      <div style={{ marginTop: 4 }}>
                        <PixelText size={5} color={C.plumMd}>
                          SUGGESTED
                        </PixelText>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ADD CUSTOM VALUE */}
          <div style={{ marginTop: 16, marginBottom: 8 }}>
            <PixelText
              size={7}
              color={C.plumMd}
              style={{ display: 'block', textAlign: 'center', marginBottom: 8 }}
            >
              ✏️ WRITE YOUR OWN VALUE
            </PixelText>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="What matters most to you in your own words..."
              rows={2}
              style={{
                width: '100%',
                padding: 10,
                background: C.cardBg,
                border: `2px solid ${C.mutedBorder}`,
                borderRadius: 4,
                color: C.cream,
                fontSize: 13,
                fontFamily: DM_SANS_FONT,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <PixelBtn
              onClick={addCustomValue}
              disabled={!freeText.trim() || values.length >= 5}
              color={freeText.trim() && values.length < 5 ? C.plum : C.charcoal}
              textColor={freeText.trim() && values.length < 5 ? C.cream : C.gray}
              style={{ width: '100%', marginTop: 8 }}
            >
              ADD MY VALUE
            </PixelBtn>
          </div>

          {values.length >= 2 && (
            <PixelBtn
              onClick={() => setStep('seal')}
              color={C.gold}
              textColor={C.charcoal}
              style={{ width: '100%' }}
            >
              THESE MATTER TO ME →
            </PixelBtn>
          )}
          {values.length < 2 && (
            <div style={{ textAlign: 'center' }}>
              <PixelText size={7} color={C.grayLt}>
                Select at least 2 values
              </PixelText>
            </div>
          )}
          <button
            onClick={() => setStep('guide')}
            style={{
              display: 'block',
              margin: '12px auto 0',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <PixelText size={7} color={C.plumMd}>
              I need help finding my values →
            </PixelText>
          </button>
        </div>
      )}

      {/* GUIDED EXPLORATION — collect answers, then AI generates values */}
      {step === 'guide' && (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧚</div>
            <PixelText size={10} color={C.goldMd} style={{ display: 'block', marginBottom: 4 }}>
              LET'S FIND YOURS
            </PixelText>
            <PixelText size={7} color={C.grayLt}>
              {guideStep + 1} of {GUIDE_PROMPTS.length}
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <ValuesTypewriterText key={`q-${guideStep}`} text={GUIDE_PROMPTS[guideStep].question} />
            <div style={{ marginTop: 8 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: 'block', lineHeight: 1.6 }}>
                {GUIDE_PROMPTS[guideStep].hint}
              </PixelText>
            </div>
          </DialogBox>

          {/* Unified input: textarea with 🎤 mic button on the left */}
          <VoiceInputField
            value={guideAnswers[guideStep]}
            onChange={(text) => updateGuideAnswer(text)}
            placeholder="What comes to mind..."
            rows={3}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {guideStep < GUIDE_PROMPTS.length - 1 ? (
              <PixelBtn
                onClick={() => setGuideStep((g) => g + 1)}
                disabled={!guideAnswers[guideStep].trim()}
                color={C.plum}
                style={{ flex: 1 }}
              >
                NEXT QUESTION →
              </PixelBtn>
            ) : (
              <PixelBtn
                onClick={generateValuesFromAnswers}
                disabled={!guideAnswers[guideStep].trim() || loadingValues}
                color={C.gold}
                textColor={C.charcoal}
                style={{ flex: 1 }}
              >
                {loadingValues ? (
                  <>
                    DARA IS REFLECTING <TypingDots />
                  </>
                ) : (
                  'DISCOVER MY VALUES →'
                )}
              </PixelBtn>
            )}
          </div>

          {guideStep > 0 && (
            <button
              onClick={() => setGuideStep((g) => g - 1)}
              style={{
                display: 'block',
                margin: '10px auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <PixelText size={6} color={C.grayLt}>
                ← Previous question
              </PixelText>
            </button>
          )}

          <button
            onClick={() => setStep('cards')}
            style={{
              display: 'block',
              margin: '8px auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <PixelText size={6} color={C.grayLt}>
              Back to value cards
            </PixelText>
          </button>
        </div>
      )}

      {/* SEAL — Values confirmed, Dara closes */}
      {step === 'seal' && (
        <div style={{ animation: 'fadeIn 0.6s ease-out', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <PixelText size={11} color={C.goalGold} style={{ display: 'block', marginBottom: 20 }}>
            VALUES SEALED
          </PixelText>

          {selectedCards.length > 0 && (
            <div
              style={{
                padding: C.padLg,
                background: C.goalGold + '10',
                border: `2px solid ${C.goalGold}40`,
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              {selectedCards.map((v) => (
                <div key={v.id} style={{ marginBottom: 6 }}>
                  <PixelText size={8} color={C.goalGold}>
                    {v.icon} {v.text}
                  </PixelText>
                </div>
              ))}
            </div>
          )}

          {freeText.trim() && (
            <div
              style={{
                padding: 14,
                background: C.cardBg,
                border: `2px solid ${C.mutedBorder}`,
                borderRadius: 6,
                marginBottom: 12,
                textAlign: 'left',
              }}
            >
              <PixelText size={7} color={C.grayLt} style={{ display: 'block', marginBottom: 4 }}>
                IN YOUR WORDS:
              </PixelText>
              <PixelText
                size={8}
                color={C.cream}
                style={{ display: 'block', lineHeight: 1.7, fontStyle: 'italic' }}
              >
                "{freeText.trim()}"
              </PixelText>
            </div>
          )}

          <DialogBox speaker="DARA">
            <ValuesTypewriterText
              text={`You chose these with your heart, ${heroName}. That's what makes them unshakable.

When the Shadow tries to make
you forget why you started —
and it will — these are what
you come back to.

You are already stronger than
you think. These values prove it.
They will guide you in the darkness.`}
            />
          </DialogBox>

          <PixelBtn
            onClick={() => onComplete(selectedCards, freeText.trim())}
            color={C.gold}
            textColor={C.charcoal}
            style={{ width: '100%', marginTop: 12 }}
          >
            SHOW ME HOW →
          </PixelBtn>
        </div>
      )}
    </div>
  );
}
