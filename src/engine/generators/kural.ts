import type { Kural, KuralChapter, Question } from '../../data/types';
import { type Rng, int, sample, seeded, shuffle } from '../../lib/rng';
import { makeMcq } from '../make';

/** Kural questions in the styles TNPSC uses: which chapter, complete the couplet, match the meaning. */
export function kuralQuestions(
  kurals: Kural[],
  chapters: KuralChapter[],
  orders: number[],
  count: number,
  seedKey: string,
): Question[] {
  const pool = kurals.filter((k) => orders.includes(k.order));
  if (pool.length === 0) return [];
  const r = seeded(`kural-${seedKey}`);
  const picked: Kural[] = [];
  while (picked.length < count) picked.push(...shuffle(r, pool));
  return picked.slice(0, count).map((k, i) => build(k, (i + int(r, 0, 2)) % 3, kurals, chapters, r));
}

function build(k: Kural, type: number, kurals: Kural[], chapters: KuralChapter[], r: Rng): Question {
  const ch = chapters.find((c) => c.order === k.order)!;
  const sameChapter = kurals.filter((x) => x.order === k.order && x.n !== k.n);
  const explanation = {
    ta: `குறள் ${k.n} · அதிகாரம்: ${ch.name}\n${k.l1}\n${k.l2}`,
    en: `Kural ${k.n} · ${ch.en}\n${k.pope}`,
  };
  const base = { unit: 'A7' as const, topic: 'thirukkural', r, explanation };

  if (type === 0 || chapters.length < 4) {
    const others = sample(r, chapters.filter((c) => c.order !== k.order), 3);
    return makeMcq({
      ...base,
      id: `gen-kural-ch-${k.n}`,
      stem: { ta: `“${k.l1} ${k.l2}”\nஇக்குறள் இடம்பெறும் அதிகாரம் எது?`, en: 'Which chapter (அதிகாரம்) is this kural from?' },
      correct: { ta: ch.name, en: ch.en },
      wrong: others.map((c) => ({ ta: c.name, en: c.en })),
    });
  }
  if (type === 1) {
    const others = sample(r, sameChapter, 3);
    return makeMcq({
      ...base,
      id: `gen-kural-l2-${k.n}`,
      stem: { ta: `“${k.l1} ...”\nஇக்குறளின் இரண்டாம் அடி எது?`, en: 'Choose the second line of this kural.' },
      correct: { ta: k.l2 },
      wrong: others.map((x) => ({ ta: x.l2 })),
    });
  }
  const others = sample(r, sameChapter, 3);
  return makeMcq({
    ...base,
    id: `gen-kural-mean-${k.n}`,
    stem: { ta: 'கீழ்க்காணும் பொருள் தரும் குறள் எது?', en: `“${k.pope}”\nWhich kural has this meaning?` },
    correct: { ta: `${k.l1} ${k.l2}` },
    wrong: others.map((x) => ({ ta: `${x.l1} ${x.l2}` })),
  });
}
