import type { Question } from '../data/types';
import { passageById } from '../data/content';
import { T } from './kit';

const MATCH_LABELS = ['(a)', '(b)', '(c)', '(d)', '(e)'];
/** Extracted match items often already start with "(a)" or "1." */
const labelled = (s?: string) => !!s && /^\s*\(?[a-eஅஆஇஈ1-5][).]/i.test(s);

export function sourceLabel(q: Question): string {
  if (q.source.kind === 'PYQ') {
    const key = q.keySource === 'FINAL_KEY' ? 'இறுதி விடைக்குறிப்பு' : 'தற்காலிக விடைக்குறிப்பு';
    return `TNPSC ${q.source.year} · வினா ${q.source.qNo} · ${key}`;
  }
  if (q.source.kind === 'LESSON') return 'பாட வினா';
  if (q.source.kind === 'GENERATED') return q.source.kural ? `திருக்குறள் ${q.source.kural}` : 'புதிய வினா';
  if (q.source.kind === 'DECK') return 'நினைவு அட்டை';
  if (q.source.kind === 'CURRENT_AFFAIRS') return `நடப்பு நிகழ்வு${q.source.date ? ` · ${q.source.date}` : ''}`;
  return 'பயிற்சி வினா';
}

export function SourceBadge({ q }: { q: Question }) {
  const pyq = q.source.kind === 'PYQ';
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${pyq ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
      {sourceLabel(q)}
    </span>
  );
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
      <div className="text-[1.08rem] font-semibold leading-relaxed">
        {number && <span className="mr-1 text-slate-500">{number}.</span>}
        <T v={q.stem} />
      </div>
      {q.statements && q.statements.length > 0 && (
        <ol className="space-y-2">
          {q.statements.map((s, i) => (
            <li key={i} className="flex gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700/60">
              {q.format !== 'ASSERTION_REASON' && <span className="font-semibold">{i + 1}.</span>}
              <T v={s} />
            </li>
          ))}
        </ol>
      )}
      {q.matchTable && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-2xl bg-slate-100 p-3 text-[0.95em] dark:bg-slate-700/60">
          {q.matchTable.left.map((l, i) => (
            <div key={`l${i}`} className="contents">
              <div>{!labelled(l.ta ?? l.en) && <span className="mr-1 font-semibold">{MATCH_LABELS[i]}</span>}<T v={l} /></div>
              <div>{!labelled(q.matchTable!.right[i]?.ta ?? q.matchTable!.right[i]?.en) && <span className="mr-1 font-semibold">{i + 1}.</span>}<T v={q.matchTable!.right[i]} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
