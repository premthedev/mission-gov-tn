import type { Bi, Unit } from '../data/types';
import type { DayInfo } from '../data/schedule';
import type { GenTopic } from './generators/aptitude';

export type StepKind =
  | 'KURAL_LEARN' | 'KURAL_QUIZ' | 'REVIEW' | 'LESSON' | 'DRILL' | 'SHORT_MOCK' | 'MOCK' | 'TAG' | 'CHECKLIST' | 'INFO';

export type Blueprint = 'DIAGNOSTIC' | 'TAMIL_100' | 'FULL_200';
export type ChecklistKind = 'PRE_MOCK' | 'MOCK' | 'EXAM';

export interface StepPayload {
  order?: number;
  orders?: number[];
  count?: number;
  lessonId?: string;
  units?: Unit[];
  gens?: GenTopic[];
  blueprint?: Blueprint;
  list?: ChecklistKind;
  text?: Bi;
}

export interface Step {
  id: string;
  kind: StepKind;
  minutes: number;
  title: Bi;
  payload: StepPayload;
}

export interface PlanCtx {
  /** Kural chapter orders (1..20) already learned. */
  learnedOrders: number[];
  /** Lesson ids not done yet, in study order, up to the current week. */
  nextLessons: string[];
  dueReviews: number;
}

const ALL_ORDERS = Array.from({ length: 20 }, (_, i) => i + 1);

const step = (id: string, kind: StepKind, minutes: number, title: Bi, payload: StepPayload = {}): Step => ({
  id, kind, minutes, title, payload,
});

function kuralBlock(ctx: PlanCtx, minutes: number): Step[] {
  const next = ALL_ORDERS.find((o) => !ctx.learnedOrders.includes(o));
  if (next) {
    return [
      step('kural-learn', 'KURAL_LEARN', minutes - 3, { ta: 'திருக்குறள்: புதிய அதிகாரம்', en: 'Thirukkural: new chapter' }, { order: next }),
      step('kural-quiz', 'KURAL_QUIZ', 3, { ta: 'குறள்: சிறு வினாக்கள்', en: 'Kural quick check' }, { orders: [next], count: 4 }),
    ];
  }
  return [
    step('kural-quiz', 'KURAL_QUIZ', minutes, { ta: 'திருக்குறள் மீள்பார்வை', en: 'Thirukkural revision' }, {
      orders: ALL_ORDERS, count: Math.max(6, minutes),
    }),
  ];
}

const review = (minutes: number): Step =>
  step('review', 'REVIEW', minutes, { ta: 'பழைய தவறுகள் மீள்பார்வை', en: 'Review your mistakes' }, { count: Math.round(minutes * 1.5) });
const tag = (minutes: number): Step =>
  step('tag', 'TAG', minutes, { ta: 'தவறுகளுக்குக் காரணம் குறித்தல்', en: 'Tag why you got them wrong' });
const lesson = (id: string, lessonId: string, minutes: number): Step =>
  step(id, 'LESSON', minutes, { ta: 'பாடம்', en: 'Lesson' }, { lessonId });
const drill = (id: string, info: DayInfo, minutes: number, title?: Bi): Step =>
  step(id, 'DRILL', minutes, title ?? { ta: 'பயிற்சி வினாக்கள்', en: 'Practice questions' }, {
    units: info.week.units, gens: info.week.gens, count: Math.max(8, Math.round(minutes * 0.9)),
  });

export function buildSteps(info: DayInfo, ctx: PlanCtx): Step[] {
  const hasReview = ctx.dueReviews > 0;
  const lessons = [...ctx.nextLessons];

  switch (info.type) {
    case 'STUDY_WEEKDAY': {
      const steps = kuralBlock(ctx, 10);
      let drillMin = 15;
      if (hasReview) steps.push(review(7));
      else drillMin += 7;
      const l = lessons.shift();
      if (l) steps.push(lesson('lesson-1', l, 23));
      else drillMin += 23;
      steps.push(drill('drill', info, drillMin), tag(5));
      return steps;
    }
    case 'STUDY_WEEKEND': {
      const steps = kuralBlock(ctx, 12);
      let drillMin = 0;
      if (hasReview) steps.push(review(10));
      else drillMin += 10;
      const l1 = lessons.shift();
      const l2 = lessons.shift();
      if (l1) steps.push(lesson('lesson-1', l1, 30));
      else drillMin += 30;
      if (l2) steps.push(lesson('lesson-2', l2, 25));
      else drillMin += 25;
      if (drillMin > 0) steps.push(drill('drill', info, drillMin));
      steps.push(
        step('short-mock', 'SHORT_MOCK', 35, { ta: 'சிறு மாதிரித் தேர்வு (நேரக் கட்டுப்பாடு)', en: 'Short mock (timed)' }, {
          units: info.week.units, gens: info.week.gens, count: 25,
        }),
        tag(8),
      );
      return steps;
    }
    case 'DIAGNOSTIC':
      return [
        step('info', 'INFO', 2, { ta: 'ஏன் இந்தத் தேர்வு?', en: 'Why this test' }, {
          text: {
            ta: 'இன்று 2025 குரூப் 4 வினாத்தாளின் பகுதி அ (தமிழ்) மற்றும் பகுதி இ (திறனறிவு) வினாக்களை உண்மையான நேரக் கட்டுப்பாட்டில் எழுதுகிறீர்கள். மதிப்பெண் குறைவாக இருந்தாலும் கவலை வேண்டாம். எதை முதலில் கற்பிக்க வேண்டும் என்பதை ஆப் இதிலிருந்து அறிந்துகொள்ளும்.',
            en: 'You will take the real 2025 Group 4 Part A (Tamil) and Part C (Aptitude) under exam timing. A low score is fine. The app uses it to decide what to teach first.',
          },
        }),
        step('mock', 'MOCK', 100, { ta: 'தொடக்க நிலைத் தேர்வு', en: 'Diagnostic test' }, { blueprint: 'DIAGNOSTIC' }),
        tag(15),
        ...kuralBlock(ctx, 3).filter((s) => s.kind === 'KURAL_QUIZ').map((s) => ({ ...s, minutes: 3 })),
      ];
    case 'SECTIONAL_BIG':
      return [
        step('mock', 'MOCK', 70, { ta: 'தமிழ் 100 வினாக்கள் · 70 நிமிடம்', en: 'Tamil 100 questions · 70 min' }, { blueprint: 'TAMIL_100' }),
        tag(20),
        review(20),
        ...kuralBlock(ctx, 10),
      ];
    case 'PRE_MOCK_LIGHT':
      return [
        step('kural-quiz', 'KURAL_QUIZ', 10, { ta: 'திருக்குறள் மீள்பார்வை', en: 'Thirukkural revision' }, { orders: ALL_ORDERS, count: 10 }),
        hasReview ? review(25) : drill('drill-extra', info, 25),
        drill('drill', info, 20, { ta: 'லேசான பயிற்சி', en: 'Light practice' }),
        step('checklist', 'CHECKLIST', 5, { ta: 'நாளைக்கான தயாரிப்பு', en: 'Get ready for tomorrow' }, { list: 'PRE_MOCK' }),
      ];
    case 'FULL_MOCK':
      return [
        step('checklist', 'CHECKLIST', 0, { ta: 'தேர்வுக்கு முன்', en: 'Before you start' }, { list: 'MOCK' }),
        step('mock', 'MOCK', 180, { ta: 'முழு மாதிரித் தேர்வு · 9:30–12:30', en: 'Full mock · 9:30–12:30' }, { blueprint: 'FULL_200' }),
      ];
    case 'MOCK_REVIEW':
      return [
        hasReview ? review(40) : drill('drill', info, 40),
        ...kuralBlock(ctx, 10),
        tag(10),
      ];
    case 'FINAL_REVIEW':
      return [
        step('kural-quiz', 'KURAL_QUIZ', 20, { ta: 'திருக்குறள்: 20 அதிகாரங்கள்', en: 'Thirukkural: all 20 chapters' }, { orders: ALL_ORDERS, count: 20 }),
        hasReview ? review(40) : drill('drill-extra', info, 40),
        drill('drill', info, 40, { ta: 'கலவைப் பயிற்சி', en: 'Mixed practice' }),
        step('checklist', 'CHECKLIST', 20, { ta: 'நாளைய தேர்வுக்கான சரிபார்ப்பு', en: 'Exam-day checklist' }, { list: 'EXAM' }),
      ];
    case 'EXAM_DAY':
      return [step('checklist', 'CHECKLIST', 0, { ta: 'தேர்வு நாள் சரிபார்ப்பு', en: 'Exam-day checklist' }, { list: 'EXAM' })];
    default:
      return [];
  }
}

export const plannedMinutes = (steps: Step[]) => steps.reduce((t, s) => t + s.minutes, 0);
