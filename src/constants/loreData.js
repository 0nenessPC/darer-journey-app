/** Lore chapters — unlocked by boss defeats, each mirrors a therapeutic insight */

export const LORE_CHAPTERS = [
  {
    id: 'lore_1',
    title: "The Shadow's Origin",
    subtitle: 'How the Shadow was born',
    unlockBosses: 1,
    icon: '📜',
    content: `Long ago, the Shadow was not a monster. It was a protector — born from a moment when you needed to hide to stay safe.

The Shadow learned its job well: keep you from being seen, judged, hurt. It built walls, whispered warnings, mapped every escape route.

But the world you grew up in is not the world you live in now. The Shadow still guards against threats that no longer exist. It fights battles you no longer need to fight.

Understanding the Shadow's purpose is the first step. It meant well. But its methods are outdated — and you have the power to teach it new ones.`,
  },
  {
    id: 'lore_2',
    title: 'The Shadow Feeds on Escape',
    subtitle: 'Why avoidance makes it stronger',
    unlockBosses: 3,
    icon: '📜',
    content: `Every time you avoid a social situation, the Shadow grows. Not because the situation was dangerous — but because avoidance sends a signal to your brain: "We survived because we escaped."

The Shadow keeps a ledger. Each escape is a vote for fear. After enough votes, the Shadow declares itself ruler of your territory.

But here's what the Shadow doesn't want you to know: every time you face a situation and stay — even with anxiety, even with shaking hands — that's a vote for courage.

You don't need to feel brave. You just need to stay. The Shadow's power comes from the belief that escape is the only option.`,
  },
  {
    id: 'lore_3',
    title: "Dara's Promise",
    subtitle: 'Where Dara comes from',
    unlockBosses: 5,
    icon: '🌟',
    content: `Dara was not always a guide. Once, she was a hero who faced her own Shadow — and learned something the Shadow never expected.

That the fear would pass on its own. That the worst predictions rarely come true. That the people she feared judging her were mostly worried about themselves.

Dara carries the memory of every hero she's guided. Their victories, their retreats, their moments of unexpected courage. She knows the path because others have walked it before you.

She doesn't promise the Shadow will disappear. She promises something better: that you can carry it, and it will get lighter with every step.`,
  },
  {
    id: 'lore_4',
    title: "The Storm's Secret",
    subtitle: 'What the physical sensations really mean',
    unlockBosses: 7,
    icon: '⛈️',
    content: `The Shadow's Storm — the racing heart, the tight chest, the heat in your face — feels like danger. But these are not danger signals. They are your body's preparation for action.

Your heart races to pump blood to your muscles. Your breathing quickens to oxygenate your brain. The Storm is your body saying: "I am ready."

The Shadow hijacks this energy and labels it as fear. But the same physical sensations that accompany terror also accompany excitement, anticipation, and joy.

The Storm is not your enemy. It is your engine. The Shadow just taught you to interpret the engine as a warning. You can learn to read it differently.`,
  },
  {
    id: 'lore_5',
    title: "The Shadow's Weakness",
    subtitle: 'What the Shadow fears most',
    unlockBosses: 10,
    icon: '💀',
    content: `The Shadow has one true weakness: it cannot survive in the light.

Not the light of other people's approval. Not the light of perfect confidence. The light of honest attention.

When you look directly at the Shadow's predictions — "They'll think I'm weird" — and ask "What evidence do I actually have?" — the Shadow shrinks. Not because the thought disappears, but because you've stopped believing it automatically.

When you feel the Storm and say "This is just my body preparing" instead of "Something is wrong" — the Shadow loses its grip.

The Shadow doesn't need to be defeated. It needs to be seen clearly. That's what you've been doing all along.`,
  },
  {
    id: 'lore_6',
    title: 'The Order of DARER',
    subtitle: 'You are not the first — and not alone',
    unlockBosses: 15,
    icon: '🏰',
    content: `Every DARER who walks this path follows the same pattern: Decision. Allowance. Rising. Engagement. Repetition.

Those who came before you left marks on the path. Every boss defeated, every repeat completed, every moment of courage added to the road.

You are part of something larger than your individual battles. You are part of a lineage of people who chose to face their Shadow instead of running from it.

The Order has no ranks, no hierarchy, no leaders. Only people who walked the path and became stronger for it. Your journey adds to it.`,
  },
];

export function getUnlockedLore(defeatedCount) {
  return LORE_CHAPTERS.filter((ch) => defeatedCount >= ch.unlockBosses);
}

export function getNextLore(defeatedCount) {
  return LORE_CHAPTERS.find((ch) => defeatedCount < ch.unlockBosses);
}
