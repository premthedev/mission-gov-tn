import { useEffect, useRef, useState } from 'react';
import type { Question } from '../data/types';
import { UNIT_LABEL, decks, lessonById, lessons, pyq } from '../data/content';
import { db, type SessionRow } from '../data/db';
import {
  addXp, cacheQuestions, doneLessonIds, dueReviewIds, ensureSession, getQuestions, loadStats, markLessonDone, practiceBank,
} from '../data/progress';
import { DAY_LABEL, WEEKS, dayInfo } from '../data/schedule';
import { plannedMinutes, type Step } from '../engine/planner';
import type { GenTopic } from '../engine/generators/aptitude';
import { assembleDrill, assembleWarmup } from '../engine/select';
import { XP } from '../engine/xp';
import { addDays, todayISO } from '../lib/date';
import { autoBackup, buzz } from '../native';
import { STEP_INFO } from './coach';
import { ExtendPicker } from './Extend';
import { fx } from './feedback';
import { Icon, StepBadge } from './icons';
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
    if (l) return { ta: `பாடம்: ${l.title.ta ?? ''}`, en: l.title.en };
  }
  return s.title;
}

const QUIZ_KINDS = ['WARMUP', 'REVIEW', 'DRILL', 'SHORT_MOCK'];
/** Steps that get a "what this is / what to tap" card before they start. */
const COACHED = ['WARMUP', 'KURAL_CARDS', 'LESSON', 'DRILL', 'SPEED', 'SHORT_MOCK', 'REVIEW'];

/** Material already taught: checks of finished lessons and past-paper questions on their topics. */
async function learnedQuestions(): Promise<Question[]> {
  const done = await doneLessonIds();
  const ls = lessons().filter((l) => done.has(l.id));
  const topics = new Set(ls.map((l) => l.cheat).filter(Boolean));
  return [...ls.filter((l) => !l.fromCheat).flatMap((l) => l.check), ...pyq().filter((q) => q.cheat && topics.has(q.cheat) && !q.deletedByTnpsc)];
}

async function questionsForStep(row: SessionRow, step: Step): Promise<Question[]> {
  let ids = row.stepQuestions[step.id];
  if (!ids) {
    const count = step.payload.count ?? 10;
    const week = dayInfo(row.date).week.no;
    let qs: Question[];
    if (step.kind === 'REVIEW') qs = await getQuestions(await dueReviewIds(row.date, count));
    else if (step.kind === 'WARMUP') {
      const pastGens = [...new Set(WEEKS.filter((w) => w.no < week).flatMap((w) => w.gens))] as GenTopic[];
      const pastDecks = decks().filter((d) => d.week < week);
      qs = assembleWarmup({
        due: await getQuestions(await dueReviewIds(row.date, count)),
        count,
        seedKey: row.date,
        learned: await learnedQuestions(),
        decks: pastDecks.length ? pastDecks : decks().filter((d) => d.week <= week),
        gens: pastGens.length ? pastGens : dayInfo(row.date).week.gens,
      });
    } else {
      qs = assembleDrill({
        units: step.payload.units ?? [], gens: step.payload.gens ?? [], count, seedKey: `${row.date}-${step.id}`,
        bank: await practiceBank(), stats: await loadStats(), today: row.date, news: step.kind === 'DRILL',
      });
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

/** Before each step: what it is, why, and exactly what to tap. */
function StepCoach({ step, n, total, onGo }: { step: Step; n: number; total: number; onGo: () => void }) {
  const info = STEP_INFO[step.kind];
  const lesson = step.kind === 'LESSON' ? lessonById(step.payload.lessonId ?? '') : undefined;
  return (
    <div className="slide-up space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <StepBadge kind={step.kind} active size={48} />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">படி {n}/{total}{step.minutes ? ` · ${step.minutes} நிமிடம்` : ''}</div>
            <div className="text-lg font-bold leading-snug"><T v={lesson ? lesson.title : step.title} /></div>
            {lesson && <div className="text-sm text-teal-700 dark:text-teal-300"><T v={UNIT_LABEL[lesson.unit]} inline /></div>}
          </div>
        </div>
        <p className="leading-relaxed">{info.what}</p>
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
          <div className="mb-1.5 text-xs font-semibold text-slate-500">எப்படி?</div>
          <ol className="space-y-1.5">
            {info.how.map((h, i) => (
              <li key={i} className="flex gap-2.5 text-[0.95rem]">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-600 text-xs font-bold text-white">{i + 1}</span>
                <span>{h}</span>
              </li>
            ))}
          </ol>
        </div>
      </Card>
      <Button onClick={onGo} className="w-full text-lg"><Icon name="play" size={20} /> தொடங்கு</Button>
    </div>
  );
}

/** Today's guided session: one short step at a time, each with its own countdown. */
export function Session({ onExit }: { onExit: () => void }) {
  const date = todayISO();
  const [row, setRow] = useState<SessionRow | null>(null);
  const [qs, setQs] = useState<Question[] | null>(null);
  const [stepSec, setStepSec] = useState(0);
  const [warned, setWarned] = useState(false);
  const [intro, setIntro] = useState(true);
  const [coach, setCoach] = useState(true);
  const pending = useRef(0);
  const rowRef = useRef<SessionRow | null>(null);
  rowRef.current = row;

  useEffect(() => {
    void ensureSession(date).then((r) => {
      setRow(r);
      setIntro(r.index === 0 && !r.completed && !(r.stepSec[r.steps[0]?.id] > 0));
    });
  }, [date]);

  const step = row && !row.completed ? row.steps[row.index] : undefined;

  useEffect(() => {
    if (!row || !step) return;
    const sec = row.stepSec[step.id] ?? 0;
    setStepSec(sec);
    setWarned(false);
    setQs(null);
    setCoach(COACHED.includes(step.kind) && sec < 5);
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
    if (!step || intro || coach) return;
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
  }, [step?.id, intro, coach]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ---- the whole path at a glance, one button ----
  if (intro && step) {
    return (
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-sm text-slate-500"><T v={DAY_LABEL[row.dayType]} inline /></div>
          <div className="text-3xl font-bold">இன்றைய பாதை · {plannedMinutes(row.steps)} நிமிடம்</div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">ஒவ்வொரு படிக்கும் முன் என்ன செய்ய வேண்டும் என்று ஆப் சொல்லும். வரிசையாகச் செய்தால் போதும்.</p>
        </div>
        <div className="relative space-y-3">
          <div className="absolute bottom-5 left-5 top-5 w-0.5 bg-teal-200 dark:bg-teal-800" />
          {row.steps.map((s, i) => (
            <div key={s.id} className="slide-up relative flex items-center gap-3" style={{ animationDelay: `${i * 50}ms` }}>
              <StepBadge kind={s.kind} done={row.done.includes(s.id)} active={i === row.index} />
              <span className="min-w-0 flex-1 text-[0.95rem] font-medium"><T v={stepTitle(s)} /></span>
              {s.minutes > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">{s.minutes}′</span>}
            </div>
          ))}
        </div>
        <Button onClick={() => { fx.tap(); setIntro(false); }} className="w-full text-lg">போகலாம் <Icon name="right" /></Button>
      </div>
    );
  }

  if (row.completed || !step) {
    const tomorrow = dayInfo(addDays(date, 1));
    return (
      <Card className="pop-in space-y-4 text-center">
        <Icon name="checkCircle" size={52} className="mx-auto text-emerald-600" />
        <div className="text-xl font-bold">இன்றைய திட்டம் முடிந்தது!</div>
        <div className="text-slate-500">{Math.round(row.activeSec / 60)} / {plannedMinutes(row.steps)} நிமிடம் படித்தீர்கள்</div>
        {tomorrow.type !== 'AFTER_EXAM' && (
          <div className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-700/60">
            <div className="font-semibold">நாளை</div>
            <T v={DAY_LABEL[tomorrow.type]} />
            {tomorrow.minutes > 0 && <div className="text-slate-500">{tomorrow.minutes} நிமிடம் · {tomorrow.week.title.ta}</div>}
          </div>
        )}
        <div className="text-left">
          <ExtendPicker done onExtended={(r) => { fx.tap(); setRow(r); window.scrollTo({ top: 0 }); }} />
        </div>
        <Button onClick={onExit} variant="secondary" className="w-full">போதும், முகப்புக்குச் செல்</Button>
      </Card>
    );
  }

  const left = step.minutes * 60 - stepSec;

  let body;
  if (coach) {
    body = <StepCoach step={step} n={row.index + 1} total={row.steps.length} onGo={() => { fx.tap(); setCoach(false); }} />;
  } else {
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
            <Button onClick={() => void advance()} className="w-full">தொடர்க <Icon name="right" /></Button>
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
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-1">
          {row.steps.map((s, i) => (
            <div key={s.id} className={`h-1.5 flex-1 rounded-full ${i < row.index ? 'bg-teal-500' : i === row.index ? 'bg-amber-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
          ))}
        </div>
        {!coach && (
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">படி {row.index + 1}/{row.steps.length} · {txt(stepTitle(step))}</h2>
            {step.kind !== 'MOCK' && step.minutes > 0 && (
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-sm font-semibold ${left < 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{left >= 0 ? mmss(left) : `+${mmss(-left)}`}</span>
            )}
          </div>
        )}
      </div>

      {warned && !coach && step.kind !== 'MOCK' && step.kind !== 'WRAPUP' && (
        <Card className="flex items-center justify-between gap-3 bg-amber-50 py-3 dark:bg-amber-950/40">
          <span className="text-sm">இந்தப் படிக்குத் திட்டமிட்ட நேரம் முடிந்தது. நேரம் இருந்தால் தொடருங்கள்; இல்லையெனில் அடுத்த படிக்குச் செல்லுங்கள்.</span>
          <Button variant="secondary" onClick={() => void advance(true)} className="shrink-0 text-sm">அடுத்து</Button>
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
