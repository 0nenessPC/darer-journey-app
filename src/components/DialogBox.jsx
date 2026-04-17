import PixelText from './PixelText';
import TypingDots from './TypingDots';

export default function DialogBox({ 
  speaker, 
  text, 
  typing, 
  children 
}) {
  return (
    <div style={{
      background: "#1A1218", 
      border: "3px solid #5C3A50", 
      borderRadius: 6,
      padding: 14, 
      margin: "0 0 12px",
    }}>
      {speaker && (
        <PixelText size={9} color="#E8C87A" style={{ display: "block", marginBottom: 6 }}>
          {speaker}
        </PixelText>
      )}
      {typing ? (
        <TypingDots />
      ) : (
        <PixelText size={9} color="#F5EDE8" style={{ display: "block", whiteSpace: "pre-wrap" }}>
          {text}
        </PixelText>
      )}
      {children}
    </div>
  );
}
