import type { ErrorReason } from '../data/types';
import { addDays } from '../lib/date';

/** Leitner boxes. Box n is reviewed INTERVALS[n-1] days after the last review. */
export const INTERVALS = [1, 3, 7, 14];

export interface ReviewRow {
  questionId: string;
  box: number;
  nextReview: string;
  reason?: ErrorReason;
  addedAt: string;
  lapses: number;
}

export function onMistake(existing: ReviewRow | undefined, questionId: string, date: string): ReviewRow {
  return {
    questionId,
    box: 1,
    nextReview: addDays(date, INTERVALS[0]),
    reason: existing?.reason,
    addedAt: existing?.addedAt ?? date,
    lapses: (existing?.lapses ?? 0) + 1,
  };
}

/** Returns the updated row, or null once the item has graduated from the last box. */
export function onReviewed(row: ReviewRow, correct: boolean, date: string): ReviewRow | null {
  if (!correct) return { ...row, box: 1, nextReview: addDays(date, INTERVALS[0]), lapses: row.lapses + 1 };
  const box = row.box + 1;
  if (box > INTERVALS.length) return null;
  return { ...row, box, nextReview: addDays(date, INTERVALS[box - 1]) };
}
