import bundledManifest from '../../content/manifest.json';
import { CONTENT_BASE, SYNC_EVERY_MS } from '../config';
import { applyRemote } from './content';
import { db, getSetting, setSetting } from './db';

interface Manifest {
  generatedAt: string;
  files: { path: string; sha: string }[];
}

const bundledSha = new Map((bundledManifest as Manifest).files.map((f) => [f.path, f.sha]));
/** When the content inside this APK was generated. Downloads older than this are stale. */
const bundledAt = Date.parse((bundledManifest as Manifest).generatedAt) || 0;
const SYNCABLE = /^(lessons|questions|decks|feed|cheats|explain)\/[\w.-]+\.json$|^curriculum\.json$/;

/**
 * Apply previously downloaded files (offline, at start-up). A downloaded file is used only if it
 * differs from the bundled copy and is newer than this build; stale copies (e.g. from before an
 * APK update) are deleted so they can never hide newer bundled content.
 */
export async function loadDownloaded(): Promise<void> {
  const rows = await db.remoteFiles.toArray();
  const fresh = rows.filter((r) => bundledSha.get(r.path) !== r.sha && (r.gen ?? r.at) > bundledAt);
  const stale = rows.filter((r) => !fresh.includes(r));
  if (stale.length) await db.remoteFiles.bulkDelete(stale.map((r) => r.path));
  const files = Object.fromEntries(fresh.map((r) => [r.path, r.data]));
  if (Object.keys(files).length) applyRemote(files);
}

export interface SyncResult {
  ok: boolean;
  updated: number;
  newQuestions: number;
  error?: string;
}

/**
 * Download new or changed content files listed in content/manifest.json on GitHub.
 * Runs at most every few hours unless forced. Safe to call while offline.
 */
export async function syncContent(force = false): Promise<SyncResult> {
  const last = await getSetting<number>('lastSync', 0);
  if (!force && Date.now() - last < SYNC_EVERY_MS) return { ok: true, updated: 0, newQuestions: 0 };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, updated: 0, newQuestions: 0, error: 'offline' };
  try {
    const res = await fetch(`${CONTENT_BASE}manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
    const manifest = (await res.json()) as Manifest;
    const gen = Date.parse(manifest.generatedAt) || Date.now();
    await setSetting('lastSync', Date.now());
    if (gen <= bundledAt) return { ok: true, updated: 0, newQuestions: 0 }; // GitHub copy is not newer than this APK
    const have = new Map((await db.remoteFiles.toArray()).map((r) => [r.path, r.sha]));
    const todo = manifest.files.filter((f) => SYNCABLE.test(f.path) && f.sha !== (have.get(f.path) ?? bundledSha.get(f.path)));
    let newQuestions = 0;
    for (const f of todo) {
      const r = await fetch(`${CONTENT_BASE}${f.path}?v=${f.sha}`);
      if (!r.ok) continue;
      const data = await r.json();
      const count = Array.isArray((data as { questions?: unknown[] }).questions) ? (data as { questions: unknown[] }).questions.length : 0;
      newQuestions += count;
      await db.remoteFiles.put({ path: f.path, sha: f.sha, data, at: Date.now(), gen });
    }
    if (todo.length) await loadDownloaded();
    return { ok: true, updated: todo.length, newQuestions };
  } catch (e) {
    return { ok: false, updated: 0, newQuestions: 0, error: (e as Error).message };
  }
}
