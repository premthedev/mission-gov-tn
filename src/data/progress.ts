import type { Choice, Confidence, ErrorReason, Kural, Letter, Mode, Question, Unit } from './types';
import { db, getSetting, setSetting, type AttemptRow, type SessionRow } from './db';
import { KURALS, contentQuestion, lessons, realBank } from './content';
import { dayInfo, START } from './schedule';
import { bonusSteps, buildSteps, plannedMinutes, type PlanCtx } from '../engine/planner';
import { isCorrect } from '../engine/scoring';
import { onMistake, onReviewed } from '../engine/srs';
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
  // Thirukkural questions grade the kural itself (its own revision schedule), not the question.
  if (p.q.source.kural) {
    await reviewKural(p.q.source.kural, correct, date);
    return correct;
  }
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

// ---------- Thirukkural (new kurals as cards; revision only through quiz questions) ----------

/** Days until a kural comes back in the quiz, by box. A wrong answer puts it back in box 1. */
export const KURAL_INTERVALS = [2, 5, 10, 21];

/** Kurals in syllabus order that have not been learned yet. */
export async function nextNewKurals(n: number): Promise<Kural[]> {
  const known = new Set((await db.kuralCards.toArray()).map((c) => c.n));
  const ordered = [...KURALS].sort((a, b) => a.order - b.order || a.n - b.n);
  return ordered.filter((k) => !known.has(k.n)).slice(0, n);
}

export async function dueKuralCards(date = todayISO(), max = 12): Promise<Kural[]> {
  const due = await db.kuralCards.where('nextReview').belowOrEqual(date).toArray();
  const ns = due.sort((a, b) => a.box - b.box || (a.nextReview < b.nextReview ? -1 : 1)).slice(0, max).map((c) => c.n);
  return KURALS.filter((k) => ns.includes(k.n));
}

/** Marks a kural as learned the moment it is shown, so it is never shown as "new" again. */
export async function learnKural(n: number, date = todayISO()): Promise<void> {
  if (await db.kuralCards.get(n)) return;
  await db.kuralCards.put({ n, box: 1, nextReview: addDays(date, KURAL_INTERVALS[0]), learnedAt: date });
}

/** A quiz answer on a kural moves it up a box (longer gap) or back to box 1. */
export async function reviewKural(n: number, correct: boolean, date = todayISO()): Promise<void> {
  const c = await db.kuralCards.get(n);
  if (!c) return learnKural(n, date);
  if (c.learnedAt === date && correct) return; // today's new kural: keep its first gap
  const box = correct ? Math.min(KURAL_INTERVALS.length, c.box + 1) : 1;
  const gap = correct ? KURAL_INTERVALS[box - 1] * (c.box >= KURAL_INTERVALS.length ? 2 : 1) : 1;
  await db.kuralCards.put({ ...c, box, nextReview: addDays(date, gap) });
}

/**
 * Today's kural set for a session step, fixed once chosen: the new kurals (marked learned straight away)
 * and the kurals due for revision. Resuming the step later today shows the same set.
 */
export async function kuralPlan(date: string, stepId: string, newCount: number): Promise<{ fresh: Kural[]; due: Kural[] }> {
  const key = `kuralDay:${date}:${stepId}`;
  let saved = await getSetting<{ fresh: number[]; due: number[] } | null>(key, null);
  if (!saved) {
    const due = await dueKuralCards(date, 8);
    const fresh = await nextNewKurals(newCount);
    for (const k of fresh) await learnKural(k.n, date);
    saved = { fresh: fresh.map((k) => k.n), due: due.map((k) => k.n) };
    await setSetting(key, saved);
  }
  const byN = (ns: number[]) => ns.map((n) => KURALS.find((k) => k.n === n)!).filter(Boolean);
  return { fresh: byN(saved.fresh), due: byN(saved.due) };
}

export const kuralsLearned = () => db.kuralCards.count();

// ---------- topics already introduced (first-time topic cards) ----------

export async function topicsSeen(): Promise<Set<string>> {
  return new Set(await getSetting<string[]>('topicsSeen', []));
}
export async function markTopicSeen(id: string): Promise<void> {
  const s = await getSetting<string[]>('topicsSeen', []);
  if (!s.includes(id)) await setSetting('topicsSeen', [...s, id]);
}

// ---------- lessons & sessions ----------

export const doneLessonIds = async () => new Set((await db.lessonsDone.toArray()).map((d) => d.id));

/** Lessons not done yet: this week and earlier first (backlog), then next week's (read ahead). */
export async function nextLessonIds(date: string, aheadWeeks = 1): Promise<{ ids: string[]; backlog: number }> {
  const done = await doneLessonIds();
  const week = dayInfo(date).week.no;
  const todo = lessons().filter((l) => !done.has(l.id));
  const back = todo.filter((l) => l.week <= week).map((l) => l.id);
  const ahead = todo.filter((l) => l.week > week && l.week <= week + aheadWeeks).map((l) => l.id);
  return { ids: [...back, ...ahead], backlog: back.length };
}

/** Study days (weekday or weekend lesson days) left in this plan week, today included. */
export function lessonDaysLeft(date: string): number {
  const info = dayInfo(date);
  let n = 0;
  for (let d = date; dayInfo(d).week.no === info.week.no && diffDays(date, d) < 8; d = addDays(d, 1)) {
    const t = dayInfo(d).type;
    if (t === 'STUDY_WEEKDAY' || t === 'STUDY_WEEKEND') n += t === 'STUDY_WEEKEND' ? 1.5 : 1;
  }
  return Math.max(1, Math.round(n));
}

export async function planContext(date: string): Promise<PlanCtx> {
  const next = await nextLessonIds(date);
  return {
    kuralsLearned: await kuralsLearned(),
    dueKurals: (await dueKuralCards(date, 99)).length,
    nextLessons: next.ids,
    backlog: next.backlog,
    lessonDaysLeft: lessonDaysLeft(date),
    dueReviews: (await dueReviewIds(date)).length,
  };
}

/**
 * Questions for practice and drills: past papers, news, and checks from lessons already done
 * (so a drill never tests a lesson that hasn't been taught yet).
 */
export async function practiceBank(): Promise<Question[]> {
  const done = await doneLessonIds();
  return realBank().filter((q) => q.source.kind !== 'LESSON' || done.has(q.id.replace(/-c\d+$/, '')));
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

/**
 * More time today: append extra steps (next lessons, practice, kural, mistakes) after the plan.
 * Works before, during or after the day's session; a finished session continues with the new steps.
 */
export async function extendSession(date: string, minutes: number): Promise<SessionRow> {
  const row = await ensureSession(date);
  const planned = new Set(row.steps.map((s) => s.payload.lessonId).filter(Boolean));
  const ctx = await planContext(date);
  // Extra time may read ahead as far as lessons exist.
  ctx.nextLessons = (await nextLessonIds(date, 9)).ids.filter((id) => !planned.has(id));
  const round = 1 + Math.max(0, ...row.steps.map((s) => Number(/^x(\d+)-/.exec(s.id)?.[1] ?? 0)));
  const extra = bonusSteps(dayInfo(date), ctx, minutes, round);
  const patch: Partial<SessionRow> = { steps: [...row.steps, ...extra], completed: false, extraMin: (row.extraMin ?? 0) + minutes };
  await db.sessions.update(date, patch);
  return { ...row, ...patch };
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

/** Reading a whole chapter in the Learn tab counts as learning its 10 kurals. */
export async function markKuralLearned(order: number) {
  await db.kuralLearned.put({ order, at: todayISO() });
  for (const k of KURALS.filter((x) => x.order === order)) await learnKural(k.n);
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
