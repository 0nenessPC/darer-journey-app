/** Dara's post-battle letters — personalized messages referencing specific growth */

const LETTER_TEMPLATES = {
  // After first victory
  first_victory: [
    (ctx) => `Dear ${ctx.heroName},

Today you did something remarkable. You faced ${ctx.bossName} — and you won.

I know it doesn't feel like "winning" in the way movies show it. The Storm still came. Your heart still raced. But you stayed. And that's the thing the Shadow never understood: staying IS the victory.

Your SUDS dropped from ${ctx.sudsBefore} to ${ctx.sudsAfter}. That's not nothing. That's proof.

I'm proud of you. Not because you conquered a fear — but because you proved to yourself that you can.

— Dara`,
  ],

  // After repeat with SUDS improvement
  repeat_improvement: [
    (ctx) => `Dear ${ctx.heroName},

Something shifted today. Remember last time you faced ${ctx.bossName}? The Storm hit at ${ctx.prevPeakSUDS}. This time it was only ${ctx.currentPeakSUDS}.

The Shadow hasn't gotten weaker. You have gotten stronger.

Every repeat is a vote for a new story. Last time the story was "I can survive this." Today it became "I've done this before."

Same dragon. Smaller fire.

— Dara`,
  ],

  // After high SUDS drop (>30)
  big_suds_drop: [
    (ctx) => `Dear ${ctx.heroName},

I want you to look at what happened today. Before: ${ctx.sudsBefore}. After: ${ctx.sudsAfter}.

That's a drop of ${ctx.sudsDrop} points. That's not a small number. That's your nervous system doing exactly what the Shadow said it couldn't do — calming down, all on its own, because you didn't run.

The Storm passed. It always does. Today you saw it with your own body, not just your mind.

That's the kind of evidence that changes lives.

— Dara`,
  ],

  // After streak milestone
  streak_letter: [
    (ctx) => `Dear ${ctx.heroName},

${ctx.streakCount} days in a row. ${ctx.streakCount} days of choosing courage over comfort.

Do you know what the Shadow expected when you started this? That you'd give up. That avoidance would win. That one bad day would become two, then three, then forever.

You proved it wrong every single day.

I want you to notice something: it wasn't easy. It was never supposed to be. The courage isn't in the absence of fear — it's in the persistence despite it.

Keep going. I'm right here with you.

— Dara`,
  ],

  // After level up
  level_up_letter: [
    (ctx) => `Dear ${ctx.heroName},

You just reached Courage Level ${ctx.playerLevel}. I've been watching your journey since the beginning, and the changes are real.

You've faced ${ctx.defeatedCount} bosses. Each one a piece of the Shadow's grip on your life. Each one a moment where you chose differently than you used to.

I remember when you were at Level 1, barely able to look at the first exposure on the list. Look at you now.

Not "look at how far you've come" — though you have. More importantly: look at what you're capable of.

— Dara`,
  ],

  // Generic encouragement (fallback)
  generic: [
    (ctx) => `Dear ${ctx.heroName},

Another battle behind you. ${ctx.outcome === 'victory' ? 'Victory' : ctx.outcome === 'partial' ? 'Progress' : 'Experience'} — all of it counts.

The Shadow told you that facing ${ctx.bossName} would go badly. And yet, here you are. Still walking the path. Still choosing to show up.

That choice — the choice to come back — that's the real work. Everything else is just details.

I'll see you next time.

— Dara`,
  ],
};

/** Generate a personalized post-battle letter */
export function generatePostBattleLetter(ctx) {
  // Determine which letter type to use
  if (ctx.isFirstVictory) {
    const template = LETTER_TEMPLATES.first_victory[0];
    return template(ctx);
  }
  if (ctx.isRepeat && ctx.sudsImprovement) {
    const template = LETTER_TEMPLATES.repeat_improvement[0];
    return template(ctx);
  }
  if (ctx.sudsDrop >= 30) {
    const template = LETTER_TEMPLATES.big_suds_drop[0];
    return template(ctx);
  }
  if (ctx.streakCount >= 7 && ctx.streakCount % 7 === 0) {
    const template = LETTER_TEMPLATES.streak_letter[0];
    return template(ctx);
  }
  if (ctx.justLeveledUp) {
    const template = LETTER_TEMPLATES.level_up_letter[0];
    return template(ctx);
  }
  return LETTER_TEMPLATES.generic[0](ctx);
}

/** Dara's dialogue tone based on player level */
export function getDaraTone(playerLevel = 1) {
  if (playerLevel <= 3) {
    return {
      stage: 'guide',
      label: 'Gentle Guide',
      style:
        'warm, encouraging, slightly tentative — like a friend who believes in you more than you believe in yourself',
      openings: [
        "I'm here with you.",
        "You don't have to do this perfectly.",
        "Let's take this one step at a time.",
      ],
      victories: [
        'That was brave. Really brave.',
        'I know how hard that was. Well done.',
        'You did it. However it felt — you did it.',
      ],
    };
  }
  if (playerLevel <= 7) {
    return {
      stage: 'partner',
      label: 'Trusted Partner',
      style: 'confident, warm, more direct — speaks as an equal who has walked alongside the hero',
      openings: [
        "You know what to do. Let's go.",
        'Ready for this one?',
        'Same rules as always: stay, breathe, observe.',
      ],
      victories: [
        "Another one down. You're getting good at this.",
        'Notice how the Storm feels different now?',
        "That's progress. Real, measurable progress.",
      ],
    };
  }
  if (playerLevel <= 12) {
    return {
      stage: 'mentor',
      label: 'Battle Mentor',
      style: 'assured, reflective, occasionally challenging — pushes the hero to go deeper',
      openings: [
        "You've come far. Let's see how much further.",
        "The Shadow's getting predictable, isn't it?",
        "This one might feel different. That's normal.",
      ],
      victories: [
        'Look at the numbers. The trend is clear.',
        "You're not the same person who started this.",
        "The Shadow's playbook is running out of pages.",
      ],
    };
  }
  return {
    stage: 'ally',
    label: 'Kindred Spirit',
    style:
      'humble, honest, peer-level — no longer a guide but a fellow traveler who has seen the depths',
    openings: [
      "We've walked a long way together.",
      "You know the path now. I'm just walking beside you.",
      "The Shadow and you — you've met enough times now.",
    ],
    victories: [
      "You don't need me to tell you that was good. You felt it.",
      'Remember your first battle? Look at you now.',
      "The Shadow's still there. But so are you. Always.",
    ],
  };
}
