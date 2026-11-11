import type { Question, Unit } from '../data/types';
import { UNIT_LABEL } from '../data/content';
import type { ScoreResult } from '../engine/scoring';
import { Button, Card, T } from './kit';

export function MockResult({ result, questions, answers, guesses, onDone }: {
  result: ScoreResult;
  questions: Question[];
  answers: Record<string, string>;
  guesses: string[];
  onDone: () => void;
}) {
  const byUnit = new Map<Unit, { c: number; t: number }>();
  for (const q of questions) {
    const u = byUnit.get(q.unit) ?? { c: 0, t: 0 };
    u.t++;
    if (answers[q.id] === q.answer || q.acceptedAnswers?.includes(answers[q.id] as never)) u.c++;
    byUnit.set(q.unit, u);
  }
  const guessed = questions.filter((q) => guesses.includes(q.id));
  const guessRight = guessed.filter((q) => answers[q.id] === q.answer).length;
  const p = result.byPart;

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-sm text-slate-500">மொத்த மதிப்பெண் · Total</div>
        <div className="text-5xl font-bold text-teal-700 dark:text-teal-300">{result.total.toFixed(1)}</div>
        <div className="text-sm text-slate-500">/ {result.maxMarks} · {result.correct} சரி / {questions.length}</div>
        {p.A.total > 0 && (
          <div className={`mt-3 rounded-2xl p-2 text-sm font-semibold ${result.gatePassed ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'}`}>
            {result.gatePassed
              ? `பகுதி அ: ${result.marksA} மதிப்பெண் · தகுதி வரம்பு (${result.gateMarks}) கடந்தது ✓`
              : `பகுதி அ: ${result.marksA} மதிப்பெண் · வரம்பு ${result.gateMarks} கடக்கவில்லை. பகுதி ஆ, இ மதிப்பிடப்படாது`}
          </div>
        )}
      </Card>

      <Card className="grid grid-cols-3 gap-2 text-center text-sm">
        {(['A', 'B', 'C'] as const).filter((k) => p[k].total > 0).map((k) => (
          <div key={k}>
            <div className="font-semibold">பகுதி {k === 'A' ? 'அ' : k === 'B' ? 'ஆ' : 'இ'}</div>
            <div className="text-2xl font-bold">{p[k].correct}/{p[k].total}</div>
            <div className="text-xs text-slate-500">தவறு {p[k].wrong} · E {p[k].e} · காலி {p[k].blank}</div>
          </div>
        ))}
      </Card>

      {result.blank > 0 && (
        <Card className="bg-rose-50 text-sm dark:bg-rose-950/30">
          <T v={{ ta: `${result.blank} வினாக்கள் காலியாக விடப்பட்டன: −${result.deduction} மதிப்பெண். உண்மையான தேர்வில் ஒவ்வொரு வினாவுக்கும் ஒரு வட்டத்தைக் கருமையாக்குங்கள்.`, en: `${result.blank} blanks cost −${result.deduction}. In the real exam, shade a bubble for every question.` }} />
        </Card>
      )}

      {guessed.length > 0 && (
        <Card className="text-sm">
          <T v={{ ta: `"?" குறித்த ${guessed.length} ஊக வினாக்களில் ${guessRight} சரி (${Math.round((guessRight / guessed.length) * 100)}%). 25%-க்கு மேல் இருந்தால் ஊகிப்பது பலன் தருகிறது.`, en: `Guesses: ${guessRight}/${guessed.length} right. Above 25% means guessing is paying off.` }} />
        </Card>
      )}

      <Card className="space-y-2">
        <div className="font-semibold">அலகு வாரியாக · By unit</div>
        {[...byUnit.entries()].map(([u, v]) => (
          <div key={u} className="flex items-center justify-between gap-2 text-sm">
            <T v={UNIT_LABEL[u]} inline className="truncate" />
            <span className={`shrink-0 font-semibold ${v.c / v.t < 0.5 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>{v.c}/{v.t}</span>
          </div>
        ))}
      </Card>

      <p className="text-center text-sm text-slate-500">
        <T v={{ ta: 'தவறிய, காலி, ஊக வினாக்கள் அனைத்தும் மீள்பார்வைப் பட்டியலில் சேர்க்கப்பட்டன.', en: 'All wrong, blank and guessed questions are now in your review queue.' }} />
      </p>
      <Button onClick={onDone} className="w-full">முடிக்க ✓</Button>
    </div>
  );
}
