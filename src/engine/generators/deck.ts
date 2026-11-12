import type { Deck, Question, Unit } from '../../data/types';
import { type Rng, int, sample, seeded, shuffle } from '../../lib/rng';
import { makeMcq } from '../make';

const fill = (s: string | undefined, t: string, m: string) => s?.replace('{t}', t).replace('{m}', m);

/** One question from deck item `i`. dir 0 = term → meaning, 1 = meaning → term. */
export function deckQuestion(deck: Deck, i: number, dir: 0 | 1, r: Rng): Question | null {
  const [term, meaning, note] = deck.items[i];
  const useReverse = dir === 1 && deck.rq;
  const others = deck.items.filter((x, j) => j !== i && x[1] !== meaning && x[0] !== term);
  if (others.length < 3) return null;
  const pickFrom = sample(r, others, 6);
  const wrong = useReverse ? pickFrom.map((x) => ({ ta: x[0] })) : pickFrom.map((x) => ({ ta: x[1] }));
  const tmpl = useReverse ? deck.rq! : deck.q;
  try {
    return makeMcq({
      id: `deck-${deck.id}-${i}-${useReverse ? 'r' : 'f'}`,
      unit: deck.unit,
      topic: deck.topic,
      r,
      stem: { ta: fill(tmpl.ta, term, meaning), en: fill(tmpl.en, term, meaning) },
      correct: { ta: useReverse ? term : meaning },
      wrong,
      explanation: { ta: `${term} → ${meaning}${note ? `\n${note}` : ''}` },
      source: { kind: 'DECK' },
      keySource: 'LESSON',
    });
  } catch {
    return null;
  }
}

/** `count` fresh questions from the given decks, different each seed. */
export function deckQuestions(list: Deck[], count: number, seedKey: string): Question[] {
  const r = seeded(`deck-${seedKey}`);
  const slots = shuffle(r, list.flatMap((d) => d.items.map((_, i) => ({ d, i }))));
  const out: Question[] = [];
  for (const s of slots) {
    if (out.length >= count) break;
    const q = deckQuestion(s.d, s.i, int(r, 0, 1) as 0 | 1, r);
    if (q) out.push(q);
  }
  return out;
}

export const decksForUnits = (all: Deck[], units: Unit[]) => all.filter((d) => units.includes(d.unit));
