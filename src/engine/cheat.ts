import type { Bi, CheatSheet, Question, Unit } from '../data/types';
import { words } from '../lib/text';

/** All the Tamil/English text of a question, for keyword matching. */
export function questionText(q: Question): string {
  const parts: (Bi | undefined)[] = [q.stem, ...(q.statements ?? []), ...Object.values(q.options), ...(q.matchTable?.left ?? []), ...(q.matchTable?.right ?? [])];
  return parts.map((b) => `${b?.ta ?? ''} ${b?.en ?? ''}`).join(' ');
}

const norm = (s: string) => s.toLowerCase().replace(/_/g, '-');

/** Units whose cheat sheets may answer a question from `unit` (Tamil literature also appears in GS Unit VI). */
function family(unit: Unit): Unit[] {
  if (unit[0] === 'A') return ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'];
  if (unit === 'B6') return ['B6', 'A7'];
  if (unit[0] === 'C') return ['C1', 'C2'];
  return [unit];
}

/**
 * Best cheat sheet for a question: explicit id → topic slug → keywords found in the question
 * (same unit first, then the unit's family). Undefined when nothing fits.
 */
export function matchCheat(q: Question, cheats: CheatSheet[], byId: Map<string, CheatSheet>): CheatSheet | undefined {
  if (q.cheat && byId.has(q.cheat)) return byId.get(q.cheat);
  const topic = norm(q.topic);
  const fam = family(q.unit);
  const inFam = cheats.filter((c) => fam.includes(c.unit));
  const byTopic = inFam.filter((c) => c.id === topic || c.topics.some((t) => norm(t) === topic));
  if (byTopic.length) return byTopic.find((c) => c.unit === q.unit) ?? byTopic[0];

  const text = questionText(q).toLowerCase();
  let best: CheatSheet | undefined;
  let bestScore = 0;
  for (const c of inFam) {
    let s = 0;
    for (const k of c.keywords) if (k && text.includes(k.toLowerCase())) s += Math.min(3, 1 + k.length / 8);
    if (c.unit === q.unit) s *= 1.3;
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return bestScore >= 1 ? best : undefined;
}

/** The cheat-sheet recipe ("if you see this → do this") closest to the question. */
export function bestPattern(q: Question, c: CheatSheet): { see: string; do: string } | undefined {
  if (!c.patterns.length) return undefined;
  const qw = new Set(words(questionText(q)));
  let best = c.patterns[0];
  let bestScore = -1;
  for (const p of c.patterns) {
    const s = words(p.see).filter((w) => qw.has(w)).length;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}
