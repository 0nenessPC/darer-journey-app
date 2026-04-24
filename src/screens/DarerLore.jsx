import { C } from "../constants/gameData";
import { PixelText, PixelBtn } from "../components/shared.jsx";

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap";

function DarerLore({ onComplete, obState, setOBState }) {
  // Part 2 of the intro: who DARERs really are + the new hero awakens
  const slide = obState?.slide ?? 0;
  const setSlide = (v) => setOBState({ slide: typeof v === 'function' ? v(slide) : v });
  const slides = [
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
      <link href={FONT_LINK} rel="stylesheet" />
      <div style={{ marginBottom: 24, animation: "fadeIn 0.5s ease-out" }} key={slide}>
        <PixelText size={10} color={C.cream} style={{ display: "block", marginBottom: 16 }}>{cur.text}</PixelText>
        {cur.sub && <PixelText size={8} color={C.goldMd} style={{ display: "block" }}>{cur.sub}</PixelText>}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {slides.map((_, i) => <div key={i} style={{ width: i === slide ? 20 : 8, height: 8, borderRadius: 2, background: i === slide ? C.goldMd : "#5C3A50", transition: "all 0.3s" }} />)}
      </div>
      <PixelBtn onClick={() => last ? onComplete() : setSlide(s => s + 1)} color={last ? C.gold : C.plum}>
        {last ? "BEGIN THE JOURNEY" : "NEXT"}
      </PixelBtn>
      {slide > 0 && <button onClick={() => setSlide(s => s - 1)} style={{ background: "none", border: "none", marginTop: 12, cursor: "pointer" }}><PixelText size={7} color={C.grayLt}>BACK</PixelText></button>}
    </div>
  );
}

export default DarerLore;
