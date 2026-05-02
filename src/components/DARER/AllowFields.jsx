import React from 'react';
import { C, PIXEL_FONT } from '../../constants/gameData';
import { PixelText, PixelBtn, DialogBox } from '../../components/shared';

/**
 * Shared ALLOW phase — 6-field sequential Storm interrogation form.
 * Fields appear progressively: thoughts → likelihood → severity → canHandle → fearShowing → body.
 * Submit button is disabled until all 6 fields are filled.
 */
export default function AllowFields({
  allowFearful, setAllowFearful,
  allowLikelihood, setAllowLikelihood,
  allowSeverity, setAllowSeverity,
  allowCanHandle, setAllowCanHandle,
  allowFearShowing, setAllowFearShowing,
  allowPhysicalSensations, setAllowPhysicalSensations,
  allowCustomSensation, setAllowCustomSensation,
  onComplete,
}) {
  const allDone = allowFearful.trim() && allowLikelihood !== null && allowSeverity !== null
    && allowCanHandle && allowFearShowing && allowPhysicalSensations.length > 0;

  return (
    <>
      <DialogBox speaker="DARA">
        <PixelText size={8} color={C.cream} style={{ display: "block", lineHeight: 1.8 }}>
          Close your eyes. Imagine{"\n"}yourself stepping into this{"\n"}battle.{"\n"}{"\n"}
          The Storm will speak — let{"\n"}it. Name every whisper, every{"\n"}signal your body sends.{"\n"}Don't fight them. Let them be.
        </PixelText>
      </DialogBox>

      {/* ALLOW progress dots — 6 fields */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16 }}>
        {[
          { label: "Thoughts", done: !!allowFearful.trim() },
          { label: "Likelihood", done: allowLikelihood !== null },
          { label: "Severity", done: allowSeverity !== null },
          { label: "Can Handle", done: !!allowCanHandle },
          { label: "Fear Showing", done: !!allowFearShowing },
          { label: "Body", done: allowPhysicalSensations.length > 0 },
        ].map((f, i) => {
          const prevDone = i === 0 ? true : (
            i === 1 ? !!allowFearful.trim() :
            i === 2 ? allowLikelihood !== null :
            i === 3 ? allowSeverity !== null :
            i === 4 ? !!allowCanHandle :
            !!allowFearShowing
          );
          const isCurrent = prevDone && !f.done;
          const isDone = f.done;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <div style={{
                width: 10, height: 10, borderRadius: "50%",
                background: isDone ? C.hpGreen : isCurrent ? C.goldMd : C.mutedBorder,
                border: isCurrent ? `2px solid ${C.goldMd}` : "2px solid transparent",
                transition: "all 0.3s ease",
              }} />
              <PixelText size={5} color={isDone ? C.hpGreen : isCurrent ? C.goldMd : C.subtleText}>{f.label}</PixelText>
            </div>
          );
        })}
      </div>

      {/* 1. Fearful thoughts */}
      <div style={{ marginTop: 16 }}>
        <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 4 }}>
          WHAT DOES THE SHADOW WHISPER?
        </PixelText>
        <PixelText size={7} color={C.subtleText} style={{ display: "block", marginBottom: 8, fontStyle: "italic" }}>
          What are your fearful thoughts?
        </PixelText>
        <textarea
          value={allowFearful}
          onChange={e => setAllowFearful(e.target.value)}
          placeholder="e.g. They'll think I'm weird. I'll embarrass myself..."
          rows={3}
          style={{
            width: "100%", minHeight: 70, padding: 10,
            background: C.cardBg, border: `2px solid ${C.mutedBorder}`,
            borderRadius: 4, color: C.cream, fontSize: 12,
            fontFamily: PIXEL_FONT, outline: "none", resize: "none",
            lineHeight: 1.6, boxSizing: "border-box",
          }}
        />
      </div>

      {/* 2. Likelihood */}
      {allowFearful.trim() && (
        <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
            HOW LIKELY IS THE FEAR COME TRUE?
          </PixelText>
          {(() => {
            const pct = allowLikelihood ?? 50;
            const color = pct <= 33 ? C.hpGreen : pct <= 66 ? C.amber : C.bossRed;
            return (
              <div>
                <input type="range" min="0" max="100" value={pct} onChange={e => setAllowLikelihood(+e.target.value)}
                  aria-label="How likely do you think this fear is" style={{ width: "100%", accentColor: color }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <PixelText size={6} color={C.subtleText}>Won't happen</PixelText>
                  <PixelText size={9} color={color}>{pct}%</PixelText>
                  <PixelText size={6} color={C.subtleText}>Certain</PixelText>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 3. Severity */}
      {allowLikelihood !== null && (
        <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
            HOW BAD WOULD IT BE IF IT HAPPENED?
          </PixelText>
          {(() => {
            const sev = allowSeverity ?? 5;
            const color = sev <= 3 ? C.hpGreen : sev <= 6 ? C.amber : C.bossRed;
            return (
              <div>
                <input type="range" min="0" max="10" value={sev} onChange={e => setAllowSeverity(+e.target.value)}
                  aria-label="How severe would it feel" style={{ width: "100%", accentColor: color }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <PixelText size={6} color={C.subtleText}>Mild</PixelText>
                  <PixelText size={9} color={color}>{sev} / 10</PixelText>
                  <PixelText size={6} color={C.subtleText}>Devastating</PixelText>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 4. Can I handle it? */}
      {allowSeverity !== null && (
        <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
            COULD YOU HANDLE IT IF IT HAPPENED?
          </PixelText>
          {["Yes — I'd get through it", "I'm not sure, but I think so", "I don't know if I could"].map(opt => (
            <button key={opt} onClick={() => setAllowCanHandle(opt)} style={{
              display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
              borderRadius: 4, border: `2px solid ${allowCanHandle === opt ? C.teal : C.mutedBorder}`,
              background: allowCanHandle === opt ? C.teal + "20" : C.cardBg,
              cursor: "pointer", textAlign: "left",
            }}>
              <PixelText size={7} color={allowCanHandle === opt ? C.teal : C.grayLt}>{opt}</PixelText>
            </button>
          ))}
        </div>
      )}

      {/* 5. Is FEAR showing up? */}
      {allowCanHandle && (
        <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.bossRed} style={{ display: "block", marginBottom: 8 }}>
            IS FEAR SHOWING UP RIGHT NOW?
          </PixelText>
          {["Yes — the Shadow is loud", "A little — a faint whisper", "Not really — it's quiet for now"].map(opt => (
            <button key={opt} onClick={() => setAllowFearShowing(opt)} style={{
              display: "block", width: "100%", marginBottom: 6, padding: "10px 14px",
              borderRadius: 4, border: `2px solid ${allowFearShowing === opt ? C.bossRed : C.mutedBorder}`,
              background: allowFearShowing === opt ? C.bossRed + "20" : C.cardBg,
              cursor: "pointer", textAlign: "left",
            }}>
              <PixelText size={7} color={allowFearShowing === opt ? C.bossRed : C.grayLt}>{opt}</PixelText>
            </button>
          ))}
        </div>
      )}

      {/* 6. Physical sensations */}
      {allowFearShowing && (
        <div style={{ marginTop: 16, animation: "fadeIn 0.3s ease-out" }}>
          <PixelText size={7} color={C.hpGreen} style={{ display: "block", marginBottom: 8 }}>
            WHAT DOES YOUR BODY FEEL?
          </PixelText>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Racing heart 💓", "Sweaty palms 💦", "Tight chest 🫁", "Shaking 🫨", "Nausea 🤢", "Hot flushes 🔥", "Dizzy 😵", "Dry mouth 👄", "Nothing significant — my body feels fine 🧘"].map(s => {
              const picked = allowPhysicalSensations.includes(s);
              return (
                <button key={s} onClick={() => {
                  setAllowPhysicalSensations(prev =>
                    picked ? prev.filter(x => x !== s) : [...prev, s]
                  );
                }} style={{
                  padding: "6px 10px", borderRadius: 4,
                  border: `2px solid ${picked ? C.teal : C.mutedBorder}`,
                  background: picked ? C.teal + "20" : C.cardBg,
                  cursor: "pointer",
                }}>
                  <PixelText size={6} color={picked ? C.teal : C.grayLt}>{s}</PixelText>
                </button>
              );
            })}
          </div>
          <input
            value={allowCustomSensation}
            onChange={e => setAllowCustomSensation(e.target.value)}
            placeholder="Or describe another sensation..."
            style={{
              width: "100%", padding: C.padSm, marginTop: 8,
              background: C.cardBg, border: `2px solid ${C.mutedBorder}`,
              borderRadius: 4, color: C.cream, fontSize: 11,
              fontFamily: PIXEL_FONT, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>
      )}

      <PixelBtn
        onClick={onComplete}
        disabled={!allDone}
        color={C.gold} textColor={C.charcoal}
        style={{ width: "100%", marginTop: 16 }}
      >
        I'M ALLOWING IT → NEXT: RISE
      </PixelBtn>
    </>
  );
}
