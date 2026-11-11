import { useEffect, useRef, useState } from 'react';
import type { Bi, Confidence, Letter, Mode, Question } from '../data/types';
import { recordAttempt } from '../data/progress';
import { LETTERS } from '../engine/make';
import { Button, Card, T, mmss } from './kit';
import { QuestionBody, SourceBadge } from './QuestionBody';

export interface QuizResult {
  questionId: string;
  correct: boolean;
  confidence: Confidence;
}

const CONF: { v: Confidence; label: Bi }[] = [
  { v: 'SURE', label: { ta: 'உறுதி', en: 'Sure' } },
  { v: 'FIFTY_FIFTY', label: { ta: '50-50', en: '50-50' } },
  { v: 'GUESS', label: { ta: 'ஊகம்', en: 'Guess' } },
];

/**
 * One question at a time: tap to choose, long-press (or ✕) to strike out an option,
 * tag confidence, submit, then read the explanation before moving on.
 */
export function QuizRunner({
  questions, mode, sessionId, stepId, onFinish, timeLimitSec, finishLabel,
}: {
  questions: Question[];
  mode: Mode;
  sessionId?: string;
  stepId?: string;
  onFinish: (results: QuizResult[]) => void;
  timeLimitSec?: number;
  finishLabel?: Bi;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [eliminated, setEliminated] = useState<Letter[]>([]);
  const [confidence, setConfidence] = useState<Confidence>('SURE');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const shownAt = useRef(Date.now());
  const press = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  useEffect(() => {
    if (!timeLimitSec) return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [timeLimitSec]);

  const q = questions[idx];
  const finished = idx >= questions.length;

  if (questions.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <T v={{ ta: 'இந்தப் பகுதிக்கான வினாக்கள் இன்னும் ஆப்பில் சேர்க்கப்படவில்லை.', en: 'No questions for this part in the app yet.' }} />
        <Button onClick={() => onFinish([])} className="w-full"><T v={finishLabel ?? { ta: 'தொடர்க', en: 'Continue' }} inline /></Button>
      </Card>
    );
  }

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const guesses = results.filter((r) => r.confidence !== 'SURE');
    const guessRight = guesses.filter((r) => r.correct).length;
    return (
      <Card className="space-y-4 text-center">
        <div className="text-5xl font-bold text-teal-700 dark:text-teal-300">{correct}/{results.length}</div>
        <T v={{ ta: 'சரியான விடைகள்', en: 'correct answers' }} className="text-slate-500" />
        {guesses.length > 0 && (
          <div className="text-sm text-slate-500">
            <T v={{ ta: `ஊகித்த ${guesses.length} வினாக்களில் ${guessRight} சரி.`, en: `Of ${guesses.length} non-sure answers, ${guessRight} were right.` }} />
          </div>
        )}
        <div className="text-sm text-slate-500">
          <T v={{ ta: 'தவறியவையும் ஊகித்தவையும் மீள்பார்வைப் பட்டியலில் சேர்க்கப்பட்டன.', en: 'Wrong and guessed questions were added to your review queue.' }} />
        </div>
        <Button onClick={() => onFinish(results)} className="w-full"><T v={finishLabel ?? { ta: 'அடுத்த படி →', en: 'Next step →' }} inline /></Button>
      </Card>
    );
  }

  const toggleElim = (l: Letter) => {
    if (submitted) return;
    setEliminated((e) => (e.includes(l) ? e.filter((x) => x !== l) : [...e, l]));
    if (selected === l) setSelected(null);
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitted(true);
    const correct = await recordAttempt({ q, chosen: selected, eliminated, confidence, ms: Date.now() - shownAt.current, mode, sessionId, stepId });
    setResults((r) => [...r, { questionId: q.id, correct, confidence }]);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setSelected(null);
    setEliminated([]);
    setConfidence('SURE');
    setSubmitted(false);
    shownAt.current = Date.now();
    window.scrollTo({ top: 0 });
  };

  const isRight = (l: Letter) => l === q.answer || (q.acceptedAnswers?.includes(l) ?? false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{idx + 1} / {questions.length}</span>
        {timeLimitSec ? (
          <span className={elapsed > timeLimitSec ? 'font-semibold text-rose-600' : ''}>⏱ {mmss(timeLimitSec - elapsed)}</span>
        ) : null}
        <SourceBadge q={q} />
      </div>
      <Card>
        <QuestionBody q={q} />
      </Card>

      <div className="space-y-2.5">
        {LETTERS.map((l) => {
          const elim = eliminated.includes(l);
          let cls = 'bg-white ring-slate-300 dark:bg-slate-800 dark:ring-slate-600';
          if (!submitted && selected === l) cls = 'bg-teal-50 ring-2 ring-teal-600 dark:bg-teal-900/40';
          if (submitted && isRight(l)) cls = 'bg-emerald-50 ring-2 ring-emerald-600 dark:bg-emerald-900/40';
          if (submitted && selected === l && !isRight(l)) cls = 'bg-rose-50 ring-2 ring-rose-600 dark:bg-rose-900/40';
          return (
            <div key={l} className={`flex items-stretch rounded-2xl ring-1 ${cls}`}>
              <button
                type="button"
                className={`flex min-h-14 flex-1 items-start gap-3 px-3 py-3 text-left ${elim ? 'opacity-40 line-through' : ''}`}
                onPointerDown={() => {
                  longPressed.current = false;
                  press.current = window.setTimeout(() => {
                    longPressed.current = true;
                    toggleElim(l);
                  }, 450);
                }}
                onPointerUp={() => window.clearTimeout(press.current)}
                onPointerLeave={() => window.clearTimeout(press.current)}
                onClick={() => {
                  if (longPressed.current) return;
                  if (!submitted && !elim) setSelected(l);
                }}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold dark:bg-slate-700">{l}</span>
                <T v={q.options[l]} className="pt-0.5" />
              </button>
              {!submitted && (
                <button type="button" onClick={() => toggleElim(l)} className="w-11 shrink-0 text-lg text-slate-400 active:text-rose-600" aria-label={`Cross out ${l}`}>
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!submitted ? (
        <div className="space-y-3">
          <div className="flex justify-center gap-2">
            {CONF.map((c) => (
              <button
                key={c.v}
                type="button"
                onClick={() => setConfidence(c.v)}
                className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ${confidence === c.v ? 'bg-slate-800 text-white ring-slate-800 dark:bg-slate-200 dark:text-slate-900' : 'ring-slate-300 dark:ring-slate-600'}`}
              >
                <T v={c.label} inline />
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500">
            <T v={{ ta: 'நீண்ட நேரம் அழுத்தினால் / ✕ தொட்டால் அந்த விடை அடிக்கப்படும்.', en: 'Long-press or tap ✕ to cross out an option.' }} />
          </p>
          <Button onClick={submit} disabled={!selected} className="w-full"><T v={{ ta: 'விடையைச் சரிபார்', en: 'Check answer' }} inline /></Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Card className={isRight(selected!) ? 'ring-emerald-300' : 'ring-rose-300'}>
            <div className="mb-2 text-lg font-bold">
              {isRight(selected!) ? (
                <span className="text-emerald-700 dark:text-emerald-300">✓ <T v={{ ta: 'சரி!', en: 'Correct' }} inline /></span>
              ) : (
                <span className="text-rose-700 dark:text-rose-300">✗ <T v={{ ta: `சரியான விடை: ${q.answer}`, en: `Answer: ${q.answer}` }} inline /></span>
              )}
            </div>
            {q.explanation ? (
              <div className="space-y-2 leading-relaxed">
                <T v={q.explanation} />
                {q.explanation.verified === false && (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <T v={{ ta: 'விளக்கம்: Kiro எழுதியது · சரிபார்க்கப்படவில்லை', en: 'Explanation written by Kiro · not yet verified' }} inline />
                  </p>
                )}
              </div>
            ) : (
              <T v={{ ta: 'இந்த வினாவுக்கு விளக்கம் இன்னும் சேர்க்கப்படவில்லை.', en: 'No explanation added yet.' }} className="text-slate-500" />
            )}
            {q.keySource === 'TENTATIVE_TICK' && (
              <p className="mt-2 text-xs text-slate-500">
                <T v={{ ta: 'விடை: TNPSC தற்காலிக விடைக் குறிப்பு (இறுதிக் குறிப்பு படிக்க முடியவில்லை).', en: 'Key: TNPSC tentative key (the final key scan is unreadable).' }} />
              </p>
            )}
          </Card>
          <Button onClick={next} className="w-full">
            <T v={idx + 1 < questions.length ? { ta: 'அடுத்த வினா →', en: 'Next question →' } : { ta: 'முடிவுகள் →', en: 'See results →' }} inline />
          </Button>
        </div>
      )}
    </div>
  );
}
