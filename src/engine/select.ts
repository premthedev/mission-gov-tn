import type { Part, Question, Unit } from '../data/types';
import { UNIT_COUNTS } from '../data/content';
import { diffDays } from '../lib/date';
import { seeded, shuffle } from '../lib/rng';
import { generate, type GenTopic } from './generators/aptitude';

export interface QStat {
  attempts: number;
  correctStreak: number;
  lastDate: string;
  lastCorrect: boolean;
}

export interface Stats {
  byQuestion: Map<string, QStat>;
  /** accuracy 0..1 per topic */
  topicAcc: Map<string, number>;
}

/**
 * "Best questions first":
 * score = 0.35 relevance + 0.25 recurrence + 0.25 weakness + 0.15 recency.
 * Questions answered correctly twice in a row in the last 7 days are skipped.
 */
export function rankQuestions(pool: Question[], stats: Stats, today: string, bank: Question[]): Question[] {
  const yearsByTopic = new Map<string, Set<number>>();
  for (const q of bank) {
    if (q.source.kind !== 'PYQ' || !q.source.year) continue;
    const s = yearsByTopic.get(q.topic) ?? new Set<number>();
    s.add(q.source.year);
    yearsByTopic.set(q.topic, s);
  }
  const maxYears = Math.max(1, ...[...yearsByTopic.values()].map((s) => s.size));
  const maxUnit = Math.max(...Object.values(UNIT_COUNTS));

  const scored = pool
    .filter((q) => !q.deletedByTnpsc && q.syllabusEra !== 'OFF_SYLLABUS')
    .filter((q) => {
      const st = stats.byQuestion.get(q.id);
      return !(st && st.correctStreak >= 2 && diffDays(st.lastDate, today) < 7);
    })
    .map((q) => {
      const era = q.syllabusEra === 'CURRENT' ? 1 : 0.7;
      const relevance = era * (UNIT_COUNTS[q.unit] / maxUnit);
      const recurrence = (yearsByTopic.get(q.topic)?.size ?? 1) / maxYears;
      const acc = stats.topicAcc.get(q.topic);
      const weakness = acc === undefined ? 0.5 : 1 - acc;
      const year = q.source.year ?? 2026;
      const recency = year >= 2025 ? 1 : 0.3 + (0.7 * Math.max(0, year - 2012)) / 13;
      const seenToday = stats.byQuestion.get(q.id)?.lastDate === today ? -1 : 0;
      return { q, s: 0.35 * relevance + 0.25 * recurrence + 0.25 * weakness + 0.15 * recency + seenToday };
    });
  return scored.sort((a, b) => b.s - a.s).map((x) => x.q);
}

/** Mix ranked real questions (≈60%) with fresh generated ones for the week's aptitude topics. */
export function assembleDrill(opts: {
  units: Unit[];
  gens: GenTopic[];
  count: number;
  seedKey: string;
  bank: Question[];
  stats: Stats;
  today: string;
}): Question[] {
  const { units, gens, count, seedKey, bank, stats, today } = opts;
  const pool = rankQuestions(bank.filter((q) => units.includes(q.unit)), stats, today, bank);
  const realTarget = gens.length ? Math.ceil(count * 0.6) : count;
  const real = pool.slice(0, realTarget);
  const out: Question[] = [...real];
  for (let i = 0; out.length < count && gens.length; i++) {
    out.push(generate(gens[i % gens.length], `${seedKey}-${i}`));
  }
  return shuffle(seeded(seedKey), out);
}

/** Pick `n` questions for a unit, best first; returns fewer if the bank is short. */
export function pickForUnit(unit: Unit, n: number, bank: Question[], stats: Stats, today: string, exclude: Set<string>): Question[] {
  return rankQuestions(bank.filter((q) => q.unit === unit && !exclude.has(q.id)), stats, today, bank).slice(0, n);
}

export const partOrder: Part[] = ['A', 'B', 'C'];
