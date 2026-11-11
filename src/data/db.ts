import Dexie, { type Table } from 'dexie';
import type { Choice, Confidence, ErrorReason, KuralUrai, Letter, Mode, Part, Question, Unit } from './types';
import type { ReviewRow } from '../engine/srs';
import type { Step } from '../engine/planner';
import type { DayType } from './schedule';
import type { ScoreResult } from '../engine/scoring';

export interface AttemptRow {
  id?: number;
  questionId: string;
  chosen: Choice;
  eliminated: Letter[];
  confidence: Confidence;
  ms: number;
  correct: boolean;
  mode: Mode;
  sessionId?: string;
  stepId?: string;
  date: string;
  at: number;
  part: Part;
  unit: Unit;
  topic: string;
  reason?: ErrorReason;
}

export interface SessionRow {
  date: string;
  dayType: DayType;
  steps: Step[];
  index: number;
  stepSec: Record<string, number>;
  /** Question ids chosen for a step, so resuming shows the same questions. */
  stepQuestions: Record<string, string[]>;
  done: string[];
  skipped: string[];
  activeSec: number;
  completed: boolean;
}

export interface MockRow {
  id?: number;
  date: string;
  blueprint: string;
  questionIds: string[];
  answers: Record<string, Choice>;
  guesses: string[];
  result: ScoreResult;
  durationSec: number;
}

export interface MockDraft {
  key: string;
  blueprint: string;
  questionIds: string[];
  answers: Record<string, Choice>;
  guesses: string[];
  elapsedSec: number;
  startedAt: number;
}

export interface KV {
  key: string;
  value: unknown;
}

class AppDB extends Dexie {
  attempts!: Table<AttemptRow, number>;
  reviews!: Table<ReviewRow, string>;
  sessions!: Table<SessionRow, string>;
  mocks!: Table<MockRow, number>;
  mockDrafts!: Table<MockDraft, string>;
  lessonsDone!: Table<{ id: string; at: string }, string>;
  kuralLearned!: Table<{ order: number; at: string }, number>;
  qcache!: Table<Question, string>;
  urai!: Table<KuralUrai & { n: number }, number>;
  kv!: Table<KV, string>;

  constructor() {
    super('mission-gov');
    this.version(1).stores({
      attempts: '++id, questionId, date, mode, unit, sessionId',
      reviews: 'questionId, nextReview',
      sessions: 'date',
      mocks: '++id, date',
      mockDrafts: 'key',
      lessonsDone: 'id',
      kuralLearned: 'order',
      qcache: 'id',
      urai: 'n',
      kv: 'key',
    });
  }
}

export const db = new AppDB();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.kv.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.kv.put({ key, value });
}
