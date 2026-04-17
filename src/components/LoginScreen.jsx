import { useState } from 'react';
import PixelText from './PixelText';
import PixelBtn from './PixelBtn';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handle = () => {
    setErr("");
    if (!email.trim()) { 
      setErr("Enter your email"); 
      return; 
    }
    if (!pw.trim()) { 
      setErr("Enter your password"); 
      return; 
    }
    setLoading(true);
    setTimeout(() => { 
      setLoading(false); 
      onLogin(); 
    }, 1000);
  };

  return (
    <div style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      padding: "0 28px", 
      background: "#2A1F28" 
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <PixelText size={28} color="#E8C87A">D.A.R.E.R.</PixelText>
        <div style={{ marginTop: 8 }}>
          <PixelText size={8} color="#C89DB2">DARE TO FEAR. DARE TO ACT.</PixelText>
        </div>
      </div>
      
      <div style={{ 
        background: "#1A1218", 
        border: "3px solid #5C3A50", 
        borderRadius: 6, 
        padding: 20 
      }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {["login","signup"].map((m) => (
            <button 
              key={m} 
              onClick={() => { 
                setMode(m); 
                setErr(""); 
              }} 
              style={{
                flex: 1, 
                padding: 8, 
                border: "2px solid #5C3A50", 
                borderRadius: 3,
                background: mode === m ? "#7B4B6A" : "transparent", 
                cursor: "pointer",
                fontFamily: "'Press Start 2P', monospace", 
                fontSize: 8, 
                color: mode === m ? "#F5EDE8" : "#B8A8B2",
              }}
            >
              {m === "login" ? "LOG IN" : "NEW GAME"}
            </button>
          ))}
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <PixelText size={8} color="#B8A8B2">EMAIL</PixelText>
          <input 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            onKeyDown={(e) => e.key==="Enter" && handle()}
            style={{ 
              width: "100%", 
              padding: 10, 
              marginTop: 4, 
              background: "#2A1F28", 
              border: "2px solid #5C3A50", 
              borderRadius: 3, 
              color: "#F5EDE8", 
              fontSize: 13, 
              outline: "none", 
              boxSizing: "border-box" 
            }} 
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <PixelText size={8} color="#B8A8B2">PASSWORD</PixelText>
          <input 
            type="password" 
            value={pw} 
            onChange={(e) => setPw(e.target.value)} 
            onKeyDown={(e) => e.key==="Enter" && handle()}
            style={{ 
              width: "100%", 
              padding: 10, 
              marginTop: 4, 
              background: "#2A1F28", 
              border: "2px solid #5C3A50", 
              borderRadius: 3, 
              color: "#F5EDE8", 
              fontSize: 13, 
              outline: "none", 
              boxSizing: "border-box" 
            }} 
          />
        </div>
        
        {err && (
          <div style={{ marginBottom: 12 }}>
            <PixelText size={8} color="#C45A5A">{err}</PixelText>
          </div>
        )}
        
        <PixelBtn 
          onClick={handle} 
          disabled={loading} 
          style={{ width: "100%" }}
        >
          {loading ? ".." : mode === "login" ? "START YOUR JOURNEY" : "CREATE HERO"}
        </PixelBtn>
      </div>
    </div>
  );
}
