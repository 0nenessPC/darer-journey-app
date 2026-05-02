import { useState } from "react";
import { supabase } from "../utils/supabase";
import { C } from "../constants/gameData";
import { PixelText, PixelBtn } from "../components/shared.jsx";

const PIXEL_FONT = "'Press Start 2P', monospace";

function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const handle = async () => {
    setErr("");
    if (!email.trim()) { setErr("Enter your email"); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password: pw });
        if (error) { setErr(error.message); setLoading(false); return; }
        setErr("Account created! Check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) { setErr(error.message); setLoading(false); return; }
        onLogin();
      }
    } catch (e) {
      setErr("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px", background: C.mapBg }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <PixelText size={28} color={C.goldMd}>D.A.R.E.R.</PixelText>
        <div style={{ marginTop: 8 }}><PixelText size={8} color={C.plumMd}>DARE TO FEAR. DARE TO ACT.</PixelText></div>
      </div>
      <div style={{ background: C.cardBg, border: `3px solid ${C.mutedBorder}`, borderRadius: 6, padding: 20 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{
              flex: 1, padding: C.padSm, border: `2px solid ${C.mutedBorder}`, borderRadius: 3,
              background: mode === m ? C.plum : "transparent", cursor: "pointer",
              fontFamily: PIXEL_FONT, fontSize: 8, color: mode === m ? C.cream : C.grayLt,
            }}>{m === "login" ? "LOG IN" : "NEW GAME"}</button>
          ))}
        </div>
        <div style={{ marginBottom: 12 }}>
          <PixelText size={8} color={C.subtleText}>EMAIL</PixelText>
          <input value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()}
            style={{ width: "100%", padding: 10, marginTop: 4, background: C.mapBg, border: `2px solid ${C.mutedBorder}`, borderRadius: 3, color: C.cream, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <PixelText size={8} color={C.subtleText}>PASSWORD</PixelText>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key==="Enter" && handle()}
            style={{ width: "100%", padding: 10, marginTop: 4, background: C.mapBg, border: `2px solid ${C.mutedBorder}`, borderRadius: 3, color: C.cream, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        {err && <div style={{ marginBottom: 12 }}><PixelText size={8} color={C.red}>{err}</PixelText></div>}
        <PixelBtn onClick={handle} disabled={loading} style={{ width: "100%" }}>
          {loading ? "..." : mode === "login" ? "START YOUR JOURNEY" : "CREATE HERO"}
        </PixelBtn>
      </div>
    </div>
  );
}

export default LoginScreen;
