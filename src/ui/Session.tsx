import { useEffect, useRef, useState } from 'react';
import type { Question } from '../data/types';
import { CHAPTERS, KURALS, chapterByOrder, lessonById } from '../data/content';
import { db, type SessionRow } from '../data/db';
import { BANK, cacheQuestions, dueReviewIds, ensureSession, getQuestions, loadStats, markKuralLearned, markLessonDone } from '../data/progress';
import { DAY_LABEL, dayInfo } from '../data/schedule';
import { kuralQuestions } from '../engine/generators/kural';
import { plannedMinutes, type Step } from '../engine/planner';
import { assembleDrill } from '../engine/select';
import { addDays, todayISO } from '../lib/date';
import { autoBackup, buzz } from '../native';
import { Button, Card, T, mmss, txt } from './kit';
import { KuralReader } from './KuralReader';
import { LessonView } from './LessonView';
import { Mock } from './Mock';
import { QuizRunner } from './QuizRunner';
import { Checklist, TagMistakes } from './StepExtras';

export function stepTitle(s: Step): { ta?: string; en?: string } {
  if (s.kind === 'KURAL_LEARN' && s.payload.order) {
    const ch = chapterByOrder(s.payload.order);
    return { ta: `திருக்குறள்: ${ch.name} (${s.payload.order}/20)`, en: `Thirukkural chapter ${s.payload.order}/20 · ${ch.en}` };
  }
  if (s.kind === 'LESSON' && s.payload.lessonId) {
    const l = lessonById(s.payload.lessonId);
    if (l) return { ta: `பாடம்: ${l.title.ta ?? ''}`, en: l.title.en ? `Lesson: ${l.title.en}` : undefined };
  }
  return s.title;
}

async function questionsForStep(row: SessionRow, step: Step): Promise<Question[]> {
  let ids = row.stepQuestions[step.id];
  if (!ids) {
    let qs: Question[] = [];
    const count = step.payload.count ?? 10;
    if (step.kind === 'KURAL_QUIZ') {
      const learned = (await db.kuralLearned.toArray()).map((k) => k.order);
      const orders = step.payload.orders ?? (learned.length ? learned : [1]);
      qs = kuralQuestions(KURALS, CHAPTERS, orders, count, `${row.date}-${step.id}`);
    } else if (step.kind === 'REVIEW') {
      qs = await getQuestions(await dueReviewIds(row.date, count));
    } else {
      qs = assembleDrill({ units: step.payload.units ?? [], gens: step.payload.gens ?? [], count, seedKey: `${row.date}-${step.id}`, bank: BANK, stats: await loadStats(), today: row.date });
    }
    await cacheQuestions(qs);
    ids = qs.map((q) => q.id);
    row.stepQuestions = { ...row.stepQuestions, [step.id]: ids };
    await db.sessions.update(row.date, { stepQuestions: row.stepQuestions });
  }
  const done = await db.attempts.where('sessionId').equals(row.date).filter((a) => a.stepId === step.id).toArray();
  const answered = new Set(done.map((a) => a.questionId));
  return (await getQuestions(ids)).filter((q) => !answered.has(q.id));
}

/** Today's guided session: one step at a time, each with its own countdown. */
export function Session({ onExit }: { onExit: () => void }) {
  const date = todayISO();
  const [row, setRow] = useState<SessionRow | null>(null);
  const [qs, setQs] = useState<Question[] | null>(null);
  const [stepSec, setStepSec] = useState(0);
  const [warned, setWarned] = useState(false);
  const pending = useRef(0);
  const rowRef = useRef<SessionRow | null>(null);
  rowRef.current = row;

  useEffect(() => {
    void ensureSession(date).then(setRow);
  }, [date]);

  const step = row && !row.completed ? row.steps[row.index] : undefined;

  useEffect(() => {
    if (!row || !step) return;
    setStepSec(row.stepSec[step.id] ?? 0);
    setWarned(false);
    setQs(null);
    if (['KURAL_QUIZ', 'REVIEW', 'DRILL', 'SHORT_MOCK'].includes(step.kind)) void questionsForStep(row, step).then(setQs);
  }, [row?.index, row?.completed]); // eslint-disable-line react-hooks/exhaustive-deps

  const flush = async () => {
    const r = rowRef.current;
    if (!r || pending.current === 0) return;
    const s = r.steps[r.index];
    const add = pending.current;
    pending.current = 0;
    const stepSecMap = { ...r.stepSec, ...(s ? { [s.id]: (r.stepSec[s.id] ?? 0) + add } : {}) };
    r.activeSec += add;
    r.stepSec = stepSecMap;
    await db.sessions.update(r.date, { activeSec: r.activeSec, stepSec: stepSecMap });
  };

  useEffect(() => {
    if (!step) return;
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pending.current += 1;
      setStepSec((s) => s + 1);
      if (pending.current >= 10) void flush();
    }, 1000);
    const onHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      void flush();
    };
  }, [step?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step && step.minutes > 0 && step.kind !== 'MOCK' && !warned && stepSec >= step.minutes * 60) {
      setWarned(true);
      void buzz();
    }
  }, [stepSec, step, warned]);

  if (!row) return <p className="p-6 text-center text-slate-500">ஏற்றுகிறது…</p>;

  const advance = async (skipped = false) => {
    await flush();
    const r = rowRef.current!;
    const s = r.steps[r.index];
    const index = r.index + 1;
    const completed = index >= r.steps.length;
    const patch: Partial<SessionRow> = {
      index,
      completed,
      done: skipped ? r.done : [...r.done, s.id],
      skipped: skipped ? [...r.skipped, s.id] : r.skipped,
    };
    await db.sessions.update(r.date, patch);
    if (completed) void autoBackup();
    setRow({ ...r, ...patch });
    window.scrollTo({ top: 0 });
  };

  if (row.completed || !step) {
    const tomorrow = dayInfo(addDays(date, 1));
    return (
      <Card className="space-y-4 text-center">
        <div className="text-5xl">✅</div>
        <div className="text-xl font-bold"><T v={{ ta: 'இன்றைய படிப்பு முடிந்தது!', en: "Today's session is done!" }} /></div>
        <div className="text-slate-500">{Math.round(row.activeSec / 60)} / {plannedMinutes(row.steps)} நிமிடம்</div>
        {tomorrow.type !== 'AFTER_EXAM' && (
          <div className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-700/60">
            <div className="font-semibold">நாளை · Tomorrow</div>
            <T v={DAY_LABEL[tomorrow.type]} />
            {tomorrow.minutes > 0 && <div className="text-slate-500">{tomorrow.minutes} நிமிடம்</div>}
          </div>
        )}
        <Button onClick={onExit} className="w-full">முகப்பு · Home</Button>
      </Card>
    );
  }

  const total = row.steps.length;
  const left = step.minutes * 60 - stepSec;

  let body;
  switch (step.kind) {
    case 'KURAL_LEARN':
      body = <KuralReader order={step.payload.order ?? 1} onDone={async () => { await markKuralLearned(step.payload.order ?? 1); await advance(); }} doneLabel="அதிகாரம் முடிந்தது → வினாக்கள்" />;
      break;
    case 'LESSON':
      body = <LessonView key={step.id} lessonId={step.payload.lessonId ?? ''} sessionId={date} stepId={step.id} onDone={async () => { await markLessonDone(step.payload.lessonId ?? ''); await advance(); }} />;
      break;
    case 'MOCK':
      body = <Mock blueprint={step.payload.blueprint ?? 'FULL_200'} onDone={() => void advance()} />;
      break;
    case 'TAG':
      body = <TagMistakes sessionId={date} onDone={() => void advance()} />;
      break;
    case 'CHECKLIST':
      body = <Checklist kind={step.payload.list ?? 'MOCK'} onDone={() => void advance()} />;
      break;
    case 'INFO':
      body = (
        <Card className="space-y-4">
          <T v={step.payload.text} className="leading-relaxed" />
          <Button onClick={() => void advance()} className="w-full">தொடர்க →</Button>
        </Card>
      );
      break;
    default:
      body = qs === null ? (
        <p className="p-6 text-center text-slate-500">வினாக்கள் தயாராகின்றன…</p>
      ) : (
        <QuizRunner
          key={step.id}
          questions={qs}
          mode={step.kind === 'KURAL_QUIZ' ? 'KURAL' : step.kind === 'REVIEW' ? 'REVIEW' : step.kind === 'SHORT_MOCK' ? 'SHORT_MOCK' : 'DRILL'}
          sessionId={date}
          stepId={step.id}
          timeLimitSec={step.kind === 'SHORT_MOCK' ? step.minutes * 60 : undefined}
          onFinish={() => void advance()}
        />
      );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-teal-800 dark:text-teal-200">படி {row.index + 1} / {total}</span>
          {step.kind !== 'MOCK' && step.minutes > 0 && (
            <span className={`font-mono font-semibold ${left < 0 ? 'text-rose-600' : 'text-slate-600 dark:text-slate-300'}`}>
              {left >= 0 ? `⏱ ${mmss(left)}` : `+${mmss(-left)}`}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {row.steps.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i < row.index ? 'bg-teal-600' : i === row.index ? 'bg-teal-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
        <h2 className="text-xl font-bold leading-snug"><T v={stepTitle(step)} /></h2>
      </div>

      {warned && step.kind !== 'MOCK' && (
        <Card className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/40">
          <span className="text-sm"><T v={{ ta: 'இந்தப் படிக்கான நேரம் முடிந்தது. இதை முடித்துவிட்டு அடுத்ததுக்குச் செல்லுங்கள்.', en: "Time's up for this step. Wrap up and move on." }} /></span>
          <Button variant="secondary" onClick={() => void advance(true)} className="shrink-0 text-sm">அடுத்து →</Button>
        </Card>
      )}

      {body}

      {step.kind !== 'MOCK' && (
        <div className="pt-2 text-center">
          <button type="button" className="text-sm text-slate-400 underline" onClick={() => window.confirm(`"${txt(stepTitle(step))}" படியைத் தவிர்க்கவா? Skip this step?`) && void advance(true)}>
            இந்தப் படியைத் தவிர் · Skip step
          </button>
        </div>
      )}
    </div>
  );
}
