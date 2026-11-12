import type { Unit } from '../data/types';
import { UNIT_COUNTS } from '../data/content';

/** XP rules (Duolingo-style): small, frequent rewards; combos pay more. */
export const XP = {
  correct: 10,
  wrong: 2,
  combo3: 3,
  combo5: 5,
  kuralCard: 3,
  lessonDone: 25,
  stepDone: 5,
  sessionDone: 50,
  speedCorrect: 6,
};

export function answerXp(correct: boolean, combo: number): number {
  if (!correct) return XP.wrong;
  return XP.correct + (combo >= 5 ? XP.combo5 : combo >= 3 ? XP.combo3 : 0);
}

const LEVEL_XP = 400;
const TITLES = ['தொடக்கம்', 'கற்பவர்', 'முயல்பவர்', 'பயிற்சியாளர்', 'திறனாளர்', 'வல்லுநர்', 'வெற்றியாளர்', 'சாதனையாளர்'];

export function level(total: number) {
  const n = Math.floor(total / LEVEL_XP) + 1;
  return {
    n,
    title: TITLES[Math.min(TITLES.length - 1, n - 1)],
    into: total % LEVEL_XP,
    need: LEVEL_XP,
  };
}

/**
 * Projected correct answers out of 200 from practice accuracy per unit.
 * Units with few attempts are blended with a cautious starting estimate.
 */
const PRIOR: Record<string, number> = { A: 0.55, B: 0.3, C: 0.55 };
export function projected(unitAcc: Map<Unit, { c: number; t: number }>) {
  let total = 0;
  const byUnit: { unit: Unit; acc: number; expected: number; attempts: number }[] = [];
  for (const [u, n] of Object.entries(UNIT_COUNTS) as [Unit, number][]) {
    const s = unitAcc.get(u) ?? { c: 0, t: 0 };
    const w = Math.min(1, s.t / 20);
    const acc = w * (s.t ? s.c / s.t : 0) + (1 - w) * PRIOR[u[0]];
    total += acc * n;
    byUnit.push({ unit: u, acc, expected: acc * n, attempts: s.t });
  }
  return { correct: Math.round(total), marks: Math.round(total * 1.5), byUnit };
}
