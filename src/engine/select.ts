import type { Deck, Question, Unit } from '../data/types';
import { UNIT_COUNTS, caQuestions, decks } from '../data/content';
import { diffDays } from '../lib/date';
import { seeded, shuffle } from '../lib/rng';
import { generate, type GenTopic } from './generators/aptitude';
import { deckQuestions, decksForUnits } from './generators/deck';
import { shuffleOptions } from './shuffle';

export { shuffleOptions };

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
 * score = 0.35 relevance + 0.25 recurrence + 0.25 weakness + 0.15 recency (+ small random jitter so
 * the order is never identical two days running). Questions answered correctly twice in a row in the
 * last 7 days are skipped.
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
  const jitter = seeded(`rank-${today}`);

  return pool
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
      return { q, s: 0.35 * relevance + 0.25 * recurrence + 0.25 * weakness + 0.15 * recency + seenToday + 0.12 * jitter() };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.q);
}

/**
 * A practice set for this week's units: ranked real questions (≈50%), memory-deck questions (≈25%)
 * and freshly generated aptitude questions (≈25%), shuffled together.
 */
export function assembleDrill(opts: {
  units: Unit[];
  gens: GenTopic[];
  count: number;
  seedKey: string;
  bank: Question[];
  stats: Stats;
  today: string;
  /** Up to two recent current-affairs questions are mixed in. */
  news?: boolean;
}): Question[] {
  const { units, gens, count, seedKey, bank, stats, today } = opts;
  const pool = rankQuestions(bank.filter((q) => units.includes(q.unit)), stats, today, bank);
  const unitDecks = decksForUnits(decks(), units);
  const recent = opts.news ? recentNews(today, 2, seedKey) : [];
  const genShare = gens.length ? Math.round(count * 0.25) : 0;
  const deckShare = unitDecks.length ? Math.round(count * 0.25) : 0;
  const out: Question[] = pool.slice(0, Math.max(0, count - genShare - deckShare - recent.length));
  out.push(...deckQuestions(unitDecks, count - out.length - genShare - recent.length, seedKey));
  for (let i = 0; out.length < count - recent.length && gens.length; i++) out.push(generate(gens[i % gens.length], `${seedKey}-${i}`));
  if (out.length < count - recent.length) out.push(...deckQuestions(decks(), count - recent.length - out.length, `${seedKey}-any`));
  out.push(...recent);
  return shuffle(seeded(seedKey), out).map((q) => (q.source.kind === 'PYQ' ? shuffleOptions(q, seedKey) : q));
}

/** Current-affairs questions from the last three days, not answered yet today. */
function recentNews(today: string, n: number, seedKey: string): Question[] {
  const fresh = caQuestions().filter((q) => q.source.date && diffDays(q.source.date, today) <= 3);
  return shuffle(seeded(`news-${seedKey}`), fresh).slice(0, n);
}

/**
 * Warm-up: only things already met. Due mistakes first, then questions from lessons already done,
 * memory decks from weeks already studied, and aptitude topics already taught.
 */
export function assembleWarmup(opts: {
  due: Question[];
  count: number;
  seedKey: string;
  learned: Question[];
  decks: Deck[];
  gens: GenTopic[];
}): Question[] {
  const { due, count, seedKey, learned, gens } = opts;
  const r = seeded(`warm-${seedKey}`);
  const out = due.slice(0, count);
  const seen = new Set(out.map((q) => q.id));
  const fromLessons = shuffle(r, learned.filter((q) => !seen.has(q.id))).slice(0, Math.max(0, Math.min(2, count - out.length)));
  out.push(...fromLessons.map((q) => (q.source.kind === 'PYQ' ? shuffleOptions(q, seedKey) : q)));
  out.push(...deckQuestions(opts.decks, Math.max(0, count - out.length - 1), `warm-${seedKey}`));
  for (let i = 0; out.length < count; i++) out.push(generate(gens[i % Math.max(1, gens.length)] ?? 'simplification', `warm-${seedKey}-${i}`));
  return out;
}

/** Pick `n` questions for a unit, best first; returns fewer if the bank is short. */
export function pickForUnit(unit: Unit, n: number, bank: Question[], stats: Stats, today: string, exclude: Set<string>): Question[] {
  return rankQuestions(bank.filter((q) => q.unit === unit && !exclude.has(q.id)), stats, today, bank).slice(0, n);
}
