export default function TypingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[0,1,2].map((i) => (
        <span 
          key={i} 
          style={{
            width: 6, 
            height: 6, 
            borderRadius: "50%", 
            background: "#C89DB2",
            animation: `bop 1s ease-in-out ${i*0.15}s infinite`,
          }} 
        />
      ))}
      <style>{`@keyframes bop { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-4px)} }`}</style>
    </span>
  );
}
