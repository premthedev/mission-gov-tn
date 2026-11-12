import { useEffect, useState } from 'react';
import { db } from '../data/db';
import { addXp, streak, xpToday } from '../data/progress';
import { XP } from '../engine/xp';
import { todayISO } from '../lib/date';
import { Confetti } from './Celebrate';
import { fx } from './feedback';
import { Button, Card } from './kit';
import { TagMistakes } from './StepExtras';

/** End of the day: celebration, today's numbers, then one tap per mistake to say why it happened. */
export function WrapUp({ sessionId, onDone }: { sessionId: string; onDone: () => void }) {
  const [stats, setStats] = useState<{ c: number; t: number; xp: number; streak: number } | null>(null);
  const [tagging, setTagging] = useState(false);

  useEffect(() => {
    void (async () => {
      await addXp(XP.sessionDone);
      const list = await db.attempts.where('date').equals(todayISO()).toArray();
      setStats({ c: list.filter((a) => a.correct).length, t: list.length, xp: await xpToday(), streak: Math.max(1, await streak()) });
      fx.win();
    })();
  }, []);

  if (!stats) return null;
  if (tagging) return <TagMistakes sessionId={sessionId} onDone={onDone} />;

  const pct = stats.t ? Math.round((stats.c / stats.t) * 100) : 0;
  return (
    <div className="space-y-4">
      <Confetti />
      <Card className="pop-in space-y-4 text-center">
        <div className="text-6xl">🎉</div>
        <div className="text-2xl font-bold">இன்றைய வேலை முடிந்தது!</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-900/30"><div className="text-2xl font-bold">{stats.xp}</div><div className="text-xs text-slate-500">XP இன்று</div></div>
          <div className="rounded-2xl bg-teal-50 p-3 dark:bg-teal-900/30"><div className="text-2xl font-bold">{pct}%</div><div className="text-xs text-slate-500">{stats.c}/{stats.t} சரி</div></div>
          <div className="rounded-2xl bg-orange-50 p-3 dark:bg-orange-900/30"><div className="text-2xl font-bold">🔥{stats.streak}</div><div className="text-xs text-slate-500">தொடர் நாள்</div></div>
        </div>
        <p className="text-sm text-slate-500">கடைசி 2 நிமிடம்: ஒவ்வொரு தவறுக்கும் காரணத்தைத் தொடுங்கள். அடுத்த முறை ஆப் அதைக் குறிவைக்கும்.</p>
        <Button onClick={() => setTagging(true)} className="w-full text-lg">தவறுகளைக் குறி →</Button>
      </Card>
    </div>
  );
}
