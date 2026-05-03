import React from 'react';
import { C, PIXEL_FONT } from '../constants/gameData';
import { PixelText, PixelBtn } from '../components/shared';
import { getDaraTone } from '../constants/daraLetters';

export default function WelcomeBackLetter({ letterData, onContinue, hero }) {
  const tone = getDaraTone(hero?.playerLevel || 1);
  const { daysSinceLastActive, lastBossName, totalDefeated, bestSudsDrop, streakCount } = letterData;

  return (
    <div style={{ minHeight: '100vh', background: C.mapBg, padding: '16px 16px 100px' }}>
      {/* Letter header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 60, height: 60, margin: '0 auto 12px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${C.plum}, ${C.goldMd})`,
          border: `3px solid ${C.goldMd}60`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
        }}>
          ✉
        </div>
        <PixelText size={10} color={C.goldMd}>WELCOME BACK</PixelText>
        {daysSinceLastActive > 0 && (
          <PixelText size={7} color={C.grayLt} style={{ display: 'block', marginTop: 4 }}>
            {daysSinceLastActive === 1
              ? "You were away for a day"
              : `${daysSinceLastActive} days since you last walked the path`}
          </PixelText>
        )}
        <div style={{ marginTop: 4 }}>
          <PixelText size={6} color={tone.stage === 'guide' ? C.teal : tone.stage === 'partner' ? C.plumMd : tone.stage === 'mentor' ? C.goldMd : C.goalGold}>
            {tone.label}
          </PixelText>
        </div>
      </div>

      {/* Letter body */}
      <div style={{
        padding: C.padXl,
        background: C.cardBg,
        border: `2px solid ${C.goalGold}30`,
        borderRadius: 8,
        marginBottom: 20,
      }}>
        {generateLetterBody({ daysSinceLastActive, lastBossName, totalDefeated, bestSudsDrop, streakCount, heroName: hero?.name || 'Hero' }).split('\n').map((line, i) => (
          <PixelText
            key={i}
            size={8}
            color={C.cream}
            style={{
              display: 'block',
              lineHeight: 2,
              marginBottom: line === '' ? 12 : 0,
            }}
          >
            {line}
          </PixelText>
        ))}
      </div>

      {/* Stats recap */}
      {totalDefeated > 0 && (
        <div style={{
          padding: C.padMd,
          background: C.cardBg,
          border: `2px solid ${C.mutedBorder}`,
          borderRadius: 6,
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-around',
        }}>
          <div style={{ textAlign: 'center' }}>
            <PixelText size={12} color={C.hpGreen}>{totalDefeated}</PixelText>
            <div><PixelText size={6} color={C.grayLt}>BOSSES</PixelText></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <PixelText size={12} color={C.bossRed}>{bestSudsDrop}</PixelText>
            <div><PixelText size={6} color={C.grayLt}>BEST DROP</PixelText></div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <PixelText size={12} color={C.goldMd}>{streakCount}</PixelText>
            <div><PixelText size={6} color={C.grayLt}>STREAK</PixelText></div>
          </div>
        </div>
      )}

      <PixelBtn onClick={onContinue} color={C.gold} textColor={C.charcoal}>
        I'M READY TO CONTINUE →
      </PixelBtn>
    </div>
  );
}

function generateLetterBody(ctx) {
  const { daysSinceLastActive, lastBossName, totalDefeated, bestSudsDrop, streakCount, heroName } = ctx;

  if (daysSinceLastActive === 0) {
    return `Welcome back, ${heroName}.

The path is the same as you left it. The Shadow hasn't grown. Your courage hasn't shrunk.

Pick up where you left off. I'm here.`;
  }

  if (daysSinceLastActive <= 2) {
    return `Hey ${heroName}.

Just a day or two away — that's nothing. The path doesn't go anywhere. ${lastBossName ? `The last time you were here, you faced ${lastBossName}. That courage is still yours.` : ''}

What are we facing today?

— Dara`;
  }

  if (daysSinceLastActive <= 7) {
    return `Dear ${heroName},

It's been ${daysSinceLastActive} days. Long enough for the Shadow to whisper that maybe you've forgotten how to do this. You haven't.

${totalDefeated > 0
      ? `You've defeated ${totalDefeated} bosses${bestSudsDrop > 0 ? ` with a best SUDS drop of ${bestSudsDrop}` : ''}. That's not something that goes away in a week.`
      : 'You started this journey, and starting is the hardest part.'}

The path remembers you. I remember you.

Let's take one step. Just one.

— Dara`;
  }

  return `Dear ${heroName},

It's been ${daysSinceLastActive} days.

I know what probably happened. The Shadow told you it was easier not to come back. That the break was too long, that you'd lost your progress, that it would feel awkward.

None of that is true.

${totalDefeated > 0
      ? `You defeated ${totalDefeated} bosses${streakCount > 0 ? ` and built a streak of ${streakCount} days` : ''}. ${lastBossName ? `Your last battle was against ${lastBossName}.` : ''}${bestSudsDrop > 0 ? ` Your best SUDS drop was ${bestSudsDrop} points — proof that your body learned something you can't unlearn.` : ''}`
      : 'You showed up once, and that counts.'}

Courage isn't about never leaving. It's about always coming back.

I'm glad you're here.

— Dara`;
}
