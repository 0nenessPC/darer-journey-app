import React from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';

export function PixelText({ children, size = 10, color = C.cream, style = {} }) {
  return <span style={{ fontFamily: PIXEL_FONT, fontSize: size, color, lineHeight: 1.6, ...style }}>{children}</span>;
}

export function PixelBtn({ children, onClick, color = C.plum, textColor = C.cream, disabled, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: PIXEL_FONT, fontSize: 10, padding: "12px 20px",
      background: disabled ? C.grayLt : color, color: disabled ? C.gray : textColor,
      border: `3px solid ${disabled ? C.gray : (color === C.plum ? C.mutedBorder : C.goldBtnShadow)}`,
      borderRadius: 4, cursor: disabled ? "default" : "pointer",
      boxShadow: disabled ? "none" : `0 4px 0 ${color === C.plum ? C.plumBtnShadow : C.goldBtnShadow}`,
      transition: "transform 0.1s", imageRendering: "pixelated", ...style,
    }}>{children}</button>
  );
}

export function HPBar({ current, max, width = "100%", height = 12, label }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? C.hpGreen : pct > 25 ? C.amber : C.hpRed;
  return (
    <div style={{ width }}>
      {label && <PixelText size={8} color={C.grayLt}>{label}</PixelText>}
      <div style={{ height, background: C.cardBg, borderRadius: 2, border: `2px solid ${C.mutedBorder}`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, transition: "width 0.6s ease", imageRendering: "pixelated" }} />
      </div>
    </div>
  );
}

export function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0,1,2].map(i => <span key={i} style={{
        width: 6, height: 6, borderRadius: "50%", background: C.plumMd,
        animation: `bop 1s ease-in-out ${i*0.15}s infinite`,
      }} />)}
      <style>{`@keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </span>
  );
}

export function DialogBox({ speaker, text, typing, children }) {
  return (
    <div style={{
      background: C.cardBg, border: `3px solid ${C.mutedBorder}`, borderRadius: 6,
      padding: "12px 14px", marginBottom: 10,
    }}>
      {speaker && <div style={{ marginBottom: 4 }}><PixelText size={7} color={C.goldMd}>{speaker}</PixelText></div>}
      {text && <PixelText size={8} color={C.cream} style={{ display: "block", whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{text}</PixelText>}
      {typing && <TypingDots />}
      {children}
    </div>
  );
}

export function OnboardingProgress({ screen }) {
  const ONBOARDING = [
    { key: "intro", label: "Story" },
    { key: "character", label: "Hero" },
    { key: "values", label: "Values" },
    { key: "shadowLore", label: "Shadow Lore" },
    { key: "psychoed", label: "Learn" },
    { key: "shadowLorePost", label: "Shadow Lore" },
    { key: "intake", label: "Intake" },
    { key: "shadowReveal", label: "Reveal" },
    { key: "darerStrategy", label: "DARER STRATEGY" },
    { key: "armoryIntro", label: "Armory" },
    { key: "tutorial", label: "Training" },
  ];
  const idx = ONBOARDING.findIndex(s => s.key === screen);
  if (idx === -1) return null;
  const pct = ((idx + 1) / ONBOARDING.length) * 100;
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 200,
      background: C.cardBg, borderBottom: `2px solid ${C.mutedBorder}`,
      padding: "8px 12px 6px",
      boxSizing: "border-box",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
      }}>
        <PixelText size={7} color={C.goldMd}>STEP {idx + 1}/{ONBOARDING.length}</PixelText>
        <PixelText size={7} color={C.grayLt}>{ONBOARDING[idx].label.toUpperCase()}</PixelText>
      </div>
      <div style={{ height: 4, background: C.mapBg, borderRadius: 2, border: `1px solid ${C.mutedBorder}`, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: C.plumMd, transition: "width 0.3s ease" }} />
      </div>
    </div>
  );
}
