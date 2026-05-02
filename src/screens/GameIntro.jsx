import { useEffect } from "react";
import { C } from "../constants/gameData";
import { PixelText, PixelBtn } from "../components/shared.jsx";

function GameIntro({ onComplete, obState, setOBState }) {
  const slide = obState?.slide ?? 0;
  const setSlide = (v) => setOBState({ slide: typeof v === 'function' ? v(slide) : v });
  const slides = [
    { text: "For as long as anyone can\nremember, the Shadow of Fear\nhas ruled these lands.", sub: "It turns words into walls.\nIt makes crowds feel like cages.\nIt convinces people that staying\nsmall is the same as staying safe." },
    { text: "Millions have fallen under\nits spell — convinced they are\nnot enough, that they will be\njudged, that they don't belong\nin social contexts.", sub: "But the Shadow holds a secret\nit never wanted you to know.\nIt is terrified of you.\nThe moment you step forward\nand say \"I DARE to FEAR\" —\nit loses its power." },
    { text: "Fear spreads.\nBut so does courage.", sub: "All over the world, ordinary people\nhave chosen to face the Shadow\nrather than hide from it.\n\nNo one knows where they meet\nor how many there are.\n\nPeople call these mystic heroes", emphasis: "THE DARER." },
    { text: "DARERs are not \"chosen ones.\"\nNot people born fearless\nor special. Just ordinary\npeople who have doubted\nthemselves a thousand times.", sub: "Someone who isn't sure they can\ndo this. Who almost didn't\nopen this app.\nBut they did. And that changes\neverything." },
    { text: "No two DARERs walk the same\npath. But every path is shaped\nby the same things — your fears,\nyour strengths, and the choices\nyou make.", sub: "Today, a new DARER awakens.\nFear trembles.\nThe Shadow's reign comes\ncloser to its end." },
  ];
  const cur = slides[slide];
  const last = slide === slides.length - 1;
  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center",
      alignItems: "center", padding: "0 32px", background: C.mapBg, textAlign: "center",
    }}>
      <div style={{ marginBottom: 24, animation: "fadeIn 0.5s ease-out" }} key={slide}>
        <PixelText size={10} color={C.cream} style={{ display: "block", marginBottom: 16 }}>{cur.text}</PixelText>
        <PixelText size={8} color={C.goldMd} style={{ display: "block" }}>{cur.sub}</PixelText>
        {cur.emphasis && <PixelText size={14} color={C.goldMd} style={{ display: "block", marginTop: 16 }}>{cur.emphasis}</PixelText>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {slides.map((_, i) => <div key={i} style={{ width: i === slide ? 20 : 8, height: 8, borderRadius: 2, background: i === slide ? C.goldMd : C.mutedBorder, transition: "all 0.3s" }} />)}
      </div>
      <PixelBtn onClick={() => last ? onComplete() : setSlide(s => s + 1)} color={last ? C.gold : C.plum}>
        {last ? "BEGIN THE JOURNEY" : "NEXT"}
      </PixelBtn>
      {slide > 0 && <button onClick={() => setSlide(s => s - 1)} style={{ background: "none", border: "none", marginTop: 12, cursor: "pointer" }}><PixelText size={7} color={C.subtleText}>BACK</PixelText></button>}

    </div>
  );
}

export default GameIntro;
