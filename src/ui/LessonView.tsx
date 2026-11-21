import { useMemo, useState } from 'react';
import { cheatById, lessonById, UNIT_LABEL } from '../data/content';
import { addXp } from '../data/progress';
import type { Bi, CheatSheet, Question } from '../data/types';
import { XP } from '../engine/xp';
import { CheatSheetModal, SheetTable } from './CheatSheet';
import { fx } from './feedback';
import { Icon } from './icons';
import { Button, Card, Label, T } from './kit';
import { QuizRunner } from './QuizRunner';

type Card_ =
  | { kind: 'one'; body: Bi }
  | { kind: 'teach'; heading?: Bi; body: Bi; table?: string[][] }
  | { kind: 'try'; q: Question }
  | { kind: 'examples' }
  | { kind: 'traps' }
  | { kind: 'done' };

/**
 * Learn by doing: short teaching cards, each followed straight away by a question on it,
 * then worked examples (or "if you see this → do this" recipes), TNPSC traps and the remaining questions.
 */
export function LessonView({ lessonId, onDone, sessionId, stepId }: { lessonId: string; onDone: () => void; sessionId?: string; stepId?: string }) {
  const lesson = lessonById(lessonId);
  const [i, setI] = useState(0);
  const [sheet, setSheet] = useState<CheatSheet | null>(null);

  const cards = useMemo<Card_[]>(() => {
    if (!lesson) return [];
    const checks = [...lesson.check];
    const out: Card_[] = [{ kind: 'one', body: lesson.oneLine }];
    lesson.sections.forEach((s) => {
      out.push({ kind: 'teach', heading: s.heading, body: s.body, table: s.table });
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
  const cs = cheatById(lesson.cheat);
  const next = () => {
    fx.tap();
    setI((x) => x + 1);
    window.scrollTo({ top: 0 });
  };
  const back = () => {
    let j = i - 1;
    while (j > 0 && cards[j].kind === 'try') j--;
    setI(Math.max(0, j));
    window.scrollTo({ top: 0 });
  };
  const nav = (label: string) => (
    <div className="flex gap-3">
      {i > 0 && (
        <Button variant="secondary" onClick={back} className="w-14 shrink-0 px-0"><Icon name="back" /></Button>
      )}
      <Button onClick={next} className="flex-1 text-lg">{label} <Icon name="right" /></Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <Label><T v={UNIT_LABEL[lesson.unit]} inline /></Label>
          {cs && (
            <button type="button" onClick={() => setSheet(cs)} className="flex items-center gap-1 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <Icon name="sheet" size={16} /> குறிப்பு அட்டை
            </button>
          )}
        </div>
        <h2 className="text-xl font-bold leading-snug"><T v={lesson.title} /></h2>
        <div className="mt-3 flex gap-1">
          {cards.map((c, j) => <div key={j} className={`h-1.5 flex-1 rounded-full ${j < i ? 'bg-teal-500' : j === i ? 'bg-teal-300' : 'bg-slate-200 dark:bg-slate-700'} ${c.kind === 'try' ? 'opacity-90' : ''}`} />)}
        </div>
      </div>

      <div key={i} className="slide-up space-y-4">
        {card.kind === 'one' && (
          <>
            <Card className="bg-gradient-to-br from-teal-600 to-teal-800 text-white ring-0">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-100">ஒரே வரியில்</div>
              <T v={card.body} className="text-xl font-semibold leading-relaxed" />
            </Card>
            {nav('புரிகிறது')}
          </>
        )}

        {card.kind === 'teach' && (
          <>
            <Card className="space-y-3 leading-relaxed">
              {card.heading && <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200"><T v={card.heading} /></h3>}
              {(card.body.ta || card.body.en) && <T v={card.body} />}
              {card.table && <SheetTable rows={card.table} />}
            </Card>
            {nav(cards[i + 1]?.kind === 'try' ? 'முயன்று பார்' : 'தொடர்க')}
          </>
        )}

        {card.kind === 'try' && (
          <QuizRunner key={card.q.id} questions={[card.q]} mode="LESSON" sessionId={sessionId} stepId={stepId} skipSummary onFinish={() => setI((x) => x + 1)} />
        )}

        {card.kind === 'examples' && (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Icon name="bulb" size={18} /> {lesson.fromCheat ? 'இப்படிக் கேட்டால் → இப்படிச் செய்' : 'எடுத்துக்காட்டுகள்'}
            </div>
            {lesson.examples.map((e, j) => (
              <Card key={j} className="space-y-1">
                <T v={e.q} className="font-semibold" />
                <div className="flex gap-1.5 text-teal-800 dark:text-teal-200"><span>→</span><T v={e.a} /></div>
              </Card>
            ))}
            {nav('தொடர்க')}
          </>
        )}

        {card.kind === 'traps' && (
          <>
            <Card className="space-y-3 bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
              <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300"><Icon name="alert" size={20} /> TNPSC பொறிகள்</div>
              {lesson.traps.map((t, j) => <div key={j} className="flex gap-2"><span>•</span><T v={t} /></div>)}
            </Card>
            {nav('தொடர்க')}
          </>
        )}

        {card.kind === 'done' && (
          <Card className="pop-in space-y-3 text-center">
            <Icon name="bulb" size={44} className="mx-auto text-amber-500" />
            <div className="text-xl font-bold">பாடம் முடிந்தது!</div>
            <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">+{XP.lessonDone} XP</div>
            {cs && (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                இந்தத் தலைப்பின் குறிப்பு அட்டை "கற்க → குறிப்புகள்" பகுதியில் எப்போதும் இருக்கும். தேர்வுக்கு முந்தைய வாரம் அதை மட்டும் படித்தால் போதும்.
              </p>
            )}
            <p className="text-xs text-slate-500">மூலம்: {lesson.sourceRef}</p>
            <Button onClick={() => { fx.win(); void addXp(XP.lessonDone); onDone(); }} className="w-full text-lg">அடுத்த படி <Icon name="right" /></Button>
          </Card>
        )}
      </div>
      {sheet && <CheatSheetModal c={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
