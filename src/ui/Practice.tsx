import { useState } from 'react';
import type { Bi, Mode, Question, Unit } from '../data/types';
import { ALL_UNITS, CHAPTERS, KURALS, UNIT_LABEL, caQuestions, decks, lessonQuestions, papers, pyq } from '../data/content';
import { db } from '../data/db';
import { cacheQuestions, dueReviewIds, getQuestions, loadStats } from '../data/progress';
import { ALL_GEN_TOPICS, GENERATORS, generate, type GenTopic } from '../engine/generators/aptitude';
import { deckQuestions } from '../engine/generators/deck';
import { kuralQuestionsFor } from '../engine/generators/kural';
import type { Blueprint } from '../engine/planner';
import { rankQuestions, shuffleOptions } from '../engine/select';
import { todayISO } from '../lib/date';
import { seeded, shuffle } from '../lib/rng';
import { Button, Card, Chip, Screen, txt } from './kit';

type Source = 'pyq' | 'news' | 'apt' | 'decks' | 'kural' | 'mistakes';
const SOURCES: { v: Source; icon: string; label: Bi; sub: string }[] = [
  { v: 'pyq', icon: '📄', label: { ta: 'பழைய வினாத்தாள்கள்' }, sub: 'TNPSC 2012–2025' },
  { v: 'news', icon: '📰', label: { ta: 'நடப்பு நிகழ்வுகள்' }, sub: 'தினமும் புதியவை' },
  { v: 'apt', icon: '🧮', label: { ta: 'திறனறிவு' }, sub: 'ஒவ்வொரு முறையும் புதிய எண்கள்' },
  { v: 'decks', icon: '🗂️', label: { ta: 'நினைவு அட்டைகள்' }, sub: 'கலைச்சொல், மரபு, அறிஞர்கள்…' },
  { v: 'kural', icon: '📜', label: { ta: 'திருக்குறள்' }, sub: 'கற்ற குறள்களில்' },
  { v: 'mistakes', icon: '🔁', label: { ta: 'என் தவறுகள்' }, sub: 'மீண்டும் முயல' },
];

export function Practice({ startQuiz, startMock }: { startQuiz: (title: Bi, qs: Question[], mode: Mode) => void; startMock: (b: Blueprint) => void }) {
  const [source, setSource] = useState<Source>('pyq');
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<GenTopic[]>([]);
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [count, setCount] = useState(15);
  const [busy, setBusy] = useState(false);

  const all = pyq();
  const countFor = (u: Unit) => all.filter((q) => q.unit === u && !q.deletedByTnpsc).length;
  const toggle = <X,>(arr: X[], v: X) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const news = caQuestions();

  const start = async () => {
    setBusy(true);
    const today = todayISO();
    const seed = `practice-${Date.now()}`;
    let qs: Question[] = [];
    let mode: Mode = 'PRACTICE';
    if (source === 'pyq') {
      const pool = [...all, ...lessonQuestions()].filter((q) => (units.length ? units.includes(q.unit) : true));
      qs = rankQuestions(pool, await loadStats(), today, all).slice(0, count).map((q) => shuffleOptions(q, seed));
    } else if (source === 'news') {
      qs = shuffle(seeded(seed), [...news].sort((a, b) => ((b.source.date ?? '') > (a.source.date ?? '') ? 1 : -1)).slice(0, 80)).slice(0, count);
    } else if (source === 'apt') {
      const list = topics.length ? topics : ALL_GEN_TOPICS;
      qs = Array.from({ length: count }, (_, i) => generate(list[i % list.length], `${seed}-${i}`));
    } else if (source === 'decks') {
      const chosen = decks().filter((d) => (deckIds.length ? deckIds.includes(d.id) : true));
      qs = deckQuestions(chosen, count, seed);
    } else if (source === 'kural') {
      const known = new Set((await db.kuralCards.toArray()).map((c) => c.n));
      const pool = KURALS.filter((k) => known.has(k.n));
      qs = kuralQuestionsFor(pool.length ? pool : KURALS.filter((k) => k.order <= 2), KURALS, CHAPTERS, count, seed);
    } else {
      const due = await dueReviewIds(today, count);
      const ids = due.length ? due : (await db.reviews.toArray()).map((r) => r.questionId).slice(0, count);
      qs = await getQuestions(ids);
      mode = 'REVIEW';
    }
    await cacheQuestions(qs);
    setBusy(false);
    startQuiz(SOURCES.find((s) => s.v === source)!.label, qs, mode);
  };

  const unitList = ALL_UNITS.filter((u) => countFor(u) > 0);

  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">பயிற்சி</h1>

      <div className="grid grid-cols-2 gap-2.5">
        {SOURCES.map((s) => (
          <button key={s.v} type="button" onClick={() => setSource(s.v)} className={`rounded-2xl p-3 text-left ring-1 transition ${source === s.v ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'}`}>
            <div className="text-2xl">{s.icon}</div>
            <div className="font-semibold">{txt(s.label)}</div>
            <div className={`text-xs ${source === s.v ? 'text-teal-50' : 'text-slate-500'}`}>{s.v === 'news' ? `${news.length} வினாக்கள்` : s.sub}</div>
          </button>
        ))}
      </div>

      {source === 'pyq' && (
        <Card className="space-y-2">
          <div className="text-sm font-semibold">அலகு <span className="font-normal text-slate-500">(எதுவும் இல்லை = அனைத்தும், சிறந்தவை முதலில்)</span></div>
          <div className="flex flex-wrap gap-2">
            {unitList.map((u) => <Chip key={u} active={units.includes(u)} onClick={() => setUnits((x) => toggle(x, u))}>{txt(UNIT_LABEL[u])} · {countFor(u)}</Chip>)}
          </div>
          <div className="text-xs text-slate-500">{papers().map((p) => `${p.title}: ${p.count}`).join(' · ')}</div>
        </Card>
      )}
      {source === 'news' && news.length === 0 && (
        <Card className="text-sm text-slate-500">தினசரி நடப்பு நிகழ்வு வினாக்கள் இன்னும் தொடங்கவில்லை. GEMINI_API_KEY சேர்த்தவுடன் ஒவ்வொரு காலையும் வரும்.</Card>
      )}
      {source === 'apt' && (
        <Card className="flex flex-wrap gap-2">
          {ALL_GEN_TOPICS.map((t) => <Chip key={t} active={topics.includes(t)} onClick={() => setTopics((x) => toggle(x, t))}>{txt(GENERATORS[t].title)}</Chip>)}
        </Card>
      )}
      {source === 'decks' && (
        <Card className="flex flex-wrap gap-2">
          {decks().map((d) => <Chip key={d.id} active={deckIds.includes(d.id)} onClick={() => setDeckIds((x) => toggle(x, d.id))}>{txt(d.title)}</Chip>)}
        </Card>
      )}

      <div className="flex items-center gap-2">
        {[10, 15, 25, 40].map((n) => <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n} வினா</Chip>)}
      </div>

      <Button onClick={start} disabled={busy} className="w-full text-lg">தொடங்கு ▶</Button>

      <Card className="space-y-3">
        <div className="font-semibold">மாதிரித் தேர்வுகள் (OMR)</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => startMock('TAMIL_100')}>தமிழ் 100 · 70′</Button>
          <Button variant="secondary" onClick={() => startMock('FULL_200')}>முழுத் தேர்வு · 180′</Button>
        </div>
      </Card>
    </Screen>
  );
}
