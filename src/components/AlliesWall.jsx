import React from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText } from '../components/shared';
import BottomNav from './BottomNav';

// Simulated anonymized victories — would come from a shared DB in production
const ALLY_VICTORIES = [
  { id: 1, hero: 'DARER_382', boss: 'The Meeting', sudsBefore: 82, sudsAfter: 35, outcome: 'victory', date: '2h ago', note: 'I spoke up for the first time in months.' },
  { id: 2, hero: 'DARER_197', boss: 'Coffee Shop', sudsBefore: 65, sudsAfter: 40, outcome: 'victory', date: '4h ago', note: 'Made eye contact with the barista. Stayed.' },
  { id: 3, hero: 'DARER_514', boss: 'Party Invitation', sudsBefore: 90, sudsAfter: 55, outcome: 'partial', date: '6h ago', note: 'Went for 20 minutes. Left early but I went.' },
  { id: 4, hero: 'DARER_728', boss: 'Phone Call', sudsBefore: 70, sudsAfter: 20, outcome: 'victory', date: '8h ago', note: 'Called a friend I\'ve been avoiding. We talked for an hour.' },
  { id: 5, hero: 'DARER_043', boss: 'Restaurant Alone', sudsBefore: 75, sudsAfter: 30, outcome: 'victory', date: '12h ago', note: 'Ate alone without looking at my phone.' },
  { id: 6, hero: 'DARER_661', boss: 'The Presentation', sudsBefore: 95, sudsAfter: 50, outcome: 'victory', date: '1d ago', note: 'Presented to 30 people. My hands shook but my voice didn\'t.' },
  { id: 7, hero: 'DARER_889', boss: 'Group Chat', sudsBefore: 60, sudsAfter: 35, outcome: 'victory', date: '1d ago', note: 'Sent a message in the group chat instead of lurking.' },
  { id: 8, hero: 'DARER_305', boss: 'The Elevator', sudsBefore: 55, sudsAfter: 25, outcome: 'victory', date: '1d ago', note: 'Took the elevator with 3 strangers. Didn\'t look down.' },
  { id: 9, hero: 'DARER_472', boss: 'Ask for Help', sudsBefore: 78, sudsAfter: 42, outcome: 'partial', date: '2d ago', note: 'Asked a stranger for directions. They were nice.' },
  { id: 10, hero: 'DARER_916', boss: 'The Compliment', sudsBefore: 68, sudsAfter: 28, outcome: 'victory', date: '2d ago', note: 'Gave someone a genuine compliment. It felt good.' },
  { id: 11, hero: 'DARER_233', boss: 'Networking Event', sudsBefore: 88, sudsAfter: 60, outcome: 'partial', date: '2d ago', note: 'Talked to one person. That was enough.' },
  { id: 12, hero: 'DARER_774', boss: 'Say No', sudsBefore: 72, sudsAfter: 45, outcome: 'victory', date: '3d ago', note: 'Said no to something I didn\'t want to do. The world didn\'t end.' },
];

export default function AlliesWall({ onBack, setScreen }) {
  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0 }}>
        <PixelText size={8} color={C.grayLt}>← BACK TO MAP</PixelText>
      </button>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <PixelText size={10} color={C.goalGold}>🤝 ALLIES WALL</PixelText>
        <PixelText size={7} color={C.grayLt} style={{ display: 'block', marginTop: 4, lineHeight: 1.8 }}>
          Anonymous victories from DARERs{'\n'}around the world. You're not alone.
        </PixelText>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ALLY_VICTORIES.map(v => (
          <div key={v.id} style={{
            padding: C.padMd,
            background: C.cardBg,
            border: `2px solid ${v.outcome === 'victory' ? C.hpGreen + '40' : C.amber + '40'}`,
            borderRadius: 6,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <PixelText size={7} color={C.plumMd}>{v.hero}</PixelText>
              <PixelText size={6} color={C.grayLt}>{v.date}</PixelText>
            </div>
            <PixelText size={8} color={C.cream} style={{ display: 'block', marginBottom: 4 }}>
              {v.outcome === 'victory' ? '✓' : '◐'} {v.boss}
            </PixelText>
            <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
              <PixelText size={6} color={C.bossRed}>SUDS: {v.sudsBefore}</PixelText>
              <PixelText size={6} color={C.hpGreen}>→ {v.sudsAfter}</PixelText>
              <PixelText size={6} color={C.teal}>(-{v.sudsBefore - v.sudsAfter})</PixelText>
            </div>
            {v.note && (
              <PixelText size={7} color={C.grayLt} style={{ display: 'block', fontStyle: 'italic', lineHeight: 1.8 }}>
                "{v.note}"
              </PixelText>
            )}
          </div>
        ))}
      </div>

      <BottomNav active="map" onNav={(s) => {
        if (s === 'map') onBack();
        else if (setScreen) setScreen(s);
      }} />
    </div>
  );
}
