import { db } from './db';
import { KURALS } from './content';
import type { KuralUrai } from './types';

/**
 * Tamil commentaries (மு. வரதராசனார், சாலமன் பாப்பையா) and an English prose meaning are fetched once
 * from the tk120404/thirukkural dataset for personal study, then kept offline. They are not shipped in the repo.
 */
const URL_ = 'https://raw.githubusercontent.com/tk120404/thirukkural/master/thirukkural.json';

/** In-memory copy so question generators can use the Tamil meaning synchronously. */
const cache = new Map<number, KuralUrai>();

export async function loadUraiCache(): Promise<void> {
  (await db.urai.toArray()).forEach((u) => cache.set(u.n, u));
}

/** Tamil meaning (Mu. Va.) of a kural, if downloaded. */
export const tamilMeaning = (n: number): string | undefined => cache.get(n)?.mv;

export async function uraiReady(): Promise<boolean> {
  return (await db.urai.count()) >= KURALS.length;
}

export async function fetchUrai(): Promise<boolean> {
  if (await uraiReady()) {
    if (cache.size === 0) await loadUraiCache();
    return true;
  }
  try {
    const res = await fetch(URL_);
    if (!res.ok) return false;
    const data = (await res.json()) as { kural: { Number: number; mv?: string; sp?: string; explanation?: string }[] };
    const wanted = new Set(KURALS.map((k) => k.n));
    const rows = data.kural.filter((k) => wanted.has(k.Number)).map((k) => ({ n: k.Number, mv: k.mv, sp: k.sp, en: k.explanation }));
    await db.urai.bulkPut(rows);
    rows.forEach((u) => cache.set(u.n, u));
    return true;
  } catch {
    return false;
  }
}

export async function getUrai(n: number): Promise<KuralUrai | undefined> {
  return cache.get(n) ?? db.urai.get(n);
}
