import React, { useState, useEffect, useRef } from 'react';
import { C, PIXEL_FONT, FONT_LINK } from '../constants/gameData';
import { PixelText, PixelBtn, HPBar } from '../components/shared';
export default function ValuesScreen({ heroName, onComplete }) {
  const [step, setStep] = useState("intro");
  const [values, setValues] = useState([]);
  const [freeText, setFreeText] = useState("");
  const [guideStep, setGuideStep] = useState(0);
  const [guideAnswers, setGuideAnswers] = useState(["", "", ""]);
  const [generatedValues, setGeneratedValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [allCards, setAllCards] = useState(null);

  // Outcome-oriented values informed by Behavioral Activation life areas
  // (Lejuez et al., BATD-R) and DBT Wise Mind Values (Linehan/Rathus & Miller, 2015)
  // Weighted toward social/relational domains for social anxiety population
  const DEFAULT_CARDS = [
    { id: "v1", text: "Reach out and build new friendships", icon: "🤝", domain: "friendships" },
    { id: "v2", text: "Feel a sense of belonging in a group", icon: "💜", domain: "friendships" },
    { id: "v3", text: "Show the people I love how much they mean to me", icon: "❤️", domain: "intimacy" },
    { id: "v4", text: "Spend quality time with people I care about", icon: "🔥", domain: "friendships" },
    { id: "v5", text: "Be someone others can trust and count on", icon: "🌟", domain: "friendships" },
    { id: "v6", text: "Open up and let people really know me", icon: "🤗", domain: "intimacy" },
    { id: "v7", text: "Speak up and share what I think and feel", icon: "🗣", domain: "expression" },
    { id: "v8", text: "Share my ideas confidently at work or school", icon: "💡", domain: "employment" },
    { id: "v9", text: "Enjoy social events without dreading them", icon: "🎉", domain: "friendships" },
    { id: "v10", text: "Take on challenges that help me grow", icon: "🏔", domain: "growth" },
    { id: "v11", text: "Be respected and confident at work or school", icon: "⭐", domain: "achievement" },
    { id: "v12", text: "Contribute and help people around me", icon: "🌍", domain: "community" },
  ];

  const VALUE_CARDS = allCards || DEFAULT_CARDS;

  // Guided exploration prompts (inspired by DBT values experiments, Rathus & Miller 2015)
  const GUIDE_PROMPTS = [
    { question: "Imagine someone is telling the story of your best moments with other people — your highlights in social life. What would they describe?", hint: "A time you connected with someone, made a friend laugh, felt like you belonged, or showed up as the real you..." },
    { question: "Think about someone whose social life you admire. What is it about the way they connect with others that you wish you had?", hint: "Maybe they're effortlessly warm, or they speak their mind, or they walk into any room like they belong..." },
    { question: "If the Shadow vanished tomorrow and fear no longer controlled how you showed up around people — what would change?", hint: "Who would you reach out to? What would you say yes to? How would your relationships be different?" },
  ];

  const updateGuideAnswer = (text) => {
    setGuideAnswers(prev => { const next = [...prev]; next[guideStep] = text; return next; });
  };

  const generateValuesFromAnswers = async () => {
    setLoadingValues(true);
    try {
      const combined = guideAnswers.filter(a => a.trim()).join(". ");
      const res = await callAI(
        `You are a values counselor for a social anxiety RPG game. Based on what the user shared about what matters to them, generate exactly 3 personalized value statements. Each should be an outcome-oriented value (what they want in life, not how they want to behave). Keep each to 8 words or fewer. Return ONLY a JSON array like: [{"text":"value text","icon":"emoji"}]. No other text.`,
        [{ role: "user", text: `Here is what the user shared:\n1. Social highlights: "${guideAnswers[0]}"\n2. Social qualities they admire: "${guideAnswers[1]}"\n3. What they'd do without fear: "${guideAnswers[2]}"` }]
      );
      const jsonMatch = res.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const newCards = parsed.slice(0, 3).map((v, i) => ({
            id: "vg" + i, text: v.text, icon: v.icon || "💫", domain: "personal", generated: true,
          }));
          setGeneratedValues(newCards);
          setAllCards([...newCards, ...DEFAULT_CARDS]);
          setValues([]);
          setStep("cards");
        } else { setStep("cards"); }
      } else { setStep("cards"); }
    } catch (e) { setStep("cards"); }
    setLoadingValues(false);
  };

  const toggleValue = (v) => {
    setValues(prev => prev.includes(v.id) ? prev.filter(x => x !== v.id) : prev.length < 5 ? [...prev, v.id] : prev);
  };

  const selectedCards = VALUE_CARDS.filter(v => values.includes(v.id));

  return (
    <div style={{
      minHeight: "100vh", background: C.mapBg, padding: "20px 20px 32px",
      overflowY: "auto",
    }}>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* INTRO — Dara asks the question */}
      {step === "intro" && (
        <div style={{ animation: "fadeIn 0.6s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏰</div>
            <PixelText size={11} color={C.goalGold} style={{ display: "block", marginBottom: 8 }}>
              WHY BECOME A DARER?
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
              {heroName}, before we step onto{"\n"}this journey — one that will be{"\n"}rocky, and at times filled with{"\n"}pain and challenges — it is{"\n"}important to ask ourselves and{"\n"}connect with something deeper.{"\n"}{"\n"}
              Why are you here?{"\n"}What motivates you to start{"\n"}this journey?{"\n"}What is worth fighting for?{"\n"}{"\n"}
              This isn't about goals you{"\n"}"should" have. This is about{"\n"}what truly matters to your heart.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setStep("cards")} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            LET ME SHOW YOU →
          </PixelBtn>
        </div>
      )}

      {/* CARDS — Select values that resonate */}
      {step === "cards" && (
        <div style={{ animation: "fadeIn 0.4s ease-out" }}>
          <PixelText size={10} color={C.goalGold} style={{ display: "block", textAlign: "center", marginBottom: 6 }}>
            WHAT MATTERS MOST?
          </PixelText>
          <PixelText size={7} color={C.grayLt} style={{ display: "block", textAlign: "center", marginBottom: 16 }}>
            Choose up to 5 that speak to you.
          </PixelText>

          {/* Dara's picks label — only if generated values exist */}
          {generatedValues.length > 0 && (
            <PixelText size={7} color={C.plumMd} style={{ display: "block", marginBottom: 8 }}>
              ✨ DARA'S PICKS FOR YOU
            </PixelText>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {VALUE_CARDS.map((v, i) => {
              const active = values.includes(v.id);
              const isGenerated = v.generated;
              const showDivider = generatedValues.length > 0 && i === generatedValues.length;
              return (
                <div key={v.id} style={{ display: "contents" }}>
                  {showDivider && (
                    <div style={{ gridColumn: "1 / -1", padding: "8px 0 4px" }}>
                      <PixelText size={7} color={C.grayLt}>ALL VALUES</PixelText>
                    </div>
                  )}
                  <button onClick={() => toggleValue(v)} style={{
                    padding: "14px 10px",
                    background: active ? C.goalGold + "15" : isGenerated ? C.plumMd + "08" : "#1A1218",
                    border: `2px solid ${active ? C.goalGold : isGenerated ? C.plumMd + "60" : "#5C3A50"}`,
                    borderRadius: 6, cursor: "pointer", textAlign: "center",
                    boxShadow: active ? `0 0 12px ${C.goalGold}20` : isGenerated ? `0 0 8px ${C.plumMd}15` : "none",
                    transition: "all 0.2s",
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{v.icon}</div>
                    <PixelText size={7} color={active ? C.goalGold : isGenerated ? C.plumMd : C.grayLt}>
                      {v.text}
                    </PixelText>
                    {isGenerated && !active && (
                      <div style={{ marginTop: 4 }}><PixelText size={5} color={C.plumMd}>SUGGESTED</PixelText></div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {values.length >= 2 && (
            <PixelBtn onClick={() => setStep("seal")} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
              THESE MATTER TO ME →
            </PixelBtn>
          )}
          {values.length < 2 && (
            <div style={{ textAlign: "center" }}>
              <PixelText size={7} color={C.grayLt}>Select at least 2 values</PixelText>
            </div>
          )}
          <button onClick={() => setStep("guide")} style={{
            display: "block", margin: "12px auto 0", background: "none", border: "none", cursor: "pointer",
          }}>
            <PixelText size={7} color={C.plumMd}>I need help finding my values →</PixelText>
          </button>
        </div>
      )}

      {/* GUIDED EXPLORATION — collect answers, then AI generates values */}
      {step === "guide" && (
        <div style={{ animation: "fadeIn 0.4s ease-out" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🧚</div>
            <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 4 }}>
              LET'S FIND YOURS
            </PixelText>
            <PixelText size={7} color={C.grayLt} style={{ display: "block" }}>
              {guideStep + 1} of {GUIDE_PROMPTS.length}
            </PixelText>
          </div>

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              {GUIDE_PROMPTS[guideStep].question}
            </PixelText>
            <div style={{ marginTop: 8 }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", lineHeight: 1.6 }}>
                {GUIDE_PROMPTS[guideStep].hint}
              </PixelText>
            </div>
          </DialogBox>

          <textarea
            value={guideAnswers[guideStep]}
            onChange={e => updateGuideAnswer(e.target.value)}
            placeholder="What comes to mind..."
            rows={3}
            style={{
              width: "100%", padding: 12, marginTop: 12,
              background: "#1A1218", border: "2px solid #5C3A50",
              borderRadius: 4, color: C.cream, fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              outline: "none", resize: "none", boxSizing: "border-box",
            }}
          />

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {guideStep < GUIDE_PROMPTS.length - 1 ? (
              <PixelBtn onClick={() => setGuideStep(g => g + 1)} disabled={!guideAnswers[guideStep].trim()} color={C.plum} style={{ flex: 1 }}>
                NEXT QUESTION →
              </PixelBtn>
            ) : (
              <PixelBtn onClick={generateValuesFromAnswers} disabled={!guideAnswers[guideStep].trim() || loadingValues} color={C.gold} textColor={C.charcoal} style={{ flex: 1 }}>
                {loadingValues ? "DARA IS REFLECTING..." : "DISCOVER MY VALUES →"}
              </PixelBtn>
            )}
          </div>

          {guideStep > 0 && (
            <button onClick={() => setGuideStep(g => g - 1)} style={{
              display: "block", margin: "10px auto", background: "none", border: "none", cursor: "pointer",
            }}>
              <PixelText size={6} color={C.grayLt}>← Previous question</PixelText>
            </button>
          )}

          <button onClick={() => setStep("cards")} style={{
            display: "block", margin: "8px auto", background: "none", border: "none", cursor: "pointer",
          }}>
            <PixelText size={6} color={C.grayLt}>Back to value cards</PixelText>
          </button>
        </div>
      )}

      {/* SEAL — Values confirmed, Dara closes */}
      {step === "seal" && (
        <div style={{ animation: "fadeIn 0.6s ease-out", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
          <PixelText size={11} color={C.goalGold} style={{ display: "block", marginBottom: 20 }}>
            VALUES SEALED
          </PixelText>

          {selectedCards.length > 0 && (
            <div style={{
              padding: 16, background: C.goalGold + "10", border: `2px solid ${C.goalGold}40`,
              borderRadius: 6, marginBottom: 12,
            }}>
              {selectedCards.map(v => (
                <div key={v.id} style={{ marginBottom: 6 }}>
                  <PixelText size={8} color={C.goalGold}>{v.icon} {v.text}</PixelText>
                </div>
              ))}
            </div>
          )}

          {freeText.trim() && (
            <div style={{
              padding: 14, background: "#1A1218", border: "2px solid #5C3A50",
              borderRadius: 6, marginBottom: 12, textAlign: "left",
            }}>
              <PixelText size={7} color={C.grayLt} style={{ display: "block", marginBottom: 4 }}>IN YOUR WORDS:</PixelText>
              <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.7, fontStyle: "italic" }}>
                "{freeText.trim()}"
              </PixelText>
            </div>
          )}

          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              Remember these, {heroName}.{"\n"}When the Shadow tries to make{"\n"}you forget why you started —{"\n"}and it will — these are what{"\n"}you come back to.{"\n"}{"\n"}
              Now I know what you're fighting{"\n"}for. Let's find out what you're{"\n"}fighting against.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => onComplete(selectedCards, freeText.trim())} color={C.gold} textColor={C.charcoal} style={{ width: "100%", marginTop: 12 }}>
            FACE THE SHADOW →
          </PixelBtn>
        </div>
      )}


    </div>
  );
}

