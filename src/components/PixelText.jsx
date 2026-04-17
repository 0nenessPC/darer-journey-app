import { PIXEL_FONT } from './DesignTokens';

export default function PixelText({ 
  children, 
  size = 10, 
  color = "#F5EDE8", 
  style = {} 
}) {
  return (
    <span 
      style={{ 
        fontFamily: PIXEL_FONT, 
        fontSize: size, 
        color, 
        lineHeight: 1.6, 
        ...style 
      }}
    >
      {children}
    </span>
  );
}
