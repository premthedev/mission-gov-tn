import { useEffect, useState } from 'react';
import { CHAPTERS, KURALS, chapterByOrder } from '../data/content';
import { addXp, kuralPlan } from '../data/progress';
import type { Kural, KuralUrai, Question } from '../data/types';
import { fetchUrai, getUrai, tamilMeaning } from '../data/urai';
import { CHAPTER_THEME, kuralQuestionsFor } from '../engine/generators/kural';
import { XP } from '../engine/xp';
import { todayISO } from '../lib/date';
import { fx } from './feedback';
import { Icon } from './icons';
import { Button, Card } from './kit';
import { QuizRunner } from './QuizRunner';

/**
 * Thirukkural in small doses. Today's new kurals are shown once as cards (and counted as learned
 * right away, so they never repeat as "new"). Then one quiz question per kural: today's new ones plus
 * the ones due for revision. A right answer pushes a kural's next revision further out (2 → 5 → 10 → 21 days).
 */
export function KuralCards({ newCount, quizCount, sessionId, stepId, onDone }: { newCount: number; quizCount: number; sessionId?: string; stepId?: string; onDone: () => void }) {
  const date = todayISO();
  const [plan, setPlan] = useState<{ fresh: Kural[]; due: Kural[] } | null>(null);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const [urai, setUrai] = useState<KuralUrai | undefined>();
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    void (async () => {
      const p = await kuralPlan(date, stepId ?? 'kural', newCount);
      if (p.fresh[0]?.n === KURALS.find((k) => k.order === 1)!.n) setShowMap(true);
      setPlan(p);
    })();
  }, [newCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const card = plan?.fresh[i];
  useEffect(() => {
    if (!card) return;
    setUrai(undefined);
    void (async () => {
      let u = await getUrai(card.n);
      if (!u && (await fetchUrai())) u = await getUrai(card.n);
      setUrai(u);
    })();
  }, [card?.n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plan) return null;

  const startQuiz = () => {
    const pool = [...plan.fresh, ...plan.due];
    const count = Math.min(10, Math.max(quizCount, pool.length));
    setQuiz(kuralQuestionsFor(pool, KURALS, CHAPTERS, Math.min(count, pool.length), `${date}-${stepId}`, tamilMeaning));
  };

  if (showMap) {
    return (
      <div className="space-y-4">
        <Card className="space-y-3">
          <div className="text-lg font-bold">பாடத்திட்டத்தில் உள்ள 20 அதிகாரங்கள்</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">TNPSC பெரும்பாலும் ஒரு குறளைக் கொடுத்து "இது எந்த அதிகாரம்?" என்று கேட்கும். அதனால் முதலில் பெயர்களைப் பாருங்கள். ஒவ்வொரு நாளும் சில குறள்கள் மட்டும் வரும்.</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {CHAPTERS.map((c) => (
              <div key={c.order} className={`rounded-xl px-2.5 py-1.5 ${c.paal === 'அறத்துப்பால்' ? 'bg-teal-50 dark:bg-teal-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                <span className="text-slate-400">{c.order}.</span> {c.name}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">பச்சை = அறத்துப்பால் · மஞ்சள் = பொருட்பால்</p>
        </Card>
        <Button onClick={() => setShowMap(false)} className="w-full text-lg">குறள்களைத் தொடங்கு <Icon name="right" /></Button>
      </div>
    );
  }

  if (quiz) return <QuizRunner questions={quiz} mode="KURAL" sessionId={sessionId} stepId={stepId} onFinish={onDone} compactResult />;

  if (!card) {
    const total = plan.fresh.length + plan.due.length;
    if (total === 0) {
      return (
        <Card className="space-y-3 text-center">
          <Icon name="trophy" size={40} className="mx-auto text-amber-500" />
          <p>இன்று புதிய குறளும் இல்லை, மீள்பார்வைக் குறளும் இல்லை. அடுத்த படிக்குச் செல்லுங்கள்.</p>
          <Button onClick={onDone} className="w-full">அடுத்த படி <Icon name="right" /></Button>
        </Card>
      );
    }
    return (
      <Card className="pop-in space-y-4 text-center">
        <Icon name="scroll" size={40} className="mx-auto text-teal-600" />
        <div className="text-lg font-bold">{plan.fresh.length ? `${plan.fresh.length} புதிய குறள்கள் படித்தீர்கள்!` : 'இன்று மீள்பார்வை மட்டும்'}</div>
        <p className="text-slate-600 dark:text-slate-300">
          இப்போது {total} குறள்களில் ஒவ்வொன்றுக்கும் ஒரு வினா
          {plan.due.length ? ` (${plan.due.length} முன்பு படித்தவை)` : ''}. சரியாகச் சொன்னால் அந்தக் குறள் சில நாள் கழித்தே மீண்டும் வரும்.
        </p>
        <Button onClick={startQuiz} className="w-full text-lg">வினாக்கள் <Icon name="right" /></Button>
      </Card>
    );
  }

  const ch = chapterByOrder(card.order);
  const advance = () => {
    void addXp(XP.kuralCard);
    fx.tap();
    setOpen(false);
    setI((x) => x + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="font-semibold text-teal-700 dark:text-teal-300">புதிய குறள்</span>
        <span>{i + 1} / {plan.fresh.length}</span>
      </div>
      <div className="flex gap-1">
        {plan.fresh.map((k, j) => <div key={k.n} className={`h-1.5 flex-1 rounded-full ${j < i ? 'bg-teal-500' : j === i ? 'bg-teal-300' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
      </div>

      <div key={card.n} className="slide-up rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between text-sm text-teal-100">
          <span>குறள் {card.n}</span>
          {open && <span className="rounded-full bg-white/15 px-2.5 py-0.5">{ch.paal}</span>}
        </div>
        <div className="mt-4 space-y-2 text-[1.3rem] font-semibold leading-relaxed">
          <div>{card.l1}</div>
          <div>{card.l2}</div>
        </div>
        {!open && <p className="mt-5 text-sm text-teal-100">இருமுறை உரக்கப் படியுங்கள். பிறகு கண்ணை மூடி ஒருமுறை சொல்லிப் பாருங்கள்.</p>}
      </div>

      {open ? (
        <Card className="pop-in space-y-3">
          <div>
            <div className="text-xs font-semibold text-teal-700 dark:text-teal-300">அதிகாரம் {ch.ch}</div>
            <div className="text-2xl font-bold">{ch.name}</div>
            <div className="text-sm text-slate-500">{CHAPTER_THEME[card.order]}</div>
          </div>
          {urai?.mv && <p className="leading-relaxed"><b>பொருள் (மு.வ.):</b> {urai.mv}</p>}
          {urai?.sp && <p className="text-[0.95rem] leading-relaxed text-slate-700 dark:text-slate-200"><b>எளிதாக:</b> {urai.sp}</p>}
          <p className="text-sm italic text-slate-500">{card.pope}</p>
          {!urai && <p className="text-xs text-slate-400">தமிழ் உரைக்கு ஒருமுறை இணையம் தேவை.</p>}
        </Card>
      ) : null}

      {open ? (
        <Button onClick={advance} className="w-full text-lg">{i + 1 < plan.fresh.length ? 'அடுத்த குறள்' : 'வினாக்களுக்குச் செல்'} <Icon name="right" /></Button>
      ) : (
        <Button onClick={() => { fx.tap(); setOpen(true); }} variant="secondary" className="w-full text-lg"><Icon name="eye" /> பொருள் காண்</Button>
      )}
    </div>
  );
}
