import { useState } from 'react';
import { lessonById, UNIT_LABEL } from '../data/content';
import { Button, Card, T } from './kit';
import { QuizRunner } from './QuizRunner';

/** Lesson in four parts: explanation → examples → traps → check questions. */
export function LessonView({ lessonId, onDone, sessionId, stepId }: { lessonId: string; onDone: () => void; sessionId?: string; stepId?: string }) {
  const lesson = lessonById(lessonId);
  const [page, setPage] = useState(0);
  if (!lesson) {
    return (
      <Card className="space-y-3">
        <T v={{ ta: 'இந்தப் பாடம் கிடைக்கவில்லை.', en: 'Lesson not found.' }} />
        <Button onClick={onDone}>தொடர்க</Button>
      </Card>
    );
  }
  const pages = ['learn', 'examples', 'traps', 'check'] as const;
  const kind = pages[page];
  const nextPage = () => {
    setPage((p) => p + 1);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300"><T v={UNIT_LABEL[lesson.unit]} inline /></div>
        <h2 className="text-2xl font-bold leading-snug"><T v={lesson.title} /></h2>
        <div className="mt-3 flex gap-1.5">
          {pages.map((p, i) => <div key={p} className={`h-1.5 flex-1 rounded-full ${i <= page ? 'bg-teal-600' : 'bg-slate-200 dark:bg-slate-700'}`} />)}
        </div>
      </div>

      {kind === 'learn' && (
        <>
          <Card className="bg-teal-50 dark:bg-teal-950/40">
            <div className="text-xs font-semibold uppercase text-teal-700 dark:text-teal-300">ஒரே வரியில் · In one line</div>
            <T v={lesson.oneLine} className="text-lg font-semibold" />
          </Card>
          {lesson.sections.map((s, i) => (
            <Card key={i} className="space-y-2 leading-relaxed">
              {s.heading && <h3 className="text-lg font-bold"><T v={s.heading} /></h3>}
              <T v={s.body} />
            </Card>
          ))}
          <Button onClick={nextPage} className="w-full">எடுத்துக்காட்டுகள் →</Button>
        </>
      )}

      {kind === 'examples' && (
        <>
          {lesson.examples.map((e, i) => (
            <Card key={i} className="space-y-1">
              <T v={e.q} className="font-semibold" />
              <T v={e.a} className="text-teal-800 dark:text-teal-200" />
            </Card>
          ))}
          <Button onClick={nextPage} className="w-full">TNPSC பொறிகள் →</Button>
        </>
      )}

      {kind === 'traps' && (
        <>
          <Card className="space-y-3 bg-amber-50 dark:bg-amber-950/30">
            <div className="font-bold text-amber-800 dark:text-amber-300">⚠ TNPSC எப்படிச் சிக்க வைக்கும் · Traps</div>
            {lesson.traps.map((t, i) => <T key={i} v={t} />)}
          </Card>
          <p className="text-center text-xs text-slate-500">மூலம் · Source: {lesson.sourceRef}</p>
          <Button onClick={nextPage} className="w-full">சரிபார்ப்பு வினாக்கள் ({lesson.check.length}) →</Button>
        </>
      )}

      {kind === 'check' && (
        <QuizRunner questions={lesson.check} mode="LESSON" sessionId={sessionId} stepId={stepId} onFinish={onDone} finishLabel={{ ta: 'பாடம் முடிந்தது ✓', en: 'Lesson done' }} />
      )}
    </div>
  );
}
