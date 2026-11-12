import { useMemo, useState } from 'react';
import { lessonById, UNIT_LABEL } from '../data/content';
import { addXp } from '../data/progress';
import type { Bi, Question } from '../data/types';
import { XP } from '../engine/xp';
import { fx } from './feedback';
import { Button, Card, T } from './kit';
import { QuizRunner } from './QuizRunner';

type Card_ =
  | { kind: 'one'; body: Bi }
  | { kind: 'teach'; heading?: Bi; body: Bi }
  | { kind: 'try'; q: Question }
  | { kind: 'examples' }
  | { kind: 'traps' }
  | { kind: 'done' };

/**
 * Learn by doing (Brilliant-style): short teaching cards, each followed straight away by a question
 * on it, then examples, TNPSC traps, and the remaining questions.
 */
export function LessonView({ lessonId, onDone, sessionId, stepId }: { lessonId: string; onDone: () => void; sessionId?: string; stepId?: string }) {
  const lesson = lessonById(lessonId);
  const [i, setI] = useState(0);

  const cards = useMemo<Card_[]>(() => {
    if (!lesson) return [];
    const checks = [...lesson.check];
    const out: Card_[] = [{ kind: 'one', body: lesson.oneLine }];
    lesson.sections.forEach((s) => {
      out.push({ kind: 'teach', heading: s.heading, body: s.body });
      const q = checks.shift();
      if (q) out.push({ kind: 'try', q });
    });
    if (lesson.examples.length) out.push({ kind: 'examples' });
    if (lesson.traps.length) out.push({ kind: 'traps' });
    checks.forEach((q) => out.push({ kind: 'try', q }));
    out.push({ kind: 'done' });
    return out;
  }, [lesson]);

  if (!lesson) {
    return (
      <Card className="space-y-3">
        <p>இந்தப் பாடம் கிடைக்கவில்லை.</p>
        <Button onClick={onDone}>தொடர்க</Button>
      </Card>
    );
  }

  const card = cards[i];
  const next = () => {
    fx.tap();
    setI((x) => x + 1);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300"><T v={UNIT_LABEL[lesson.unit]} inline /></div>
        <h2 className="text-xl font-bold leading-snug"><T v={lesson.title} /></h2>
        <div className="mt-3 flex gap-1">
          {cards.map((c, j) => <div key={j} className={`h-1.5 flex-1 rounded-full ${j < i ? 'bg-teal-500' : j === i ? 'bg-teal-300' : 'bg-slate-200 dark:bg-slate-700'} ${c.kind === 'try' ? 'opacity-90' : ''}`} />)}
        </div>
      </div>

      <div key={i} className="slide-up space-y-4">
        {card.kind === 'one' && (
          <>
            <Card className="bg-gradient-to-br from-teal-600 to-teal-800 text-white ring-0">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-100">ஒரே வரியில் · The idea</div>
              <T v={card.body} className="text-xl font-semibold leading-relaxed" />
            </Card>
            <Button onClick={next} className="w-full text-lg">புரிகிறது →</Button>
          </>
        )}

        {card.kind === 'teach' && (
          <>
            <Card className="space-y-2 leading-relaxed">
              {card.heading && <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200"><T v={card.heading} /></h3>}
              <T v={card.body} />
            </Card>
            <Button onClick={next} className="w-full text-lg">முயன்று பார் →</Button>
          </>
        )}

        {card.kind === 'try' && (
          <QuizRunner key={card.q.id} questions={[card.q]} mode="LESSON" sessionId={sessionId} stepId={stepId} skipSummary onFinish={() => setI((x) => x + 1)} />
        )}

        {card.kind === 'examples' && (
          <>
            <div className="text-sm font-semibold text-slate-500">எடுத்துக்காட்டுகள் · Examples</div>
            {lesson.examples.map((e, j) => (
              <Card key={j} className="space-y-1">
                <T v={e.q} className="font-semibold" />
                <T v={e.a} className="text-teal-800 dark:text-teal-200" />
              </Card>
            ))}
            <Button onClick={next} className="w-full text-lg">தொடர்க →</Button>
          </>
        )}

        {card.kind === 'traps' && (
          <>
            <Card className="space-y-3 bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
              <div className="font-bold text-amber-800 dark:text-amber-300">⚠ TNPSC பொறிகள் · Traps</div>
              {lesson.traps.map((t, j) => <T key={j} v={t} />)}
            </Card>
            <Button onClick={next} className="w-full text-lg">தொடர்க →</Button>
          </>
        )}

        {card.kind === 'done' && (
          <Card className="pop-in space-y-3 text-center">
            <div className="text-5xl">💡</div>
            <div className="text-xl font-bold">பாடம் முடிந்தது!</div>
            <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">+{XP.lessonDone} XP</div>
            <p className="text-xs text-slate-500">மூலம்: {lesson.sourceRef}</p>
            <Button onClick={() => { fx.win(); void addXp(XP.lessonDone); onDone(); }} className="w-full text-lg">அடுத்த படி →</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
