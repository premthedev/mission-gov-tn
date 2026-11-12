import { useEffect, useRef, useState } from 'react';
import type { Question } from '../data/types';
import { lessonById } from '../data/content';
import { db, type SessionRow } from '../data/db';
import { addXp, bank, cacheQuestions, dueReviewIds, ensureSession, getQuestions, loadStats, markLessonDone } from '../data/progress';
import { DAY_LABEL, dayInfo } from '../data/schedule';
import { STEP_ICON, plannedMinutes, type Step } from '../engine/planner';
import { assembleDrill, assembleWarmup } from '../engine/select';
import { XP } from '../engine/xp';
import { addDays, todayISO } from '../lib/date';
import { autoBackup, buzz } from '../native';
import { fx } from './feedback';
import { Button, Card, T, mmss, txt } from './kit';
import { KuralCards } from './KuralCards';
import { LessonView } from './LessonView';
import { Mock } from './Mock';
import { QuizRunner } from './QuizRunner';
import { SpeedRound } from './SpeedRound';
import { Checklist } from './StepExtras';
import { WrapUp } from './WrapUp';

export function stepTitle(s: Step): { ta?: string; en?: string } {
  if (s.kind === 'LESSON' && s.payload.lessonId) {
    const l = lessonById(s.payload.lessonId);
    if (l) return { ta: l.title.ta ?? '', en: l.title.en };
  }
  return s.title;
}

const QUIZ_KINDS = ['WARMUP', 'REVIEW', 'DRILL', 'SHORT_MOCK'];

async function questionsForStep(row: SessionRow, step: Step): Promise<Question[]> {
  let ids = row.stepQuestions[step.id];
  if (!ids) {
    const count = step.payload.count ?? 10;
    let qs: Question[];
    if (step.kind === 'REVIEW') qs = await getQuestions(await dueReviewIds(row.date, count));
    else if (step.kind === 'WARMUP') qs = assembleWarmup(await getQuestions(await dueReviewIds(row.date, count)), count, row.date, dayInfo(row.date).week.gens);
    else qs = assembleDrill({ units: step.payload.units ?? [], gens: step.payload.gens ?? [], count, seedKey: `${row.date}-${step.id}`, bank: bank(), stats: await loadStats(), today: row.date });
    await cacheQuestions(qs);
    ids = qs.map((q) => q.id);
    row.stepQuestions = { ...row.stepQuestions, [step.id]: ids };
    await db.sessions.update(row.date, { stepQuestions: row.stepQuestions });
  }
  const done = await db.attempts.where('sessionId').equals(row.date).filter((a) => a.stepId === step.id).toArray();
  const answered = new Set(done.map((a) => a.questionId));
  return (await getQuestions(ids)).filter((q) => !answered.has(q.id));
}

/** Today's guided session: one short step at a time, each with its own countdown. */
export function Session({ onExit }: { onExit: () => void }) {
  const date = todayISO();
  const [row, setRow] = useState<SessionRow | null>(null);
  const [qs, setQs] = useState<Question[] | null>(null);
  const [stepSec, setStepSec] = useState(0);
  const [warned, setWarned] = useState(false);
  const [intro, setIntro] = useState(true);
  const pending = useRef(0);
  const rowRef = useRef<SessionRow | null>(null);
  rowRef.current = row;

  useEffect(() => {
    void ensureSession(date).then((r) => {
      setRow(r);
      setIntro(r.index === 0 && !r.completed);
    });
  }, [date]);

  const step = row && !row.completed ? row.steps[row.index] : undefined;

  useEffect(() => {
    if (!row || !step) return;
    setStepSec(row.stepSec[step.id] ?? 0);
    setWarned(false);
    setQs(null);
    if (QUIZ_KINDS.includes(step.kind)) void questionsForStep(row, step).then(setQs);
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
    if (!step || intro) return;
    const t = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      pending.current += 1;
      setStepSec((x) => x + 1);
      if (pending.current >= 10) void flush();
    }, 1000);
    const onHide = () => void flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
      void flush();
    };
  }, [step?.id, intro]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!skipped) void addXp(XP.stepDone);
    await db.sessions.update(r.date, patch);
    if (completed) void autoBackup();
    setRow({ ...r, ...patch });
    window.scrollTo({ top: 0 });
  };

  // ---- intro: the whole path at a glance, one button ----
  if (intro && step) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm text-slate-500"><T v={DAY_LABEL[row.dayType]} inline /></div>
          <div className="text-3xl font-bold">{plannedMinutes(row.steps)} நிமிடம்</div>
        </div>
        <div className="relative space-y-3 pl-6">
          <div className="absolute bottom-4 left-[1.1rem] top-4 w-0.5 bg-teal-200 dark:bg-teal-800" />
          {row.steps.map((s, i) => (
            <div key={s.id} className="slide-up relative flex items-center gap-3" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="z-10 -ml-6 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lg shadow ring-2 ring-teal-500 dark:bg-slate-800">{STEP_ICON[s.kind]}</span>
              <span className="min-w-0 flex-1 text-[0.95rem] font-medium"><T v={stepTitle(s)} inline /></span>
              {s.minutes > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">{s.minutes}′</span>}
            </div>
          ))}
        </div>
        <Button onClick={() => { fx.tap(); setIntro(false); }} className="w-full text-lg">போகலாம்! · Let's go</Button>
      </div>
    );
  }

  if (row.completed || !step) {
    const tomorrow = dayInfo(addDays(date, 1));
    return (
      <Card className="pop-in space-y-4 text-center">
        <div className="text-5xl">✅</div>
        <div className="text-xl font-bold">இன்றைய படிப்பு முடிந்தது!</div>
        <div className="text-slate-500">{Math.round(row.activeSec / 60)} / {plannedMinutes(row.steps)} நிமிடம் படித்தீர்கள்</div>
        {tomorrow.type !== 'AFTER_EXAM' && (
          <div className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-700/60">
            <div className="font-semibold">நாளை</div>
            <T v={DAY_LABEL[tomorrow.type]} />
            {tomorrow.minutes > 0 && <div className="text-slate-500">{tomorrow.minutes} நிமிடம் · {tomorrow.week.title.ta}</div>}
          </div>
        )}
        <Button onClick={onExit} className="w-full">முகப்பு</Button>
      </Card>
    );
  }

  const left = step.minutes * 60 - stepSec;

  let body;
  switch (step.kind) {
    case 'KURAL_CARDS':
      body = <KuralCards key={step.id} newCount={step.payload.newKurals ?? 0} quizCount={step.payload.count ?? 4} sessionId={date} stepId={step.id} onDone={() => void advance()} />;
      break;
    case 'LESSON':
      body = <LessonView key={step.id} lessonId={step.payload.lessonId ?? ''} sessionId={date} stepId={step.id} onDone={async () => { await markLessonDone(step.payload.lessonId ?? ''); await advance(); }} />;
      break;
    case 'SPEED':
      body = <SpeedRound key={step.id} gens={step.payload.gens} seconds={step.payload.seconds ?? 90} sessionId={date} onDone={() => void advance()} />;
      break;
    case 'MOCK':
      body = <Mock blueprint={step.payload.blueprint ?? 'FULL_200'} onDone={() => void advance()} />;
      break;
    case 'WRAPUP':
      body = <WrapUp sessionId={date} onDone={() => void advance()} />;
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
          mode={step.kind === 'REVIEW' ? 'REVIEW' : step.kind === 'WARMUP' ? 'WARMUP' : step.kind === 'SHORT_MOCK' ? 'SHORT_MOCK' : 'DRILL'}
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
        <div className="flex gap-1">
          {row.steps.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i < row.index ? 'bg-teal-500' : i === row.index ? 'bg-teal-300' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-base font-bold">{STEP_ICON[step.kind]} <T v={stepTitle(step)} inline /></h2>
          {step.kind !== 'MOCK' && step.minutes > 0 && (
            <span className={`shrink-0 font-mono text-sm font-semibold ${left < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{left >= 0 ? mmss(left) : `+${mmss(-left)}`}</span>
          )}
        </div>
      </div>

      {warned && step.kind !== 'MOCK' && step.kind !== 'WRAPUP' && (
        <Card className="flex items-center justify-between gap-3 bg-amber-50 py-3 dark:bg-amber-950/40">
          <span className="text-sm">நேரம் முடிந்தது. இதை முடித்து அடுத்ததுக்குச் செல்லுங்கள்.</span>
          <Button variant="secondary" onClick={() => void advance(true)} className="shrink-0 text-sm">அடுத்து →</Button>
        </Card>
      )}

      {body}

      {step.kind !== 'MOCK' && step.kind !== 'WRAPUP' && (
        <div className="pb-4 pt-2 text-center">
          <button type="button" className="text-xs text-slate-400 underline" onClick={() => window.confirm(`"${txt(stepTitle(step))}" தவிர்க்கவா?`) && void advance(true)}>
            இந்தப் படியைத் தவிர்
          </button>
        </div>
      )}
    </div>
  );
}
