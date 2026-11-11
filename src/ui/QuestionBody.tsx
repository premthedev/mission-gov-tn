import type { Question } from '../data/types';
import { passageById } from '../data/content';
import { T } from './kit';

const MATCH_LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)'];

export function SourceBadge({ q }: { q: Question }) {
  let label = '';
  if (q.source.kind === 'PYQ') {
    const key = q.keySource === 'FINAL_KEY' ? 'Final key' : 'Tentative key';
    label = `TNPSC ${q.source.year} · Q${q.source.qNo} · ${key}`;
  } else if (q.source.kind === 'LESSON') label = 'Lesson question';
  else if (q.source.kind === 'GENERATED') label = 'App-generated · fresh';
  else if (q.source.kind === 'CURRENT_AFFAIRS') label = `Current affairs${q.source.date ? ` · ${q.source.date}` : ''}`;
  else label = 'Practice variant';
  return <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{label}</span>;
}

export function QuestionBody({ q, number }: { q: Question; number?: string }) {
  const passage = q.passageId ? passageById(q.passageId) : undefined;
  return (
    <div className="space-y-3">
      {passage && (
        <div className="max-h-72 overflow-y-auto rounded-2xl bg-amber-50 p-3 text-[0.95em] leading-relaxed ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
          <T v={passage.text} />
        </div>
      )}
      <div className="text-lg font-medium leading-relaxed">
        {number && <span className="mr-1 text-slate-500">{number}.</span>}
        <T v={q.stem} />
      </div>
      {q.statements && q.statements.length > 0 && (
        <ol className="space-y-2">
          {q.statements.map((s, i) => (
            <li key={i} className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/60">
              {q.format !== 'ASSERTION_REASON' && <span className="mr-1 font-semibold">{i + 1}.</span>}
              <T v={s} />
            </li>
          ))}
        </ol>
      )}
      {q.matchTable && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-slate-100 p-3 text-[0.95em] dark:bg-slate-700/60">
          {q.matchTable.left.map((l, i) => (
            <div key={`l${i}`} className="contents">
              <div><span className="mr-1 font-semibold">{MATCH_LABELS[i]}</span><T v={l} /></div>
              <div><span className="mr-1 font-semibold">{i + 1}.</span><T v={q.matchTable!.right[i]} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
