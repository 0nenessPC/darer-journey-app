
/**
 * Pixel-art Dara avatar rendered as inline SVG.
 *
 * Design: 16x16 pixel grid scaled up. Cloaked figure with hood, glowing eyes,
 * and a wooden staff. JRPG NPC-sprite style.
 *
 * Props:
 *   size    — pixel height (default 80)
 *   variant — string key from the avatar catalog (default 'dara_default')
 *   glow    — boolean, pulse the staff-tip glow (default false)
 *   style   — additional container styles
 */
const VARIANTS = {
  dara_default: {
    name: 'The Guide',
    cloak: '#5C3A50',
    cloakLight: '#7B5268',
    hood: '#4A2E40',
    skin: '#D4A574',
    staff: '#8B6914',
    staffTip: '#E8A04A',
    eyes: '#E8A04A',
    robe: '#3D2535',
  },
  dara_sage: {
    name: 'The Sage',
    cloak: '#2D5A3D',
    cloakLight: '#3D8B5C',
    hood: '#1E3D2A',
    skin: '#D4A574',
    staff: '#A0845C',
    staffTip: '#60A5FA',
    eyes: '#60A5FA',
    robe: '#1A3525',
  },
  dara_storm: {
    name: 'The Storm',
    cloak: '#3A3A5C',
    cloakLight: '#5C5C8B',
    hood: '#2A2A40',
    skin: '#C49464',
    staff: '#6B5B3B',
    staffTip: '#A78BFA',
    eyes: '#A78BFA',
    robe: '#1E1E35',
  },
  dara_ember: {
    name: 'The Ember',
    cloak: '#5C2A1A',
    cloakLight: '#8B3A2A',
    hood: '#3D1E12',
    skin: '#E8C4A0',
    staff: '#7B5B2B',
    staffTip: '#F97316',
    eyes: '#FBBF24',
    robe: '#2D1510',
  },
  dara_phantom: {
    name: 'The Phantom',
    cloak: '#2A2A2A',
    cloakLight: '#4A4A4A',
    hood: '#1A1A1A',
    skin: '#B0B0B0',
    staff: '#555555',
    staffTip: '#E2E8F0',
    eyes: '#E2E8F0',
    robe: '#111111',
  },
};

function PixelDara({ colors, size = 80, glow = false }) {
  const px = size / 16;
  const { cloak, cloakLight, hood, skin, staff, staffTip, eyes, robe } = colors;

  // 16x16 pixel grid — [row][col] = color key
  // . = transparent, c = cloak, C = cloakLight, h = hood, s = skin,
  // S = staff, t = staffTip, e = eyes, r = robe
  const grid = [
    '................', // 0: top of hood
    '................', // 1
    '......hhhh......', // 2: hood top
    '.....hCCCCh.....', // 3: hood with cloak trim
    '....hCcCCcCh....', // 4
    '....hsCCcCsh....', // 5: eyes level (s = skin gap around eyes)
    '...hCseCCesCh...', // 6: eyes (e) glowing
    '...hCssCCssCh...', // 7: mouth area (covered by hood shadow)
    '....hCccCCCh....', // 8: hood bottom
    '.....hCCCh......', // 9: neck
    '....cCrrCcc.....', // 10: robe top
    '...ccCrrrCcc....', // 11
    '..ccCrrrrrCcc...', // 12: robe mid, staff on right
    '.ccCrrrrrrrCccS.', // 13: staff (S) appears
    '.ccrrrrrrrrrCSS.', // 14: staff extends down with tip
    '................', // 15
  ];

  const colorMap = {
    '.': null,
    c: cloak,
    C: cloakLight,
    h: hood,
    s: skin,
    S: staff,
    t: staffTip,
    e: eyes,
    r: robe,
  };

  const pixels = [];
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const key = grid[row][col];
      const color = colorMap[key];
      if (color) {
        pixels.push(
          <rect
            key={`${row}-${col}`}
            x={col * px}
            y={row * px}
            width={px}
            height={px}
            fill={color}
          />,
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ imageRendering: 'pixelated', display: 'block' }}
    >
      {pixels}
      {/* Staff tip glow */}
      {glow && (
        <circle
          cx={14 * px + px / 2}
          cy={14 * px + px / 2}
          r={px * 1.5}
          fill={staffTip}
          opacity={0.3}
        >
          <animate
            attributeName="opacity"
            values="0.15;0.35;0.15"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  );
}

export function DaraAvatar({ size = 80, variant = 'dara_default', glow = false, style = {} }) {
  const colors = VARIANTS[variant] || VARIANTS.dara_default;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <PixelDara colors={colors} size={size} glow={glow} />
    </div>
  );
}

export const AVATAR_COLORS = VARIANTS;
