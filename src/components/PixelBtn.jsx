import PixelText from './PixelText';

export default function PixelBtn({ 
  children, 
  onClick, 
  color = "#7B4B6A", 
  textColor = "#F5EDE8", 
  disabled, 
  style = {} 
}) {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      style={{
        fontFamily: "'Press Start 2P', 'Courier New', monospace", 
        fontSize: 10, 
        padding: "12px 20px",
        background: disabled ? "#7A6B75" : color, 
        color: disabled ? "#7A6B75" : textColor,
        border: `3px solid ${disabled ? "#7A6B75" : (color === "#7B4B6A" ? "#5C3A50" : "#A07830")}`,
        borderRadius: 4, 
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : `${color === "#7B4B6A" ? "#4A2D40" : "#806020"} 0 4px 0`,
        transition: "transform 0.1s", 
        imageRendering: "pixelated",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
