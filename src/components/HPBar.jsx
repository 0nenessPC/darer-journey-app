import PixelText from './PixelText';

export default function HPBar({ current, max, width = "100%", height = 12, label }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 50 ? "#6BA56B" : pct > 25 ? "#D4A050" : "#C45A5A";
  
  return (
    <div style={{ width }}>
      {label && <PixelText size={8} color="#B8A8B2">{label}</PixelText>}
      <div style={{ 
        height, 
        background: "#1A1218", 
        borderRadius: 2, 
        border: "2px solid #5C3A50", 
        overflow: "hidden" 
      }}>
        <div 
          style={{ 
            height: "100%", 
            width: `${pct}%`, 
            background: color, 
            transition: "width 0.6s ease", 
            imageRendering: "pixelated" 
          }} 
        />
      </div>
    </div>
  );
}
