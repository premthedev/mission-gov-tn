import { useEffect, useRef, useState } from 'react';
import type { Choice, Question } from '../data/types';
import { db, type MockDraft } from '../data/db';
import { BANK, cacheQuestions, getQuestions, loadStats, recordAttempt } from '../data/progress';
import { assembleMock, type MockPaper } from '../engine/mock';
import type { Blueprint } from '../engine/planner';
import { scoreOMR, type ScoreResult } from '../engine/scoring';
import { todayISO } from '../lib/date';
import { buzz } from '../native';
import { Button, Card, T, mmss } from './kit';
import { QuestionBody } from './QuestionBody';
import { MockResult } from './MockResult';

const BUBBLES: Choice[] = ['A', 'B', 'C', 'D', 'E'];
const PART_TA = { A: 'பகுதி அ (தமிழ்)', B: 'பகுதி ஆ (பொது அறிவு)', C: 'பகுதி இ (திறனறிவு)' } as const;

/** On-screen OMR mock with TNPSC scoring. Answers are saved continuously so nothing is lost. */
export function Mock({ blueprint, onDone }: { blueprint: Blueprint; onDone: () => void }) {
  const key = `${todayISO()}-${blueprint}`;
  const [paper, setPaper] = useState<MockPaper | null>(null);
  const [draft, setDraft] = useState<MockDraft | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [grid, setGrid] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const draftRef = useRef<MockDraft | null>(null);
  draftRef.current = draft;

  useEffect(() => {
    (async () => {
      const existing = await db.mockDrafts.get(key);
      if (existing) {
        setQuestions(await getQuestions(existing.questionIds));
        setDraft(existing);
      }
      const p = assembleMock(blueprint, BANK, await loadStats(), todayISO());
      setPaper(p);
    })();
  }, [key, blueprint]);

  const minutes = paper?.minutes ?? 180;
  const limit = minutes * 60;

  useEffect(() => {
    if (!draft || result) return;
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setDraft((d) => (d ? { ...d, elapsedSec: d.elapsedSec + 1 } : d));
    }, 1000);
    const save = window.setInterval(() => draftRef.current && db.mockDrafts.put(draftRef.current), 5000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(save);
      if (draftRef.current) void db.mockDrafts.put(draftRef.current);
    };
  }, [draft !== null, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const d = draftRef.current;
    if (!d) return;
    const items = questions.map((q) => ({ part: q.part, chosen: d.answers[q.id] ?? 'BLANK', answer: q.answer, accepted: q.acceptedAnswers }));
    const res = scoreOMR(items);
    for (const q of questions) {
      await recordAttempt({ q, chosen: d.answers[q.id] ?? 'BLANK', eliminated: [], confidence: d.guesses.includes(q.id) ? 'GUESS' : 'SURE', ms: 0, mode: 'MOCK', sessionId: todayISO(), stepId: `mock-${blueprint}` });
    }
    await db.mocks.add({ date: todayISO(), blueprint, questionIds: d.questionIds, answers: d.answers, guesses: d.guesses, result: res, durationSec: d.elapsedSec });
    await db.mockDrafts.delete(key);
    setResult(res);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (draft && !result && draft.elapsedSec >= limit) {
      void buzz();
      void submit();
    }
  }, [draft?.elapsedSec]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!paper) return <p className="p-6 text-center text-slate-500">தயாராகிறது…</p>;

  if (result && draft) {
    return <MockResult result={result} questions={questions} answers={draft.answers} guesses={draft.guesses} onDone={onDone} />;
  }

  if (!draft) {
    const start = async () => {
      await cacheQuestions(paper.questions);
      const d: MockDraft = { key, blueprint, questionIds: paper.questions.map((q) => q.id), answers: {}, guesses: [], elapsedSec: 0, startedAt: Date.now() };
      await db.mockDrafts.put(d);
      setQuestions(paper.questions);
      setDraft(d);
    };
    return (
      <div className="space-y-4">
        <Card className="space-y-2">
          <div className="text-2xl font-bold">{paper.questions.length} வினாக்கள் · {minutes} நிமிடம்</div>
          <T v={{ ta: 'ஒவ்வொரு வினாவுக்கும் A, B, C, D, E (விடை தெரியவில்லை) என ஐந்து வட்டங்கள். சரி = +1.5, தவறு = 0, E = 0, காலி = −0.5.', en: 'Five bubbles per question: A–D and E (answer not known). Correct +1.5, wrong 0, E 0, blank −0.5.' }} />
          {paper.pacing.length > 1 && (
            <T v={{ ta: `நேரத் திட்டம்: ${paper.pacing.map((p) => `${PART_TA[p.part]} → ${p.until} நிமிடம் வரை`).join(' · ')}`, en: 'Follow the pacing guide shown at the top.' }} className="text-sm text-slate-500" />
          )}
          <T v={{ ta: 'தெரியவில்லை என்றால் கூட E-க்கு பதிலாக A–D-இல் ஒன்றை ஊகியுங்கள்; தவறுக்கு மதிப்பெண் குறைப்பு இல்லை. ஊகித்த வினாவுக்கு "?" தொடுங்கள்.', en: 'When unsure, guess A–D instead of E: wrong answers cost nothing. Tap "?" on guesses.' }} className="text-sm" />
        </Card>
        {paper.notes.map((n, i) => (
          <Card key={i} className="bg-amber-50 text-sm dark:bg-amber-950/30"><T v={n} /></Card>
        ))}
        <Button onClick={start} className="w-full" disabled={paper.questions.length === 0}>தேர்வைத் தொடங்கு · Start</Button>
      </div>
    );
  }

  const q = questions[idx];
  const answers = draft.answers;
  const blanks = questions.filter((x) => !answers[x.id]).length;
  const elapsedMin = draft.elapsedSec / 60;
  const phase = paper.pacing.find((p) => elapsedMin < p.until);
  const choose = (c: Choice) => setDraft({ ...draft, answers: { ...answers, [q.id]: c } });
  const toggleGuess = () => setDraft({ ...draft, guesses: draft.guesses.includes(q.id) ? draft.guesses.filter((g) => g !== q.id) : [...draft.guesses, q.id] });
  const go = (i: number) => {
    setIdx(Math.max(0, Math.min(questions.length - 1, i)));
    setGrid(false);
    window.scrollTo({ top: 0 });
  };
  const confirmSubmit = () => {
    const msg = blanks > 0 ? `${blanks} வினாக்கள் காலியாக உள்ளன (−${blanks * 0.5}). இருந்தாலும் சமர்ப்பிக்கவா?` : 'சமர்ப்பிக்கவா? Submit now?';
    if (window.confirm(msg)) void submit();
  };

  return (
    <div className="space-y-3">
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-2 bg-slate-50/95 px-4 py-2 text-sm backdrop-blur dark:bg-slate-900/95">
        <span className={`font-mono text-lg font-bold ${limit - draft.elapsedSec < 600 ? 'text-rose-600' : ''}`}>⏱ {mmss(limit - draft.elapsedSec)}</span>
        <span className="truncate text-xs text-slate-500">{phase ? `இப்போது: ${PART_TA[phase.part]}` : 'சரிபார்ப்பு நேரம் · Check time'}</span>
        <button type="button" onClick={() => setGrid((g) => !g)} className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold dark:bg-slate-700">காலி {blanks} ▦</button>
      </div>

      {grid ? (
        <Card>
          <div className="grid grid-cols-8 gap-1.5">
            {questions.map((x, i) => {
              const a = answers[x.id];
              const cls = !a ? 'bg-white ring-1 ring-slate-300 dark:bg-slate-800' : a === 'E' ? 'bg-slate-300 dark:bg-slate-600' : 'bg-teal-600 text-white';
              return (
                <button key={x.id} type="button" onClick={() => go(i)} className={`h-9 rounded-lg text-xs font-semibold ${cls} ${i === idx ? 'outline-2 outline-amber-500' : ''}`}>
                  {i + 1}{draft.guesses.includes(x.id) ? '?' : ''}
                </button>
              );
            })}
          </div>
          <Button onClick={confirmSubmit} variant="danger" className="mt-4 w-full">சமர்ப்பி · Submit</Button>
        </Card>
      ) : (
        <>
          <div className="text-xs font-semibold text-slate-500">{PART_TA[q.part]}</div>
          <Card><QuestionBody q={q} number={String(idx + 1)} /></Card>
          <div className="space-y-2">
            {(['A', 'B', 'C', 'D'] as const).map((l) => (
              <button key={l} type="button" onClick={() => choose(l)} className={`flex w-full items-start gap-3 rounded-2xl px-3 py-3 text-left ring-1 ${answers[q.id] === l ? 'bg-teal-50 ring-2 ring-teal-600 dark:bg-teal-900/40' : 'bg-white ring-slate-300 dark:bg-slate-800 dark:ring-slate-600'}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${answers[q.id] === l ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-400'}`}>{l}</span>
                <T v={q.options[l]} className="pt-0.5" />
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            {BUBBLES.map((b) => (
              <button key={b} type="button" onClick={() => choose(b)} className={`grid h-11 w-11 place-items-center rounded-full border-2 font-bold ${answers[q.id] === b ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-400'}`}>{b}</button>
            ))}
            <button type="button" onClick={toggleGuess} className={`ml-2 h-11 rounded-full px-3 text-sm font-semibold ring-1 ${draft.guesses.includes(q.id) ? 'bg-amber-400 text-slate-900 ring-amber-500' : 'ring-slate-300 dark:ring-slate-600'}`}>? ஊகம்</button>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => go(idx - 1)} disabled={idx === 0} className="flex-1">←</Button>
            {idx < questions.length - 1 ? (
              <Button onClick={() => go(idx + 1)} className="flex-[3]">அடுத்து → {idx + 2}</Button>
            ) : (
              <Button onClick={confirmSubmit} variant="danger" className="flex-[3]">சமர்ப்பி · Submit</Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
