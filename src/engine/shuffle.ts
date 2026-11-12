import type { Letter, Question } from '../data/types';
import { seeded, shuffle } from '../lib/rng';

/** Shuffle A–D for practice so answers can't be remembered by position. Mocks keep the paper order. */
export function shuffleOptions(q: Question, seedKey: string): Question {
  const r = seeded(`opt-${q.id}-${seedKey}`);
  const L: Letter[] = ['A', 'B', 'C', 'D'];
  const order = shuffle(r, L);
  const options = {} as Question['options'];
  const map = {} as Record<Letter, Letter>;
  order.forEach((from, i) => {
    options[L[i]] = q.options[from];
    map[from] = L[i];
  });
  return { ...q, options, answer: map[q.answer], acceptedAnswers: q.acceptedAnswers?.map((a) => map[a]) };
}
