import React from 'react';
import { C } from '../constants/gameData';
import { PixelText } from './shared';

const TABS = [
  { icon: '🗺', label: 'MAP', screen: 'map' },
  { icon: '📚', label: 'BANK', screen: 'bank' },
  { icon: '🏆', label: 'WALL', screen: 'ladder' },
  { icon: '🛡', label: 'HERO', screen: 'profile' },
];

export default function BottomNav({ active, onNav, zIndex = 0 }) {
  return (
    <nav role="navigation" aria-label="Main navigation" style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      display: 'flex', borderTop: `3px solid ${C.mutedBorder}`, background: C.cardBg,
      zIndex: zIndex || undefined,
    }}>
      {TABS.map(t => {
        const isActive = active === t.screen;
        return (
          <button
            key={t.label}
            onClick={() => onNav(t.screen)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={`${t.label} tab`}
            style={{
              flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer',
              background: isActive ? C.cardBgAlt : 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}
          >
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <PixelText size={6} color={isActive ? C.goldMd : C.grayLt}>{t.label}</PixelText>
          </button>
        );
      })}
    </nav>
  );
}
