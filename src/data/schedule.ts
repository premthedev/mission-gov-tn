import type { Bi, Unit } from './types';
import type { GenTopic } from '../engine/generators/aptitude';
import { diffDays, weekday } from '../lib/date';

/** Study plan from docs/TNPSC_G4_FINAL_PLAN.md, Section 5. 64 study days, 83 hours. */
export const START = '2026-11-07';
export const LAST_STUDY_DAY = '2027-01-09';
export const EXAM = '2027-01-10';
export const TOTAL_STUDY_DAYS = 64;
export const BUDGET_MIN = 83 * 60;

export type DayType =
  | 'STUDY_WEEKDAY' | 'STUDY_WEEKEND' | 'DIAGNOSTIC' | 'SECTIONAL_BIG' | 'PRE_MOCK_LIGHT'
  | 'FULL_MOCK' | 'MOCK_REVIEW' | 'FINAL_REVIEW' | 'EXAM_DAY' | 'BEFORE_START' | 'AFTER_EXAM';

export interface WeekPlan {
  no: number;
  start: string;
  title: Bi;
  units: Unit[];
  gens: GenTopic[];
}

export const WEEKS: WeekPlan[] = [
  { no: 1, start: '2026-11-07', title: { ta: 'இலக்கணம்: எழுத்து', en: 'Tamil grammar: letters & sandhi' }, units: ['A1'], gens: ['simplification', 'percentage', 'hcf_lcm'] },
  { no: 2, start: '2026-11-14', title: { ta: 'சொல் இலக்கணம் + சொல்லகராதி', en: 'Words + vocabulary' }, units: ['A1', 'A2'], gens: ['ratio', 'si', 'ci'] },
  { no: 3, start: '2026-11-21', title: { ta: 'எழுதும் திறன் + கலைச்சொற்கள்', en: 'Writing skills + technical terms' }, units: ['A3', 'A4'], gens: ['area', 'volume', 'time_work', 'series', 'alpha', 'direction'] },
  { no: 4, start: '2026-11-28', title: { ta: 'வாசித்தல், மொழிபெயர்ப்பு, இலக்கியம்', en: 'Reading, translation, literature' }, units: ['A5', 'A6', 'A7'], gens: ['series', 'alpha', 'percentage', 'hcf_lcm'] },
  { no: 5, start: '2026-12-05', title: { ta: 'தமிழ்நாடு வரலாறு, பண்பாடு, இயக்கங்கள்', en: 'TN history, culture & movements (GS Unit VI)' }, units: ['B6'], gens: ['si', 'ci', 'ratio'] },
  { no: 6, start: '2026-12-12', title: { ta: 'பொருளாதாரம் + TN வளர்ச்சி நிர்வாகம்', en: 'Economy + TN development administration (GS Unit V)' }, units: ['B5'], gens: ['time_work', 'area', 'volume'] },
  { no: 7, start: '2026-12-19', title: { ta: 'இந்திய அரசியலமைப்பு', en: 'Indian Polity (GS Unit IV)' }, units: ['B4'], gens: ['series', 'alpha', 'direction'] },
  { no: 8, start: '2026-12-26', title: { ta: 'வரலாறு, தேசிய இயக்கம், அறிவியல், புவியியல்', en: 'History & national movement, Science, Geography' }, units: ['B3', 'B1', 'B2'], gens: ['percentage', 'hcf_lcm', 'simplification'] },
  { no: 9, start: '2027-01-02', title: { ta: 'இறுதி மீள்பார்வை', en: 'Final revision' }, units: ['A1', 'A2', 'A3', 'A7', 'B4', 'B5', 'B6'], gens: ['simplification', 'percentage', 'ratio', 'si', 'ci', 'time_work'] },
];

const SPECIAL: Record<string, DayType> = {
  '2026-11-14': 'DIAGNOSTIC',
  '2026-11-29': 'SECTIONAL_BIG',
  '2026-12-12': 'PRE_MOCK_LIGHT',
  '2026-12-13': 'FULL_MOCK',
  '2026-12-14': 'MOCK_REVIEW',
  '2026-12-15': 'MOCK_REVIEW',
  '2026-12-26': 'PRE_MOCK_LIGHT',
  '2026-12-27': 'FULL_MOCK',
  '2026-12-28': 'MOCK_REVIEW',
  '2026-12-29': 'MOCK_REVIEW',
  '2027-01-02': 'PRE_MOCK_LIGHT',
  '2027-01-03': 'FULL_MOCK',
  '2027-01-04': 'MOCK_REVIEW',
  '2027-01-05': 'MOCK_REVIEW',
  '2027-01-09': 'FINAL_REVIEW',
  '2027-01-10': 'EXAM_DAY',
};

export const DAY_MINUTES: Record<DayType, number> = {
  STUDY_WEEKDAY: 60, STUDY_WEEKEND: 120, DIAGNOSTIC: 120, SECTIONAL_BIG: 120, PRE_MOCK_LIGHT: 60,
  FULL_MOCK: 180, MOCK_REVIEW: 60, FINAL_REVIEW: 120, EXAM_DAY: 0, BEFORE_START: 0, AFTER_EXAM: 0,
};

export const DAY_LABEL: Record<DayType, Bi> = {
  STUDY_WEEKDAY: { ta: 'படிப்பு நாள்', en: 'Study day' },
  STUDY_WEEKEND: { ta: 'வார இறுதி: படிப்பு + சிறு தேர்வு', en: 'Weekend: study + short mock' },
  DIAGNOSTIC: { ta: 'தொடக்க நிலைத் தேர்வு', en: 'Diagnostic test' },
  SECTIONAL_BIG: { ta: 'தமிழ் 100 வினாத் தேர்வு', en: 'Tamil sectional (100 questions)' },
  PRE_MOCK_LIGHT: { ta: 'லேசான மீள்பார்வை · நாளை முழுத் தேர்வு', en: 'Light revision · full mock tomorrow' },
  FULL_MOCK: { ta: 'முழு மாதிரித் தேர்வு (200 வினா)', en: 'Full mock test (200 questions)' },
  MOCK_REVIEW: { ta: 'தேர்வுத் தவறுகள் மீள்பார்வை', en: 'Mock review' },
  FINAL_REVIEW: { ta: 'இறுதி நாள் மீள்பார்வை', en: 'Final review' },
  EXAM_DAY: { ta: 'தேர்வு நாள்', en: 'Exam day' },
  BEFORE_START: { ta: 'திட்டம் தொடங்கவில்லை', en: 'Plan not started' },
  AFTER_EXAM: { ta: 'தேர்வு முடிந்தது', en: 'Exam over' },
};

export interface DayInfo {
  date: string;
  dayNo: number;
  daysToExam: number;
  type: DayType;
  minutes: number;
  week: WeekPlan;
}

export function dayTypeFor(date: string): DayType {
  if (diffDays(START, date) < 0) return 'BEFORE_START';
  if (diffDays(EXAM, date) > 0) return 'AFTER_EXAM';
  const special = SPECIAL[date];
  if (special) return special;
  const wd = weekday(date);
  return wd === 0 || wd === 6 ? 'STUDY_WEEKEND' : 'STUDY_WEEKDAY';
}

export function weekFor(date: string): WeekPlan {
  let w = WEEKS[0];
  for (const wk of WEEKS) if (diffDays(wk.start, date) >= 0) w = wk;
  return w;
}

export function dayInfo(date: string): DayInfo {
  const type = dayTypeFor(date);
  return {
    date,
    dayNo: Math.min(TOTAL_STUDY_DAYS, Math.max(0, diffDays(START, date) + 1)),
    daysToExam: diffDays(date, EXAM),
    type,
    minutes: DAY_MINUTES[type],
    week: weekFor(date),
  };
}

/** Next special days after `date` (diagnostic, sectional, mocks, exam). */
export function upcomingSpecial(date: string, n = 2): { date: string; type: DayType }[] {
  return Object.entries(SPECIAL)
    .filter(([d, t]) => diffDays(date, d) > 0 && t !== 'MOCK_REVIEW' && t !== 'PRE_MOCK_LIGHT')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(0, n)
    .map(([d, type]) => ({ date: d, type }));
}

export const SPECIAL_DATES = SPECIAL;
