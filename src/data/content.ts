import kuralData from '../../content/kural20.json';
import type {
  Bi, CheatSheet, CurriculumWeek, Deck, Era, Explanation, Format, KeySource, Kural, KuralChapter, Lesson, Letter, Part, Passage, Question, Unit,
} from './types';
import { bestPattern, matchCheat } from '../engine/cheat';
import { deckQuestions } from '../engine/generators/deck';
import { shuffleOptions } from '../engine/shuffle';
import { cleanMath } from '../lib/text';

/**
 * Content store. Starts with the files bundled in the app, then merges files downloaded from GitHub
 * (see sync.ts). Every getter returns the current merged view; subscribe() notifies React on change.
 */

export const CHAPTERS: KuralChapter[] = kuralData.chapters;
export const KURALS: Kural[] = kuralData.kurals;

type RawText = string | Bi;
const clean = (s?: string) => (s ? cleanMath(s) : undefined);
export const bi = (v: RawText | undefined): Bi => {
  if (v === undefined || v === null) return {};
  if (typeof v === 'string') return { ta: clean(v) };
  const out: Bi = {};
  if (v.ta) out.ta = clean(v.ta);
  if (v.en) out.en = clean(v.en);
  return out;
};
const optBi = (v: RawText | undefined): Bi | undefined => {
  const b = bi(v);
  return b.ta || b.en ? b : undefined;
};
const letters: Letter[] = ['A', 'B', 'C', 'D'];

interface RawCheck {
  stem: RawText;
  statements?: RawText[];
  options: RawText[];
  answer: Letter;
  explain?: RawText;
  /** Why each option is wrong, aligned with `options` (the correct one may be empty). */
  why?: (RawText | null)[];
  hint?: RawText;
  format?: Format;
}

interface RawLesson extends Omit<Lesson, 'check' | 'title' | 'oneLine' | 'sections' | 'examples' | 'traps'> {
  title: RawText;
  oneLine: RawText;
  sections: { heading?: RawText; body: RawText; table?: string[][] }[];
  examples: { q: RawText; a: RawText }[];
  traps: RawText[];
  check: RawCheck[];
}

interface RawPyq {
  qNo: number;
  part: Part;
  unit: Unit;
  topic: string;
  format?: Format;
  stem: RawText;
  statements?: RawText[];
  matchTable?: { left: RawText[]; right: RawText[] };
  passageId?: string;
  options: Record<Letter, RawText>;
  answer: Letter;
  acceptedAnswers?: Letter[];
  keySource: KeySource;
  keyChanged?: boolean;
  deleted?: boolean;
  era: Era;
  explain?: RawText;
  explainVerified?: boolean;
  ai?: boolean;
}

interface RawPaper {
  exam: string;
  year: number;
  title: string;
  url: string;
  passages?: { id: string; text: RawText }[];
  questions: RawPyq[];
}

interface RawCa {
  id: string;
  unit: Unit;
  topic?: string;
  stem: RawText;
  options: RawText[];
  answer: Letter;
  explain?: RawText;
  url?: string;
  headline?: string;
}

interface RawFeed {
  date: string;
  questions: RawCa[];
}

/** content/explain/*.json, written by tools/enrich.mjs, keyed by question id. */
interface RawEnrich {
  items: Record<string, {
    hint?: Bi; explain?: Bi; why?: Partial<Record<Letter, Bi>>; rule?: Bi; eg?: Bi; tip?: Bi; doubt?: boolean;
  }>;
}

function lessonFromRaw(raw: RawLesson): Lesson {
  return {
    ...raw,
    title: bi(raw.title),
    oneLine: bi(raw.oneLine),
    sections: raw.sections.map((s) => ({ heading: s.heading ? bi(s.heading) : undefined, body: bi(s.body), table: s.table })),
    examples: raw.examples.map((e) => ({ q: bi(e.q), a: bi(e.a) })),
    traps: raw.traps.map(bi),
    check: raw.check.map((c, i): Question => {
      const why: Partial<Record<Letter, Bi>> = {};
      c.why?.forEach((w, j) => {
        const b = optBi(w ?? undefined);
        if (b && letters[j] !== c.answer) why[letters[j]] = b;
      });
      return {
        id: `${raw.id}-c${i + 1}`,
        part: raw.unit[0] as Part,
        unit: raw.unit,
        topic: raw.topic,
        format: c.format ?? 'ONE_LINER',
        stem: bi(c.stem),
        statements: c.statements?.map(bi),
        options: Object.fromEntries(letters.map((l, j) => [l, bi(c.options[j])])) as Record<Letter, Bi>,
        answer: c.answer,
        keySource: 'LESSON',
        source: { kind: 'LESSON' },
        syllabusEra: 'CURRENT',
        explanation: c.explain ? { ...bi(c.explain), ref: raw.sourceRef, verified: true, why: Object.keys(why).length ? why : undefined } : undefined,
        hint: optBi(c.hint),
        cheat: raw.cheat,
      };
    }),
  };
}

function paperToQuestions(p: RawPaper): Question[] {
  return p.questions.map((q) => ({
    id: `pyq-${p.exam}-q${String(q.qNo).padStart(3, '0')}`,
    part: q.part,
    unit: q.unit,
    topic: q.topic,
    format: q.format ?? 'ONE_LINER',
    stem: bi(q.stem),
    statements: q.statements?.map(bi),
    matchTable: q.matchTable ? { left: q.matchTable.left.map(bi), right: q.matchTable.right.map(bi) } : undefined,
    passageId: q.passageId ? `${p.exam}-${q.passageId}` : undefined,
    options: Object.fromEntries(letters.map((l) => [l, bi(q.options[l])])) as Record<Letter, Bi>,
    answer: q.answer,
    acceptedAnswers: q.acceptedAnswers,
    keySource: q.keySource,
    keyChanged: q.keyChanged,
    deletedByTnpsc: q.deleted,
    source: { kind: 'PYQ', exam: p.exam, year: p.year, qNo: q.qNo, url: p.url, aiExtracted: q.ai },
    syllabusEra: q.era,
    explanation: q.explain ? { ...bi(q.explain), verified: q.explainVerified ?? false } : undefined,
  }));
}

function feedToQuestions(f: RawFeed): Question[] {
  return f.questions.map((c) => ({
    id: `ca-${c.id}`,
    part: 'B' as Part,
    unit: c.unit,
    topic: c.topic ?? 'current-affairs',
    format: 'ONE_LINER' as Format,
    stem: bi(c.stem),
    options: Object.fromEntries(letters.map((l, j) => [l, bi(c.options[j])])) as Record<Letter, Bi>,
    answer: c.answer,
    keySource: 'CITED_SOURCE' as KeySource,
    source: { kind: 'CURRENT_AFFAIRS' as const, date: f.date, url: c.url, headline: c.headline, aiExtracted: true },
    syllabusEra: 'CURRENT' as Era,
    explanation: c.explain ? { ...bi(c.explain), verified: false } : undefined,
  }));
}

/** Put the AI tutor's notes on a question. The official answer is never touched. */
function enrich(q: Question, e: RawEnrich['items'][string]): Question {
  const base = q.explanation ?? {};
  const main = e.explain && (e.explain.ta || e.explain.en) ? bi(e.explain) : { ta: base.ta, en: base.en };
  const why: Partial<Record<Letter, Bi>> = { ...(base.why ?? {}) };
  for (const l of letters) if (e.why?.[l] && l !== q.answer) why[l] = bi(e.why[l]);
  const explanation: Explanation = {
    ...base,
    ...main,
    why: Object.keys(why).length ? why : undefined,
    rule: optBi(e.rule) ?? base.rule,
    example: optBi(e.eg) ?? base.example,
    tip: optBi(e.tip) ?? base.tip,
    doubt: e.doubt || undefined,
    ai: q.source.kind !== 'LESSON' || !base.ta ? true : base.ai,
    verified: q.source.kind === 'LESSON' ? base.verified : false,
  };
  return { ...q, explanation, hint: q.hint ?? optBi(e.hint) };
}

// ---------- cheat-sheet lessons ----------

/** A lesson made from a cheat sheet: its tables and recipes as cards, then past-paper questions on it. */
function lessonFromCheat(id: string, title: Bi, week: number, seq: number, c: CheatSheet, bank: Question[], allDecks: Deck[]): Lesson {
  const checks = bank
    .filter((q) => !q.deletedByTnpsc && q.syllabusEra !== 'OFF_SYLLABUS' && (q.cheat === c.id))
    .sort((a, b) => (b.source.year ?? 0) - (a.source.year ?? 0) || (a.keySource === 'FINAL_KEY' ? -1 : 1))
    .slice(0, 5)
    .map((q) => shuffleOptions(q, id));
  if (checks.length < 3) {
    const unitDecks = allDecks.filter((d) => d.unit === c.unit && (c.topics.includes(d.topic) || d.id.includes(c.id)));
    checks.push(...deckQuestions(unitDecks.length ? unitDecks : allDecks.filter((d) => d.unit === c.unit), 4 - checks.length, id).map((q) => ({ ...q, cheat: c.id })));
  }
  return {
    id,
    unit: c.unit,
    topic: c.topics[0] ?? c.id,
    week,
    seq,
    minutes: 20,
    title: title.ta ? title : { ta: c.title },
    oneLine: { ta: c.oneLine },
    sections: c.blocks.map((b) => ({ heading: { ta: b.h }, body: { ta: b.body ?? '' }, table: b.table })),
    examples: c.patterns.map((p) => ({ q: { ta: p.see }, a: { ta: p.do } })),
    traps: c.traps.map((t) => ({ ta: t })),
    check: checks,
    sourceRef: c.source,
    cheat: c.id,
    fromCheat: true,
  };
}

const probe = (l: Lesson): Question => ({
  id: l.id, part: l.unit[0] as Part, unit: l.unit, topic: l.topic, format: 'ONE_LINER',
  stem: { ta: `${l.title.ta ?? ''} ${l.oneLine.ta ?? ''}` }, options: { A: {}, B: {}, C: {}, D: {} },
  answer: 'A', keySource: 'LESSON', source: { kind: 'LESSON' }, syllabusEra: 'CURRENT',
});

// ---------- bundled files ----------

const strip = (k: string) => k.replace(/^.*\/content\//, '');
const glob = (g: Record<string, unknown>) => Object.fromEntries(Object.entries(g).map(([k, v]) => [strip(k), v]));
const BUNDLED: Record<string, unknown> = {
  ...glob(import.meta.glob('../../content/lessons/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/questions/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/decks/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/feed/ca-*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/cheats/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/explain/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/curriculum.json', { eager: true, import: 'default' })),
};

// ---------- merged state ----------

interface State {
  lessons: Lesson[];
  pyq: Question[];
  ca: Question[];
  decks: Deck[];
  cheats: CheatSheet[];
  cheatById: Map<string, CheatSheet>;
  curriculum: CurriculumWeek[];
  passages: Passage[];
  papers: { exam: string; year: number; title: string; url: string; count: number }[];
  byId: Map<string, Question>;
  feedDates: string[];
}

function build(files: Record<string, unknown>): State {
  const written: Lesson[] = [];
  let pyq: Question[] = [];
  let ca: Question[] = [];
  const decks: Deck[] = [];
  const cheats: CheatSheet[] = [];
  const passages: Passage[] = [];
  const papers: State['papers'] = [];
  const feedDates: string[] = [];
  const notes: RawEnrich['items'] = {};
  let curriculum: CurriculumWeek[] = [];
  for (const [path, data] of Object.entries(files)) {
    try {
      if (path.startsWith('lessons/')) written.push(...(data as RawLesson[]).map(lessonFromRaw));
      else if (path.startsWith('questions/')) {
        const p = data as RawPaper;
        pyq.push(...paperToQuestions(p));
        passages.push(...(p.passages ?? []).map((x) => ({ id: `${p.exam}-${x.id}`, text: bi(x.text) })));
        papers.push({ exam: p.exam, year: p.year, title: p.title, url: p.url, count: p.questions.length });
      } else if (path.startsWith('decks/')) decks.push(...(data as Deck[]));
      else if (path.startsWith('cheats/')) cheats.push(...(data as CheatSheet[]));
      else if (path.startsWith('explain/')) Object.assign(notes, (data as RawEnrich).items);
      else if (path.startsWith('feed/ca-')) {
        const f = data as RawFeed;
        ca.push(...feedToQuestions(f));
        feedDates.push(f.date);
      } else if (path === 'curriculum.json') curriculum = data as CurriculumWeek[];
    } catch (e) {
      console.warn('Skipping bad content file', path, e);
    }
  }
  const uniq = <T extends { id: string }>(arr: T[]) => [...new Map(arr.map((x) => [x.id, x])).values()];
  const C = uniq(cheats).sort((a, b) => a.unit.localeCompare(b.unit) || a.order - b.order);
  const cheatById = new Map(C.map((c) => [c.id, c]));
  const tag = (q: Question): Question => {
    const e = notes[q.id];
    const withNotes = e ? enrich(q, e) : q;
    const c = matchCheat(withNotes, C, cheatById);
    return c ? { ...withNotes, cheat: c.id } : withNotes;
  };
  pyq = uniq(pyq).map(tag);
  ca = uniq(ca).map(tag);
  const D = uniq(decks);

  // Written lessons first; curriculum entries without one become cheat-sheet lessons.
  const L0 = uniq(written).map((l) => ({ ...l, check: l.check.map(tag) }));
  const have = new Set(L0.map((l) => l.id));
  const fromCheats: Lesson[] = [];
  for (const w of curriculum) {
    w.lessons.forEach((entry, i) => {
      if (have.has(entry.id) || !entry.cheat) return;
      const c = cheatById.get(entry.cheat);
      if (c) fromCheats.push(lessonFromCheat(entry.id, bi(entry.title), w.week, i + 1, c, pyq, D));
    });
  }
  // Order lessons the way the curriculum lists them (falls back to week/seq).
  const pos = new Map<string, number>();
  curriculum.forEach((w) => w.lessons.forEach((l, i) => pos.set(l.id, w.week * 100 + i)));
  const L = [...L0, ...fromCheats].sort((a, b) => (pos.get(a.id) ?? a.week * 100 + 50 + a.seq) - (pos.get(b.id) ?? b.week * 100 + 50 + b.seq));
  // Written lessons that have no cheat id yet get one from their topic and title.
  for (const l of L) if (!l.cheat) l.cheat = matchCheat(probe(l), C, cheatById)?.id;

  const byId = new Map<string, Question>([...pyq, ...ca, ...L0.flatMap((l) => l.check)].map((q) => [q.id, q]));
  return {
    lessons: L, pyq, ca, decks: D, cheats: C, cheatById, curriculum, passages, byId,
    papers: papers.sort((a, b) => b.year - a.year), feedDates: feedDates.sort(),
  };
}

let state = build(BUNDLED);
let version = 0;
const listeners = new Set<() => void>();

/** Merge downloaded files over the bundled ones and refresh every screen. */
export function applyRemote(files: Record<string, unknown>): void {
  state = build({ ...BUNDLED, ...files });
  version++;
  listeners.forEach((l) => l());
}

export const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const contentVersion = () => version;

export const lessons = () => state.lessons;
export const pyq = () => state.pyq;
export const caQuestions = () => state.ca;
export const decks = () => state.decks;
export const cheats = () => state.cheats;
export const cheatById = (id?: string) => (id ? state.cheatById.get(id) : undefined);
export const curriculum = () => state.curriculum;
export const papers = () => state.papers;
export const feedDates = () => state.feedDates;
/** Checks from written lessons (cheat-sheet lessons reuse past-paper questions). */
export const lessonQuestions = () => state.lessons.filter((l) => !l.fromCheat).flatMap((l) => l.check);
export const contentQuestion = (id: string) => state.byId.get(id);
export const lessonById = (id: string) => state.lessons.find((l) => l.id === id);
export const passageById = (id: string) => state.passages.find((p) => p.id === id);
export const deckById = (id: string) => state.decks.find((d) => d.id === id);
export const chapterByOrder = (order: number) => CHAPTERS.find((c) => c.order === order)!;
/** Real (non-generated) questions used for ranking and practice. */
export const realBank = () => [...state.pyq, ...state.ca, ...lessonQuestions()];

/** Cheat sheet for any question, including generated ones. */
export function cheatForQuestion(q: Question): CheatSheet | undefined {
  return matchCheat(q, state.cheats, state.cheatById);
}

/** Hint before answering: the question's own hint, else the closest recipe from its cheat sheet. */
export function hintFor(q: Question): { hint: Bi; from?: string } | undefined {
  if (q.hint && (q.hint.ta || q.hint.en)) return { hint: q.hint };
  const c = cheatForQuestion(q);
  const p = c && bestPattern(q, c);
  return p ? { hint: { ta: `${p.see}\n→ ${p.do}` }, from: c.title } : undefined;
}

/** Questions that belong to a cheat sheet (past papers and lesson checks). */
export function questionsForCheat(id: string): Question[] {
  return realBank().filter((q) => q.cheat === id && !q.deletedByTnpsc);
}

export const UNIT_LABEL: Record<Unit, Bi> = {
  A1: { ta: 'இலக்கணம்', en: 'Tamil I · Grammar' },
  A2: { ta: 'சொல்லகராதி', en: 'Tamil II · Vocabulary' },
  A3: { ta: 'எழுதும் திறன்', en: 'Tamil III · Writing skills' },
  A4: { ta: 'கலைச்சொற்கள்', en: 'Tamil IV · Technical terms' },
  A5: { ta: 'வாசித்தல் · புரிதல்', en: 'Tamil V · Reading comprehension' },
  A6: { ta: 'மொழிபெயர்ப்பு', en: 'Tamil VI · Translation' },
  A7: { ta: 'இலக்கியம் · அறிஞர்கள்', en: 'Tamil VII · Literature & scholars' },
  B1: { ta: 'பொது அறிவியல்', en: 'GS I · General science' },
  B2: { ta: 'புவியியல்', en: 'GS II · Geography' },
  B3: { ta: 'இந்திய வரலாறு · தேசிய இயக்கம்', en: 'GS III · History & national movement' },
  B4: { ta: 'இந்திய அரசியலமைப்பு', en: 'GS IV · Indian polity' },
  B5: { ta: 'பொருளாதாரம் · TN நிர்வாகம்', en: 'GS V · Economy & TN development admin' },
  B6: { ta: 'தமிழ்நாடு வரலாறு · பண்பாடு', en: 'GS VI · TN history, culture & movements' },
  C1: { ta: 'திறனறிவு', en: 'Aptitude' },
  C2: { ta: 'காரணவியல்', en: 'Reasoning' },
};

/** Official indicative question counts (Annexure III). */
export const UNIT_COUNTS: Record<Unit, number> = {
  A1: 25, A2: 15, A3: 15, A4: 10, A5: 15, A6: 5, A7: 15,
  B1: 5, B2: 5, B3: 10, B4: 15, B5: 20, B6: 20,
  C1: 15, C2: 10,
};
export const ALL_UNITS = Object.keys(UNIT_COUNTS) as Unit[];
