import { useEffect, useState } from 'react';
import { CHAPTERS, KURALS, chapterByOrder } from '../data/content';
import { addXp, dueKuralCards, learnKural, nextNewKurals, reviewKural } from '../data/progress';
import type { Kural, KuralUrai, Question } from '../data/types';
import { fetchUrai, getUrai } from '../data/urai';
import { kuralQuestionsFor } from '../engine/generators/kural';
import { XP } from '../engine/xp';
import { todayISO } from '../lib/date';
import { fx } from './feedback';
import { Button, Card } from './kit';
import { QuizRunner } from './QuizRunner';

/**
 * Thirukkural in small doses: a few due revision cards, then N new cards (tap to flip), then a quick quiz
 * on exactly those kurals. 200 syllabus kurals ≈ 5 a day, finished well before the exam.
 */
export function KuralCards({ newCount, quizCount, sessionId, stepId, onDone }: { newCount: number; quizCount: number; sessionId?: string; stepId?: string; onDone: () => void }) {
  const [deck, setDeck] = useState<{ k: Kural; isNew: boolean }[] | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [urai, setUrai] = useState<KuralUrai | undefined>();
  const [quiz, setQuiz] = useState<Question[] | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    void (async () => {
      const due = await dueKuralCards(todayISO(), 6);
      const fresh = await nextNewKurals(newCount);
      if (fresh.length && fresh[0].n === KURALS.find((k) => k.order === 1)!.n) setShowMap(true);
      setDeck([...due.map((k) => ({ k, isNew: false })), ...fresh.map((k) => ({ k, isNew: true }))]);
    })();
  }, [newCount]);

  const card = deck?.[i];
  useEffect(() => {
    if (!card) return;
    setUrai(undefined);
    void (async () => {
      let u = await getUrai(card.k.n);
      if (!u && (await fetchUrai())) u = await getUrai(card.k.n);
      setUrai(u);
    })();
  }, [card?.k.n]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!deck) return null;

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
        <Button onClick={() => setShowMap(false)} className="w-full text-lg">குறள்களைத் தொடங்கு →</Button>
      </div>
    );
  }

  if (quiz) {
    return <QuizRunner questions={quiz} mode="KURAL" sessionId={sessionId} stepId={stepId} onFinish={onDone} compactResult />;
  }

  if (!card) {
    const learned = deck.filter((d) => d.isNew).map((d) => d.k);
    const pool = learned.length ? learned : deck.map((d) => d.k);
    if (pool.length === 0) {
      return (
        <Card className="space-y-3 text-center">
          <div className="text-4xl">🏆</div>
          <p>200 குறள்களும் கற்றாகிவிட்டன. இன்று மீள்பார்வை அட்டைகள் இல்லை.</p>
          <Button onClick={onDone} className="w-full">அடுத்த படி →</Button>
        </Card>
      );
    }
    return (
      <Card className="pop-in space-y-4 text-center">
        <div className="text-4xl">📜</div>
        <div className="text-lg font-bold">{learned.length ? `${learned.length} புதிய குறள்கள் கற்றீர்கள்!` : 'மீள்பார்வை முடிந்தது!'}</div>
        <p className="text-slate-500">இப்போது அவற்றில் {quizCount} சிறு வினாக்கள்.</p>
        <Button onClick={() => setQuiz(kuralQuestionsFor(pool, KURALS, CHAPTERS, quizCount, `${todayISO()}-${stepId}`))} className="w-full text-lg">வினாக்கள் →</Button>
      </Card>
    );
  }

  const ch = chapterByOrder(card.k.order);
  const advance = async (knew: boolean) => {
    if (card.isNew) await learnKural(card.k.n);
    else await reviewKural(card.k.n, knew);
    void addXp(XP.kuralCard);
    knew ? fx.correct() : fx.tap();
    setFlipped(false);
    setI((x) => x + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{card.isNew ? '🆕 புதிய குறள்' : '🔁 மீள்பார்வை'}</span>
        <span>{i + 1} / {deck.length}</span>
      </div>
      <button type="button" onClick={() => { fx.tap(); setFlipped((f) => !f); }} className="flip-card block w-full text-left">
        <div className={`flip-inner relative min-h-[22rem] ${flipped ? 'flipped' : ''}`}>
          <div className="flip-face absolute inset-0 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 p-5 text-white shadow-lg">
            <div className="text-sm text-teal-100">குறள் {card.k.n}</div>
            <div className="space-y-2 text-[1.35rem] font-semibold leading-relaxed">
              <div>{card.k.l1}</div>
              <div>{card.k.l2}</div>
            </div>
            <div className="text-center text-sm text-teal-100">தொட்டுத் திருப்பு · tap to see chapter & meaning</div>
          </div>
          <div className="flip-face flip-back absolute inset-0 overflow-y-auto rounded-3xl bg-white p-5 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">அதிகாரம் {ch.ch} · {ch.paal}</div>
            <div className="mb-3 text-2xl font-bold">{ch.name}</div>
            {urai?.mv && <p className="mb-2 leading-relaxed"><b>பொருள்:</b> {urai.mv}</p>}
            {urai?.sp && <p className="mb-2 text-[0.95rem] leading-relaxed text-slate-700 dark:text-slate-200"><b>எளிதாக:</b> {urai.sp}</p>}
            <p className="text-sm italic text-slate-500">{card.k.pope}</p>
            {!urai && <p className="mt-2 text-xs text-slate-400">தமிழ் உரைக்கு ஒருமுறை இணையம் தேவை.</p>}
          </div>
        </div>
      </button>
      {flipped ? (
        card.isNew ? (
          <Button onClick={() => void advance(true)} className="w-full text-lg">கற்றேன் ✓ · Got it</Button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => void advance(false)}>மறந்தேன் 🔁</Button>
            <Button onClick={() => void advance(true)}>நினைவிருந்தது ✓</Button>
          </div>
        )
      ) : (
        <p className="text-center text-sm text-slate-500">இருமுறை உரக்கப் படியுங்கள்; பிறகு திருப்புங்கள்.</p>
      )}
    </div>
  );
}
