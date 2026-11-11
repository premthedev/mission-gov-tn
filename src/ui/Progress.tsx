import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { LESSONS } from '../data/content';
import { db, getSetting, setSetting } from '../data/db';
import { streak, studiedMinutes } from '../data/progress';
import type { Part } from '../data/types';
import { fetchUrai, uraiReady } from '../data/urai';
import { exportBackup, importBackup, isNative, scheduleReminders } from '../native';
import { Bar, Button, Card, Chip, Screen, T, type LangMode } from './kit';

const PART_TA: Record<Part, string> = { A: 'பகுதி அ · தமிழ்', B: 'பகுதி ஆ · பொது அறிவு', C: 'பகுதி இ · திறனறிவு' };

export function Progress({ lang, setLang }: { lang: LangMode; setLang: (l: LangMode) => void }) {
  const data = useLiveQuery(async () => {
    const attempts = await db.attempts.toArray();
    const byPart: Record<Part, { c: number; t: number }> = { A: { c: 0, t: 0 }, B: { c: 0, t: 0 }, C: { c: 0, t: 0 } };
    for (const a of attempts) {
      byPart[a.part].t++;
      if (a.correct) byPart[a.part].c++;
    }
    return {
      mins: await studiedMinutes(),
      streak: await streak(),
      learned: await db.kuralLearned.count(),
      lessons: await db.lessonsDone.count(),
      reviews: await db.reviews.count(),
      mocks: await db.mocks.orderBy('id').reverse().toArray(),
      byPart,
      total: attempts.length,
    };
  }, []);
  const [time, setTime] = useState('20:15');
  const [msg, setMsg] = useState('');
  const [urai, setUrai] = useState<boolean | null>(null);

  useEffect(() => {
    void getSetting('reminderTime', '20:15').then(setTime);
    void uraiReady().then(setUrai);
  }, []);

  const saveTime = async (t: string) => {
    setTime(t);
    await setSetting('reminderTime', t);
    const ok = await scheduleReminders(t);
    setMsg(ok ? `நினைவூட்டல் தினமும் ${t}` : isNative ? 'அறிவிப்பு அனுமதி தேவை (Settings → Apps → Mission GOV → Notifications)' : 'நினைவூட்டல்கள் Android ஆப்பில் மட்டும்.');
  };

  const doExport = async () => setMsg(`சேமிக்கப்பட்டது: ${await exportBackup()}`);
  const doImport = (file?: File) => {
    if (!file) return;
    file.text().then(importBackup).then(() => setMsg('மீட்டெடுக்கப்பட்டது ✓ · Restored')).catch((e: Error) => setMsg(e.message));
  };

  if (!data) return null;
  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">முன்னேற்றம் · Progress</h1>

      <Card className="space-y-2">
        <div className="flex justify-between text-sm"><span className="font-semibold">படித்த நேரம்</span><span>{(data.mins / 60).toFixed(1)} / 83 மணி</span></div>
        <Bar value={data.mins} max={83 * 60} />
        <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs text-slate-500">
          <div><div className="text-lg font-bold text-slate-900 dark:text-white">{data.streak}</div>தொடர்</div>
          <div><div className="text-lg font-bold text-slate-900 dark:text-white">{data.learned}/20</div>குறள்</div>
          <div><div className="text-lg font-bold text-slate-900 dark:text-white">{data.lessons}/{LESSONS.length}</div>பாடங்கள்</div>
          <div><div className="text-lg font-bold text-slate-900 dark:text-white">{data.reviews}</div>மீள்பார்வை</div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="font-semibold">துல்லியம் · Accuracy ({data.total} வினாக்கள்)</div>
        {(['A', 'B', 'C'] as Part[]).map((p) => {
          const v = data.byPart[p];
          const pct = v.t ? Math.round((v.c / v.t) * 100) : 0;
          return (
            <div key={p} className="space-y-1">
              <div className="flex justify-between text-sm"><span>{PART_TA[p]}</span><span>{v.t ? `${pct}% · ${v.c}/${v.t}` : '—'}</span></div>
              <Bar value={v.c} max={v.t} />
            </div>
          );
        })}
        <T v={{ ta: 'இலக்கு: பகுதி அ 72%+, பகுதி இ 80%+, பகுதி ஆ 37%+ (மொத்தம் 120 சரி).', en: 'Target: Part A 72%+, Part C 80%+, Part B 37%+ (120 correct overall).' }} className="text-xs text-slate-500" />
      </Card>

      {data.mocks.length > 0 && (
        <Card className="space-y-2">
          <div className="font-semibold">மாதிரித் தேர்வுகள் · Mocks</div>
          {data.mocks.map((m) => (
            <div key={m.id} className="flex justify-between text-sm">
              <span>{m.date} · {m.blueprint}</span>
              <span className="font-semibold">{m.result.total.toFixed(1)} / {m.result.maxMarks} {m.result.gatePassed ? '' : '⚠'}</span>
            </div>
          ))}
        </Card>
      )}

      <Card className="space-y-3">
        <div className="font-semibold">அமைப்புகள் · Settings</div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>தினசரி நினைவூட்டல் · Daily reminder</span>
          <input type="time" value={time} onChange={(e) => void saveTime(e.target.value)} className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700" />
        </label>
        <div className="space-y-1 text-sm">
          <div>மொழி · Language</div>
          <div className="flex gap-2">
            {(['both', 'ta', 'en'] as LangMode[]).map((l) => (
              <Chip key={l} active={lang === l} onClick={() => { setLang(l); void setSetting('lang', l); }}>{l === 'both' ? 'தமிழ் + English' : l === 'ta' ? 'தமிழ்' : 'English'}</Chip>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>திருக்குறள் தமிழ் உரை (offline)</span>
          {urai ? <span className="text-teal-700 dark:text-teal-300">✓ தயார்</span> : <Button variant="secondary" className="text-sm" onClick={() => void fetchUrai().then(setUrai)}>பதிவிறக்கு</Button>}
        </div>
        {msg && <p className="text-sm text-teal-800 dark:text-teal-200">{msg}</p>}
      </Card>

      <Card className="space-y-3">
        <div className="font-semibold">காப்புப் பிரதி · Backup</div>
        <T v={{ ta: 'ஒவ்வொரு அமர்வுக்குப் பிறகும் Documents/MissionGOV-இல் தானாகச் சேமிக்கப்படும்.', en: 'Saved automatically to Documents/MissionGOV after each session.' }} className="text-xs text-slate-500" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void doExport()}>ஏற்றுமதி · Export</Button>
          <label className="grid min-h-12 cursor-pointer place-items-center rounded-2xl bg-white px-5 py-3 font-semibold text-teal-800 ring-1 ring-teal-700/30 dark:bg-slate-800 dark:text-teal-200">
            இறக்குமதி · Import
            <input type="file" accept="application/json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
          </label>
        </div>
      </Card>

      <p className="pb-4 text-center text-xs text-slate-500">
        Mission GOV · TNPSC Group 4 (Notification 11/2026) · Thirukkural: tk120404/thirukkural (Apache-2.0), G.U. Pope · Past papers: tnpsc.gov.in
      </p>
    </Screen>
  );
}
