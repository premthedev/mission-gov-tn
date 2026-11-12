import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { CHAPTERS, curriculum, decks, lessons, UNIT_LABEL } from '../data/content';
import { db } from '../data/db';
import { WEEKS, dayInfo } from '../data/schedule';
import type { Deck } from '../data/types';
import { fmtDay, todayISO } from '../lib/date';
import { Card, Chip, Screen, T } from './kit';

export function Learn({ openKural, openLesson, openDeck }: { openKural: (order: number) => void; openLesson: (id: string) => void; openDeck: (d: Deck) => void }) {
  const [tab, setTab] = useState<'path' | 'decks' | 'kural'>('path');
  const learned = useLiveQuery(async () => new Set((await db.kuralCards.toArray()).map((c) => c.n)), []);
  const done = useLiveQuery(async () => new Set((await db.lessonsDone.toArray()).map((d) => d.id)), []);
  const thisWeek = dayInfo(todayISO()).week.no;
  const available = new Set(lessons().map((l) => l.id));
  const plan = curriculum();

  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">கற்க</h1>
      <div className="flex gap-2">
        <Chip active={tab === 'path'} onClick={() => setTab('path')}>9 வாரப் பாதை</Chip>
        <Chip active={tab === 'decks'} onClick={() => setTab('decks')}>நினைவு அட்டைகள்</Chip>
        <Chip active={tab === 'kural'} onClick={() => setTab('kural')}>திருக்குறள்</Chip>
      </div>

      {tab === 'path' && (
        <div className="space-y-4">
          {WEEKS.map((w) => {
            const ids = plan.find((p) => p.week === w.no)?.lessons ?? lessons().filter((l) => l.week === w.no).map((l) => ({ id: l.id, title: l.title }));
            const doneCount = ids.filter((l) => done?.has(l.id)).length;
            return (
              <div key={w.no} className={`space-y-2 ${w.no > thisWeek + 1 ? 'opacity-70' : ''}`}>
                <div className="flex items-baseline justify-between">
                  <div className="font-bold">
                    {w.no === thisWeek && <span className="mr-1 rounded-full bg-teal-600 px-2 py-0.5 text-xs text-white">இந்த வாரம்</span>}
                    வாரம் {w.no}: {w.title.ta}
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">{fmtDay(w.start).en} · {doneCount}/{ids.length}</span>
                </div>
                {ids.map((l) => {
                  const ready = available.has(l.id);
                  const isDone = done?.has(l.id);
                  return (
                    <button key={l.id} type="button" disabled={!ready} onClick={() => openLesson(l.id)} className="w-full text-left">
                      <Card className={`flex items-center gap-3 py-3 ${ready ? 'active:bg-teal-50' : ''}`}>
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm ${isDone ? 'bg-teal-600 text-white' : ready ? 'bg-teal-50 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200' : 'bg-slate-100 dark:bg-slate-700'}`}>
                          {isDone ? '✓' : ready ? '💡' : '🔒'}
                        </span>
                        <span className="min-w-0 flex-1 text-[0.95rem]"><T v={l.title} inline /></span>
                        {!ready && <span className="shrink-0 text-xs text-slate-400">விரைவில்</span>}
                      </Card>
                    </button>
                  );
                })}
              </div>
            );
          })}
          <p className="text-center text-xs text-slate-500">🔒 பாடங்கள் அந்த வாரத்துக்கு முன்பே இணையம் வழியாக வந்து சேரும்; ஆப்பை மீண்டும் நிறுவத் தேவையில்லை.</p>
        </div>
      )}

      {tab === 'decks' && (
        <div className="grid grid-cols-2 gap-3">
          {decks().map((d) => (
            <button key={d.id} type="button" onClick={() => openDeck(d)} className="rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 active:bg-teal-50 dark:bg-slate-800 dark:ring-slate-700">
              <div className="text-xs text-slate-500"><T v={UNIT_LABEL[d.unit]} inline /></div>
              <div className="font-semibold leading-snug"><T v={d.title} inline /></div>
              <div className="mt-1 text-xs text-teal-700 dark:text-teal-300">{d.items.length} அட்டைகள்</div>
            </button>
          ))}
        </div>
      )}

      {tab === 'kural' && (
        <div className="grid grid-cols-2 gap-3">
          {CHAPTERS.map((c) => {
            const n = learned ? Array.from({ length: c.end - c.start + 1 }, (_, i) => c.start + i).filter((x) => learned.has(x)).length : 0;
            return (
              <button key={c.order} type="button" onClick={() => openKural(c.order)} className="rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 active:bg-teal-50 dark:bg-slate-800 dark:ring-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-500"><span>{c.order}. அதி. {c.ch}</span><span>{n}/10</span></div>
                <div className="font-semibold">{c.name}</div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-teal-500" style={{ width: `${n * 10}%` }} /></div>
              </button>
            );
          })}
        </div>
      )}
    </Screen>
  );
}

/** Browse a memory deck as quick flip rows. */
export function DeckView({ deck }: { deck: Deck }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">தொட்டால் பொருள் தெரியும். இந்த அட்டைகளிலிருந்து தினமும் புதிய வினாக்கள் உருவாகும். மூலம்: {deck.source}</p>
      {deck.items.map(([t, m, note], i) => (
        <button key={i} type="button" onClick={() => setOpen(open === i ? null : i)} className="w-full text-left">
          <Card className="py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{t}</span>
              <span className={`text-right ${open === i ? 'text-teal-800 dark:text-teal-200' : 'text-slate-300 dark:text-slate-600'}`}>{open === i ? m : '•••'}</span>
            </div>
            {open === i && note && <div className="mt-1 text-xs text-slate-500">{note}</div>}
          </Card>
        </button>
      ))}
    </div>
  );
}
