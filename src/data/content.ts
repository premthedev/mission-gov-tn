import kuralData from '../../content/kural20.json';
import type {
  Bi, CurriculumWeek, Deck, Era, Format, KeySource, Kural, KuralChapter, Lesson, Letter, Part, Passage, Question, Unit,
} from './types';

/**
 * Content store. Starts with the files bundled in the app, then merges files downloaded from GitHub
 * (see sync.ts). Every getter returns the current merged view; subscribe() notifies React on change.
 */

export const CHAPTERS: KuralChapter[] = kuralData.chapters;
export const KURALS: Kural[] = kuralData.kurals;

type RawText = string | Bi;
const bi = (v: RawText | undefined): Bi => (v === undefined ? {} : typeof v === 'string' ? { ta: v } : v);
const letters: Letter[] = ['A', 'B', 'C', 'D'];

interface RawCheck {
  stem: RawText;
  statements?: RawText[];
  options: RawText[];
  answer: Letter;
  explain?: RawText;
  format?: Format;
}

interface RawLesson extends Omit<Lesson, 'check' | 'title' | 'oneLine' | 'sections' | 'examples' | 'traps'> {
  title: RawText;
  oneLine: RawText;
  sections: { heading?: RawText; body: RawText }[];
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

function lessonFromRaw(raw: RawLesson): Lesson {
  return {
    ...raw,
    title: bi(raw.title),
    oneLine: bi(raw.oneLine),
    sections: raw.sections.map((s) => ({ heading: s.heading ? bi(s.heading) : undefined, body: bi(s.body) })),
    examples: raw.examples.map((e) => ({ q: bi(e.q), a: bi(e.a) })),
    traps: raw.traps.map(bi),
    check: raw.check.map((c, i): Question => ({
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
      explanation: c.explain ? { ...bi(c.explain), ref: raw.sourceRef, verified: false } : undefined,
    })),
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

// ---------- bundled files ----------

const strip = (k: string) => k.replace(/^.*\/content\//, '');
const glob = (g: Record<string, unknown>) => Object.fromEntries(Object.entries(g).map(([k, v]) => [strip(k), v]));
const BUNDLED: Record<string, unknown> = {
  ...glob(import.meta.glob('../../content/lessons/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/questions/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/decks/*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/feed/ca-*.json', { eager: true, import: 'default' })),
  ...glob(import.meta.glob('../../content/curriculum.json', { eager: true, import: 'default' })),
};

// ---------- merged state ----------

interface State {
  lessons: Lesson[];
  pyq: Question[];
  ca: Question[];
  decks: Deck[];
  curriculum: CurriculumWeek[];
  passages: Passage[];
  papers: { exam: string; year: number; title: string; url: string; count: number }[];
  byId: Map<string, Question>;
  feedDates: string[];
}

function build(files: Record<string, unknown>): State {
  const lessons: Lesson[] = [];
  const pyq: Question[] = [];
  const ca: Question[] = [];
  const decks: Deck[] = [];
  const passages: Passage[] = [];
  const papers: State['papers'] = [];
  const feedDates: string[] = [];
  let curriculum: CurriculumWeek[] = [];
  for (const [path, data] of Object.entries(files)) {
    try {
      if (path.startsWith('lessons/')) lessons.push(...(data as RawLesson[]).map(lessonFromRaw));
      else if (path.startsWith('questions/')) {
        const p = data as RawPaper;
        pyq.push(...paperToQuestions(p));
        passages.push(...(p.passages ?? []).map((x) => ({ id: `${p.exam}-${x.id}`, text: bi(x.text) })));
        papers.push({ exam: p.exam, year: p.year, title: p.title, url: p.url, count: p.questions.length });
      } else if (path.startsWith('decks/')) decks.push(...(data as Deck[]));
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
  const L = uniq(lessons).sort((a, b) => a.week - b.week || a.seq - b.seq);
  const P = uniq(pyq);
  const C = uniq(ca);
  const byId = new Map<string, Question>([...P, ...C, ...L.flatMap((l) => l.check)].map((q) => [q.id, q]));
  return {
    lessons: L, pyq: P, ca: C, decks: uniq(decks), curriculum, passages, byId,
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
export const curriculum = () => state.curriculum;
export const papers = () => state.papers;
export const feedDates = () => state.feedDates;
export const lessonQuestions = () => state.lessons.flatMap((l) => l.check);
export const contentQuestion = (id: string) => state.byId.get(id);
export const lessonById = (id: string) => state.lessons.find((l) => l.id === id);
export const passageById = (id: string) => state.passages.find((p) => p.id === id);
export const deckById = (id: string) => state.decks.find((d) => d.id === id);
export const chapterByOrder = (order: number) => CHAPTERS.find((c) => c.order === order)!;
/** Real (non-generated) questions used for ranking and practice. */
export const realBank = () => [...state.pyq, ...state.ca, ...lessonQuestions()];

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
