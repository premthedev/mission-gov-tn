import { useLiveQuery } from 'dexie-react-hooks';
import { caQuestions, feedDates } from '../data/content';
import { dueReviewIds, kuralsLearned, previewSteps, streak, studiedMinutes, xpToday, xpTotal } from '../data/progress';
import { BUDGET_MIN, DAY_LABEL, dayInfo, upcomingSpecial } from '../data/schedule';
import { STEP_ICON, plannedMinutes } from '../engine/planner';
import { level } from '../engine/xp';
import { diffDays, fmtDay, todayISO } from '../lib/date';
import { Ring } from './Celebrate';
import { Bar, Button, Card, Screen, T } from './kit';
import { stepTitle } from './Session';

const HINT: Partial<Record<string, string>> = {
  STUDY_WEEKDAY: 'ஒரு மணி நேரம். ஆப் சொல்வதை மட்டும் செய்யுங்கள்.',
  STUDY_WEEKEND: 'இரண்டு மணி நேரம்: பாடங்கள் + 30 நிமிடச் சிறு தேர்வு.',
  DIAGNOSTIC: 'உண்மையான 2025 வினாத்தாள்: உங்கள் தொடக்க நிலை.',
  SECTIONAL_BIG: '100 தமிழ் வினாக்கள், 70 நிமிடம். தகுதி வரம்பு 40 சரி.',
  PRE_MOCK_LIGHT: 'இன்று லேசாக. நாளை காலை 9:30 முழுத் தேர்வு.',
  FULL_MOCK: 'காலை 9:30-க்குத் தொடங்குங்கள். 3 மணி நேரம், உண்மையான தேர்வு போல.',
  MOCK_REVIEW: 'தேர்வுத் தவறுகளைத் திரும்பச் செய்யுங்கள்.',
  FINAL_REVIEW: 'புதியதாக எதுவும் இல்லை. மீள்பார்வை + சரிபார்ப்புப் பட்டியல்.',
  EXAM_DAY: 'வாழ்த்துகள்! பட்டியலைப் பார்த்துவிட்டுச் செல்லுங்கள்.',
};

export function Today({ onStart }: { onStart: () => void }) {
  const date = todayISO();
  const info = dayInfo(date);
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
    };
  }, [date]);
  const next = upcomingSpecial(date, 1)[0];
  const day = fmtDay(date);
  const todayMin = data?.session ? Math.round(data.session.activeSec / 60) : 0;
  const planMin = data ? plannedMinutes(data.steps) : info.minutes;
  const lv = level(data?.xp ?? 0);
  const newsToday = feedDates().at(-1) === date ? caQuestions().filter((q) => q.source.date === date).length : 0;

  return (
    <Screen className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{day.ta}</div>
          <div className="text-xl font-bold">{info.type === 'AFTER_EXAM' ? 'தேர்வு முடிந்தது' : info.type === 'BEFORE_START' ? 'Mission GOV' : `நாள் ${info.dayNo}/64 · தேர்வுக்கு ${info.daysToExam} நாள்`}</div>
        </div>
        <div className="flex gap-2 text-sm font-bold">
          <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200">🔥 {data?.streak ?? 0}</span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">⭐ {data?.xp ?? 0}</span>
        </div>
      </div>

      <Card className="space-y-4 bg-gradient-to-br from-teal-600 to-teal-900 text-white ring-0">
        <div className="flex items-center gap-4">
          <Ring value={todayMin} max={planMin}>
            <div className="text-2xl font-bold leading-none">{todayMin}</div>
            <div className="text-[0.65rem] text-teal-100">/ {planMin} நிமி</div>
          </Ring>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-100">இன்று</div>
            <div className="text-xl font-bold leading-tight"><T v={DAY_LABEL[info.type]} inline /></div>
            {HINT[info.type] && <div className="mt-1 text-sm text-teal-50">{HINT[info.type]}</div>}
          </div>
        </div>
        {data && data.steps.length > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {data.steps.map((s) => {
                const done = data.session?.done.includes(s.id);
                return (
                  <span key={s.id} title={stepTitle(s).ta} className={`rounded-full px-2.5 py-1 text-sm ${done ? 'bg-white text-teal-800' : 'bg-white/15'}`}>
                    {STEP_ICON[s.kind]}{s.minutes ? ` ${s.minutes}′` : ''}
                  </span>
                );
              })}
            </div>
            <Button variant="secondary" onClick={onStart} className="w-full text-lg" disabled={data.session?.completed}>
              {data.session?.completed ? 'இன்று முடிந்தது ✓' : data.session && data.session.index > 0 ? `தொடர்க · படி ${data.session.index + 1}/${data.steps.length}` : 'தொடங்கு ▶'}
            </Button>
          </>
        )}
      </Card>

      {data && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center"><div className="text-xl font-bold">{data.kurals}<span className="text-sm text-slate-400">/200</span></div><div className="text-xs text-slate-500">குறள்கள்</div></Card>
          <Card className="p-3 text-center"><div className="text-xl font-bold">{data.due}</div><div className="text-xs text-slate-500">மீள்பார்வை</div></Card>
          <Card className="p-3 text-center"><div className="text-xl font-bold">+{data.xpDay}</div><div className="text-xs text-slate-500">XP இன்று</div></Card>
        </div>
      )}

      {data && (
        <Card className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">நிலை {lv.n} · {lv.title}</span>
            <span className="text-slate-500">{lv.into}/{lv.need} XP</span>
          </div>
          <Bar value={lv.into} max={lv.need} />
          <div className="flex items-baseline justify-between pt-1 text-sm">
            <span className="font-semibold">படித்த நேரம்</span>
            <span className="text-slate-500">{(data.mins / 60).toFixed(1)} / 83 மணி</span>
          </div>
          <Bar value={data.mins} max={BUDGET_MIN} />
        </Card>
      )}

      {newsToday > 0 && (
        <Card className="flex items-center gap-3 text-sm">
          <span className="text-2xl">📰</span>
          <span>இன்றைய நடப்பு நிகழ்வுகளிலிருந்து {newsToday} புதிய வினாக்கள் சேர்க்கப்பட்டன; சூடேற்றலில் வரும்.</span>
        </Card>
      )}

      {next && (
        <Card className="flex items-center justify-between gap-3 text-sm">
          <span>அடுத்து: <b><T v={DAY_LABEL[next.type]} inline /></b></span>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 font-semibold dark:bg-slate-700">{fmtDay(next.date).en} · {diffDays(date, next.date)} நாள்</span>
        </Card>
      )}
    </Screen>
  );
}
