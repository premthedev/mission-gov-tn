import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Haptics } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { db } from './data/db';
import { SPECIAL_DATES } from './data/schedule';
import { parseISO, todayISO } from './lib/date';

export const isNative = Capacitor.isNativePlatform();

export async function buzz(): Promise<void> {
  try {
    if (isNative) await Haptics.vibrate({ duration: 400 });
    else navigator.vibrate?.(300);
  } catch {
    /* vibration is optional */
  }
}

/** Daily study reminder plus specific nudges before diagnostic/mock/exam days. */
export async function scheduleReminders(time: string): Promise<boolean> {
  if (!isNative) return false;
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return false;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });

  const [hour, minute] = time.split(':').map(Number);
  const notifications = [
    {
      id: 1,
      title: 'Mission GOV',
      body: 'இன்றைய படிப்பு காத்திருக்கிறது. Today\'s session is waiting.',
      schedule: { on: { hour, minute }, allowWhileIdle: true },
    },
  ];
  let id = 100;
  const now = Date.now();
  for (const [date, type] of Object.entries(SPECIAL_DATES)) {
    if (type !== 'FULL_MOCK' && type !== 'DIAGNOSTIC' && type !== 'EXAM_DAY' && type !== 'SECTIONAL_BIG') continue;
    const eve = parseISO(date);
    eve.setDate(eve.getDate() - 1);
    eve.setHours(20, 30, 0, 0);
    if (eve.getTime() > now) {
      notifications.push({
        id: id++,
        title: type === 'EXAM_DAY' ? 'நாளை தேர்வு · Exam tomorrow' : 'நாளை தேர்வு நாள் · Test tomorrow',
        body: type === 'FULL_MOCK' ? 'நாளை காலை 9:30 முழு மாதிரித் தேர்வு (3 மணி நேரம்). Full mock at 9:30 AM.' : 'ஆப்பைத் திறந்து சரிபார்ப்புப் பட்டியலைப் பாருங்கள். Open the app for the checklist.',
        schedule: { at: eve, allowWhileIdle: true } as never,
      });
    }
    if (type === 'FULL_MOCK') {
      const morning = parseISO(date);
      morning.setHours(9, 0, 0, 0);
      if (morning.getTime() > now) {
        notifications.push({ id: id++, title: 'மாதிரித் தேர்வு 9:30', body: '30 நிமிடத்தில் தொடங்குகிறது. Starts in 30 minutes.', schedule: { at: morning, allowWhileIdle: true } as never });
      }
    }
  }
  await LocalNotifications.schedule({ notifications });
  return true;
}

export async function exportBackup(): Promise<string> {
  const data = {
    app: 'mission-gov',
    version: 1,
    exportedAt: new Date().toISOString(),
    tables: Object.fromEntries(await Promise.all(db.tables.map(async (t) => [t.name, await t.toArray()] as const))),
  };
  const json = JSON.stringify(data);
  const name = `mission-gov-backup-${todayISO()}.json`;
  if (isNative) {
    await Filesystem.writeFile({ path: `MissionGOV/${name}`, data: json, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
    return `Documents/MissionGOV/${name}`;
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  return name;
}

export async function importBackup(json: string): Promise<void> {
  const data = JSON.parse(json) as { app?: string; tables?: Record<string, unknown[]> };
  if (data.app !== 'mission-gov' || !data.tables) throw new Error('Not a Mission GOV backup file');
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) {
      const rows = data.tables?.[t.name];
      if (!rows) continue;
      await t.clear();
      await t.bulkPut(rows as never[]);
    }
  });
}

/** Quiet daily backup on the phone after a session is completed. */
export async function autoBackup(): Promise<void> {
  if (!isNative) return;
  try {
    await exportBackup();
  } catch {
    /* storage may be unavailable; manual export still works */
  }
}
