import { useState } from 'react';
import type { Bi, Mode, Question, Unit } from '../data/types';
import { ALL_UNITS, CHAPTERS, KURALS, UNIT_LABEL, caQuestions, cheatById, cheats, decks, papers, pyq } from '../data/content';
import { db } from '../data/db';
import { cacheQuestions, dueReviewIds, getQuestions, loadStats, practiceBank } from '../data/progress';
import { tamilMeaning } from '../data/urai';
import { ALL_GEN_TOPICS, GENERATORS, generate, type GenTopic } from '../engine/generators/aptitude';
import { deckQuestions } from '../engine/generators/deck';
import { kuralQuestionsFor } from '../engine/generators/kural';
import type { Blueprint } from '../engine/planner';
import { rankQuestions, shuffleOptions } from '../engine/select';
import { todayISO } from '../lib/date';
import { seeded, shuffle } from '../lib/rng';
import { Icon, type IconName } from './icons';
import { Button, Card, Chip, Screen, txt } from './kit';

type Source = 'topic' | 'pyq' | 'news' | 'apt' | 'decks' | 'kural' | 'mistakes';
const SOURCES: { v: Source; icon: IconName; label: Bi; sub: string }[] = [
  { v: 'topic', icon: 'sheet', label: { ta: 'தலைப்பு வாரியாக' }, sub: 'ஒரு தலைப்பை மட்டும்' },
  { v: 'pyq', icon: 'file', label: { ta: 'பழைய வினாத்தாள்கள்' }, sub: 'TNPSC 2018–2025' },
  { v: 'news', icon: 'news', label: { ta: 'நடப்பு நிகழ்வுகள்' }, sub: 'தினமும் புதியவை' },
  { v: 'apt', icon: 'calc', label: { ta: 'திறனறிவு' }, sub: 'ஒவ்வொரு முறையும் புதிய எண்கள்' },
  { v: 'decks', icon: 'cards', label: { ta: 'நினைவு அட்டைகள்' }, sub: 'கலைச்சொல், மரபு, அறிஞர்கள்…' },
  { v: 'kural', icon: 'scroll', label: { ta: 'திருக்குறள்' }, sub: 'கற்ற குறள்களில்' },
  { v: 'mistakes', icon: 'repeat', label: { ta: 'என் தவறுகள்' }, sub: 'மீண்டும் முயல' },
];

/** Practice by topic: the cheat sheet's past-paper questions, plus deck or generated questions on it. */
export function topicQuestions(id: string, bank: Question[], count: number, seed: string): Question[] {
  const c = cheatById(id);
  if (!c) return [];
  const real = shuffle(seeded(seed), bank.filter((q) => q.cheat === id && !q.deletedByTnpsc)).slice(0, count).map((q) => shuffleOptions(q, seed));
  const out = [...real];
  const gens = ALL_GEN_TOPICS.filter((g) => c.topics.includes(g));
  for (let i = 0; out.length < count && gens.length; i++) out.push(generate(gens[i % gens.length], `${seed}-${i}`));
  if (out.length < count) {
    const ds = decks().filter((d) => c.topics.includes(d.topic) || d.id.includes(c.id));
    out.push(...deckQuestions(ds, count - out.length, seed));
  }
  return out;
}

export function Practice({ startQuiz, startMock, initialTopic }: { startQuiz: (title: Bi, qs: Question[], mode: Mode) => void; startMock: (b: Blueprint) => void; initialTopic?: string }) {
  const [source, setSource] = useState<Source>('topic');
  const [units, setUnits] = useState<Unit[]>([]);
  const [topics, setTopics] = useState<GenTopic[]>([]);
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [topic, setTopic] = useState<string | undefined>(initialTopic);
  const [count, setCount] = useState(15);
  const [busy, setBusy] = useState(false);

  const all = pyq();
  const countFor = (u: Unit) => all.filter((q) => q.unit === u && !q.deletedByTnpsc).length;
  const toggle = <X,>(arr: X[], v: X) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const news = caQuestions();
  const sheets = cheats();

  const start = async () => {
    setBusy(true);
    const today = todayISO();
    const seed = `practice-${Date.now()}`;
    let qs: Question[] = [];
    let mode: Mode = 'PRACTICE';
    let title: Bi = SOURCES.find((s) => s.v === source)!.label;
    const pool = await practiceBank();
    if (source === 'topic') {
      if (!topic) {
        setBusy(false);
        return;
      }
      qs = topicQuestions(topic, pool, count, seed);
      title = { ta: cheatById(topic)?.title ?? 'தலைப்பு' };
    } else if (source === 'pyq') {
      const p = pool.filter((q) => q.source.kind !== 'CURRENT_AFFAIRS' && (units.length ? units.includes(q.unit) : true));
      qs = rankQuestions(p, await loadStats(), today, all).slice(0, count).map((q) => shuffleOptions(q, seed));
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
      const learned = KURALS.filter((k) => known.has(k.n));
      const kp = learned.length ? learned : KURALS.filter((k) => k.order <= 2);
      qs = kuralQuestionsFor(kp, KURALS, CHAPTERS, Math.min(count, kp.length), seed, tamilMeaning);
    } else {
      const due = await dueReviewIds(today, count);
      const ids = due.length ? due : (await db.reviews.toArray()).map((r) => r.questionId).slice(0, count);
      qs = await getQuestions(ids);
      mode = 'REVIEW';
    }
    await cacheQuestions(qs);
    setBusy(false);
    startQuiz(title, qs, mode);
  };

  const unitList = ALL_UNITS.filter((u) => countFor(u) > 0);
  const sheetUnits = [...new Set(sheets.map((c) => c.unit))] as Unit[];

  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">பயிற்சி</h1>
      <p className="-mt-2 text-sm text-slate-500">இன்றைய அமர்வு முடிந்த பிறகு, நேரம் இருந்தால் மட்டும்.</p>

      <div className="grid grid-cols-2 gap-2.5">
        {SOURCES.map((s) => (
          <button key={s.v} type="button" onClick={() => setSource(s.v)} className={`flex gap-2.5 rounded-2xl p-3 text-left ring-1 transition ${source === s.v ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'}`}>
            <Icon name={s.icon} size={22} className={source === s.v ? 'text-white' : 'text-teal-700 dark:text-teal-300'} />
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{txt(s.label)}</span>
              <span className={`block text-xs ${source === s.v ? 'text-teal-50' : 'text-slate-500'}`}>{s.v === 'news' ? `${news.length} வினாக்கள்` : s.sub}</span>
            </span>
          </button>
        ))}
      </div>

      {source === 'topic' && (
        <Card className="space-y-3">
          <div className="text-sm font-semibold">தலைப்பைத் தேர்ந்தெடுங்கள்</div>
          {sheetUnits.map((u) => (
            <div key={u} className="space-y-1.5">
              <div className="text-xs font-semibold text-slate-500">{txt(UNIT_LABEL[u])}</div>
              <div className="flex flex-wrap gap-2">
                {sheets.filter((c) => c.unit === u).map((c) => <Chip key={c.id} active={topic === c.id} onClick={() => setTopic(c.id)}>{c.title.split(/[:·(]/)[0].trim()}</Chip>)}
              </div>
            </div>
          ))}
        </Card>
      )}
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
        <Card className="text-sm text-slate-500">தினசரி நடப்பு நிகழ்வு வினாக்கள் இன்னும் வரவில்லை.</Card>
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

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4">
        {[10, 15, 25, 40].map((n) => <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n} வினா</Chip>)}
      </div>

      <Button onClick={start} disabled={busy || (source === 'topic' && !topic)} className="w-full text-lg"><Icon name="play" size={20} /> {source === 'topic' && !topic ? 'ஒரு தலைப்பைத் தேர்ந்தெடுங்கள்' : 'தொடங்கு'}</Button>

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
