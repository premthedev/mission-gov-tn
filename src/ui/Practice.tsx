import { useState } from 'react';
import type { Bi, Mode, Question, Unit } from '../data/types';
import { ALL_UNITS, CHAPTERS, KURALS, LESSON_QUESTIONS, PAPERS, PYQ, UNIT_LABEL } from '../data/content';
import { db } from '../data/db';
import { cacheQuestions, dueReviewIds, getQuestions, loadStats } from '../data/progress';
import { ALL_GEN_TOPICS, GENERATORS, generate, type GenTopic } from '../engine/generators/aptitude';
import { kuralQuestions } from '../engine/generators/kural';
import type { Blueprint } from '../engine/planner';
import { rankQuestions } from '../engine/select';
import { todayISO } from '../lib/date';
import { Button, Card, Chip, Screen, T, txt } from './kit';

type Source = 'pyq' | 'lesson' | 'apt' | 'kural' | 'mistakes';
const SOURCES: { v: Source; label: Bi }[] = [
  { v: 'pyq', label: { ta: 'பழைய வினாத்தாள்கள்', en: 'Past papers' } },
  { v: 'apt', label: { ta: 'திறனறிவு (புதியவை)', en: 'Aptitude (fresh)' } },
  { v: 'kural', label: { ta: 'திருக்குறள்', en: 'Thirukkural' } },
  { v: 'lesson', label: { ta: 'பாட வினாக்கள்', en: 'Lesson questions' } },
  { v: 'mistakes', label: { ta: 'என் தவறுகள்', en: 'My mistakes' } },
];

export function Practice({ startQuiz, startMock }: { startQuiz: (title: Bi, qs: Question[], mode: Mode) => void; startMock: (b: Blueprint) => void }) {
  const [source, setSource] = useState<Source>('pyq');
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<GenTopic[]>([]);
  const [count, setCount] = useState(15);
  const [busy, setBusy] = useState(false);

  const bank = source === 'lesson' ? LESSON_QUESTIONS : PYQ;
  const countFor = (u: Unit) => bank.filter((q) => q.unit === u && !q.deletedByTnpsc).length;
  const toggle = <X,>(arr: X[], v: X) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const start = async () => {
    setBusy(true);
    const today = todayISO();
    const seed = `practice-${Date.now()}`;
    let qs: Question[] = [];
    let mode: Mode = 'PRACTICE';
    if (source === 'pyq' || source === 'lesson') {
      const pool = bank.filter((q) => (units.length ? units.includes(q.unit) : true));
      qs = rankQuestions(pool, await loadStats(), today, PYQ).slice(0, count);
    } else if (source === 'apt') {
      const list = topics.length ? topics : ALL_GEN_TOPICS;
      qs = Array.from({ length: count }, (_, i) => generate(list[i % list.length], `${seed}-${i}`));
    } else if (source === 'kural') {
      const learned = (await db.kuralLearned.toArray()).map((k) => k.order);
      qs = kuralQuestions(KURALS, CHAPTERS, learned.length ? learned : CHAPTERS.map((c) => c.order), count, seed);
    } else {
      const due = await dueReviewIds(today, count);
      const all = due.length ? due : (await db.reviews.toArray()).map((r) => r.questionId).slice(0, count);
      qs = await getQuestions(all);
      mode = 'REVIEW';
    }
    await cacheQuestions(qs);
    setBusy(false);
    startQuiz(SOURCES.find((s) => s.v === source)!.label, qs, mode);
  };

  const unitList = ALL_UNITS.filter((u) => countFor(u) > 0);

  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">பயிற்சி · Practice</h1>

      <div className="flex flex-wrap gap-2">
        {SOURCES.map((s) => <Chip key={s.v} active={source === s.v} onClick={() => setSource(s.v)}>{txt(s.label)}</Chip>)}
      </div>

      {(source === 'pyq' || source === 'lesson') && (
        <Card className="space-y-2">
          <div className="text-sm font-semibold">அலகு · Units <span className="font-normal text-slate-500">(எதுவும் தேர்வு செய்யவில்லை = அனைத்தும்)</span></div>
          {unitList.length === 0 && <T v={{ ta: 'இன்னும் வினாக்கள் சேர்க்கப்படவில்லை.', en: 'No questions added yet.' }} className="text-sm text-slate-500" />}
          <div className="flex flex-wrap gap-2">
            {unitList.map((u) => <Chip key={u} active={units.includes(u)} onClick={() => setUnits((x) => toggle(x, u))}>{txt(UNIT_LABEL[u])} · {countFor(u)}</Chip>)}
          </div>
          {source === 'pyq' && (
            <div className="pt-1 text-xs text-slate-500">
              {PAPERS.map((p) => `${p.title}: ${p.count}`).join(' · ') || 'Past papers are being added.'}
              <br />
              <T v={{ ta: 'சிறந்தவை முதலில்: பாடத்திட்டப் பொருத்தம், மீண்டும் மீண்டும் கேட்கப்பட்ட தலைப்பு, உங்கள் பலவீனம், ஆண்டு.', en: 'Best first: syllabus fit, repeated topics, your weak areas, recency.' }} />
            </div>
          )}
        </Card>
      )}

      {source === 'apt' && (
        <Card className="space-y-2">
          <div className="text-sm font-semibold">தலைப்பு · Topics <span className="font-normal text-slate-500">(எதுவும் இல்லை = கலவை)</span></div>
          <div className="flex flex-wrap gap-2">
            {ALL_GEN_TOPICS.map((t) => <Chip key={t} active={topics.includes(t)} onClick={() => setTopics((x) => toggle(x, t))}>{txt(GENERATORS[t].title)}</Chip>)}
          </div>
          <T v={{ ta: 'ஒவ்வொரு முறையும் புதிய எண்களுடன் வினாக்கள், விளக்கத்துடன்.', en: 'New numbers every time, with worked solutions.' }} className="text-xs text-slate-500" />
        </Card>
      )}

      <Card className="space-y-2">
        <div className="text-sm font-semibold">எத்தனை வினாக்கள் · How many</div>
        <div className="flex gap-2">
          {[10, 15, 25, 40].map((n) => <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n}</Chip>)}
        </div>
      </Card>

      <Button onClick={start} disabled={busy} className="w-full text-lg">தொடங்கு · Start</Button>

      <Card className="space-y-3">
        <div className="font-semibold">மாதிரித் தேர்வுகள் · Mock tests</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => startMock('TAMIL_100')}>தமிழ் 100 · 70 நிமி</Button>
          <Button variant="secondary" onClick={() => startMock('FULL_200')}>முழுத் தேர்வு · 180 நிமி</Button>
        </div>
      </Card>
    </Screen>
  );
}
