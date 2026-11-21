import { useEffect } from 'react';
import { UNIT_LABEL, questionsForCheat } from '../data/content';
import type { CheatSheet } from '../data/types';
import { Icon } from './icons';
import { Button, Card, Label, T } from './kit';

/** A table from a cheat sheet; the first row is the header. Scrolls sideways on narrow screens. */
export function SheetTable({ rows }: { rows: string[][] }) {
  const [head, ...body] = rows;
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[18rem] border-separate border-spacing-0 text-left text-[0.92rem]">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={`bg-teal-700 px-2.5 py-2 font-semibold text-white ${i === 0 ? 'rounded-tl-xl' : ''} ${i === head.length - 1 ? 'rounded-tr-xl' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className={i % 2 ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-800'}>
              {r.map((c, j) => (
                <td key={j} className={`border-b border-slate-200 px-2.5 py-2 align-top dark:border-slate-700 ${j === 0 ? 'font-semibold' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The full cheat sheet: idea in one line, "see this → do this" recipes, tables, traps. */
export function CheatSheetView({ c, onPractice }: { c: CheatSheet; onPractice?: () => void }) {
  const n = questionsForCheat(c.id).length;
  return (
    <div className="space-y-4">
      <div>
        <Label><T v={UNIT_LABEL[c.unit]} inline /></Label>
        <h2 className="mt-1 text-xl font-bold leading-snug">{c.title}</h2>
      </div>
      <Card className="bg-gradient-to-br from-teal-600 to-teal-800 text-white ring-0">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-100">ஒரே வரியில்</div>
        <p className="text-lg font-semibold leading-relaxed">{c.oneLine}</p>
      </Card>

      {c.patterns.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-200"><Icon name="bulb" size={20} /> இப்படிக் கேட்டால் → இப்படிச் செய்</div>
          {c.patterns.map((p, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/50">
              <div className="font-semibold">{p.see}</div>
              <div className="mt-1 flex gap-1.5 text-[0.95rem] leading-relaxed text-slate-700 dark:text-slate-200"><span className="text-teal-600">→</span><span className="whitespace-pre-line">{p.do}</span></div>
            </div>
          ))}
        </Card>
      )}

      {c.blocks.map((b, i) => (
        <Card key={i} className="space-y-2.5">
          <h3 className="text-lg font-bold text-teal-800 dark:text-teal-200">{b.h}</h3>
          {b.body && <p className="whitespace-pre-line leading-relaxed">{b.body}</p>}
          {b.table && <SheetTable rows={b.table} />}
        </Card>
      ))}

      {c.traps.length > 0 && (
        <Card className="space-y-2 bg-amber-50 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300"><Icon name="alert" size={20} /> TNPSC பொறிகள்</div>
          {c.traps.map((t, i) => <p key={i} className="leading-relaxed">• {t}</p>)}
        </Card>
      )}

      <p className="text-xs text-slate-500">மூலம்: {c.source}</p>
      {onPractice && (
        <Button onClick={onPractice} className="w-full text-lg">
          <Icon name="target" /> இதில் பயிற்சி{n ? ` · ${n} வினா` : ''}
        </Button>
      )}
    </div>
  );
}

/** Cheat sheet over the current screen (from a question or a lesson). */
export function CheatSheetModal({ c, onClose }: { c: CheatSheet; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-slate-200 px-2 py-2 dark:border-slate-800" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full active:bg-slate-200 dark:active:bg-slate-800" aria-label="Close">
          <Icon name="close" size={24} />
        </button>
        <div className="flex-1 truncate font-semibold">குறிப்பு அட்டை</div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-4 py-4 pb-10">
          <CheatSheetView c={c} />
          <Button onClick={onClose} variant="secondary" className="mt-4 w-full"><Icon name="back" /> திரும்பிச் செல்</Button>
        </div>
      </div>
    </div>
  );
}
