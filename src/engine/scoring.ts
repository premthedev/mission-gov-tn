import type { Choice, Letter, Part } from '../data/types';

/**
 * TNPSC OMR scoring, per Notification 11/2026:
 *  - +1.5 per correct answer; 0 for a wrong answer; 0 for [E]
 *  - 0.5 deducted for every question left blank (para 1.10.2.2, stricter "per question" reading)
 *  - Parts B and C are evaluated only if Part A >= 40% (para 6.1)
 */
export interface ScoreItem {
  part: Part;
  chosen: Choice;
  answer: Letter;
  accepted?: Letter[];
}

export interface PartScore {
  total: number;
  correct: number;
  wrong: number;
  e: number;
  blank: number;
}

export interface ScoreResult {
  byPart: Record<Part, PartScore>;
  correct: number;
  wrong: number;
  e: number;
  blank: number;
  marksA: number;
  marksBC: number;
  deduction: number;
  gateMarks: number;
  gatePassed: boolean;
  total: number;
  maxMarks: number;
}

export const MARK = 1.5;
export const BLANK_DEDUCTION = 0.5;

export function isCorrect(chosen: Choice, answer: Letter, accepted?: Letter[]): boolean {
  if (chosen === 'E' || chosen === 'BLANK') return false;
  return chosen === answer || (accepted?.includes(chosen) ?? false);
}

export function scoreOMR(items: ScoreItem[]): ScoreResult {
  const empty = (): PartScore => ({ total: 0, correct: 0, wrong: 0, e: 0, blank: 0 });
  const byPart: Record<Part, PartScore> = { A: empty(), B: empty(), C: empty() };
  for (const it of items) {
    const p = byPart[it.part];
    p.total++;
    if (it.chosen === 'BLANK') p.blank++;
    else if (it.chosen === 'E') p.e++;
    else if (isCorrect(it.chosen, it.answer, it.accepted)) p.correct++;
    else p.wrong++;
  }
  const sum = (k: keyof PartScore) => byPart.A[k] + byPart.B[k] + byPart.C[k];
  const marksA = MARK * byPart.A.correct;
  const marksBC = MARK * (byPart.B.correct + byPart.C.correct);
  const blank = sum('blank');
  const deduction = BLANK_DEDUCTION * blank;
  const gateMarks = 0.4 * MARK * byPart.A.total;
  const gatePassed = byPart.A.total === 0 ? true : marksA >= gateMarks;
  const total = (gatePassed ? marksA + marksBC : marksA) - deduction;
  return {
    byPart,
    correct: sum('correct'),
    wrong: sum('wrong'),
    e: sum('e'),
    blank,
    marksA,
    marksBC,
    deduction,
    gateMarks,
    gatePassed,
    total,
    maxMarks: MARK * items.length,
  };
}
