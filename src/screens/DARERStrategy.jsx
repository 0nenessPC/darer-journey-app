import { useState } from "react";
import { C, PIXEL_FONT, FONT_LINK } from "../constants/gameData";
import { PixelText, PixelBtn, DialogBox } from "../components/shared";
import { parseShadowSection } from "../utils/parseShadow.js";

function ShadowSide({ children }) {
  return (
    <div style={{ background: C.bossRed + "0A", border: `1.5px solid ${C.bossRed}30`, borderRadius: 8, padding: "14px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>💀</span>
        <PixelText size={6} color={C.bossRed} style={{ letterSpacing: 2 }}>THE SHADOW'S TRICK</PixelText>
      </div>
      {children}
    </div>
  );
}

function DARERSide({ children }) {
  return (
    <div style={{ background: C.hpGreen + "0A", border: `1.5px solid ${C.hpGreen}30`, borderRadius: 8, padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 12 }}>⚔️</span>
        <PixelText size={6} color={C.hpGreen} style={{ letterSpacing: 2 }}>THE DARER'S STRATEGY</PixelText>
      </div>
      {children}
    </div>
  );
}

function VSdivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "4px 0" }}>
      <div style={{ flex: 1, height: 1, background: "#5C3A5040" }} />
      <PixelText size={7} color={C.goldMd} style={{ margin: "0 10px" }}>VS</PixelText>
      <div style={{ flex: 1, height: 1, background: "#5C3A5040" }} />
    </div>
  );
}

export default function DARERStrategy({ heroName, shadowText, heroValues, onContinue }) {
  const [step, setStep] = useState(0);
  const valueName = heroValues?.[0]?.word || heroValues?.[0]?.text || "the life you want";

  const territory = parseShadowSection("WHERE IT APPEARS", shadowText);
  const storm = parseShadowSection("WHAT IT WHISPERS", shadowText);
  const escape = parseShadowSection("HOW IT KEEPS ITS GRIP", shadowText);

  const slides = [
    // Slide 0: Intro
    { render: () => (
      <div>
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>⚔️</div>
        <PixelText size={11} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>THE DARER STRATEGY</PixelText>
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.9 }}>
            {heroName}, you've already{"\n"}seen the Shadow's trap. You{"\n"}know what you're fighting for.{"\n"}{"\n"}
            Now let's look at how you{"\n"}break it.{"\n"}{"\n"}
            Every trick the Shadow uses{"\n"}has a counter. The D.A.R.E.R.{"\n"}path was built to break each{"\n"}one.{"\n"}{"\n"}
            Here are your strategies.
          </PixelText>
        </DialogBox>
      </div>
    )},
    // Slide 1: Territory vs DECIDE + RISE
    { render: () => (
      <div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>
          📍 TERRITORY vs EXPOSURE
        </PixelText>
        <ShadowSide>
          <PixelText size={8} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>THE SHADOW'S TERRITORY</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            The Shadow claims places as{"\n"}dangerous. Over time, more places{"\n"}become off-limits.{"\n"}
            {territory ? `\nYour Shadow's territory: ${territory.length > 80 ? territory.slice(0, 80) + "..." : territory}` : ""}
          </PixelText>
        </ShadowSide>
        <VSdivider />
        <DARERSide>
          <PixelText size={8} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>DECIDE + RISE</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            You DECIDE which territory to{"\n"}reclaim — then RISE into it.{"\n"}{"\n"}
            Every time you enter the{"\n"}Shadow's territory and survive,{"\n"}your brain learns: "This place{"\n"}is not actually dangerous."{"\n"}{"\n"}
            The territory shrinks. Your{"\n"}world grows.
          </PixelText>
        </DARERSide>
      </div>
    )},
    // Slide 2: Inner Storm vs ALLOW
    { render: () => (
      <div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>
          🌀 INNER STORM vs ALLOW
        </PixelText>
        <ShadowSide>
          <PixelText size={8} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>THE INNER STORM</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            The Storm hits with whispers{"\n"}and body alarm — telling you{"\n"}something terrible will happen.{"\n"}It wants you to believe the{"\n"}feelings ARE the danger.{"\n"}
            {storm ? `\nYour Storm: ${storm.length > 80 ? storm.slice(0, 80) + "..." : storm}` : ""}
          </PixelText>
        </ShadowSide>
        <VSdivider />
        <DARERSide>
          <PixelText size={8} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>ALLOW</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            You ALLOW the Storm to be there{"\n"}without obeying it.{"\n"}{"\n"}
            The racing heart, the thoughts —{"\n"}they are passengers, not drivers.{"\n"}You don't fight them. You don't{"\n"}run. You let them ride along.{"\n"}{"\n"}
            The Storm passes. It always does.{"\n"}And each time, it gets quieter.
          </PixelText>
        </DARERSide>
      </div>
    )},
    // Slide 3: The Escape vs ENGAGE
    { render: () => (
      <div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 10 }}>
          🏃 ESCAPE vs ENGAGE
        </PixelText>
        <ShadowSide>
          <PixelText size={8} color={C.bossRed} style={{ display: "block", marginBottom: 6 }}>THE ESCAPE</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            Every escape brings relief — but{"\n"}feeds the Shadow. Avoidance,{"\n"}safety behaviors, leaving early.{"\n"}Each one tells your brain the{"\n"}threat was real.{"\n"}
            {escape ? `\nYour escapes: ${escape.length > 80 ? escape.slice(0, 80) + "..." : escape}` : ""}
          </PixelText>
        </ShadowSide>
        <VSdivider />
        <DARERSide>
          <PixelText size={8} color={C.hpGreen} style={{ display: "block", marginBottom: 6 }}>ENGAGE + REPEAT</PixelText>
          <PixelText size={7} color={C.cream} style={{ display: "block", lineHeight: 1.7 }}>
            You ENGAGE fully instead of{"\n"}checking out. You stay present{"\n"}in the moment — the conversation,{"\n"}the room, the person.{"\n"}{"\n"}
            Then you REPEAT. Each time you{"\n"}stay, the Shadow's grip loosens.{"\n"}What used to be terrifying becomes{"\n"}tolerable, then normal, then{"\n"}yours again.
          </PixelText>
        </DARERSide>
      </div>
    )},
    // Slide 4: Summary
    { render: () => (
      <div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🛡</div>
        <PixelText size={10} color={C.goldMd} style={{ display: "block", marginBottom: 12 }}>
          THE DARER'S STRATEGY
        </PixelText>
        <div style={{ background: C.hpGreen + "08", border: `1.5px solid ${C.hpGreen}25`, borderRadius: 8, padding: 14, marginBottom: 12 }}>
          {[
            { letter: "D", word: "DECIDE", desc: "Choose to face the Shadow's territory" },
            { letter: "A", word: "ALLOW", desc: "Let the Storm be there — don't fight it" },
            { letter: "R", word: "RISE", desc: "Step into the territory, Storm and all" },
            { letter: "E", word: "ENGAGE", desc: "Be fully present — no escape, no checking out" },
            { letter: "R", word: "REPEAT", desc: "Do it again. The Shadow weakens every time" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < 4 ? "1px solid #5C3A5025" : "none" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 4,
                background: C.goldMd + "20", border: `1.5px solid ${C.goldMd}60`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PixelText size={10} color={C.goldMd}>{item.letter}</PixelText>
              </div>
              <div>
                <PixelText size={7} color={C.hpGreen}>{item.word}</PixelText>
                <div><PixelText size={6} color={C.cream}>{item.desc}</PixelText></div>
              </div>
            </div>
          ))}
        </div>
        <DialogBox speaker="DARA">
          <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
            Each letter is a strategy against{"\n"}a specific Shadow trick. Together{"\n"}they break the Infinite Trap.{"\n"}{"\n"}
            {heroName}, you now know your enemy{"\n"}AND your strategies. But every{"\n"}DARER needs tools to steady{"\n"}themselves when the Storm hits.{"\n"}{"\n"}Let me show you the Armory.
          </PixelText>
        </DialogBox>
      </div>
    )},
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.mapBg, padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", overflowY: "auto" }}>
      <link href={FONT_LINK} rel="stylesheet" />
      <div key={step} style={{ animation: "fadeIn 0.5s ease-out", maxWidth: 380, width: "100%" }}>
        {slides[step].render()}
      </div>
      <div style={{ display: "flex", gap: 6, margin: "16px 0" }}>
        {slides.map((_, i) => <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? C.goldMd : "#5C3A50", transition: "all 0.3s" }} />)}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && <PixelBtn onClick={() => setStep(s => s - 1)} color={C.plum}>← BACK</PixelBtn>}
        <PixelBtn onClick={() => step < slides.length - 1 ? setStep(s => s + 1) : onContinue()} color={step === slides.length - 1 ? C.gold : C.plum} textColor={step === slides.length - 1 ? C.charcoal : C.cream}>
          {step === slides.length - 1 ? "ENTER THE ARMORY →" : "NEXT"}
        </PixelBtn>
      </div>

    </div>
  );
}
