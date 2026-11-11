import type { Bi, Format, KeySource, Letter, Part, Question, QuestionSource, Unit } from '../data/types';
import { type Rng, shuffle } from '../lib/rng';

export const LETTERS: Letter[] = ['A', 'B', 'C', 'D'];

const keyOf = (b: Bi) => `${b.ta ?? ''}|${b.en ?? ''}`;

/** Build a 4-option MCQ with the correct answer placed at a random letter. */
export function makeMcq(p: {
  id: string;
  unit: Unit;
  topic: string;
  stem: Bi;
  correct: Bi;
  wrong: Bi[];
  r: Rng;
  explanation?: Bi;
  format?: Format;
  statements?: Bi[];
  keySource?: KeySource;
  source?: QuestionSource;
}): Question {
  const seen = new Set([keyOf(p.correct)]);
  const wrong: Bi[] = [];
  for (const w of p.wrong) {
    const k = keyOf(w);
    if (!seen.has(k)) {
      seen.add(k);
      wrong.push(w);
    }
    if (wrong.length === 3) break;
  }
  if (wrong.length < 3) throw new Error(`makeMcq(${p.id}): need 3 distinct wrong options`);

  const order = shuffle(p.r, [{ v: p.correct, ok: true }, ...wrong.map((v) => ({ v, ok: false }))]);
  const options = {} as Record<Letter, Bi>;
  let answer: Letter = 'A';
  order.forEach((o, i) => {
    options[LETTERS[i]] = o.v;
    if (o.ok) answer = LETTERS[i];
  });
  return {
    id: p.id,
    part: p.unit[0] as Part,
    unit: p.unit,
    topic: p.topic,
    format: p.format ?? 'ONE_LINER',
    stem: p.stem,
    statements: p.statements,
    options,
    answer,
    keySource: p.keySource ?? 'GENERATED',
    source: p.source ?? { kind: 'GENERATED' },
    syllabusEra: 'CURRENT',
    explanation: p.explanation ? { ...p.explanation, verified: true } : undefined,
  };
}
