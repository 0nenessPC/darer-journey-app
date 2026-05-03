/** Map zones — named journey chapters with environmental progression */

export const JOURNEY_ZONES = [
  {
    id: 'whisper_woods',
    name: 'WHISPER WOODS',
    subtitle: 'Where the Shadow first speaks',
    minDefeated: 0,
    maxDefeated: 3,
    bg: '#1A1A2E',
    headerBg: '#16213E',
    accent: '#4FC3F7',
    icon: '🌲',
    desc: 'The trees whisper what the Shadow fears most: that you might be okay.',
    // Environmental elements that appear
    elements: ['fog', 'whispers', 'faint_path'],
  },
  {
    id: 'mist_bridge',
    name: 'MIST BRIDGE',
    subtitle: 'Crossing into unknown territory',
    minDefeated: 4,
    maxDefeated: 7,
    bg: '#1A1A2E',
    headerBg: '#1B2838',
    accent: '#26A69A',
    icon: '🌉',
    desc: 'The bridge spans the gap between who you were and who you\'re becoming.',
    elements: ['mist', 'bridge', 'flowing_water', 'lantern_1'],
  },
  {
    id: 'dark_ravine',
    name: 'DARK RAVINE',
    subtitle: 'The Shadow\'s stronghold',
    minDefeated: 8,
    maxDefeated: 12,
    bg: '#120C10',
    headerBg: '#1A0A14',
    accent: '#7C4DFF',
    icon: '⛰️',
    desc: 'The deepest fears live here. But you\'ve brought light this far.',
    elements: ['darkness', 'cracks_in_stone', 'lantern_2', 'flowers'],
  },
  {
    id: 'shadow_castle',
    name: 'SHADOW CASTLE',
    subtitle: 'Face the final boss within',
    minDefeated: 13,
    maxDefeated: 18,
    bg: '#0D0810',
    headerBg: '#150A18',
    accent: '#E040FB',
    icon: '🏰',
    desc: 'The Shadow\'s throne room. Every step here echoes with courage.',
    elements: ['cracks_everywhere', 'lantern_3', 'bloom', 'sunlight'],
  },
  {
    id: 'summit',
    name: 'THE SUMMIT',
    subtitle: 'Beyond the Shadow',
    minDefeated: 19,
    maxDefeated: 999,
    bg: '#1A1A2E',
    headerBg: '#2E1A0E',
    accent: '#FBBF24',
    icon: '⛰️',
    desc: 'The peak. The Shadow is behind you. The view is yours.',
    elements: ['sunlight', 'bloom', 'clear_sky', 'all_lanterns'],
  },
];

export function getCurrentZone(defeatedCount) {
  return JOURNEY_ZONES.find(z => defeatedCount >= z.minDefeated && defeatedCount <= z.maxDefeated) || JOURNEY_ZONES[0];
}

/** Get how many zones the hero has visited */
export function getZonesVisited(defeatedCount) {
  return JOURNEY_ZONES.filter(z => defeatedCount >= z.minDefeated).length;
}
