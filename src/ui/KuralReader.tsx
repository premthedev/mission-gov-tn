import { useEffect, useState } from 'react';
import { KURALS, chapterByOrder } from '../data/content';
import type { KuralUrai } from '../data/types';
import { fetchUrai, getUrai } from '../data/urai';
import { Button, Card, T } from './kit';

/** Teaches one chapter: each kural with both Tamil commentaries and the English meaning, one at a time. */
export function KuralReader({ order, onDone, doneLabel }: { order: number; onDone: () => void; doneLabel?: string }) {
  const ch = chapterByOrder(order);
  const kurals = KURALS.filter((k) => k.order === order);
  const [i, setI] = useState(0);
  const [urai, setUrai] = useState<KuralUrai | undefined>();
  const [loading, setLoading] = useState(false);
  const k = kurals[i];

  useEffect(() => {
    let alive = true;
    (async () => {
      let u = await getUrai(k.n);
      if (!u) {
        setLoading(true);
        await fetchUrai();
        u = await getUrai(k.n);
        if (alive) setLoading(false);
      }
      if (alive) setUrai(u);
    })();
    return () => {
      alive = false;
    };
  }, [k.n]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-sm text-slate-500">அதிகாரம் {ch.ch} · {ch.paal} · {order}/20</div>
        <div className="text-2xl font-bold text-teal-800 dark:text-teal-200">{ch.name}</div>
        <div className="text-sm text-slate-500">{ch.en}</div>
      </div>

      {i === 0 && (
        <Card className="bg-teal-50 text-sm dark:bg-teal-950/40">
          <T v={{
            ta: 'எப்படிப் படிப்பது: ஒவ்வொரு குறளையும் இருமுறை உரக்கப் படியுங்கள். பிறகு கண்ணை மூடி முதல் அடியைச் சொல்லுங்கள். கடைசியாக அதன் பொருளை உங்கள் சொந்த வார்த்தைகளில் சொல்லுங்கள். TNPSC "இக்குறள் எந்த அதிகாரம்?" என்று கேட்கும்; அதிகாரப் பெயரையும் நினைவில் வையுங்கள்.',
            en: 'How to study: read each kural aloud twice, close your eyes and say the first line, then say its meaning in your own words. TNPSC asks which chapter a kural is from, so remember the chapter name too.',
          }} />
        </Card>
      )}

      <Card className="space-y-4">
        <div className="text-sm font-semibold text-slate-500">குறள் {k.n} · {i + 1}/10</div>
        <div className="space-y-1 text-xl font-semibold leading-relaxed">
          <div>{k.l1}</div>
          <div>{k.l2}</div>
        </div>
        {urai?.mv && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">பொருள் (மு. வரதராசனார்)</div>
            <p className="leading-relaxed">{urai.mv}</p>
          </div>
        )}
        {urai?.sp && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">எளிய விளக்கம் (சாலமன் பாப்பையா)</div>
            <p className="leading-relaxed">{urai.sp}</p>
          </div>
        )}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">English (G.U. Pope)</div>
          <p className="italic leading-relaxed text-slate-600 dark:text-slate-300">{k.pope}</p>
          {urai?.en && <p className="mt-1 text-sm text-slate-500">{urai.en}</p>}
        </div>
        {!urai && (
          <p className="text-xs text-slate-500">
            {loading ? 'தமிழ் உரை பதிவிறக்கம்… (ஒருமுறை மட்டும், இணையம் தேவை)' : 'தமிழ் உரை பெற இணைய இணைப்பு தேவை (ஒருமுறை மட்டும்).'}
          </p>
        )}
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0} className="flex-1">← முந்தைய</Button>
        {i < kurals.length - 1 ? (
          <Button onClick={() => setI((x) => x + 1)} className="flex-[2]">அடுத்த குறள் →</Button>
        ) : (
          <Button onClick={onDone} className="flex-[2]">{doneLabel ?? 'அதிகாரம் முடிந்தது ✓'}</Button>
        )}
      </div>
    </div>
  );
}
