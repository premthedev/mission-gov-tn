import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { UNIT_LABEL, caQuestions, lessons, papers, pyq } from '../data/content';
import { db, getSetting, setSetting } from '../data/db';
import { kuralsLearned, streak, studiedMinutes, unitAccuracy, xpTotal } from '../data/progress';
import { syncContent } from '../data/sync';
import { fetchUrai, uraiReady } from '../data/urai';
import { level, projected } from '../engine/xp';
import { exportBackup, importBackup, isNative, scheduleReminders } from '../native';
import { setSoundPref } from './feedback';
import { Bar, Button, Card, Chip, Screen, T, type LangMode } from './kit';

export function Progress({ lang, setLang }: { lang: LangMode; setLang: (l: LangMode) => void }) {
  const data = useLiveQuery(async () => {
    const acc = await unitAccuracy();
    return {
      mins: await studiedMinutes(),
      streak: await streak(),
      kurals: await kuralsLearned(),
      lessons: await db.lessonsDone.count(),
      reviews: await db.reviews.count(),
      mocks: await db.mocks.orderBy('id').reverse().toArray(),
      xp: await xpTotal(),
      proj: projected(acc),
      attempts: [...acc.values()].reduce((t, v) => t + v.t, 0),
    };
  }, []);
  const [time, setTime] = useState('20:15');
  const [sound, setSound] = useState(true);
  const [msg, setMsg] = useState('');
  const [urai, setUrai] = useState<boolean | null>(null);

  useEffect(() => {
    void getSetting('reminderTime', '20:15').then(setTime);
    void getSetting('sound', true).then(setSound);
    void uraiReady().then(setUrai);
  }, []);

  const saveTime = async (t: string) => {
    setTime(t);
    await setSetting('reminderTime', t);
    const ok = await scheduleReminders(t);
    setMsg(ok ? `நினைவூட்டல் தினமும் ${t}` : isNative ? 'அறிவிப்பு அனுமதி தேவை: Settings → Apps → Mission GOV → Notifications' : 'நினைவூட்டல் Android ஆப்பில் மட்டும்.');
  };
  const sync = async () => {
    setMsg('புதிய உள்ளடக்கம் தேடுகிறது…');
    const r = await syncContent(true);
    setMsg(r.ok ? (r.updated ? `${r.updated} கோப்புகள் புதுப்பிக்கப்பட்டன ✓` : 'எல்லாம் புதுப்பித்த நிலையில் ✓') : `இணையம் இல்லை (${r.error})`);
  };
  const doImport = (file?: File) => {
    if (!file) return;
    file.text().then(importBackup).then(() => setMsg('மீட்டெடுக்கப்பட்டது ✓')).catch((e: Error) => setMsg(e.message));
  };

  if (!data) return null;
  const lv = level(data.xp);
  const weakest = [...data.proj.byUnit].filter((u) => u.attempts >= 5).sort((a, b) => a.acc - b.acc).slice(0, 3);

  return (
    <Screen className="space-y-4">
      <h1 className="text-2xl font-bold">முன்னேற்றம்</h1>

      <Card className="space-y-2 bg-gradient-to-br from-indigo-600 to-indigo-900 text-white ring-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-100">இன்று தேர்வு எழுதினால் (கணிப்பு)</div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">{data.proj.correct}</span>
          <span className="text-indigo-100">/ 200 சரி · {data.proj.marks}/300 மதிப்பெண்</span>
        </div>
        <Bar value={data.proj.correct} max={120} className="bg-white/20" />
        <div className="text-sm text-indigo-100">இலக்கு 120 சரி (180 மதிப்பெண்). {data.attempts < 100 ? 'இன்னும் சில நாள் பயிற்சிக்குப் பிறகு கணிப்பு துல்லியமாகும்.' : ''}</div>
      </Card>

      {weakest.length > 0 && (
        <Card className="space-y-2">
          <div className="font-semibold">அதிக கவனம் தேவை</div>
          {weakest.map((u) => (
            <div key={u.unit} className="flex justify-between text-sm"><T v={UNIT_LABEL[u.unit]} inline /><span className="font-semibold text-rose-600">{Math.round(u.acc * 100)}%</span></div>
          ))}
        </Card>
      )}

      <Card className="grid grid-cols-4 gap-2 text-center text-xs text-slate-500">
        <div><div className="text-lg font-bold text-slate-900 dark:text-white">{(data.mins / 60).toFixed(1)}</div>/83 மணி</div>
        <div><div className="text-lg font-bold text-slate-900 dark:text-white">🔥{data.streak}</div>தொடர்</div>
        <div><div className="text-lg font-bold text-slate-900 dark:text-white">{data.kurals}</div>/200 குறள்</div>
        <div><div className="text-lg font-bold text-slate-900 dark:text-white">{data.lessons}</div>/{lessons().length} பாடம்</div>
      </Card>

      <Card className="space-y-2">
        <div className="flex justify-between text-sm"><span className="font-semibold">நிலை {lv.n} · {lv.title}</span><span className="text-slate-500">⭐ {data.xp} XP</span></div>
        <Bar value={lv.into} max={lv.need} />
      </Card>

      <Card className="space-y-2">
        <div className="font-semibold">அலகு வாரியாக</div>
        {data.proj.byUnit.map((u) => (
          <div key={u.unit} className="space-y-0.5">
            <div className="flex justify-between text-xs"><T v={UNIT_LABEL[u.unit]} inline /><span className="text-slate-500">{u.attempts ? `${Math.round(u.acc * 100)}% · ${u.attempts} முயற்சி` : '—'}</span></div>
            <Bar value={u.attempts ? u.acc * 100 : 0} max={100} />
          </div>
        ))}
      </Card>

      {data.mocks.length > 0 && (
        <Card className="space-y-2">
          <div className="font-semibold">மாதிரித் தேர்வுகள்</div>
          {data.mocks.map((m) => (
            <div key={m.id} className="flex justify-between text-sm">
              <span>{m.date} · {m.blueprint}</span>
              <span className="font-semibold">{m.result.total.toFixed(1)}/{m.result.maxMarks} {m.result.gatePassed ? '' : '⚠'}</span>
            </div>
          ))}
        </Card>
      )}

      <Card className="space-y-3">
        <div className="font-semibold">உள்ளடக்கம்</div>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          பழைய வினாக்கள் {pyq().length} · நடப்பு நிகழ்வு {caQuestions().length} · பாடங்கள் {lessons().length}
          <div className="text-xs text-slate-500">{papers().map((p) => `${p.year}: ${p.count}`).join(' · ')}</div>
        </div>
        <Button variant="secondary" onClick={() => void sync()} className="w-full">🔄 இப்போதே புதுப்பி</Button>
      </Card>

      <Card className="space-y-3">
        <div className="font-semibold">அமைப்புகள்</div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>தினசரி நினைவூட்டல்</span>
          <input type="time" value={time} onChange={(e) => void saveTime(e.target.value)} className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-slate-700" />
        </label>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>ஒலி</span>
          <Chip active={sound} onClick={() => { setSound(!sound); setSoundPref(!sound); void setSetting('sound', !sound); }}>{sound ? '🔊 ஆன்' : '🔇 ஆஃப்'}</Chip>
        </div>
        <div className="space-y-1 text-sm">
          <div>மொழி</div>
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
        <div className="font-semibold">காப்புப் பிரதி</div>
        <p className="text-xs text-slate-500">ஒவ்வொரு அமர்வுக்குப் பிறகும் Documents/MissionGOV-இல் தானாகச் சேமிக்கப்படும்.</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void exportBackup().then((p) => setMsg(`சேமிக்கப்பட்டது: ${p}`))}>ஏற்றுமதி</Button>
          <label className="grid min-h-12 cursor-pointer place-items-center rounded-2xl bg-white px-5 py-3 font-semibold text-teal-800 ring-1 ring-teal-700/30 dark:bg-slate-800 dark:text-teal-200">
            இறக்குமதி
            <input type="file" accept="application/json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
          </label>
        </div>
      </Card>

      <p className="pb-4 text-center text-xs text-slate-500">Mission GOV · TNPSC Group 4 (11/2026) · Kural: tk120404/thirukkural (Apache-2.0) · Papers: tnpsc.gov.in</p>
    </Screen>
  );
}
