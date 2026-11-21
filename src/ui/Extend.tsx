import { useState } from 'react';
import { extendSession } from '../data/progress';
import type { SessionRow } from '../data/db';
import { EXTRA_CHOICES } from '../engine/planner';
import { todayISO } from '../lib/date';
import { fx } from './feedback';
import { Icon } from './icons';

/**
 * "More time today?" — adds 15/30/60 minutes of extra steps (next lessons first) to today's session.
 * There is no upper limit: it can be used again and again.
 */
export function ExtendPicker({ onExtended, done, compact }: { onExtended: (row: SessionRow, minutes: number) => void; done?: boolean; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const pick = async (m: number) => {
    if (busy) return;
    setBusy(true);
    fx.tap();
    const row = await extendSession(todayISO(), m);
    setBusy(false);
    onExtended(row, m);
  };
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3 rounded-3xl bg-indigo-50 p-4 ring-1 ring-indigo-100 dark:bg-indigo-950/40 dark:ring-indigo-900'}>
      <div className="flex items-start gap-2.5">
        <Icon name="timer" size={22} className="mt-0.5 text-indigo-600 dark:text-indigo-300" />
        <div className="min-w-0">
          <div className="font-semibold">{done ? 'இன்னும் நேரம் இருக்கிறதா? தொடர்ந்து படிக்கலாம்' : 'இன்று கூடுதல் நேரம் இருக்கிறதா?'}</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {done
              ? 'அடுத்த பாடங்களும் பயிற்சியும் இன்றைய பாதையில் சேரும். எத்தனை முறை வேண்டுமானாலும் சேர்க்கலாம்.'
              : 'இன்றைய பாதையின் இறுதியில் அடுத்த பாடங்கள் + பயிற்சி சேரும். 1 மணி நேரம் கட்டாயம் இல்லை; நேரம் இருந்தால் நீட்டுங்கள்.'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {EXTRA_CHOICES.map((m) => (
          <button
            key={m}
            type="button"
            disabled={busy}
            onClick={() => void pick(m)}
            className="min-h-12 rounded-2xl bg-white px-2 font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-200 active:bg-indigo-100 disabled:opacity-50 dark:bg-slate-800 dark:text-indigo-200 dark:ring-indigo-800"
          >
            +{m} நிமி
          </button>
        ))}
      </div>
    </div>
  );
}
