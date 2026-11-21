import type { Bi, Kural, KuralChapter, Question } from '../../data/types';
import { type Rng, int, sample, seeded, shuffle } from '../../lib/rng';
import { makeMcq } from '../make';

/** What each syllabus chapter is about (by syllabus order 1–20). */
export const CHAPTER_THEME: Record<number, string> = {
  1: 'நல்லொழுக்கத்தின் சிறப்பு; ஒழுக்கம் உயிரினும் மேலானது',
  2: 'பொறுமை; பிறர் செய்த தீங்கைப் பொறுத்துக்கொள்ளுதல்',
  3: 'மன எழுச்சி; தளராத ஊக்கமும் முயற்சியும்',
  4: 'விருந்தினரை மகிழ்ச்சியுடன் வரவேற்றுப் போற்றுதல்',
  5: 'அறத்தின் (நற்செயலின்) வலிமையும் சிறப்பும்',
  6: 'இல்லாதவர்க்குக் கொடுத்தல் (கொடை)',
  7: 'அறிவில் சிறந்த பெரியோரைத் துணையாகக் கொள்ளுதல்',
  8: 'ஒரு செயலைச் செய்து முடிக்கும் முறை',
  9: 'அவையில் (சபையில்) அஞ்சாமல் பேசுதல்',
  10: 'பிறரிடம் இரக்கமும் கருணையும் காட்டுதல்',
  11: 'அன்பின் சிறப்பு',
  12: 'கற்க வேண்டியவற்றைக் கற்றல்; கல்வியின் சிறப்பு',
  13: 'நண்பர், பகைவர் என்று பாராமல் நடுநிலையோடு இருத்தல்',
  14: 'வெளியே துறவி போல் நடித்து உள்ளே தீயவராக இருத்தல் (போலித் துறவு)',
  15: 'கல்லாமையின் இழிவு',
  16: 'நேர்மையான, நீதியான ஆட்சி',
  17: 'எல்லோரிடமும் நற்பண்புடன் பழகுதல்',
  18: 'நண்பரை ஆராய்ந்து தேர்ந்தெடுத்தல்',
  19: 'ஒருவர் இல்லாத இடத்தில் அவரைப் பற்றித் தீமை பேசாமை',
  20: 'எல்லா உயிர்களிடத்தும் அருள் காட்டுதல்',
};

/** Word stems that often appear inside a chapter's own kurals and point to its name. */
const CHAPTER_CLUE: Record<number, string[]> = {
  1: ['ஒழுக்க'], 2: ['பொறு', 'பொறை'], 3: ['ஊக்க', 'உள்ள'], 4: ['விருந்'], 5: ['அறம', 'அறத்', 'அறன'],
  6: ['ஈகை', 'ஈத', 'ஈவ', 'இரந்'], 7: ['பெரியா'], 8: ['வினை'], 9: ['அவை'], 10: ['கண்ணோட்ட'],
  11: ['அன்ப', 'அன்பு'], 12: ['கற்', 'கல்வி'], 13: ['நடுவ'], 14: ['வஞ்ச', 'தவ'], 15: ['கல்லா'],
  16: ['கோல்', 'கோன்'], 17: ['பண்ப'], 18: ['நட்'], 19: ['புறங்', 'புறன்'], 20: ['அருள்'],
};

export type Meaning = (n: number) => string | undefined;

/** Kural questions in the styles TNPSC uses: which chapter, complete the couplet, match the meaning. */
export function kuralQuestions(
  kurals: Kural[],
  chapters: KuralChapter[],
  orders: number[],
  count: number,
  seedKey: string,
  meaning?: Meaning,
): Question[] {
  return kuralQuestionsFor(kurals.filter((k) => orders.includes(k.order)), kurals, chapters, count, seedKey, meaning);
}

/**
 * Questions about a specific set of kurals (e.g. today's new ones plus the ones due for review).
 * Each kural appears at most once until every kural in the pool has had a question.
 */
export function kuralQuestionsFor(pool: Kural[], kurals: Kural[], chapters: KuralChapter[], count: number, seedKey: string, meaning?: Meaning): Question[] {
  if (pool.length === 0) return [];
  const r = seeded(`kural-${seedKey}`);
  const picked: Kural[] = [];
  while (picked.length < count) picked.push(...shuffle(r, pool));
  return picked.slice(0, count).map((k, i) => {
    try {
      return build(k, (i + int(r, 0, 4)) % 5, kurals, chapters, r, meaning);
    } catch {
      return build(k, 0, kurals, chapters, r, meaning); // "which chapter?" always has distinct options
    }
  });
}

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

function build(k: Kural, type: number, kurals: Kural[], chapters: KuralChapter[], r: Rng, meaning?: Meaning): Question {
  const ch = chapters.find((c) => c.order === k.order)!;
  const sameChapter = kurals.filter((x) => x.order === k.order && x.n !== k.n);
  const mv = meaning?.(k.n);
  const clue = (CHAPTER_CLUE[k.order] ?? []).find((s) => `${k.l1} ${k.l2}`.includes(s));
  const explanation = {
    ta: `குறள் ${k.n} · ${ch.name} அதிகாரம் (${ch.paal})\n${k.l1}\n${k.l2}${mv ? `\n\nபொருள்: ${mv}` : ''}`,
    en: `Kural ${k.n} · ${ch.en}. ${k.pope}`,
    rule: { ta: `${ch.name} = ${CHAPTER_THEME[k.order]}. இந்த அதிகாரத்தின் குறள்கள் ${ch.start}–${ch.end}.` },
    tip: {
      ta: clue
        ? `குறளிலேயே "${clue}…" என்று தொடங்கும் சொல் உள்ளது; அது "${ch.name}" அதிகாரத்தை நினைவூட்டும்.`
        : `குறளின் கருத்தை அதிகாரத்தின் கருத்தோடு (${CHAPTER_THEME[k.order]}) பொருத்திப் பாருங்கள்.`,
    },
  };
  const base = { unit: 'A7' as const, topic: 'thirukkural', r, explanation, source: { kind: 'GENERATED' as const, kural: k.n }, cheat: 'thirukkural' };
  const lineOf = (x: Kural): Bi => ({ ta: `குறள் ${x.n} (${chapters.find((c) => c.order === x.order)?.name}) இன் அடி: ${x.l1} / ${x.l2}` });

  // Some types need a Tamil meaning or a usable blank; fall back to the chapter question.
  if (type === 2 && !mv) type = 0;

  if (type === 1 && sameChapter.length >= 3) {
    const others = shuffle(r, sameChapter);
    return makeMcq({
      ...base,
      id: `gen-kural-l2-${k.n}`,
      stem: { ta: `“${k.l1} …”\nஇக்குறளின் இரண்டாம் அடி எது?` },
      hint: { ta: 'முதல் அடியின் கடைசிச் சொல்லின் ஓசையும் (எதுகை) கருத்தும் இரண்டாம் அடியோடு தொடரும். குறளை மனதுக்குள் ஒருமுறை சொல்லிப் பாருங்கள்.' },
      correct: { ta: k.l2 },
      wrong: others.map((x) => ({ ta: x.l2 })),
      wrongWhy: others.map(lineOf),
    });
  }
  if (type === 2 && mv && sameChapter.length >= 3) {
    const others = shuffle(r, sameChapter);
    return makeMcq({
      ...base,
      id: `gen-kural-mean-${k.n}`,
      stem: { ta: `“${mv}”\nஇந்தப் பொருள் தரும் குறள் எது?` },
      hint: { ta: 'பொருளில் உள்ள முக்கியச் சொல் ஒன்றைக் குறளில் தேடுங்கள்.' },
      correct: { ta: `${k.l1} ${k.l2}` },
      wrong: others.map((x) => ({ ta: `${x.l1} ${x.l2}` })),
      wrongWhy: others.map((x) => ({ ta: `குறள் ${x.n}${meaning?.(x.n) ? `: ${short(meaning(x.n)!)}` : ''}` })),
    });
  }
  if (type === 3 && sameChapter.length >= 3) {
    const others = shuffle(r, sameChapter);
    return makeMcq({
      ...base,
      id: `gen-kural-l1-${k.n}`,
      stem: { ta: `“… ${k.l2}”\nஇக்குறளின் முதல் அடி எது?` },
      hint: { ta: 'இரண்டாம் அடியின் கருத்தைத் தொடங்கி வைக்கும் முதல் அடியைத் தேடுங்கள்; குறளை முழுதாகச் சொல்லிப் பாருங்கள்.' },
      correct: { ta: k.l1 },
      wrong: others.map((x) => ({ ta: x.l1 })),
      wrongWhy: others.map(lineOf),
    });
  }
  if (type === 4) {
    // Fill the blank: hide the longest word of the first line; distractors are words from other kurals.
    const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);
    const w1 = wordsOf(k.l1);
    const target = [...w1].sort((a, b) => b.length - a.length)[0];
    const pool = kurals.filter((x) => x.n !== k.n).flatMap((x) => wordsOf(x.l1).map((w) => ({ w, x }))).filter((p) => p.w !== target && p.w.length >= 3);
    const others = sample(r, pool, 8);
    if (target && others.length >= 3) {
      return makeMcq({
        ...base,
        id: `gen-kural-blank-${k.n}`,
        stem: { ta: `கோடிட்ட இடத்தை நிரப்புக:\n“${k.l1.replace(target, '________')}\n${k.l2}”` },
        hint: { ta: 'குறளை உரக்கச் சொல்லிப் பாருங்கள்; ஓசை (சீர், எதுகை) பொருந்தும் சொல்லே விடை.' },
        correct: { ta: target },
        wrong: others.map((p) => ({ ta: p.w })),
        wrongWhy: others.map((p) => ({ ta: `இச்சொல் குறள் ${p.x.n}-இல் வருகிறது.` })),
      });
    }
  }
  const others = sample(r, chapters.filter((c) => c.order !== k.order), 3);
  return makeMcq({
    ...base,
    id: `gen-kural-ch-${k.n}`,
    stem: { ta: `“${k.l1}\n${k.l2}”\nஇக்குறள் இடம்பெறும் அதிகாரம் எது?` },
    hint: { ta: 'குறள் என்ன சொல்கிறது என்று ஒரு வரியில் நினையுங்கள்; அந்தக் கருத்தே அதிகாரப் பெயர். குறளில் அதிகாரப் பெயரின் சொல் வருகிறதா என்றும் பாருங்கள்.' },
    correct: { ta: ch.name },
    wrong: others.map((c) => ({ ta: c.name })),
    wrongWhy: others.map((c) => ({ ta: `${c.name}: ${CHAPTER_THEME[c.order]}.` })),
  });
}
