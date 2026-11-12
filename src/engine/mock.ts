import type { Bi, Part, Question, Unit } from '../data/types';
import { ALL_UNITS, CHAPTERS, KURALS, UNIT_COUNTS, decks } from '../data/content';
import { deckQuestions, decksForUnits } from './generators/deck';
import type { Blueprint } from './planner';
import { generate, type GenTopic } from './generators/aptitude';
import { kuralQuestions } from './generators/kural';
import { pickForUnit, type Stats } from './select';

export interface MockPaper {
  blueprint: Blueprint;
  questions: Question[];
  minutes: number;
  /** Pacing guide in minutes from the start: [label, endMinute]. */
  pacing: { part: Part; until: number }[];
  notes: Bi[];
}

const C1_GENS: GenTopic[] = ['simplification', 'percentage', 'hcf_lcm', 'ratio', 'si', 'ci', 'time_work', 'area', 'volume'];
const C2_GENS: GenTopic[] = ['series', 'alpha', 'direction'];

function fillUnit(unit: Unit, n: number, bank: Question[], stats: Stats, today: string, used: Set<string>, seed: string): { qs: Question[]; filled: number } {
  const qs = pickForUnit(unit, n, bank, stats, today, used);
  qs.forEach((q) => used.add(q.id));
  let filled = 0;
  if (qs.length < n && (unit === 'C1' || unit === 'C2')) {
    const gens = unit === 'C1' ? C1_GENS : C2_GENS;
    for (let i = 0; qs.length < n; i++, filled++) qs.push(generate(gens[i % gens.length], `${seed}-${unit}-${i}`));
  }
  if (qs.length < n && unit === 'A7') {
    const extra = kuralQuestions(KURALS, CHAPTERS, CHAPTERS.map((c) => c.order), Math.min(6, n - qs.length), `${seed}-A7`)
      .filter((q) => !used.has(q.id));
    extra.forEach((q) => used.add(q.id));
    filled += extra.length;
    qs.push(...extra);
  }
  if (qs.length < n) {
    const extra = deckQuestions(decksForUnits(decks(), [unit]), n - qs.length, `${seed}-${unit}`).filter((q) => !used.has(q.id));
    extra.forEach((q) => used.add(q.id));
    filled += extra.length;
    qs.push(...extra);
  }
  return { qs, filled };
}

export function assembleMock(blueprint: Blueprint, bank: Question[], stats: Stats, today: string): MockPaper {
  const used = new Set<string>();
  const notes: Bi[] = [];
  const seed = `${blueprint}-${today}`;

  if (blueprint === 'DIAGNOSTIC') {
    const real = bank
      .filter((q) => q.source.exam === 'G4-2025' && (q.part === 'A' || q.part === 'C') && !q.deletedByTnpsc)
      .sort((a, b) => (a.source.qNo ?? 0) - (b.source.qNo ?? 0));
    const partA = real.filter((q) => q.part === 'A');
    let partC = real.filter((q) => q.part === 'C');
    if (partA.length < 100) {
      notes.push({
        ta: `2025 பகுதி அ வினாக்களில் ${partA.length}/100 மட்டுமே இப்போது ஆப்பில் உள்ளன. மீதமுள்ளவை அடுத்த புதுப்பிப்பில் வரும்.`,
        en: `Only ${partA.length}/100 of the 2025 Part A questions are in the app so far. The rest arrive in the next update.`,
      });
    }
    if (partC.length < 25) {
      const add = 25 - partC.length;
      const gens = [...C1_GENS, ...C2_GENS];
      partC = [...partC, ...Array.from({ length: add }, (_, i) => generate(gens[i % gens.length], `${seed}-C-${i}`))];
      notes.push({ ta: `பகுதி இ-இல் ${add} வினாக்கள் ஆப் உருவாக்கியவை.`, en: `${add} Part C questions are app-generated stand-ins.` });
    }
    const questions = [...partA, ...partC];
    const minutes = Math.max(10, Math.round(questions.length * 0.8));
    return { blueprint, questions, minutes, pacing: [{ part: 'A', until: Math.round(partA.length * 0.7) }, { part: 'C', until: minutes }], notes };
  }

  const units: Unit[] = blueprint === 'TAMIL_100' ? ALL_UNITS.filter((u) => u.startsWith('A')) : ALL_UNITS;
  const questions: Question[] = [];
  let missing = 0;
  let generated = 0;
  for (const u of units) {
    const { qs, filled } = fillUnit(u, UNIT_COUNTS[u], bank, stats, today, used, seed);
    missing += UNIT_COUNTS[u] - qs.length;
    generated += filled;
    questions.push(...qs);
  }
  if (generated > 0) notes.push({ ta: `${generated} வினாக்கள் ஆப் உருவாக்கியவை (திறனறிவு, திருக்குறள், நினைவு அட்டைகள்).`, en: `${generated} questions are app-generated (aptitude, Thirukkural, memory decks).` });
  if (missing > 0) {
    notes.push({
      ta: `உண்மையான வினாக்கள் இன்னும் போதவில்லை: ${missing} இடங்கள் காலியாக உள்ளன. அதனால் இந்தத் தேர்வு ${questions.length} வினாக்களுடன் நடக்கிறது.`,
      en: `Not enough real questions yet: ${missing} slots are short, so this mock has ${questions.length} questions.`,
    });
  }
  if (blueprint === 'TAMIL_100') {
    return { blueprint, questions, minutes: 70, pacing: [{ part: 'A', until: 70 }], notes };
  }
  return {
    blueprint,
    questions,
    minutes: 180,
    pacing: [{ part: 'A', until: 70 }, { part: 'C', until: 100 }, { part: 'B', until: 160 }],
    notes,
  };
}
