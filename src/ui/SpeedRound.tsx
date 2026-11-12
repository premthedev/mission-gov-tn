import { useEffect, useRef, useState } from 'react';
import type { Question } from '../data/types';
import { addXp, bestSpeed, recordAttempt, saveSpeed } from '../data/progress';
import { ALL_GEN_TOPICS, generate, type GenTopic } from '../engine/generators/aptitude';
import { LETTERS } from '../engine/make';
import { XP } from '../engine/xp';
import { fx } from './feedback';
import { Button, Card, T } from './kit';
import { Confetti } from './Celebrate';

/** 90-second aptitude blitz: one tap per answer, no explanations, beat your best. */
export function SpeedRound({ gens, seconds = 90, sessionId, onDone }: { gens?: GenTopic[]; seconds?: number; sessionId?: string; onDone: () => void }) {
  const topics = gens?.length ? gens : ALL_GEN_TOPICS;
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const [left, setLeft] = useState(seconds);
  const [n, setN] = useState(0);
  const [q, setQ] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
  const [best, setBest] = useState(0);
  const [record, setRecord] = useState(false);
  const seed = useRef(`speed-${Date.now()}`);

  useEffect(() => void bestSpeed().then(setBest), []);
  useEffect(() => {
    if (phase !== 'run') return;
    const t = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => window.clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase === 'run' && left <= 0) {
      setPhase('done');
      fx.win();
      void addXp(score * XP.speedCorrect);
      void saveSpeed(score).then(setRecord);
    }
  }, [left, phase, score]);

  const nextQ = (i: number) => setQ(generate(topics[i % topics.length], `${seed.current}-${i}`));

  if (phase === 'ready') {
    return (
      <Card className="space-y-4 text-center">
        <div className="text-5xl">⏱️</div>
        <div className="text-xl font-bold">{seconds} விநாடிகளில் எத்தனை?</div>
        <T v={{ ta: 'தொட்டவுடன் அடுத்த வினா. விளக்கம் இல்லை, வேகம் மட்டும். மனக்கணக்கே போதும்.', en: 'One tap per answer, no explanations. Pure speed.' }} className="text-slate-500" />
        {best > 0 && <div className="text-sm text-slate-500">உங்கள் சாதனை: <b>{best}</b></div>}
        <Button onClick={() => { setPhase('run'); nextQ(0); }} className="w-full text-lg">தொடங்கு!</Button>
      </Card>
    );
  }

  if (phase === 'done') {
    return (
      <Card className="pop-in space-y-4 text-center">
        {record && <Confetti count={40} />}
        <div className="text-5xl">{record ? '🏆' : '⚡'}</div>
        <div className="text-4xl font-bold text-teal-700 dark:text-teal-300">{score} / {n}</div>
        <div className="text-slate-500">{record ? 'புதிய சாதனை!' : `சாதனை: ${Math.max(best, score)}`}</div>
        <div className="inline-block rounded-full bg-amber-100 px-4 py-1.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">+{score * XP.speedCorrect} XP</div>
        <Button onClick={onDone} className="w-full">அடுத்த படி →</Button>
      </Card>
    );
  }

  const answer = async (l: (typeof LETTERS)[number]) => {
    if (!q) return;
    const ok = l === q.answer;
    setFlash(ok ? 'ok' : 'bad');
    ok ? fx.correct() : fx.wrong();
    if (ok) setScore((s) => s + 1);
    void recordAttempt({ q, chosen: l, eliminated: [], confidence: 'SURE', ms: 0, mode: 'SPEED', sessionId, stepId: 'speed' });
    window.setTimeout(() => setFlash(null), 250);
    setN((x) => x + 1);
    nextQ(n + 1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className={`font-mono text-3xl font-bold ${left <= 10 ? 'text-rose-600' : ''}`}>{left}s</span>
        <span className="text-xl font-bold text-teal-700 dark:text-teal-300">✓ {score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full bg-amber-500 transition-all duration-1000 ease-linear" style={{ width: `${(left / seconds) * 100}%` }} />
      </div>
      {q && (
        <Card className={`text-lg font-medium leading-relaxed transition ${flash === 'ok' ? 'ring-2 ring-emerald-500' : flash === 'bad' ? 'shake ring-2 ring-rose-500' : ''}`}>
          <T v={q.stem} />
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3">
        {q && LETTERS.map((l) => (
          <button key={`${n}-${l}`} type="button" onClick={() => void answer(l)} className="min-h-16 rounded-2xl bg-white px-3 py-3 text-left text-base font-semibold shadow-sm ring-1 ring-slate-200 active:bg-teal-50 dark:bg-slate-800 dark:ring-slate-700">
            <T v={q.options[l]} />
          </button>
        ))}
      </div>
    </div>
  );
}
