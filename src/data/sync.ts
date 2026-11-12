import bundledManifest from '../../content/manifest.json';
import { CONTENT_BASE, SYNC_EVERY_MS } from '../config';
import { applyRemote } from './content';
import { db, getSetting, setSetting } from './db';

interface Manifest {
  generatedAt: string;
  files: { path: string; sha: string }[];
}

const bundledSha = new Map((bundledManifest as Manifest).files.map((f) => [f.path, f.sha]));
const SYNCABLE = /^(lessons|questions|decks|feed)\/[\w.-]+\.json$|^curriculum\.json$/;

/** Apply previously downloaded files (offline, at start-up). */
export async function loadDownloaded(): Promise<void> {
  const rows = await db.remoteFiles.toArray();
  const files = Object.fromEntries(rows.filter((r) => bundledSha.get(r.path) !== r.sha).map((r) => [r.path, r.data]));
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
    const have = new Map((await db.remoteFiles.toArray()).map((r) => [r.path, r.sha]));
    const todo = manifest.files.filter((f) => SYNCABLE.test(f.path) && f.sha !== (have.get(f.path) ?? bundledSha.get(f.path)));
    let newQuestions = 0;
    for (const f of todo) {
      const r = await fetch(`${CONTENT_BASE}${f.path}?v=${f.sha}`);
      if (!r.ok) continue;
      const data = await r.json();
      const count = Array.isArray((data as { questions?: unknown[] }).questions) ? (data as { questions: unknown[] }).questions.length : 0;
      newQuestions += count;
      await db.remoteFiles.put({ path: f.path, sha: f.sha, data, at: Date.now() });
    }
    await setSetting('lastSync', Date.now());
    if (todo.length) await loadDownloaded();
    return { ok: true, updated: todo.length, newQuestions };
  } catch (e) {
    return { ok: false, updated: 0, newQuestions: 0, error: (e as Error).message };
  }
}
