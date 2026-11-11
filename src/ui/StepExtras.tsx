import { useEffect, useState } from 'react';
import { db, type AttemptRow } from '../data/db';
import { getQuestion, tagReason } from '../data/progress';
import type { Bi, ErrorReason, Question } from '../data/types';
import type { ChecklistKind } from '../engine/planner';
import { Button, Card, T, txt } from './kit';

const REASONS: { v: ErrorReason; label: Bi }[] = [
  { v: 'CONCEPT', label: { ta: 'தெரியாத பகுதி', en: "Didn't know it" } },
  { v: 'MEMORY', label: { ta: 'மறந்துவிட்டேன்', en: 'Forgot' } },
  { v: 'MISREAD_NOT', label: { ta: '"இல்லை/தவறு" தவறவிட்டேன்', en: 'Misread NOT' } },
  { v: 'CALC', label: { ta: 'கணக்குப் பிழை', en: 'Calculation' } },
  { v: 'GUESS', label: { ta: 'ஊகம்', en: 'Guessed' } },
  { v: 'TIME', label: { ta: 'நேரப் பற்றாக்குறை', en: 'Time pressure' } },
];

/** After practice: say why each mistake happened, so revision targets the real cause. */
export function TagMistakes({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const [rows, setRows] = useState<(AttemptRow & { q?: Question })[] | null>(null);
  useEffect(() => {
    (async () => {
      const list = await db.attempts.where('sessionId').equals(sessionId).toArray();
      const wrong = list.filter((a) => !a.correct || a.confidence === 'GUESS');
      const seen = new Set<string>();
      const uniq = wrong.filter((a) => (seen.has(a.questionId) ? false : (seen.add(a.questionId), true)));
      setRows(await Promise.all(uniq.map(async (a) => ({ ...a, q: await getQuestion(a.questionId) }))));
    })();
  }, [sessionId]);

  if (!rows) return null;
  if (rows.length === 0) {
    return (
      <Card className="space-y-4 text-center">
        <div className="text-4xl">🎯</div>
        <T v={{ ta: 'இன்று தவறுகள் இல்லை. அருமை!', en: 'No mistakes today. Well done!' }} />
        <Button onClick={onDone} className="w-full">முடிக்க ✓</Button>
      </Card>
    );
  }
  const set = async (row: AttemptRow, reason: ErrorReason) => {
    await tagReason(row.id!, row.questionId, reason);
    setRows((rs) => rs!.map((r) => (r.id === row.id ? { ...r, reason } : r)));
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <T v={{ ta: 'ஒவ்வொரு தவறுக்கும் காரணத்தைத் தொடுங்கள். இவை 1, 3, 7, 14 நாட்களில் மீண்டும் வரும்.', en: 'Tap the reason for each mistake. These come back after 1, 3, 7 and 14 days.' }} />
      </p>
      {rows.map((r) => (
        <Card key={r.id} className="space-y-2">
          <div className="line-clamp-3 text-sm">{txt(r.q?.stem) || r.questionId}</div>
          <div className="text-xs text-slate-500">உங்கள் விடை {r.chosen} · சரியான விடை {r.q?.answer}</div>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((x) => (
              <button key={x.v} type="button" onClick={() => set(r, x.v)} className={`rounded-full px-3 py-1.5 text-xs ring-1 ${r.reason === x.v ? 'bg-teal-700 text-white ring-teal-700' : 'ring-slate-300 dark:ring-slate-600'}`}>
                {txt(x.label)}
              </button>
            ))}
          </div>
        </Card>
      ))}
      <Button onClick={onDone} className="w-full">முடிக்க ✓</Button>
    </div>
  );
}

const LISTS: Record<ChecklistKind, Bi[]> = {
  PRE_MOCK: [
    { ta: 'நாளை காலை 9:30 – 12:30 நேரம் முழுமையாக ஒதுக்கப்பட்டுள்ளது', en: 'Tomorrow 9:30–12:30 is blocked off' },
    { ta: 'தொலைபேசி முழு சார்ஜ் + சார்ஜர் அருகில்', en: 'Phone fully charged, charger nearby' },
    { ta: 'அமைதியான இடம் · Do Not Disturb', en: 'Quiet place, Do Not Disturb on' },
    { ta: 'கணக்குக்கு வெற்றுத்தாள் + பேனா', en: 'Rough paper and pen for calculations' },
    { ta: 'தண்ணீர் · இடைவேளை இல்லை (உண்மையான தேர்வு போல)', en: 'Water ready · no breaks, like the real exam' },
  ],
  MOCK: [
    { ta: 'Do Not Disturb இயக்கப்பட்டது', en: 'Do Not Disturb is on' },
    { ta: 'வரிசை: பகுதி அ (70 நிமிடம்) → பகுதி இ (30) → பகுதி ஆ (60) → சரிபார்ப்பு (20)', en: 'Order: Part A (70 min) → Part C (30) → Part B (60) → check (20)' },
    { ta: 'எந்த வினாவையும் காலியாக விடக்கூடாது (ஒவ்வொன்றுக்கும் −0.5)', en: 'Never leave a question blank (−0.5 each)' },
    { ta: 'தெரியாவிட்டாலும் A–D-இல் ஒன்றை ஊகிக்கவும்; தவறுக்கு மதிப்பெண் குறைப்பு இல்லை', en: 'If unsure, still guess A–D; wrong answers cost nothing' },
  ],
  EXAM: [
    { ta: 'நுழைவுச் சீட்டு (Hall ticket) அச்சுப் பிரதி: கடையில் அச்சிட்டு வைத்துக்கொள்ளுங்கள்', en: 'Printed hall ticket: get it printed at a shop' },
    { ta: 'அடையாள அட்டை நகல் (photocopy)', en: 'Photocopy of an ID proof' },
    { ta: 'கருப்பு மை பந்துமுனைப் பேனா × 2 (வேறு பேனா = விடைத்தாள் செல்லாது)', en: '2 black ballpoint pens (any other pen invalidates the sheet)' },
    { ta: 'காலை 8:30-க்குள் தேர்வு மையத்தில்', en: 'Reach the centre by 8:30 AM' },
    { ta: 'வினாத்தாள் புத்தக எண்ணை எழுதி வட்டங்களைக் கருமையாக்கு (இல்லையெனில் செல்லாது)', en: 'Write and shade the question booklet number (else the sheet is invalid)' },
    { ta: 'இடது கைப் பெருவிரல் ரேகை (இல்லையெனில் −0.5)', en: 'Left thumb impression (else −0.5)' },
    { ta: 'கையொப்பம் (இல்லையெனில் செல்லாது)', en: 'Signature (else invalid)' },
    { ta: '200 வினாக்களுக்கும் ஒரு வட்டம்; காலி இல்லை', en: 'One bubble for all 200 questions; zero blanks' },
    { ta: 'தேர்வு முடிந்ததும் A, B, C, D, E எண்ணிக்கைகளை எழுதி கருமையாக்கு', en: 'After the exam, write and shade the counts of A, B, C, D, E' },
  ],
};

export function Checklist({ kind, onDone }: { kind: ChecklistKind; onDone: () => void }) {
  const items = LISTS[kind];
  const [ticked, setTicked] = useState<number[]>([]);
  return (
    <div className="space-y-3">
      {items.map((it, i) => {
        const on = ticked.includes(i);
        return (
          <button key={i} type="button" onClick={() => setTicked((t) => (on ? t.filter((x) => x !== i) : [...t, i]))} className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left ring-1 ${on ? 'bg-emerald-50 ring-emerald-400 dark:bg-emerald-900/30' : 'bg-white ring-slate-300 dark:bg-slate-800 dark:ring-slate-600'}`}>
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-sm ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'}`}>{on ? '✓' : ''}</span>
            <T v={it} />
          </button>
        );
      })}
      <Button onClick={onDone} className="w-full" disabled={ticked.length < items.length}>
        {ticked.length < items.length ? `${ticked.length}/${items.length} சரிபார்க்கப்பட்டது` : 'தயார் ✓ · Ready'}
      </Button>
    </div>
  );
}
