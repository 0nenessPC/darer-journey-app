// ============================================================
// ICON SYSTEM — Emoji-based icon mapping for D.A.R.E.R. Journey
// All ICON_XX codes mapped to meaningful emojis
// ============================================================

const ICON_MAP = {
  // Strength cards (positive social behaviors)
  ICON_2: "🧘",    // Calm/comfortable
  ICON_3: "💬",    // At ease talking
  ICON_5: "😊",    // Relaxed in groups
  ICON_6: "🚪",    // Room of strangers
  ICON_10: "📅",   // Show up to plans
  ICON_11: "😌",   // Relax with others
  ICON_25: "😌",   // Relax in unfamiliar settings
  ICON_31: "🤝",   // Introduce people
  ICON_68: "🤝",   // Meet people / Friendliness / Trust
  ICON_72: "👥",   // Meet new people
  ICON_74: "🗣️",   // Talk to authority / Assertiveness / Speak up
  ICON_76: "🎉",   // Comfortable at events / Fun / Enjoy social
  
  // Challenge cards (anxiety/avoidance)
  ICON_12: "🏃",   // Avoid social
  ICON_13: "😢",   // Upset
  ICON_14: "🤐",   // Avoid talking
  ICON_15: "😰",   // Nervous in groups
  ICON_16: "😨",   // Nervous around strangers
  ICON_19: "😓",   // Introduced - tense
  ICON_20: "🙈",   // Avoid large groups
  ICON_21: "🌑",   // Withdraw
  ICON_22: "😟",   // Seldom at ease
  ICON_23: "📝",   // Make excuses
  ICON_24: "🚶",   // Avoid formal
  ICON_91: "😬",   // Uncomfortable in groups
  ICON_103: "🚶‍♂️", // Escape / Get away from people
  
  // ACT Core Values
  ICON_26: "🗺️",   // Adventure
  ICON_28: "🎭",   // Authenticity
  ICON_29: "💝",   // Caring
  ICON_30: "💜",   // Compassion
  ICON_32: "🤲",   // Cooperation
  ICON_34: "🔍",   // Curiosity
  ICON_36: "🕊️",   // Forgiveness
  ICON_39: "🎁",   // Generosity
  ICON_40: "🙏",   // Humility
  ICON_41: "😄",   // Humour
  ICON_42: "🦅",   // Independence
  ICON_44: "💚",   // Kindness
  ICON_46: "👀",   // Open-mindedness
  ICON_47: "📋",   // Order
  ICON_48: "⏳",   // Patience
  ICON_50: "⚖️",   // Reciprocity
  ICON_51: "🤝",   // Respect
  ICON_52: "🧠",   // Self-awareness
  ICON_53: "🎵",   // Sensuality
  ICON_54: "❤️‍🔥",  // Sexuality
  ICON_70: "💕",   // Intimacy
  ICON_97: "⚔️",   // Courage / BOLT replacement
  ICON_98: "🛡️",   // Supportiveness
  ICON_99: "💖",   // Love
  
  // Map nodes & locations
  ICON_57: "🌲",   // Whisper Woods
  ICON_60: "👁️",   // Boss - The Watcher
  ICON_61: "🌉",   // Misty Bridge
  ICON_62: "🌫️",   // Boss - The Tangler
  ICON_63: "👻",   // Boss - The Phantom
  ICON_64: "😱",   // Boss - The Dread
  ICON_65: "🏕️",   // Rest Point
  ICON_66: "👹",   // Shadow King
  ICON_93: "⭐",   // Goal / Decide
  ICON_95: "🛡️",   // Rise / Observe
  
  // Values cards
  ICON_77: "🏔️",   // Take on challenges
  ICON_78: "🌟",   // Contribute/help people
  ICON_88: "😊",   // Smile at stranger
  ICON_89: "👋",   // Say hello
  
  // Shadow cycle (Infinite Trap)
  ICON_100: "🗺️",   // Shadow's Territory
  ICON_101: "🌩️",   // Inner Storm
  ICON_102: "⚡",   // F.E.A.R.
  ICON_104: "😮‍💨",  // Brief Relief
  ICON_105: "👤",   // Shadow Grows
  
  // D.A.R.E.R. Steps
  ICON_94: "🧘",   // Allow / Flexibility
  ICON_96: "🪞",   // Reflect (if needed)
};

// Named icons for common usage
const NAMED_ICONS = {
  sword: "⚔️",
  shield: "🛡️",
  heart: "❤️",
  star: "⭐",
  home: "🏠",
  profile: "👤",
  menu: "☰",
  back: "←",
  next: "→",
  close: "✕",
  settings: "⚙️",
  lock: "🔒",
  unlock: "🔓",
  fire: "🔥",
  bolt: "⚡",
  purpleHeart: "💜",
};

// Get icon by ICON_XX code
export function getIcon(code, fallback = "📍") {
  return ICON_MAP[code] || fallback;
}

// Get named icon
export function getNamedIcon(name) {
  return NAMED_ICONS[name.toLowerCase()] || "❓";
}

// Icon components for JSX usage
export function SwordIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>⚔️</span>;
}

export function ShieldIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>🛡️</span>;
}

export function HeartIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>❤️</span>;
}

export function StarIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>⭐</span>;
}

export function HomeIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>🏠</span>;
}

export function ProfileIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>👤</span>;
}

export function CastleIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>🏰</span>;
}

export function LockIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>🔒</span>;
}

export function FireIcon({ size = 20, color = "currentColor" }) {
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>🔥</span>;
}

// Boss level icons
export function getBossIcon(level) {
  const bosses = ["🐉", "👹", "👻", "🧟", "🦇", "🕷️", "🐍", "🦂", "🦖", "🐙"];
  return bosses[level % bosses.length] || "👾";
}

// IconRenderer component - renders any icon reference (ICON_XX code, named icon, or raw emoji)
export function IconRenderer({ icon, size = 16, color = "currentColor" }) {
  if (!icon) return null;
  
  // Already an emoji (single char or surrogate pair)
  if (icon.length <= 4) {
    return <span style={{ fontSize: size, color, lineHeight: 1 }}>{icon}</span>;
  }
  
  // ICON_XX code
  if (icon.startsWith("ICON_")) {
    const emoji = getIcon(icon);
    return <span style={{ fontSize: size, color, lineHeight: 1 }}>{emoji}</span>;
  }
  
  // Named icon
  const named = getNamedIcon(icon);
  return <span style={{ fontSize: size, color, lineHeight: 1 }}>{named}</span>;
}

export default {
  getIcon, getNamedIcon, getBossIcon, IconRenderer,
  SwordIcon, ShieldIcon, HeartIcon, StarIcon, HomeIcon, 
  ProfileIcon, CastleIcon, LockIcon, FireIcon,
};
