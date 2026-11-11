import type { Choice, Confidence, ErrorReason, Letter, Mode, Question } from './types';
import { db, type AttemptRow, type SessionRow } from './db';
import { LESSONS, LESSON_QUESTIONS, PYQ, contentQuestion } from './content';
import { dayInfo, START } from './schedule';
import { buildSteps, plannedMinutes } from '../engine/planner';
import { isCorrect } from '../engine/scoring';
import { onMistake, onReviewed } from '../engine/srs';
import type { Stats } from '../engine/select';
import { addDays, diffDays, todayISO } from '../lib/date';

export const BANK: Question[] = [...PYQ, ...LESSON_QUESTIONS];

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
  const existing = await db.reviews.get(p.q.id);
  if (p.mode === 'REVIEW' && existing) {
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

export async function nextLessonIds(date: string): Promise<string[]> {
  const done = new Set((await db.lessonsDone.toArray()).map((d) => d.id));
  const week = dayInfo(date).week.no;
  return LESSONS.filter((l) => l.week <= week && !done.has(l.id)).map((l) => l.id);
}

export async function planContext(date: string) {
  const learnedOrders = (await db.kuralLearned.toArray()).map((k) => k.order);
  const nextLessons = await nextLessonIds(date);
  const dueReviews = (await dueReviewIds(date)).length;
  return { learnedOrders, nextLessons, dueReviews };
}

/** Today's session: created once per day and then resumed. */
export async function ensureSession(date = todayISO()): Promise<SessionRow> {
  const existing = await db.sessions.get(date);
  if (existing) return existing;
  const info = dayInfo(date);
  const steps = buildSteps(info, await planContext(date));
  const row: SessionRow = {
    date, dayType: info.type, steps, index: 0, stepSec: {}, stepQuestions: {}, done: [], skipped: [], activeSec: 0,
    completed: steps.length === 0,
  };
  await db.sessions.put(row);
  return row;
}

export async function previewSteps(date = todayISO()) {
  const existing = await db.sessions.get(date);
  if (existing) return { steps: existing.steps, session: existing };
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
