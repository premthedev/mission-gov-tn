import type { Bi, Unit } from '../data/types';
import type { DayInfo } from '../data/schedule';
import type { GenTopic } from './generators/aptitude';

/**
 * Daily session = short, varied steps (3–25 min each), like a Duolingo/Brilliant lesson path:
 * warm-up win → Thirukkural cards → interactive lesson → practice with combos → speed round → wrap-up.
 */
export type StepKind =
  | 'WARMUP' | 'KURAL_CARDS' | 'REVIEW' | 'LESSON' | 'DRILL' | 'SPEED' | 'SHORT_MOCK' | 'MOCK' | 'WRAPUP' | 'CHECKLIST' | 'INFO';

export type Blueprint = 'DIAGNOSTIC' | 'TAMIL_100' | 'FULL_200';
export type ChecklistKind = 'PRE_MOCK' | 'MOCK' | 'EXAM';

export interface StepPayload {
  newKurals?: number;
  count?: number;
  lessonId?: string;
  units?: Unit[];
  gens?: GenTopic[];
  blueprint?: Blueprint;
  list?: ChecklistKind;
  text?: Bi;
  seconds?: number;
}

export interface Step {
  id: string;
  kind: StepKind;
  minutes: number;
  title: Bi;
  payload: StepPayload;
}

export interface PlanCtx {
  kuralsLearned: number;
  dueKurals: number;
  /** Lesson ids not done yet, in study order: this week's backlog first, then next week's (read ahead). */
  nextLessons: string[];
  /** How many of nextLessons belong to this week or earlier. */
  backlog?: number;
  /** Study days left this week, today included. */
  lessonDaysLeft?: number;
  dueReviews: number;
}

/**
 * How many lessons today: enough to finish this week's backlog in the study days left
 * (weekday 1–2, weekend 2–3), and one or two from next week when there is no backlog.
 */
export function lessonCount(ctx: PlanCtx, weekend: boolean): number {
  const available = ctx.nextLessons.length;
  if (available === 0) return 0;
  const backlog = ctx.backlog ?? available;
  const days = Math.max(1, ctx.lessonDaysLeft ?? 1);
  const need = Math.ceil(backlog / days);
  const n = weekend ? Math.min(3, Math.max(2, need)) : Math.min(2, Math.max(1, need));
  return Math.min(n, available);
}

export const STEP_ICON: Record<StepKind, string> = {
  WARMUP: '⚡', KURAL_CARDS: '📜', REVIEW: '🔁', LESSON: '💡', DRILL: '🎯', SPEED: '⏱️', SHORT_MOCK: '📝',
  MOCK: '🏁', WRAPUP: '🎉', CHECKLIST: '✅', INFO: 'ℹ️',
};

const s = (id: string, kind: StepKind, minutes: number, title: Bi, payload: StepPayload = {}): Step => ({ id, kind, minutes, title, payload });

const warmup = (m: number) => s('warmup', 'WARMUP', m, { ta: 'சூடேற்றல்: 5 விரைவு வினா', en: 'Warm-up: 5 quick ones' }, { count: m >= 8 ? 8 : 5 });
const kural = (ctx: PlanCtx, m: number, perDay: number): Step => {
  const left = 200 - ctx.kuralsLearned;
  const n = Math.min(perDay, left);
  return n > 0
    ? s('kural', 'KURAL_CARDS', m, { ta: `திருக்குறள்: ${n} புதிய குறள் அட்டைகள்`, en: `Thirukkural: ${n} new cards` }, { newKurals: n, count: 4 })
    : s('kural', 'KURAL_CARDS', m, { ta: 'திருக்குறள் மீள்பார்வை அட்டைகள்', en: 'Thirukkural revision cards' }, { newKurals: 0, count: 6 });
};
const lesson = (id: string, lessonId: string, m: number) => s(id, 'LESSON', m, { ta: 'பாடம்', en: 'Lesson' }, { lessonId });
const drill = (id: string, info: DayInfo, m: number, title?: Bi) =>
  s(id, 'DRILL', m, title ?? { ta: 'பயிற்சி: இந்த வாரத் தலைப்புகள்', en: "Practice: this week's topics" }, {
    units: info.week.units, gens: info.week.gens, count: Math.max(8, Math.round(m * 0.8)),
  });
const speed = (info: DayInfo, m = 4) => s('speed', 'SPEED', m, { ta: 'வேகச் சுற்று: 90 விநாடி', en: 'Speed round: 90 seconds' }, { gens: info.week.gens, seconds: 90 });
const wrap = (m: number) => s('wrap', 'WRAPUP', m, { ta: 'நிறைவு: தவறுகள் + இன்றைய சுருக்கம்', en: 'Wrap-up' });
const review = (m: number) => s('review', 'REVIEW', m, { ta: 'தவறுகள் மீள்பார்வை', en: 'Mistake review' }, { count: Math.round(m * 1.2) });

export function buildSteps(info: DayInfo, ctx: PlanCtx): Step[] {
  const lessons = [...ctx.nextLessons];
  switch (info.type) {
    case 'STUDY_WEEKDAY': {
      const n = lessonCount(ctx, false);
      const ls = lessons.slice(0, n);
      if (n === 2) {
        return [warmup(4), kural(ctx, 7, 5), lesson('lesson-1', ls[0], 18), lesson('lesson-2', ls[1], 18), drill('drill', info, 9), wrap(4)];
      }
      return [
        warmup(5),
        kural(ctx, 8, 5),
        ...(n === 1 ? [lesson('lesson-1', ls[0], 20)] : []),
        drill('drill', info, n === 1 ? 18 : 38),
        speed(info),
        wrap(5),
      ];
    }
    case 'STUDY_WEEKEND': {
      const n = lessonCount(ctx, true);
      const ls = lessons.slice(0, n);
      const shortMock = s('short-mock', 'SHORT_MOCK', 30, { ta: 'சிறு மாதிரித் தேர்வு: 25 வினா, 30 நிமிடம்', en: 'Short mock: 25 Qs in 30 min' }, {
        units: info.week.units, gens: info.week.gens, count: 25,
      });
      if (n === 3) {
        return [warmup(6), kural(ctx, 10, 8), ...ls.map((l, i) => lesson(`lesson-${i + 1}`, l, 22)), shortMock, speed(info, 3), wrap(5)];
      }
      return [
        warmup(8),
        kural(ctx, 12, 8),
        ...ls.map((l, i) => lesson(`lesson-${i + 1}`, l, 25)),
        drill('drill', info, 10 + (2 - n) * 25),
        shortMock,
        speed(info),
        wrap(6),
      ];
    }
    case 'DIAGNOSTIC':
      return [
        s('info', 'INFO', 2, { ta: 'ஏன் இந்தத் தேர்வு?', en: 'Why this test' }, {
          text: {
            ta: 'இன்று உண்மையான 2025 குரூப் 4 வினாத்தாளின் தமிழ் (பகுதி அ), திறனறிவு (பகுதி இ) வினாக்களை உண்மையான நேரக் கட்டுப்பாட்டில் எழுதுகிறீர்கள். மதிப்பெண் குறைவாக இருந்தாலும் பரவாயில்லை. எதை முதலில் கற்பிக்க வேண்டும் என்பதை ஆப் இதிலிருந்து தெரிந்துகொள்ளும்.',
            en: 'The real 2025 Group 4 Tamil (Part A) and Aptitude (Part C) under exam timing. A low score is fine: the app uses it to decide what to teach first.',
          },
        }),
        s('mock', 'MOCK', 100, { ta: 'தொடக்க நிலைத் தேர்வு', en: 'Diagnostic test' }, { blueprint: 'DIAGNOSTIC' }),
        wrap(12),
        kural(ctx, 6, 3),
      ];
    case 'SECTIONAL_BIG':
      return [
        s('mock', 'MOCK', 70, { ta: 'தமிழ் 100 வினாக்கள் · 70 நிமிடம்', en: 'Tamil 100 questions · 70 min' }, { blueprint: 'TAMIL_100' }),
        wrap(15),
        review(20),
        kural(ctx, 10, 6),
        speed(info, 5),
      ];
    case 'PRE_MOCK_LIGHT':
      return [
        kural(ctx, 10, 4),
        ctx.dueReviews > 0 ? review(20) : drill('drill-extra', info, 20),
        drill('drill', info, 20, { ta: 'லேசான பயிற்சி', en: 'Light practice' }),
        speed(info, 5),
        s('checklist', 'CHECKLIST', 5, { ta: 'நாளைக்கான தயாரிப்பு', en: 'Get ready for tomorrow' }, { list: 'PRE_MOCK' }),
      ];
    case 'FULL_MOCK':
      return [
        s('checklist', 'CHECKLIST', 0, { ta: 'தேர்வுக்கு முன்', en: 'Before you start' }, { list: 'MOCK' }),
        s('mock', 'MOCK', 180, { ta: 'முழு மாதிரித் தேர்வு · 9:30–12:30', en: 'Full mock · 9:30–12:30' }, { blueprint: 'FULL_200' }),
      ];
    case 'MOCK_REVIEW':
      return [
        ctx.dueReviews > 0 ? review(35) : drill('drill', info, 35),
        kural(ctx, 10, 5),
        speed(info, 5),
        wrap(10),
      ];
    case 'FINAL_REVIEW':
      return [
        kural(ctx, 20, 0),
        ctx.dueReviews > 0 ? review(40) : drill('drill-extra', info, 40),
        drill('drill', info, 40, { ta: 'கலவைப் பயிற்சி', en: 'Mixed practice' }),
        s('checklist', 'CHECKLIST', 20, { ta: 'நாளைய தேர்வுக்கான சரிபார்ப்பு', en: 'Exam-day checklist' }, { list: 'EXAM' }),
      ];
    case 'EXAM_DAY':
      return [s('checklist', 'CHECKLIST', 0, { ta: 'தேர்வு நாள் சரிபார்ப்பு', en: 'Exam-day checklist' }, { list: 'EXAM' })];
    default:
      return [];
  }
}

export const plannedMinutes = (steps: Step[]) => steps.reduce((t, x) => t + x.minutes, 0);

/** Choices offered when there is more time today. */
export const EXTRA_CHOICES = [15, 30, 60] as const;

/**
 * Extra steps for a day with more time (added after today's plan, any number of times).
 * Each 30-minute block = next lesson (20′) + practice on it (10′); a 15-minute block = one lesson.
 * When no lessons are left: new Thirukkural cards once, due mistakes once, then practice.
 * `round` keeps step ids unique across several extensions on the same day.
 */
export function bonusSteps(info: DayInfo, ctx: PlanCtx, minutes: number, round: number): Step[] {
  const lessons = [...ctx.nextLessons];
  const id = (k: string) => `x${round}-${k}`;
  const out: Step[] = [];
  let kuralUsed = false;
  let reviewUsed = false;
  for (let left = minutes, b = 1; left >= 15; b++) {
    const block = left >= 30 ? 30 : 15;
    left -= block;
    const l = lessons.shift();
    if (l) {
      if (block === 30) out.push(lesson(id(`lesson-${b}`), l, 20), drill(id(`drill-${b}`), info, 10, { ta: 'பயிற்சி: இப்போது கற்றதும் இந்த வாரத் தலைப்புகளும்', en: 'Practice' }));
      else out.push(lesson(id(`lesson-${b}`), l, 15));
      continue;
    }
    let m = block;
    if (!kuralUsed && ctx.kuralsLearned < 200) {
      kuralUsed = true;
      out.push({ ...kural(ctx, 8, 5), id: id(`kural-${b}`) });
      m -= 8;
    }
    if (!reviewUsed && ctx.dueReviews > 0 && m >= 10) {
      reviewUsed = true;
      const r = Math.min(m, 15);
      out.push({ ...review(r), id: id(`review-${b}`) });
      m -= r;
    }
    if (m > 0) out.push(drill(id(`drill-${b}`), info, m, { ta: 'கூடுதல் பயிற்சி', en: 'Extra practice' }));
  }
  return out;
}
