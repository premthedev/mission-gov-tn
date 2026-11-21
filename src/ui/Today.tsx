import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { caQuestions, curriculum, feedDates, lessons } from '../data/content';
import { db } from '../data/db';
import { dueReviewIds, kuralsLearned, previewSteps, streak, studiedMinutes, xpToday, xpTotal } from '../data/progress';
import { BUDGET_MIN, DAY_LABEL, dayInfo, upcomingSpecial } from '../data/schedule';
import { plannedMinutes, type Step } from '../engine/planner';
import { level } from '../engine/xp';
import { addDays, diffDays, fmtDay, todayISO } from '../lib/date';
import { Ring } from './Celebrate';
import { STEP_INFO } from './coach';
import { ExtendPicker } from './Extend';
import { Icon, StepBadge } from './icons';
import { Bar, Button, Card, Label, Screen, T, txt } from './kit';
import { stepTitle } from './Session';

const HINT: Partial<Record<string, string>> = {
  DIAGNOSTIC: 'இன்று உண்மையான 2025 வினாத்தாள்: உங்கள் தொடக்க நிலை. மதிப்பெண் குறைவாக இருந்தாலும் பரவாயில்லை.',
  SECTIONAL_BIG: 'இன்று 100 தமிழ் வினாக்கள், 70 நிமிடம். தகுதிக்குக் குறைந்தது 40 சரி வேண்டும்.',
  PRE_MOCK_LIGHT: 'இன்று லேசாக. நாளை காலை 9:30-க்கு முழு மாதிரித் தேர்வு; இரவு நன்றாகத் தூங்குங்கள்.',
  FULL_MOCK: 'காலை 9:30-க்குத் தொடங்குங்கள். 3 மணி நேரம், உண்மையான தேர்வு போல; இடையில் நிறுத்த வேண்டாம்.',
  MOCK_REVIEW: 'நேற்றைய தேர்வுத் தவறுகளைத் திரும்பச் செய்யும் நாள்.',
  FINAL_REVIEW: 'புதியதாக எதுவும் இல்லை. மீள்பார்வை + நாளைக்கான சரிபார்ப்புப் பட்டியல்.',
  EXAM_DAY: 'வாழ்த்துகள்! பட்டியலைப் பார்த்துவிட்டு நம்பிக்கையுடன் செல்லுங்கள்.',
};

/** The coach's one-paragraph instruction for right now. */
function coachText(type: string, steps: Step[], index: number, started: boolean, completed: boolean, minutes: number): string {
  if (type === 'BEFORE_START') return 'திட்டம் 7 நவம்பர் அன்று தொடங்கும்.';
  if (type === 'AFTER_EXAM') return 'தேர்வு முடிந்தது. வாழ்த்துகள்!';
  if (completed) return 'இன்றைய திட்டம் முடிந்தது. நன்றாகச் செய்தீர்கள்! இன்னும் நேரம் இருந்தால் கீழே "+15 / +30 / +60 நிமி" தொட்டுத் தொடருங்கள்; அடுத்த பாடங்கள் முன்கூட்டியே வரும். இல்லையெனில் ஓய்வெடுங்கள்; நாளை சந்திப்போம்.';
  if (started && steps[index]) {
    return `படி ${index + 1}/${steps.length} ("${txt(stepTitle(steps[index]))}") பாதியில் உள்ளது. கீழே உள்ள "தொடர்க" பொத்தானை அழுத்துங்கள்; விட்ட இடத்திலிருந்து தொடங்கும்.`;
  }
  const special = HINT[type];
  return `${special ? `${special} ` : ''}இன்று ${minutes} நிமிடம், ${steps.length} படிகள். கீழே உள்ள பச்சைப் பொத்தானை அழுத்துங்கள். ஒவ்வொரு படிக்கும் முன் என்ன செய்ய வேண்டும் என்று சொல்கிறேன்.`;
}

export function Today({ onStart, onGuide, openLearn }: { onStart: () => void; onGuide: () => void; openLearn: () => void }) {
  const date = todayISO();
  const info = dayInfo(date);
  const [extendOpen, setExtendOpen] = useState(false);
  const [added, setAdded] = useState(0);
  const data = useLiveQuery(async () => {
    const p = await previewSteps(date);
    return {
      steps: p.steps,
      session: p.session,
      mins: await studiedMinutes(),
      streak: await streak(date),
      kurals: await kuralsLearned(),
      due: (await dueReviewIds(date)).length,
      xp: await xpTotal(),
      xpDay: await xpToday(date),
      done: new Set((await db.lessonsDone.toArray()).map((d) => d.id)),
    };
  }, [date]);
  const next = upcomingSpecial(date, 1)[0];
  const day = fmtDay(date);
  const todayMin = data?.session ? Math.round(data.session.activeSec / 60) : 0;
  const planMin = data ? plannedMinutes(data.steps) : info.minutes;
  const lv = level(data?.xp ?? 0);
  const newsToday = feedDates().at(-1) === date ? caQuestions().filter((q) => q.source.date === date).length : 0;
  const started = !!data?.session && (data.session.index > 0 || Object.values(data.session.stepSec).some((s) => s > 0));
  const completed = !!data?.session?.completed;
  const index = data?.session?.index ?? 0;
  const tomorrow = dayInfo(addDays(date, 1));

  const weekEntries = curriculum().find((w) => w.week === info.week.no)?.lessons ?? [];
  const available = new Set(lessons().map((l) => l.id));
  const weekReady = weekEntries.filter((l) => available.has(l.id));
  const weekDone = weekReady.filter((l) => data?.done.has(l.id)).length;
  const upNext = weekReady.filter((l) => !data?.done.has(l.id)).slice(0, 3);

  return (
    <Screen className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{day.ta}</div>
          <div className="text-xl font-bold">{info.type === 'AFTER_EXAM' ? 'தேர்வு முடிந்தது' : info.type === 'BEFORE_START' ? 'Mission GOV' : `நாள் ${info.dayNo}/64 · தேர்வுக்கு ${info.daysToExam} நாள்`}</div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200"><Icon name="flame" size={16} />{data?.streak ?? 0}</span>
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"><Icon name="star" size={16} />{data?.xp ?? 0}</span>
        </div>
      </div>

      {/* coach */}
      <Card className="flex gap-3 bg-teal-50 ring-teal-100 dark:bg-teal-950/40 dark:ring-teal-900">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-700 text-white"><Icon name="coach" size={22} /></span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-teal-700 dark:text-teal-300">உங்கள் வழிகாட்டி</div>
          <p className="text-[0.95rem] leading-relaxed">{data ? coachText(info.type, data.steps, index, started, completed, planMin) : '…'}</p>
          <button type="button" onClick={onGuide} className="mt-1 text-xs font-semibold text-teal-700 underline dark:text-teal-300">எப்படிப் பயன்படுத்துவது?</button>
        </div>
      </Card>

      {/* today's session */}
      <Card className="space-y-4 bg-gradient-to-br from-teal-600 to-teal-900 text-white ring-0">
        <div className="flex items-center gap-4">
          <Ring value={todayMin} max={planMin}>
            <div className="text-2xl font-bold leading-none">{todayMin}</div>
            <div className="text-[0.65rem] text-teal-100">/ {planMin} நிமி</div>
          </Ring>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-100">இன்று</div>
            <div className="text-xl font-bold leading-tight"><T v={DAY_LABEL[info.type]} inline /></div>
            <div className="mt-1 text-sm text-teal-50">வாரம் {info.week.no}: {info.week.title.ta}</div>
          </div>
        </div>
        {data && data.steps.length > 0 && (
          <Button variant="light" onClick={onStart} className="w-full text-lg" disabled={completed}>
            {completed ? <><Icon name="check" /> இன்று முடிந்தது</> : started ? <><Icon name="play" size={20} /> தொடர்க · படி {index + 1}/{data.steps.length}</> : <><Icon name="play" size={20} /> இன்றைய அமர்வைத் தொடங்கு</>}
          </Button>
        )}
        {data?.session?.extraMin ? <div className="text-center text-xs text-teal-100">இன்று +{data.session.extraMin} நிமிடம் கூடுதலாகச் சேர்த்தீர்கள்</div> : null}
      </Card>

      {data && data.steps.length > 0 && (completed ? (
        <ExtendPicker done onExtended={() => onStart()} />
      ) : extendOpen ? (
        <Card><ExtendPicker compact onExtended={(_, m) => { setExtendOpen(false); setAdded(m); }} /></Card>
      ) : (
        <button type="button" onClick={() => setExtendOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl py-2 text-sm font-semibold text-indigo-700 active:bg-indigo-50 dark:text-indigo-300">
          <Icon name="timer" size={18} /> இன்று கூடுதல் நேரம் இருக்கிறதா? நேரத்தை நீட்டு
        </button>
      ))}
      {added > 0 && !completed && <p className="pop-in -mt-2 text-center text-sm text-indigo-700 dark:text-indigo-300">+{added} நிமிடப் படிகள் இன்றைய பாதையின் இறுதியில் சேர்க்கப்பட்டன.</p>}

      {/* the plan, step by step */}
      {data && data.steps.length > 0 && (
        <Card className="space-y-3">
          <Label>இன்றைய படிகள்</Label>
          {data.steps.map((s, i) => {
            const done = data.session?.done.includes(s.id) || data.session?.skipped.includes(s.id);
            const active = !completed && i === index;
            return (
              <div key={s.id} className={`flex items-start gap-3 ${done ? 'opacity-60' : ''}`}>
                <StepBadge kind={s.kind} done={done} active={active} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold leading-snug"><T v={stepTitle(s)} /></span>
                    {s.minutes > 0 && <span className="shrink-0 text-xs text-slate-500">{s.minutes} நிமி</span>}
                  </div>
                  {active && <p className="mt-0.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{STEP_INFO[s.kind].what}</p>}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center"><div className="text-xl font-bold">{data.kurals}<span className="text-sm text-slate-400">/200</span></div><div className="text-xs text-slate-500">குறள்கள்</div></Card>
          <Card className="p-3 text-center"><div className="text-xl font-bold">{data.due}</div><div className="text-xs text-slate-500">மீள்பார்வை</div></Card>
          <Card className="p-3 text-center"><div className="text-xl font-bold">+{data.xpDay}</div><div className="text-xs text-slate-500">XP இன்று</div></Card>
        </div>
      )}

      {weekReady.length > 0 && (
        <button type="button" onClick={openLearn} className="w-full text-left">
          <Card className="space-y-2 active:bg-slate-50 dark:active:bg-slate-700/50">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold">இந்த வாரப் பாடங்கள்</span>
              <span className="text-sm text-slate-500">{weekDone}/{weekReady.length}</span>
            </div>
            <Bar value={weekDone} max={weekReady.length} />
            {upNext.length > 0 && (
              <div className="space-y-1 pt-1 text-sm text-slate-600 dark:text-slate-300">
                {upNext.map((l) => <div key={l.id} className="flex items-center gap-2"><Icon name="bulb" size={15} className="text-teal-600" /><span className="truncate">{txt(l.title)}</span></div>)}
              </div>
            )}
          </Card>
        </button>
      )}

      {data && (
        <Card className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">நிலை {lv.n} · {lv.title}</span>
            <span className="text-slate-500">{lv.into}/{lv.need} XP</span>
          </div>
          <Bar value={lv.into} max={lv.need} tone="bg-amber-500" />
          <div className="flex items-baseline justify-between pt-1 text-sm">
            <span className="font-semibold">படித்த நேரம்</span>
            <span className="text-slate-500">{(data.mins / 60).toFixed(1)} / 83 மணி</span>
          </div>
          <Bar value={data.mins} max={BUDGET_MIN} />
        </Card>
      )}

      {newsToday > 0 && (
        <Card className="flex items-center gap-3 text-sm">
          <Icon name="news" size={26} className="text-indigo-600" />
          <span>இன்றைய நடப்பு நிகழ்வுகளிலிருந்து {newsToday} புதிய வினாக்கள் வந்துள்ளன; இன்றைய பயிற்சியில் வரும்.</span>
        </Card>
      )}

      {next && (
        <Card className="flex items-center justify-between gap-3 text-sm">
          <span>அடுத்த சிறப்பு நாள்: <b><T v={DAY_LABEL[next.type]} inline /></b></span>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-700">{fmtDay(next.date).en} · {diffDays(date, next.date)} நாள்</span>
        </Card>
      )}

      {completed && tomorrow.type !== 'AFTER_EXAM' && (
        <p className="text-center text-sm text-slate-500">நாளை: <T v={DAY_LABEL[tomorrow.type]} inline /> · {tomorrow.minutes} நிமிடம்</p>
      )}
    </Screen>
  );
}
