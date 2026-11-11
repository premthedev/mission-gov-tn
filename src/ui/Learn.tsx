import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { CHAPTERS, LESSONS, UNIT_LABEL } from '../data/content';
import { db } from '../data/db';
import type { Unit } from '../data/types';
import { Card, Chip, Screen, T } from './kit';

export function Learn({ openKural, openLesson }: { openKural: (order: number) => void; openLesson: (id: string) => void }) {
  const [tab, setTab] = useState<'lessons' | 'kural'>('lessons');
  const learned = useLiveQuery(async () => new Set((await db.kuralLearned.toArray()).map((k) => k.order)), []);
  const done = useLiveQuery(async () => new Set((await db.lessonsDone.toArray()).map((d) => d.id)), []);
  const units = [...new Set(LESSONS.map((l) => l.unit))] as Unit[];

  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">கற்க · Learn</h1>
      <div className="flex gap-2">
        <Chip active={tab === 'lessons'} onClick={() => setTab('lessons')}>பாடங்கள் · Lessons</Chip>
        <Chip active={tab === 'kural'} onClick={() => setTab('kural')}>திருக்குறள் · 20</Chip>
      </div>

      {tab === 'kural' && (
        <div className="grid grid-cols-2 gap-3">
          {CHAPTERS.map((c) => (
            <button key={c.order} type="button" onClick={() => openKural(c.order)} className="rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 active:bg-teal-50 dark:bg-slate-800 dark:ring-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{c.order}. அதி. {c.ch}</span>
                {learned?.has(c.order) && <span className="text-teal-600">✓</span>}
              </div>
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-slate-500">{c.en}</div>
            </button>
          ))}
        </div>
      )}

      {tab === 'lessons' && (
        <div className="space-y-4">
          {units.map((u) => (
            <div key={u} className="space-y-2">
              <div className="text-sm font-semibold text-teal-800 dark:text-teal-200"><T v={UNIT_LABEL[u]} inline /></div>
              {LESSONS.filter((l) => l.unit === u).map((l) => (
                <button key={l.id} type="button" onClick={() => openLesson(l.id)} className="w-full text-left">
                  <Card className="flex items-center gap-3 active:bg-teal-50">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done?.has(l.id) ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'}`}>{done?.has(l.id) ? '✓' : `W${l.week}`}</span>
                    <span className="min-w-0 flex-1"><T v={l.title} /></span>
                    <span className="shrink-0 text-xs text-slate-500">{l.minutes} நிமி</span>
                  </Card>
                </button>
              ))}
            </div>
          ))}
          <p className="text-center text-xs text-slate-500">
            <T v={{ ta: 'அடுத்த வாரப் பாடங்கள் ஒவ்வொரு ஞாயிறும் புதுப்பிப்பில் சேர்க்கப்படும்.', en: "Next week's lessons are added in each Sunday update." }} />
          </p>
        </div>
      )}
    </Screen>
  );
}
