import type { Choice, Confidence, ErrorReason, Kural, Letter, Mode, Question, Unit } from './types';
import { db, getSetting, setSetting, type AttemptRow, type SessionRow } from './db';
import { KURALS, contentQuestion, lessons, realBank } from './content';
import { dayInfo, START } from './schedule';
import { buildSteps, plannedMinutes, type PlanCtx } from '../engine/planner';
import { isCorrect } from '../engine/scoring';
import { INTERVALS, onMistake, onReviewed } from '../engine/srs';
import type { Stats } from '../engine/select';
import { addDays, diffDays, todayISO } from '../lib/date';

/** Real questions (past papers, current affairs, lesson checks). Generated ones are created on demand. */
export const bank = (): Question[] => realBank();

export async function getQuestion(id: string): Promise<Question | undefined> {
  return contentQuestion(id) ?? (await db.qcache.get(id));
}

export async function getQuestions(ids: string[]): Promise<Question[]> {
  const out: Question[] = [];
  for (const id of ids) {
    const q = await getQuestion(id);
    if (q) out.push(q);
  }
  return out;
}

/** Generated questions are cached so they can come back in reviews. */
export async function cacheQuestions(qs: Question[]): Promise<void> {
  const gen = qs.filter((q) => !contentQuestion(q.id));
  if (gen.length) await db.qcache.bulkPut(gen);
}

// ---------- XP ----------

export async function addXp(n: number, date = todayISO()): Promise<void> {
  if (n <= 0) return;
  await setSetting('xpTotal', (await getSetting('xpTotal', 0)) + n);
  await setSetting(`xp:${date}`, (await getSetting(`xp:${date}`, 0)) + n);
}
export const xpTotal = () => getSetting('xpTotal', 0);
export const xpToday = (date = todayISO()) => getSetting(`xp:${date}`, 0);

// ---------- attempts ----------

export async function recordAttempt(p: {
  q: Question;
  chosen: Choice;
  eliminated: Letter[];
  confidence: Confidence;
  ms: number;
  mode: Mode;
  sessionId?: string;
  stepId?: string;
}): Promise<boolean> {
  const date = todayISO();
  const correct = isCorrect(p.chosen, p.q.answer, p.q.acceptedAnswers);
  const row: AttemptRow = {
    questionId: p.q.id, chosen: p.chosen, eliminated: p.eliminated, confidence: p.confidence, ms: p.ms,
    correct, mode: p.mode, sessionId: p.sessionId, stepId: p.stepId, date, at: Date.now(),
    part: p.q.part, unit: p.q.unit, topic: p.q.topic,
  };
  await db.attempts.add(row);
  await cacheQuestions([p.q]);
  if (p.mode === 'SPEED') return correct;
  const existing = await db.reviews.get(p.q.id);
  if ((p.mode === 'REVIEW' || p.mode === 'WARMUP') && existing) {
    const next = onReviewed(existing, correct, date);
    if (next) await db.reviews.put(next);
    else await db.reviews.delete(p.q.id);
  } else if (!correct || p.confidence === 'GUESS') {
    await db.reviews.put(onMistake(existing, p.q.id, date));
  }
  return correct;
}

export async function tagReason(attemptId: number, questionId: string, reason: ErrorReason): Promise<void> {
  await db.attempts.update(attemptId, { reason });
  const r = await db.reviews.get(questionId);
  if (r) await db.reviews.put({ ...r, reason });
}

export async function dueReviewIds(date = todayISO(), max = 50): Promise<string[]> {
  const rows = await db.reviews.where('nextReview').belowOrEqual(date).toArray();
  return rows.sort((a, b) => a.box - b.box || (a.nextReview < b.nextReview ? -1 : 1)).slice(0, max).map((r) => r.questionId);
}

export async function loadStats(): Promise<Stats> {
  const rows = await db.attempts.orderBy('id').toArray();
  const byQuestion = new Map<string, { attempts: number; correctStreak: number; lastDate: string; lastCorrect: boolean }>();
  const topic = new Map<string, { c: number; t: number }>();
  for (const a of rows) {
    const s = byQuestion.get(a.questionId) ?? { attempts: 0, correctStreak: 0, lastDate: a.date, lastCorrect: false };
    s.attempts++;
    s.correctStreak = a.correct ? s.correctStreak + 1 : 0;
    s.lastDate = a.date;
    s.lastCorrect = a.correct;
    byQuestion.set(a.questionId, s);
    const t = topic.get(a.topic) ?? { c: 0, t: 0 };
    t.t++;
    if (a.correct) t.c++;
    topic.set(a.topic, t);
  }
  const topicAcc = new Map<string, number>();
  topic.forEach((v, k) => topicAcc.set(k, v.c / v.t));
  return { byQuestion, topicAcc };
}

export async function unitAccuracy(): Promise<Map<Unit, { c: number; t: number }>> {
  const m = new Map<Unit, { c: number; t: number }>();
  await db.attempts.each((a) => {
    if (a.mode === 'SPEED') return;
    const v = m.get(a.unit) ?? { c: 0, t: 0 };
    v.t++;
    if (a.correct) v.c++;
    m.set(a.unit, v);
  });
  return m;
}

// ---------- Thirukkural cards (spaced repetition, 1/3/7/14 days) ----------

/** Kurals in syllabus order that have not been learned yet. */
export async function nextNewKurals(n: number): Promise<Kural[]> {
  const known = new Set((await db.kuralCards.toArray()).map((c) => c.n));
  const ordered = [...KURALS].sort((a, b) => a.order - b.order || a.n - b.n);
  return ordered.filter((k) => !known.has(k.n)).slice(0, n);
}

export async function dueKuralCards(date = todayISO(), max = 12): Promise<Kural[]> {
  const due = await db.kuralCards.where('nextReview').belowOrEqual(date).toArray();
  const ns = due.sort((a, b) => a.box - b.box).slice(0, max).map((c) => c.n);
  return KURALS.filter((k) => ns.includes(k.n));
}

export async function learnKural(n: number, date = todayISO()): Promise<void> {
  if (await db.kuralCards.get(n)) return;
  await db.kuralCards.put({ n, box: 1, nextReview: addDays(date, INTERVALS[0]), learnedAt: date });
}

export async function reviewKural(n: number, knew: boolean, date = todayISO()): Promise<void> {
  const c = await db.kuralCards.get(n);
  if (!c) return learnKural(n, date);
  const box = knew ? Math.min(INTERVALS.length, c.box + 1) : 1;
  await db.kuralCards.put({ ...c, box, nextReview: addDays(date, knew ? INTERVALS[box - 1] * (c.box >= INTERVALS.length ? 2 : 1) : 1) });
}

export const kuralsLearned = () => db.kuralCards.count();

// ---------- lessons & sessions ----------

export async function nextLessonIds(date: string): Promise<string[]> {
  const done = new Set((await db.lessonsDone.toArray()).map((d) => d.id));
  const week = dayInfo(date).week.no;
  return lessons().filter((l) => l.week <= week && !done.has(l.id)).map((l) => l.id);
}

export async function planContext(date: string): Promise<PlanCtx> {
  return {
    kuralsLearned: await kuralsLearned(),
    dueKurals: (await dueKuralCards(date, 99)).length,
    nextLessons: await nextLessonIds(date),
    dueReviews: (await dueReviewIds(date)).length,
  };
}

/** Today's session: created once per day and then resumed. */
export async function ensureSession(date = todayISO()): Promise<SessionRow> {
  const existing = await db.sessions.get(date);
  if (existing && existing.steps.every((s) => s.kind !== ('TAG' as never) && s.kind !== ('KURAL_LEARN' as never))) return existing;
  const info = dayInfo(date);
  const steps = buildSteps(info, await planContext(date));
  const row: SessionRow = {
    date, dayType: info.type, steps, index: 0, stepSec: existing?.stepSec ?? {}, stepQuestions: {}, done: [], skipped: [],
    activeSec: existing?.activeSec ?? 0, completed: steps.length === 0,
  };
  await db.sessions.put(row);
  return row;
}

export async function previewSteps(date = todayISO()) {
  const existing = await db.sessions.get(date);
  if (existing && existing.steps.every((s) => s.kind !== ('TAG' as never) && s.kind !== ('KURAL_LEARN' as never))) {
    return { steps: existing.steps, session: existing };
  }
  const steps = buildSteps(dayInfo(date), await planContext(date));
  return { steps, session: undefined, minutes: plannedMinutes(steps) };
}

export async function markLessonDone(id: string) {
  await db.lessonsDone.put({ id, at: todayISO() });
}

export async function markKuralLearned(order: number) {
  await db.kuralLearned.put({ order, at: todayISO() });
}

export async function studiedMinutes(): Promise<number> {
  const all = await db.sessions.toArray();
  return Math.round(all.reduce((t, s) => t + s.activeSec, 0) / 60);
}

/** Consecutive days (ending today or yesterday) with at least 10 active minutes. */
export async function streak(today = todayISO()): Promise<number> {
  const all = await db.sessions.toArray();
  const active = new Set(all.filter((s) => s.activeSec >= 600).map((s) => s.date));
  let d = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(d) && diffDays(START, d) >= 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export async function bestSpeed(): Promise<number> {
  return getSetting('speedBest', 0);
}
export async function saveSpeed(score: number): Promise<boolean> {
  const best = await bestSpeed();
  if (score > best) {
    await setSetting('speedBest', score);
    return true;
  }
  return false;
}
