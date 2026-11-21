import { useState } from 'react';
import type { Letter, Question, Unit } from '../data/types';
import { UNIT_LABEL } from '../data/content';
import type { ScoreResult } from '../engine/scoring';
import { Icon } from './icons';
import { Button, Card, Chip, T, txt } from './kit';
import { QuestionBody } from './QuestionBody';

type Filter = 'wrong' | 'blank' | 'guess' | 'all';

/** One mock question in the answer review: your bubble, the key, and the explanation on tap. */
function ReviewItem({ q, n, chosen, guessed }: { q: Question; n: number; chosen?: string; guessed: boolean }) {
  const [open, setOpen] = useState(false);
  const right = chosen === q.answer || (q.acceptedAnswers?.includes(chosen as Letter) ?? false);
  const tone = !chosen || chosen === 'E' ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : right ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white';
  const e = q.explanation;
  return (
    <Card className="space-y-2 py-3">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-start gap-3 text-left">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${tone}`}>{n}</span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm">{txt(q.stem)}</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            உங்கள் விடை: {chosen ?? 'காலி'}{guessed ? ' (ஊகம்)' : ''} · சரியான விடை: {q.answer}
          </span>
        </span>
        <Icon name={open ? 'down' : 'right'} size={18} className="mt-1 text-slate-400" />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <QuestionBody q={q} />
          <div className="space-y-1.5">
            {(['A', 'B', 'C', 'D'] as Letter[]).map((l) => (
              <div key={l} className={`rounded-xl px-3 py-2 text-sm ${l === q.answer ? 'bg-emerald-50 font-semibold ring-1 ring-emerald-400 dark:bg-emerald-900/30' : l === chosen ? 'bg-rose-50 ring-1 ring-rose-400 dark:bg-rose-900/30' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
                ({l}) <T v={q.options[l]} inline />
                {l !== q.answer && e?.why?.[l] && <div className="mt-0.5 text-xs font-normal text-slate-500">ஏன் இல்லை: <T v={e.why[l]} inline /></div>}
              </div>
            ))}
          </div>
          {e && (e.ta || e.en) && <div className="rounded-xl bg-teal-50 p-3 text-sm leading-relaxed dark:bg-teal-900/30"><b>விளக்கம்: </b><T v={{ ta: e.ta, en: e.en }} /></div>}
          {e?.rule && <div className="text-sm"><b>விதி: </b><T v={e.rule} inline /></div>}
          {e?.tip && <div className="text-sm"><b>குறிப்பு: </b><T v={e.tip} inline /></div>}
        </div>
      )}
    </Card>
  );
}

export function MockResult({ result, questions, answers, guesses, onDone }: {
  result: ScoreResult;
  questions: Question[];
  answers: Record<string, string>;
  guesses: string[];
  onDone: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('wrong');
  const [limit, setLimit] = useState(20);
  const byUnit = new Map<Unit, { c: number; t: number }>();
  const isRight = (q: Question) => answers[q.id] === q.answer || (q.acceptedAnswers?.includes(answers[q.id] as Letter) ?? false);
  for (const q of questions) {
    const u = byUnit.get(q.unit) ?? { c: 0, t: 0 };
    u.t++;
    if (isRight(q)) u.c++;
    byUnit.set(q.unit, u);
  }
  const guessed = questions.filter((q) => guesses.includes(q.id));
  const guessRight = guessed.filter((q) => answers[q.id] === q.answer).length;
  const p = result.byPart;

  const list = questions
    .map((q, i) => ({ q, n: i + 1 }))
    .filter(({ q }) => {
      const a = answers[q.id];
      if (filter === 'wrong') return a && a !== 'E' && !isRight(q);
      if (filter === 'blank') return !a || a === 'E';
      if (filter === 'guess') return guesses.includes(q.id);
      return true;
    });

  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-sm text-slate-500">மொத்த மதிப்பெண்</div>
        <div className="text-5xl font-bold text-teal-700 dark:text-teal-300">{result.total.toFixed(1)}</div>
        <div className="text-sm text-slate-500">/ {result.maxMarks} · {result.correct} சரி / {questions.length}</div>
        {p.A.total > 0 && (
          <div className={`mt-3 rounded-2xl p-2 text-sm font-semibold ${result.gatePassed ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200'}`}>
            {result.gatePassed
              ? `பகுதி அ: ${result.marksA} மதிப்பெண் · தகுதி வரம்பு (${result.gateMarks}) கடந்தது`
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
          {result.blank} வினாக்கள் காலியாக விடப்பட்டன: −{result.deduction} மதிப்பெண். உண்மையான தேர்வில் ஒவ்வொரு வினாவுக்கும் ஒரு வட்டத்தைக் கருமையாக்குங்கள்.
        </Card>
      )}

      {guessed.length > 0 && (
        <Card className="text-sm">
          "?" குறித்த {guessed.length} ஊக வினாக்களில் {guessRight} சரி ({Math.round((guessRight / guessed.length) * 100)}%). 25%-க்கு மேல் இருந்தால் ஊகிப்பது பலன் தருகிறது.
        </Card>
      )}

      <Card className="space-y-2">
        <div className="font-semibold">அலகு வாரியாக</div>
        {[...byUnit.entries()].map(([u, v]) => (
          <div key={u} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{txt(UNIT_LABEL[u])}</span>
            <span className={`shrink-0 font-semibold ${v.c / v.t < 0.5 ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>{v.c}/{v.t}</span>
          </div>
        ))}
      </Card>

      <div className="space-y-3">
        <div className="font-bold">விடைகளைப் பாருங்கள்</div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={filter === 'wrong'} onClick={() => { setFilter('wrong'); setLimit(20); }}>தவறியவை</Chip>
          <Chip active={filter === 'blank'} onClick={() => { setFilter('blank'); setLimit(20); }}>காலி / E</Chip>
          <Chip active={filter === 'guess'} onClick={() => { setFilter('guess'); setLimit(20); }}>ஊகித்தவை</Chip>
          <Chip active={filter === 'all'} onClick={() => { setFilter('all'); setLimit(20); }}>அனைத்தும்</Chip>
        </div>
        {list.length === 0 && <p className="text-sm text-slate-500">இந்தப் பட்டியலில் வினாக்கள் இல்லை.</p>}
        {list.slice(0, limit).map(({ q, n }) => <ReviewItem key={q.id} q={q} n={n} chosen={answers[q.id]} guessed={guesses.includes(q.id)} />)}
        {list.length > limit && <Button variant="secondary" onClick={() => setLimit((l) => l + 20)} className="w-full">மேலும் {Math.min(20, list.length - limit)}</Button>}
      </div>

      <p className="text-center text-sm text-slate-500">தவறிய, காலி, ஊக வினாக்கள் அனைத்தும் மீள்பார்வைப் பட்டியலில் சேர்க்கப்பட்டன.</p>
      <Button onClick={onDone} className="w-full">முடிக்க</Button>
    </div>
  );
}
