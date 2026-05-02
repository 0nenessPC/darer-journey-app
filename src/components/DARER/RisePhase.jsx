import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText, PixelBtn, DialogBox } from '../../components/shared';
import PracticeSession from '../../components/PracticeSession';
import SUDSSlider from './SUDSSlider';

/**
 * Shared RISE (prepare + observe) phase — 4 sub-steps:
 * 0. WHEN + TIME + WHERE + calendar reminder
 * 1. Armory tool selection
 * 2. Practice prompt (YES/SKIP)
 * 2.5. PracticeSession running
 * 3. SUDS before
 */
export default function RisePhase({
  riseSubStep, setRiseSubStep,
  exposureWhen, setExposureWhen,
  exposureScheduledTime, setExposureScheduledTime,
  exposureWhere, setExposureWhere,
  exposureArmory, setExposureArmory,
  selectedArmoryTool, setSelectedArmoryTool,
  hero,
  sudsValue, setSudsValue,
  onNext,
  showBackButton, onBack,
  calendarParams,
}) {
  const buildCalendarUrl = () => {
    const dt = exposureScheduledTime
      ? new Date(new Date().toDateString() + ' ' + exposureScheduledTime)
      : new Date(Date.now() + 60 * 60 * 1000);
    const title = encodeURIComponent(calendarParams.title);
    const desc = encodeURIComponent(calendarParams.desc);
    const startStr = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endStr = new Date(dt.getTime() + 30 * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&dates=${startStr}/${endStr}`;
  };

  return (
    <div style={{ animation: "fadeIn 0.4s ease-out" }}>
      {/* Sub-step 0: WHEN + TIME + WHERE */}
      {riseSubStep === 0 && (
        <div>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              Before you step into the arena —{"\n"}tell me when and where you'll{"\n"}face this battle.
            </PixelText>
          </DialogBox>

          {/* WHEN */}
          <div style={{ marginTop: 14 }}>
            <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>📅 WHEN</PixelText>
            {[
              "Today — as soon as I'm ready",
              "Later today — within a few hours",
              "Tomorrow — I'll plan it in",
              "Within the next 3 days",
              "This week — I'll pick a day",
            ].map(opt => (
              <button key={opt} onClick={() => setExposureWhen(opt)} style={{
                display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
                borderRadius: 4, border: `2px solid ${exposureWhen === opt ? C.teal : C.mutedBorder}`,
                background: exposureWhen === opt ? C.teal + "20" : C.cardBg,
                cursor: "pointer", textAlign: "left",
              }}>
                <PixelText size={7} color={exposureWhen === opt ? C.teal : C.grayLt}>{opt}</PixelText>
              </button>
            ))}
          </div>

          {/* TIME */}
          {exposureWhen && (
            <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
              <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>⏰ WHAT TIME</PixelText>
              <input
                type="time"
                value={exposureScheduledTime}
                onChange={e => setExposureScheduledTime(e.target.value)}
                style={{
                  width: "100%", padding: "10px 14px",
                  borderRadius: 4, border: `2px solid ${C.mutedBorder}`, background: C.cardBg,
                  color: C.cream, fontFamily: "inherit", fontSize: 16, outline: "none",
                  boxSizing: "border-box", colorScheme: "dark",
                }}
              />
              <button
                onClick={() => window.open(buildCalendarUrl(), '_blank')}
                style={{
                  width: "100%", padding: "8px 14px", marginTop: 8,
                  background: C.teal, border: "none", borderRadius: 4, cursor: "pointer",
                }}
              >
                <PixelText size={7} color={C.charcoal}>📱 SET CALENDAR REMINDER →</PixelText>
              </button>
            </div>
          )}

          {/* WHERE */}
          <div style={{ marginTop: 16 }}>
            <PixelText size={7} color={C.goldMd} style={{ display: "block", marginBottom: 8 }}>📍 WHERE</PixelText>
            <button
              onClick={() => window.open("https://maps.google.com", "_blank")}
              style={{
                width: "100%", padding: "8px 12px", marginBottom: 8,
                background: "transparent", border: `1px dashed ${C.mutedBorder}`,
                borderRadius: 4, cursor: "pointer",
              }}
            >
              <PixelText size={6} color={C.plumMd}>🗺️ Open Google Maps to find your location →</PixelText>
            </button>
            <input
              type="text"
              placeholder="e.g. the coffee shop on Main St..."
              value={exposureWhere}
              onChange={e => setExposureWhere(e.target.value)}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                borderRadius: 4, border: `2px solid ${C.mutedBorder}`, background: C.cardBg,
                color: C.cream, fontFamily: "inherit", fontSize: 13, outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <PixelBtn
            onClick={() => setRiseSubStep(1)}
            disabled={!exposureWhen || !exposureWhere.trim()}
            color={C.gold} textColor={C.charcoal}
            style={{ width: "100%", marginTop: 16 }}
          >
            LOCK IT IN →
          </PixelBtn>
        </div>
      )}

      {/* Sub-step 1: ARMORY */}
      {riseSubStep === 1 && (
        <div>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              You've locked in your time and{"\n"}battlefield.{"\n"}{"\n"}
              Before you go — which tool{"\n"}from the Armory will you carry?{"\n"}Choose the one that steadies you.
            </PixelText>
          </DialogBox>
          <div style={{ marginTop: 14 }}>
            {(hero.armory || []).filter(t => t.unlocked).map(tool => (
              <button key={tool.id} onClick={() => { setExposureArmory(tool.name); setSelectedArmoryTool(tool); setRiseSubStep(2); }} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                borderRadius: 4, border: `2px solid ${exposureArmory === tool.name ? C.teal : C.mutedBorder}`,
                background: exposureArmory === tool.name ? C.teal + "20" : C.cardBg,
                cursor: "pointer", textAlign: "left",
              }}>
                <span style={{ fontSize: 18 }}>{tool.icon}</span>
                <PixelText size={7} color={exposureArmory === tool.name ? C.teal : C.grayLt}>{tool.name}</PixelText>
              </button>
            ))}
            <button onClick={() => { setExposureArmory("I'll trust the strategy alone"); setSelectedArmoryTool(null); setRiseSubStep(3); }} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
              borderRadius: 4, border: `2px solid ${exposureArmory === "I'll trust the strategy alone" ? C.teal : C.mutedBorder}`,
              background: exposureArmory === "I'll trust the strategy alone" ? C.teal + "20" : C.cardBg,
              cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontSize: 18 }}>🗡️</span>
              <PixelText size={7} color={exposureArmory === "I'll trust the strategy alone" ? C.teal : C.grayLt}>I'll trust the strategy alone</PixelText>
            </button>
            {/* Locked tools preview */}
            {(hero.armory || []).filter(t => !t.unlocked).length > 0 && (
              <div style={{ marginTop: 12, opacity: 0.5 }}>
                {(hero.armory || []).filter(t => !t.unlocked).map(tool => (
                  <div key={tool.id} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", marginBottom: 6, padding: "10px 14px",
                    borderRadius: 4, border: `2px solid ${C.mutedBorder}40`, background: C.cardBg,
                    pointerEvents: "none",
                  }}>
                    <span style={{ fontSize: 18, filter: "grayscale(1)" }}>{tool.icon}</span>
                    <PixelText size={7} color={C.subtleText}>{tool.name} 🔒</PixelText>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-step 2: Practice prompt */}
      {riseSubStep === 2 && selectedArmoryTool && (
        <div>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              You've chosen your anchor.{"\n"}{"\n"}
              Want to practice this skill{"\n"}right now before the real{"\n"}battle? Just a few rounds{"\n"}to warm up.
            </PixelText>
          </DialogBox>

          <PixelBtn onClick={() => setRiseSubStep(2.5)} color={C.teal} textColor={C.cream} style={{ width: "100%", marginTop: 16 }}>
            YES — PRACTICE NOW →
          </PixelBtn>
          <PixelBtn onClick={() => setRiseSubStep(3)} color={C.plum} textColor={C.cream} style={{ width: "100%", marginTop: 8 }}>
            SKIP — I'M READY
          </PixelBtn>
        </div>
      )}

      {/* Sub-step 2.5: Practice session running */}
      {riseSubStep === 2.5 && selectedArmoryTool && (
        <div>
          <PracticeSession
            tool={selectedArmoryTool}
            onComplete={() => setRiseSubStep(3)}
            onQuit={() => setRiseSubStep(3)}
          />
        </div>
      )}

      {/* Sub-step 3: SUDs before */}
      {riseSubStep === 3 && (
        <div>
          <DialogBox speaker="DARA">
            <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
              You're armed and ready.{"\n"}{"\n"}
              One last thing before you{"\n"}step through — how intense is{"\n"}the Storm right now? Rate it{"\n"}honestly. There's no wrong answer.
            </PixelText>
          </DialogBox>
          <div style={{ margin: "12px 0" }}>
            <PixelText size={7} color={C.subtleText}>STORM INTENSITY (before):</PixelText>
            <SUDSSlider
              value={sudsValue}
              onChange={setSudsValue}
              label="STORM INTENSITY (before)"
              subtitle="How much distress do you feel right now?"
              ariaLabel="Distress level before exposure"
            />
          </div>
          <PixelBtn onClick={onNext} color={C.gold} textColor={C.charcoal} style={{ width: "100%" }}>
            LET'S GO →
          </PixelBtn>
          {showBackButton && (
            <button onClick={onBack} style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", display: "block", width: "100%", textAlign: "center" }}>
              <PixelText size={6} color={C.subtleText}>← Back</PixelText>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
