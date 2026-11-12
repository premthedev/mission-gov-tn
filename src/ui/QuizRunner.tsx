import { useEffect, useRef, useState } from 'react';
import type { Bi, Confidence, Letter, Mode, Question } from '../data/types';
import { addXp, recordAttempt } from '../data/progress';
import { LETTERS } from '../engine/make';
import { answerXp } from '../engine/xp';
import { fx } from './feedback';
import { Button, Card, T, mmss } from './kit';
import { QuestionBody, SourceBadge } from './QuestionBody';

export interface QuizResult {
  questionId: string;
  correct: boolean;
  confidence: Confidence;
}

const CONF: { v: Confidence; label: string }[] = [
  { v: 'SURE', label: 'உறுதி' },
  { v: 'FIFTY_FIFTY', label: '50-50' },
  { v: 'GUESS', label: 'ஊகம்' },
];

/**
 * One question at a time. Tap an option, tap "Check". Feedback slides up from the bottom with the
 * explanation; combos (3+ in a row) earn bonus XP. Long-press or ✕ strikes out an option.
 */
export function QuizRunner({
  questions, mode, sessionId, stepId, onFinish, timeLimitSec, finishLabel, compactResult, skipSummary,
}: {
  questions: Question[];
  mode: Mode;
  sessionId?: string;
  stepId?: string;
  onFinish: (results: QuizResult[]) => void;
  timeLimitSec?: number;
  finishLabel?: Bi;
  compactResult?: boolean;
  /** Call onFinish straight after the last question (used inside lessons). */
  skipSummary?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [eliminated, setEliminated] = useState<Letter[]>([]);
  const [confidence, setConfidence] = useState<Confidence>('SURE');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [gain, setGain] = useState(0);
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

  useEffect(() => {
    if (skipSummary && finished && questions.length > 0) onFinish(results);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (skipSummary && finished) return null;

  if (questions.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <T v={{ ta: 'இந்தப் பகுதிக்கான வினாக்கள் விரைவில் வரும்.', en: 'Questions for this part are on the way.' }} />
        <Button onClick={() => onFinish([])} className="w-full">தொடர்க →</Button>
      </Card>
    );
  }

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const pct = Math.round((correct / Math.max(1, results.length)) * 100);
    return (
      <Card className="pop-in space-y-4 text-center">
        <div className="text-5xl">{pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'}</div>
        <div className="text-4xl font-bold text-teal-700 dark:text-teal-300">{correct}/{results.length}</div>
        <div className="text-slate-500">{pct >= 80 ? 'அருமை!' : pct >= 50 ? 'நல்ல முயற்சி!' : 'தவறியவை மீண்டும் வரும்; அப்போது வெல்லலாம்.'}</div>
        <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">+{xp} XP</div>
        {!compactResult && results.some((r) => !r.correct) && (
          <p className="text-sm text-slate-500">தவறியவை 1, 3, 7, 14 நாட்களில் மீண்டும் வரும்.</p>
        )}
        <Button onClick={() => onFinish(results)} className="w-full"><T v={finishLabel ?? { ta: 'அடுத்த படி →', en: 'Next step' }} inline /></Button>
      </Card>
    );
  }

  const toggleElim = (l: Letter) => {
    if (submitted) return;
    fx.tap();
    setEliminated((e) => (e.includes(l) ? e.filter((x) => x !== l) : [...e, l]));
    if (selected === l) setSelected(null);
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitted(true);
    const correct = await recordAttempt({ q, chosen: selected, eliminated, confidence, ms: Date.now() - shownAt.current, mode, sessionId, stepId });
    const nextCombo = correct ? combo + 1 : 0;
    const g = answerXp(correct, nextCombo);
    if (correct) (nextCombo >= 3 ? fx.combo : fx.correct)();
    else fx.wrong();
    setCombo(nextCombo);
    setGain(g);
    setXp((x) => x + g);
    void addXp(g);
    setResults((r) => [...r, { questionId: q.id, correct, confidence }]);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setSelected(null);
    setEliminated([]);
    setConfidence('SURE');
    setSubmitted(false);
    setGain(0);
    shownAt.current = Date.now();
    window.scrollTo({ top: 0 });
  };

  const isRight = (l: Letter) => l === q.answer || (q.acceptedAnswers?.includes(l) ?? false);
  const right = submitted && selected !== null && isRight(selected);

  return (
    <div className="space-y-4 pb-48">
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        {combo >= 2 && <span className="pop-in shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">🔥 {combo}</span>}
        {timeLimitSec ? <span className={`shrink-0 font-mono text-sm ${elapsed > timeLimitSec ? 'text-rose-600' : 'text-slate-500'}`}>⏱ {mmss(timeLimitSec - elapsed)}</span> : null}
        <span className="shrink-0 text-sm text-slate-500">{idx + 1}/{questions.length}</span>
      </div>

      <div key={q.id} className="slide-up space-y-4">
        <div className="flex justify-end"><SourceBadge q={q} /></div>
        <QuestionBody q={q} />

        <div className="space-y-2.5">
          {LETTERS.map((l) => {
            const elim = eliminated.includes(l);
            let cls = 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700';
            if (!submitted && selected === l) cls = 'bg-teal-50 ring-2 ring-teal-500 dark:bg-teal-900/40';
            if (submitted && isRight(l)) cls = 'bg-emerald-50 ring-2 ring-emerald-500 dark:bg-emerald-900/40';
            if (submitted && selected === l && !isRight(l)) cls = 'shake bg-rose-50 ring-2 ring-rose-500 dark:bg-rose-900/40';
            if (submitted && !isRight(l) && selected !== l) cls += ' opacity-50';
            return (
              <div key={l} className={`flex items-stretch rounded-2xl shadow-sm ring-1 transition ${cls}`}>
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
                    if (longPressed.current || submitted || elim) return;
                    fx.tap();
                    setSelected(l);
                  }}
                >
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold ${selected === l && !submitted ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>{l}</span>
                  <T v={q.options[l]} className="pt-0.5" />
                </button>
                {!submitted && (
                  <button type="button" onClick={() => toggleElim(l)} className="w-10 shrink-0 text-slate-300 active:text-rose-600 dark:text-slate-600" aria-label={`Cross out ${l}`}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* bottom action area */}
      <div className="fixed inset-x-0 bottom-0 z-30">
        {!submitted ? (
          <div className="mx-auto max-w-xl space-y-2 border-t border-slate-200 bg-slate-50/95 px-4 pb-4 pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex justify-center gap-2">
              {CONF.map((c) => (
                <button key={c.v} type="button" onClick={() => setConfidence(c.v)} className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${confidence === c.v ? 'bg-slate-800 text-white ring-slate-800 dark:bg-slate-200 dark:text-slate-900' : 'ring-slate-300 dark:ring-slate-600'}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <Button onClick={submit} disabled={!selected} className="w-full text-lg">சரிபார் · Check</Button>
          </div>
        ) : (
          <div className={`slide-up mx-auto max-w-xl rounded-t-3xl px-4 pb-4 pt-4 shadow-2xl ${right ? 'bg-emerald-50 dark:bg-emerald-950' : 'bg-rose-50 dark:bg-rose-950'}`} style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="relative mb-2 flex items-center justify-between">
              <div className={`text-xl font-bold ${right ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                {right ? (combo >= 3 ? `🔥 ${combo} தொடர் சரி!` : '✓ சரி!') : `✗ சரியான விடை: ${q.answer}`}
              </div>
              {gain > 0 && <span key={idx} className="float-up absolute right-0 top-0 font-bold text-amber-600">+{gain} XP</span>}
            </div>
            <div className="max-h-[38vh] overflow-y-auto text-[0.95rem] leading-relaxed">
              {q.explanation ? <T v={q.explanation} /> : <span className="text-slate-500">விளக்கம் விரைவில் சேர்க்கப்படும்.</span>}
              {(q.explanation?.verified === false || q.source.aiExtracted) && (
                <p className="mt-1 text-xs text-slate-500">
                  {q.source.aiExtracted ? 'AI படித்தெடுத்த வினா · ' : ''}{q.explanation?.verified === false ? 'விளக்கம் சரிபார்க்கப்படவில்லை' : ''}
                  {q.keySource === 'TENTATIVE_TICK' ? ' · TNPSC தற்காலிக விடைக்குறிப்பு' : ''}
                </p>
              )}
              {q.source.url && q.source.kind === 'CURRENT_AFFAIRS' && (
                <a href={q.source.url} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-teal-700 underline dark:text-teal-300">மூலச் செய்தி · Source</a>
              )}
            </div>
            <Button onClick={next} variant={right ? 'primary' : 'danger'} className="mt-3 w-full text-lg">
              {idx + 1 < questions.length ? 'தொடர்க →' : 'முடிவு →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
