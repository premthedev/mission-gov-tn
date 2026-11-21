import { useEffect, useRef, useState } from 'react';
import type { Bi, CheatSheet, Confidence, Letter, Mode, Question } from '../data/types';
import { cheatForQuestion, hintFor } from '../data/content';
import { addXp, markTopicSeen, recordAttempt, topicsSeen } from '../data/progress';
import { LETTERS } from '../engine/make';
import { answerXp } from '../engine/xp';
import { CheatSheetModal } from './CheatSheet';
import { fx } from './feedback';
import { Icon } from './icons';
import { Button, Card, LangCtx, T, hasEnglish, mmss, txt, useLang, type LangMode } from './kit';
import { QuestionBody, SourceBadge } from './QuestionBody';

export interface QuizResult {
  questionId: string;
  correct: boolean;
  confidence: Confidence;
}

const CONF: { v: Confidence; label: string }[] = [
  { v: 'SURE', label: 'உறுதி' },
  { v: 'FIFTY_FIFTY', label: '50-50' },
  { v: 'GUESS', label: 'ஊகம்' },
];

/** Modes where the app teaches as you go (hints, first-time topic cards). Exam-like modes stay bare. */
const TEACH: Mode[] = ['PRACTICE', 'DRILL', 'REVIEW', 'WARMUP', 'LESSON', 'KURAL'];
const INTRO: Mode[] = ['PRACTICE', 'DRILL', 'WARMUP'];

const anyEnglish = (q: Question) =>
  hasEnglish(q.stem) || Object.values(q.options).some(hasEnglish) || (q.statements ?? []).some(hasEnglish);

/** After answering: the right answer, why, why the other options are wrong, the rule, an example and a tip. */
function ExplanationPanel({ q, selected, right, onSheet }: { q: Question; selected: Letter | null; right: boolean; onSheet: (c: CheatSheet) => void }) {
  const e = q.explanation;
  const sheet = cheatForQuestion(q);
  const mine = selected && !right ? e?.why?.[selected] : undefined;
  return (
    <Card className={`pop-in space-y-3 ${right ? 'bg-emerald-50 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-800' : 'bg-rose-50 ring-rose-200 dark:bg-rose-950/40 dark:ring-rose-800'}`}>
      <div className={`flex items-center gap-2 text-xl font-bold ${right ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
        <Icon name={right ? 'checkCircle' : 'xCircle'} size={26} /> {right ? 'சரி!' : 'தவறு'}
      </div>
      <div className="rounded-2xl bg-white/80 p-3 dark:bg-slate-900/50">
        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">சரியான விடை</div>
        <div className="font-semibold">({q.answer}) <T v={q.options[q.answer]} inline /></div>
        {selected && !right && (
          <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-700">
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">நீங்கள் தேர்ந்தெடுத்தது</div>
            <div>({selected}) <T v={q.options[selected]} inline /></div>
            {mine && <div className="mt-1 text-[0.95rem] text-rose-800 dark:text-rose-200">ஏன் தவறு: <T v={mine} inline /></div>}
          </div>
        )}
      </div>

      {e && (e.ta || e.en) ? (
        <div>
          <div className="mb-0.5 text-sm font-bold">ஏன் இது சரி?</div>
          <T v={{ ta: e.ta, en: e.en }} className="leading-relaxed" />
        </div>
      ) : (
        <p className="text-sm text-slate-500">இந்த வினாவுக்கான விரிவான விளக்கம் விரைவில் சேர்க்கப்படும். கீழே உள்ள குறிப்பு அட்டையில் விதி உள்ளது.</p>
      )}
      {e?.rule && <Note icon="book" label="நினைவில் வைக்க வேண்டிய விதி" v={e.rule} />}
      {e?.example && <Note icon="eye" label="இன்னொரு எடுத்துக்காட்டு" v={e.example} />}
      {e?.tip && <Note icon="bulb" label="தேர்வுக் குறிப்பு" v={e.tip} />}

      {sheet && (
        <button type="button" onClick={() => onSheet(sheet)} className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-3 text-left ring-1 ring-teal-600/30 active:bg-teal-50 dark:bg-slate-900/60">
          <Icon name="sheet" className="text-teal-700 dark:text-teal-300" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-slate-500">முழுக் குறிப்பு அட்டை</span>
            <span className="block truncate font-semibold">{sheet.title}</span>
          </span>
          <Icon name="right" className="text-slate-400" />
        </button>
      )}

      {e?.doubt && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
          இந்த வினாவின் TNPSC விடை சர்ச்சைக்குரியதாக இருக்கலாம். தேர்வில் TNPSC விடைக்குறிப்பையே பின்பற்றுங்கள்.
        </p>
      )}
      <p className="text-xs text-slate-500">
        {[
          q.source.kind === 'PYQ' ? (q.keySource === 'FINAL_KEY' ? 'விடை: TNPSC இறுதி விடைக்குறிப்பு' : 'விடை: TNPSC தற்காலிக விடைக்குறிப்பு') : '',
          q.source.aiExtracted ? 'வினா AI மூலம் படித்தெடுக்கப்பட்டது' : '',
          e?.ai ? 'விளக்கம்: AI ஆசிரியர் (சரிபார்க்கப்படவில்லை)' : '',
        ].filter(Boolean).join(' · ')}
      </p>
      {q.source.url && q.source.kind === 'CURRENT_AFFAIRS' && (
        <a href={q.source.url} target="_blank" rel="noreferrer" className="block text-xs text-teal-700 underline dark:text-teal-300">மூலச் செய்தி</a>
      )}
    </Card>
  );
}

function Note({ icon, label, v }: { icon: 'book' | 'eye' | 'bulb'; label: string; v: Bi }) {
  return (
    <div className="flex gap-2.5 rounded-2xl bg-white/70 p-3 dark:bg-slate-900/40">
      <Icon name={icon} size={20} className="mt-0.5 text-teal-700 dark:text-teal-300" />
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <T v={v} className="leading-relaxed" />
      </div>
    </div>
  );
}

/** First time a topic shows up in practice: a short card that teaches it before the question. */
function TopicIntro({ c, onGo, onSheet }: { c: CheatSheet; onGo: () => void; onSheet: () => void }) {
  return (
    <div className="slide-up space-y-4">
      <Card className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><Icon name="bulb" size={18} /> புதிய தலைப்பு</div>
        <h3 className="text-xl font-bold leading-snug">{c.title}</h3>
        <p className="leading-relaxed">{c.oneLine}</p>
        {c.patterns.slice(0, 2).map((p, i) => (
          <div key={i} className="rounded-2xl bg-teal-50 p-3 dark:bg-teal-900/30">
            <div className="font-semibold">{p.see}</div>
            <div className="mt-1 whitespace-pre-line text-[0.95rem] leading-relaxed">→ {p.do}</div>
          </div>
        ))}
        <button type="button" onClick={onSheet} className="flex items-center gap-1.5 text-sm font-semibold text-teal-700 dark:text-teal-300">
          <Icon name="sheet" size={18} /> முழுக் குறிப்பு அட்டையைப் பார்
        </button>
      </Card>
      <Button onClick={onGo} className="w-full text-lg">புரிந்தது, வினாவுக்குச் செல் <Icon name="right" /></Button>
    </div>
  );
}

/**
 * One question at a time. Tap an option, tap "Check". The explanation opens below the options:
 * right answer, why, why your choice was wrong, the rule, an example, a tip and the topic's cheat sheet.
 */
export function QuizRunner({
  questions, mode, sessionId, stepId, onFinish, timeLimitSec, finishLabel, compactResult, skipSummary, onAnswer,
}: {
  questions: Question[];
  mode: Mode;
  sessionId?: string;
  stepId?: string;
  onFinish: (results: QuizResult[]) => void;
  timeLimitSec?: number;
  finishLabel?: Bi;
  compactResult?: boolean;
  /** Call onFinish straight after the last question (used inside lessons). */
  skipSummary?: boolean;
  /** Called after each answer (e.g. to grade a Thirukkural card). */
  onAnswer?: (q: Question, correct: boolean) => void;
}) {
  const lang = useLang();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<Letter | null>(null);
  const [eliminated, setEliminated] = useState<Letter[]>([]);
  const [confidence, setConfidence] = useState<Confidence>('SURE');
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [combo, setCombo] = useState(0);
  const [xp, setXp] = useState(0);
  const [gain, setGain] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [english, setEnglish] = useState(false);
  const [sheet, setSheet] = useState<CheatSheet | null>(null);
  const [seen, setSeen] = useState<Set<string> | null>(INTRO.includes(mode) ? null : new Set());
  const shownAt = useRef(Date.now());
  const press = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seen === null) void topicsSeen().then(setSeen);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!timeLimitSec) return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [timeLimitSec]);

  const q = questions[idx];
  const finished = idx >= questions.length;

  useEffect(() => {
    if (skipSummary && finished && questions.length > 0) onFinish(results);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  if (skipSummary && finished) return null;

  if (questions.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <T v={{ ta: 'இந்தப் பகுதிக்கான வினாக்கள் விரைவில் வரும்.', en: 'Questions for this part are on the way.' }} />
        <Button onClick={() => onFinish([])} className="w-full">தொடர்க <Icon name="right" /></Button>
      </Card>
    );
  }

  if (finished) {
    const correct = results.filter((r) => r.correct).length;
    const pct = Math.round((correct / Math.max(1, results.length)) * 100);
    const missed = results.filter((r) => !r.correct).map((r) => questions.find((x) => x.id === r.questionId)).filter((x): x is Question => !!x);
    return (
      <div className="pop-in space-y-4">
        <Card className="space-y-3 text-center">
          <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${pct >= 80 ? 'bg-amber-100 text-amber-600' : pct >= 50 ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'} dark:bg-slate-700`}>
            <Icon name={pct >= 80 ? 'trophy' : pct >= 50 ? 'star' : 'target'} size={34} />
          </div>
          <div className="text-4xl font-bold text-teal-700 dark:text-teal-300">{correct}/{results.length}</div>
          <div className="text-slate-500">{pct >= 80 ? 'அருமை!' : pct >= 50 ? 'நல்ல முயற்சி!' : 'தவறியவை மீண்டும் வரும்; அப்போது வெல்லலாம்.'}</div>
          <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">+{xp} XP</div>
        </Card>
        {!compactResult && missed.length > 0 && (
          <Card className="space-y-2">
            <div className="font-semibold">தவறியவை: சரியான விடையை ஒருமுறை பாருங்கள்</div>
            {missed.map((m) => (
              <div key={m.id} className="border-t border-slate-100 pt-2 text-sm first:border-0 first:pt-0 dark:border-slate-700">
                <div className="line-clamp-2 text-slate-600 dark:text-slate-300">{txt(m.stem)}</div>
                <div className="font-semibold text-emerald-700 dark:text-emerald-300">✓ {txt(m.options[m.answer])}</div>
              </div>
            ))}
            <p className="text-xs text-slate-500">இவை 1, 3, 7, 14 நாட்களில் மீண்டும் வரும்.</p>
          </Card>
        )}
        <Button onClick={() => onFinish(results)} className="w-full text-lg"><T v={finishLabel ?? { ta: 'அடுத்த படி', en: 'Next step' }} inline /> <Icon name="right" /></Button>
      </div>
    );
  }

  const topic = cheatForQuestion(q);
  if (seen && topic && INTRO.includes(mode) && !seen.has(topic.id)) {
    return (
      <>
        <TopicIntro
          c={topic}
          onSheet={() => setSheet(topic)}
          onGo={() => {
            fx.tap();
            void markTopicSeen(topic.id);
            setSeen((s) => new Set([...(s ?? []), topic.id]));
            shownAt.current = Date.now();
          }}
        />
        {sheet && <CheatSheetModal c={sheet} onClose={() => setSheet(null)} />}
      </>
    );
  }

  const toggleElim = (l: Letter) => {
    if (submitted) return;
    fx.tap();
    setEliminated((e) => (e.includes(l) ? e.filter((x) => x !== l) : [...e, l]));
    if (selected === l) setSelected(null);
  };

  const submit = async () => {
    if (!selected) return;
    setSubmitted(true);
    const conf = showHint && confidence === 'SURE' ? 'FIFTY_FIFTY' : confidence;
    const correct = await recordAttempt({ q, chosen: selected, eliminated, confidence: conf, ms: Date.now() - shownAt.current, mode, sessionId, stepId });
    onAnswer?.(q, correct);
    const nextCombo = correct ? combo + 1 : 0;
    const g = answerXp(correct, nextCombo);
    if (correct) (nextCombo >= 3 ? fx.combo : fx.correct)();
    else fx.wrong();
    setCombo(nextCombo);
    setGain(g);
    setXp((x) => x + g);
    void addXp(g);
    setResults((r) => [...r, { questionId: q.id, correct, confidence: conf }]);
    window.setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  };

  const next = () => {
    setIdx((i) => i + 1);
    setSelected(null);
    setEliminated([]);
    setConfidence('SURE');
    setSubmitted(false);
    setGain(0);
    setShowHint(false);
    setEnglish(false);
    shownAt.current = Date.now();
    window.scrollTo({ top: 0 });
  };

  const isRight = (l: Letter) => l === q.answer || (q.acceptedAnswers?.includes(l) ?? false);
  const right = submitted && selected !== null && isRight(selected);
  const teach = TEACH.includes(mode);
  const hint = teach ? hintFor(q) : undefined;
  const canEn = anyEnglish(q);
  const shown: LangMode = english ? (lang === 'ta' ? 'both' : 'ta') : lang;

  return (
    <div className="space-y-4 pb-36">
      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full rounded-full bg-teal-500 transition-all duration-500" style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        {combo >= 2 && <span className="pop-in flex shrink-0 items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-bold text-orange-700 dark:bg-orange-900/40 dark:text-orange-200"><Icon name="flame" size={16} />{combo}</span>}
        {timeLimitSec ? <span className={`shrink-0 font-mono text-sm ${elapsed > timeLimitSec ? 'text-rose-600' : 'text-slate-500'}`}>{mmss(timeLimitSec - elapsed)}</span> : null}
        <span className="shrink-0 text-sm text-slate-500">{idx + 1}/{questions.length}</span>
      </div>

      <LangCtx.Provider value={shown}>
        <div key={q.id} className="slide-up space-y-4">
          <div className="flex items-center justify-between gap-2">
            <SourceBadge q={q} />
            {canEn && (
              <button type="button" onClick={() => setEnglish((x) => !x)} className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600">
                <Icon name="language" size={15} /> {shown === 'ta' ? 'English-உம் காட்டு' : 'தமிழ் மட்டும்'}
              </button>
            )}
          </div>
          <Card><QuestionBody q={q} /></Card>

          {hint && !submitted && (
            showHint ? (
              <div className="pop-in flex gap-2.5 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800">
                <Icon name="bulb" size={20} className="mt-0.5 text-amber-600" />
                <div className="min-w-0 text-[0.95rem] leading-relaxed">
                  <T v={hint.hint} />
                  {hint.from && <div className="mt-1 text-xs text-slate-500">"{hint.from}" குறிப்பிலிருந்து</div>}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => { fx.tap(); setShowHint(true); }} className="flex items-center gap-1.5 rounded-full bg-amber-50 px-3.5 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 active:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800">
                <Icon name="bulb" size={18} /> குறிப்பு வேண்டுமா?
              </button>
            )
          )}

          <div className="space-y-2.5">
            {LETTERS.map((l) => {
              const elim = eliminated.includes(l);
              const why = submitted && !isRight(l) ? q.explanation?.why?.[l] : undefined;
              let cls = 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700';
              if (!submitted && selected === l) cls = 'bg-teal-50 ring-2 ring-teal-500 dark:bg-teal-900/40';
              if (submitted && isRight(l)) cls = 'bg-emerald-50 ring-2 ring-emerald-500 dark:bg-emerald-900/40';
              if (submitted && selected === l && !isRight(l)) cls = 'shake bg-rose-50 ring-2 ring-rose-500 dark:bg-rose-900/40';
              const dim = submitted && !isRight(l) && selected !== l;
              return (
                <div key={l} className={`rounded-2xl shadow-sm ring-1 transition ${cls}`}>
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      className={`flex min-h-14 flex-1 items-start gap-3 px-3 py-3 text-left ${elim ? 'opacity-40 line-through' : ''} ${dim ? 'opacity-70' : ''}`}
                      onPointerDown={() => {
                        longPressed.current = false;
                        press.current = window.setTimeout(() => {
                          longPressed.current = true;
                          toggleElim(l);
                        }, 450);
                      }}
                      onPointerUp={() => window.clearTimeout(press.current)}
                      onPointerLeave={() => window.clearTimeout(press.current)}
                      onClick={() => {
                        if (longPressed.current || submitted || elim) return;
                        fx.tap();
                        setSelected(l);
                      }}
                    >
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-bold ${
                        submitted && isRight(l) ? 'bg-emerald-600 text-white' : submitted && selected === l ? 'bg-rose-600 text-white' : selected === l ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-slate-700'
                      }`}>{submitted && isRight(l) ? <Icon name="check" size={18} strokeWidth={3} /> : l}</span>
                      <T v={q.options[l]} className="pt-0.5" />
                    </button>
                    {!submitted && (
                      <button type="button" onClick={() => toggleElim(l)} className="grid w-11 shrink-0 place-items-center text-slate-300 active:text-rose-600 dark:text-slate-600" aria-label={`Cross out ${l}`}>
                        <Icon name="close" size={18} />
                      </button>
                    )}
                  </div>
                  {why && (
                    <div className="mx-3 mb-3 -mt-1 rounded-xl bg-slate-50 px-3 py-2 text-[0.9rem] leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                      <span className="font-semibold text-rose-600 dark:text-rose-300">ஏன் இல்லை: </span><T v={why} inline />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {submitted && (
            <div ref={panelRef} className="scroll-mt-16">
              <ExplanationPanel q={q} selected={selected} right={right} onSheet={setSheet} />
            </div>
          )}
        </div>
      </LangCtx.Provider>

      {/* bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="mx-auto max-w-xl space-y-2 px-4 pt-3">
          {!submitted ? (
            <>
              <div className="flex justify-center gap-2">
                {CONF.map((c) => (
                  <button key={c.v} type="button" onClick={() => setConfidence(c.v)} className={`rounded-full px-4 py-1.5 text-sm font-medium ring-1 ${confidence === c.v ? 'bg-slate-800 text-white ring-slate-800 dark:bg-slate-200 dark:text-slate-900' : 'ring-slate-300 dark:ring-slate-600'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <Button onClick={submit} disabled={!selected} className="w-full text-lg">{selected ? 'சரிபார்' : 'ஒரு விடையைத் தொடுங்கள்'}</Button>
            </>
          ) : (
            <div className="relative">
              {gain > 0 && <span key={idx} className="float-up pointer-events-none absolute -top-6 right-2 font-bold text-amber-600">+{gain} XP</span>}
              <Button onClick={next} variant={right ? 'success' : 'primary'} className="w-full text-lg">
                {idx + 1 < questions.length ? 'அடுத்த வினா' : 'முடிவு'} <Icon name="right" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {sheet && <CheatSheetModal c={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
