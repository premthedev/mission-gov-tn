export type Part = 'A' | 'B' | 'C';
export type Unit =
  | 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7'
  | 'B1' | 'B2' | 'B3' | 'B4' | 'B5' | 'B6'
  | 'C1' | 'C2';
export type Letter = 'A' | 'B' | 'C' | 'D';
export type Choice = Letter | 'E' | 'BLANK';
export type Bi = { ta?: string; en?: string };
export type Format =
  | 'ONE_LINER' | 'STATEMENT' | 'ASSERTION_REASON' | 'MATCH' | 'CHRONOLOGY' | 'PASSAGE' | 'FILL_BLANK';
export type Confidence = 'SURE' | 'FIFTY_FIFTY' | 'GUESS';
export type ErrorReason = 'CONCEPT' | 'MEMORY' | 'MISREAD_NOT' | 'CALC' | 'GUESS' | 'TIME';
export type KeySource = 'FINAL_KEY' | 'TENTATIVE_TICK' | 'LESSON' | 'GENERATED' | 'CITED_SOURCE';
export type Era = 'CURRENT' | 'OVERLAP' | 'OFF_SYLLABUS';
export type Mode = 'PRACTICE' | 'DRILL' | 'KURAL' | 'LESSON' | 'REVIEW' | 'WARMUP' | 'SPEED' | 'SHORT_MOCK' | 'MOCK';

/** A memorisation deck. Each item is [term, meaning, note?]. Questions are generated from it in both directions. */
export interface Deck {
  id: string;
  unit: Unit;
  topic: string;
  week: number;
  title: Bi;
  /** Forward stem; {t} is replaced by the term. Answer = meaning. */
  q: Bi;
  /** Reverse stem; {m} is replaced by the meaning. Answer = term. */
  rq?: Bi;
  items: [string, string, string?][];
  source: string;
}

export interface CurriculumLesson {
  id: string;
  title: Bi;
  /** Cheat sheet that becomes the lesson when no written lesson exists yet. */
  cheat?: string;
}

export interface CurriculumWeek {
  week: number;
  lessons: CurriculumLesson[];
}

/** One-page topic summary ("cheat sheet"): how questions on this topic look and how to answer them. */
export interface CheatSheet {
  id: string;
  unit: Unit;
  order: number;
  /** Question topic slugs that belong to this sheet. */
  topics: string[];
  /** Words that, when present in a question, point to this sheet. */
  keywords: string[];
  title: string;
  oneLine: string;
  /** "If you see this → do this" recipes. */
  patterns: { see: string; do: string }[];
  blocks: { h: string; body?: string; table?: string[][] }[];
  traps: string[];
  source: string;
}

export interface QuestionSource {
  kind: 'PYQ' | 'LESSON' | 'GENERATED' | 'DECK' | 'VARIANT' | 'CURRENT_AFFAIRS';
  /** True when the question text was read from the scan by an AI model and not yet checked by a person. */
  aiExtracted?: boolean;
  headline?: string;
  exam?: string;
  year?: number;
  qNo?: number;
  url?: string;
  date?: string;
  /** Thirukkural number, for questions generated from a kural. */
  kural?: number;
}

/** Teaching notes shown after answering. */
export interface Explanation {
  ta?: string;
  en?: string;
  ref?: string;
  verified?: boolean;
  /** Why each wrong option is wrong, keyed by the option letter as displayed. */
  why?: Partial<Record<Letter, Bi>>;
  rule?: Bi;
  example?: Bi;
  tip?: Bi;
  /** Set when an AI tutor thinks the official key may be wrong. The official key still decides. */
  doubt?: boolean;
  /** Written by an AI tutor (shown with a small "AI" note). */
  ai?: boolean;
}

export interface Question {
  id: string;
  part: Part;
  unit: Unit;
  topic: string;
  format: Format;
  stem: Bi;
  statements?: Bi[];
  matchTable?: { left: Bi[]; right: Bi[] };
  passageId?: string;
  options: Record<Letter, Bi>;
  answer: Letter;
  acceptedAnswers?: Letter[];
  keySource: KeySource;
  keyChanged?: boolean;
  deletedByTnpsc?: boolean;
  source: QuestionSource;
  syllabusEra: Era;
  explanation?: Explanation;
  /** Shown before answering: how to approach this kind of question, without giving the answer away. */
  hint?: Bi;
  /** Cheat sheet id, when known. */
  cheat?: string;
}

export interface Passage {
  id: string;
  text: Bi;
}

export interface LessonSection {
  heading?: Bi;
  body: Bi;
  /** Optional table; the first row is the header. */
  table?: string[][];
}

export interface Lesson {
  id: string;
  unit: Unit;
  topic: string;
  week: number;
  /** Order within the week (Tamil and aptitude lessons are interleaved). */
  seq: number;
  minutes: number;
  title: Bi;
  oneLine: Bi;
  sections: LessonSection[];
  examples: { q: Bi; a: Bi }[];
  traps: Bi[];
  check: Question[];
  sourceRef: string;
  /** Cheat sheet behind this lesson (always set for lessons built from a cheat sheet). */
  cheat?: string;
  /** Built from a cheat sheet rather than written as a lesson. */
  fromCheat?: boolean;
}

export interface KuralChapter {
  order: number;
  ch: number;
  name: string;
  en: string;
  paal: string;
  start: number;
  end: number;
}

export interface Kural {
  n: number;
  ch: number;
  order: number;
  l1: string;
  l2: string;
  pope: string;
}

/** Commentaries fetched at runtime (personal use, not stored in the repo). */
export interface KuralUrai {
  mv?: string;
  sp?: string;
  en?: string;
}
