import kuralData from '../../content/kural20.json';
import type { Bi, Era, Format, KeySource, Kural, KuralChapter, Lesson, Letter, Part, Passage, Question, Unit } from './types';

/**
 * Bundled content. Any JSON dropped into content/lessons or content/questions is picked up at build time.
 * Raw files use a compact format and are normalised here.
 */

export const CHAPTERS: KuralChapter[] = kuralData.chapters;
export const KURALS: Kural[] = kuralData.kurals;

type RawText = string | Bi;
const bi = (v: RawText | undefined): Bi => (v === undefined ? {} : typeof v === 'string' ? { ta: v } : v);

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
}

interface RawPaper {
  exam: string;
  year: number;
  title: string;
  url: string;
  passages?: { id: string; text: RawText }[];
  questions: RawPyq[];
}

const letters: Letter[] = ['A', 'B', 'C', 'D'];

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
    source: { kind: 'PYQ', exam: p.exam, year: p.year, qNo: q.qNo, url: p.url },
    syllabusEra: q.era,
    explanation: q.explain ? { ...bi(q.explain), verified: q.explainVerified ?? false } : undefined,
  }));
}

const lessonFiles = import.meta.glob('../../content/lessons/*.json', { eager: true, import: 'default' }) as Record<string, RawLesson[]>;
const paperFiles = import.meta.glob('../../content/questions/*.json', { eager: true, import: 'default' }) as Record<string, RawPaper>;

export const LESSONS: Lesson[] = Object.values(lessonFiles)
  .flatMap((list) => list.map(lessonFromRaw))
  .sort((a, b) => a.week - b.week || a.seq - b.seq);

const papers = Object.values(paperFiles);
export const PAPERS = papers.map((p) => ({ exam: p.exam, year: p.year, title: p.title, url: p.url, count: p.questions.length }));
export const PASSAGES: Passage[] = papers.flatMap((p) => (p.passages ?? []).map((x) => ({ id: `${p.exam}-${x.id}`, text: bi(x.text) })));
export const PYQ: Question[] = papers.flatMap(paperToQuestions);
export const LESSON_QUESTIONS: Question[] = LESSONS.flatMap((l) => l.check);

const byId = new Map<string, Question>([...PYQ, ...LESSON_QUESTIONS].map((q) => [q.id, q]));
export const contentQuestion = (id: string) => byId.get(id);
export const lessonById = (id: string) => LESSONS.find((l) => l.id === id);
export const passageById = (id: string) => PASSAGES.find((p) => p.id === id);
export const chapterByOrder = (order: number) => CHAPTERS.find((c) => c.order === order)!;

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
