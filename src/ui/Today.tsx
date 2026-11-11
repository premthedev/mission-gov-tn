import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { dueReviewIds, previewSteps, streak, studiedMinutes } from '../data/progress';
import { BUDGET_MIN, DAY_LABEL, dayInfo, upcomingSpecial } from '../data/schedule';
import { plannedMinutes } from '../engine/planner';
import { diffDays, fmtDay, todayISO } from '../lib/date';
import { Bar, Button, Card, Screen, T } from './kit';
import { stepTitle } from './Session';

const DAY_HINT: Partial<Record<string, { ta: string; en: string }>> = {
  STUDY_WEEKDAY: { ta: 'ஒரு மணி நேரம். ஆப் சொல்லும் வரிசையில் செய்யுங்கள்.', en: 'One hour. Just follow the steps in order.' },
  STUDY_WEEKEND: { ta: 'இரண்டு மணி நேரம்: இரண்டு பாடங்கள் + நேரக் கட்டுப்பாட்டுடன் சிறு தேர்வு.', en: 'Two hours: two lessons and a timed short mock.' },
  DIAGNOSTIC: { ta: 'உண்மையான 2025 வினாத்தாள். உங்கள் தொடக்க நிலையை அறிய.', en: 'The real 2025 paper, to measure where you start.' },
  SECTIONAL_BIG: { ta: '100 தமிழ் வினாக்கள், 70 நிமிடம். தகுதி வரம்பு 40 சரி.', en: '100 Tamil questions in 70 minutes. The gate is 40 correct.' },
  PRE_MOCK_LIGHT: { ta: 'இன்று லேசாக. நாளை காலை 9:30 முழுத் தேர்வு.', en: 'Go light today. Full mock tomorrow at 9:30 AM.' },
  FULL_MOCK: { ta: 'காலை 9:30-க்குத் தொடங்குங்கள். உண்மையான தேர்வு போல 3 மணி நேரம்.', en: 'Start at 9:30 AM. Three hours, exactly like the real exam.' },
  MOCK_REVIEW: { ta: 'நேற்றைய தேர்வுத் தவறுகளை மீண்டும் செய்யுங்கள்.', en: "Redo yesterday's mock mistakes." },
  FINAL_REVIEW: { ta: 'புதியதாக எதுவும் இல்லை. மீள்பார்வை + சரிபார்ப்புப் பட்டியல்.', en: 'Nothing new. Revision and the exam checklist.' },
  EXAM_DAY: { ta: 'வாழ்த்துகள்! சரிபார்ப்புப் பட்டியலைப் பார்த்துவிட்டுச் செல்லுங்கள்.', en: 'All the best! Go through the checklist, then go.' },
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
      learned: await db.kuralLearned.count(),
      due: (await dueReviewIds(date)).length,
    };
  }, [date]);
  const day = fmtDay(date);
  const next = upcomingSpecial(date, 1)[0];

  return (
    <Screen className="space-y-4">
      <div>
        <div className="text-sm text-slate-500">{day.ta} · {day.en}</div>
        <div className="text-2xl font-bold">
          {info.type === 'BEFORE_START' ? 'Mission GOV' : info.type === 'AFTER_EXAM' ? 'தேர்வு முடிந்தது' : `நாள் ${info.dayNo} / 64`}
        </div>
        {info.daysToExam > 0 && <div className="text-sm text-slate-500">தேர்வுக்கு {info.daysToExam} நாட்கள் · 10 Jan 2027</div>}
      </div>

      <Card className="space-y-3 bg-gradient-to-br from-teal-700 to-teal-900 text-white ring-0">
        <div className="text-sm font-semibold uppercase tracking-wide text-teal-100">இன்று · Today</div>
        <div className="text-2xl font-bold"><T v={DAY_LABEL[info.type]} /></div>
        {DAY_HINT[info.type] && <div className="text-teal-50"><T v={DAY_HINT[info.type]} /></div>}
        {data && data.steps.length > 0 && (
          <Button variant="secondary" onClick={onStart} className="w-full text-lg" disabled={data.session?.completed}>
            {data.session?.completed ? 'இன்று முடிந்தது ✓' : data.session && data.session.index > 0 ? `தொடர்க · Continue (படி ${data.session.index + 1})` : `தொடங்கு · Start · ${plannedMinutes(data.steps)} நிமிடம்`}
          </Button>
        )}
      </Card>

      {data && data.steps.length > 0 && (
        <Card className="space-y-1">
          <div className="mb-1 text-sm font-semibold text-slate-500">இன்றைய வரிசை · Your steps</div>
          {data.steps.map((s, i) => {
            const done = data.session?.done.includes(s.id);
            const skipped = data.session?.skipped.includes(s.id);
            const current = data.session && !data.session.completed && data.session.index === i;
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl px-2 py-2 ${current ? 'bg-teal-50 dark:bg-teal-900/30' : ''}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-teal-600 text-white' : skipped ? 'bg-slate-300 text-slate-600' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {done ? '✓' : skipped ? '–' : i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm"><T v={stepTitle(s)} inline /></span>
                {s.minutes > 0 && <span className="shrink-0 text-xs text-slate-500">{s.minutes} நிமி</span>}
              </div>
            );
          })}
        </Card>
      )}

      {data && (
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">படித்த நேரம் · Studied</span>
            <span className="text-sm text-slate-500">{(data.mins / 60).toFixed(1)} / 83 மணி</span>
          </div>
          <Bar value={data.mins} max={BUDGET_MIN} />
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">
            <div><div className="text-xl font-bold">{data.streak}🔥</div><div className="text-xs text-slate-500">தொடர் நாட்கள்</div></div>
            <div><div className="text-xl font-bold">{data.learned}/20</div><div className="text-xs text-slate-500">குறள் அதிகாரம்</div></div>
            <div><div className="text-xl font-bold">{data.due}</div><div className="text-xs text-slate-500">மீள்பார்வை</div></div>
          </div>
        </Card>
      )}

      {next && (
        <Card className="flex items-center justify-between text-sm">
          <span>அடுத்த முக்கிய நாள்: <b><T v={DAY_LABEL[next.type]} inline /></b></span>
          <span className="shrink-0 text-slate-500">{fmtDay(next.date).en} · {diffDays(date, next.date)} நாள்</span>
        </Card>
      )}
    </Screen>
  );
}
