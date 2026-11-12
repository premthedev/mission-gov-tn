// Minimal Gemini REST client used by the GitHub Actions content jobs (Node 22, no dependencies).
// The key comes from the GEMINI_API_KEY secret and is never written to the repo or the app.
import { existsSync, readFileSync } from 'node:fs';

const API = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Local runs: read KEY=value lines from the git-ignored .env file in the project root.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function apiKey() {
  const k = process.env.GEMINI_API_KEY;
  if (!k || /paste|your[-_ ]?key/i.test(k)) {
    console.log('::notice::GEMINI_API_KEY is not set; skipping. Add it under Settings → Secrets → Actions.');
    process.exit(0);
  }
  return k;
}

const version = (name) => (name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0').split('.').map(Number);
const newer = (a, b) => {
  const [x, y] = [version(a), version(b)];
  return (x[0] - y[0]) || ((x[1] ?? 0) - (y[1] ?? 0));
};

/** Use GEMINI_MODEL if set; otherwise the newest stable Flash-Lite (largest free daily quota). */
export async function pickModel(key, prefer = 'flash-lite') {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  const res = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key } });
  if (!res.ok) throw new Error(`ListModels HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { models = [] } = await res.json();
  const ok = models
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''))
    .filter((n) => /^gemini-\d/.test(n) && !/(preview|exp|tts|image|live|audio|embedding|thinking|latest)/.test(n));
  const want = prefer === 'flash-lite' ? ok.filter((n) => /-flash-lite$/.test(n)) : ok.filter((n) => /-flash$/.test(n));
  const pool = want.length ? want : ok.filter((n) => /flash/.test(n));
  if (!pool.length) throw new Error(`No usable Gemini model found among: ${ok.join(', ')}`);
  return pool.sort((a, b) => newer(b, a))[0];
}

function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(t);
}

/** One generateContent call returning parsed JSON. Retries on rate limits and transient errors. */
export async function generateJson(key, model, parts, { temperature = 0.2, maxRetries = 6 } = {}) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature, responseMimeType: 'application/json' },
  };
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought && p.text).map((p) => p.text).join('');
      if (!text) throw new Error(`Empty response (finishReason=${data.candidates?.[0]?.finishReason})`);
      return parseJson(text);
    }
    const retryable = res.status === 429 || res.status >= 500;
    const detail = (await res.text()).slice(0, 300);
    if (!retryable || attempt >= maxRetries) throw new Error(`Gemini HTTP ${res.status}: ${detail}`);
    if (res.status === 429 && /per day|PerDay|daily/i.test(detail)) throw new Error(`Daily quota reached: ${detail}`);
    const wait = Math.min(90_000, 5_000 * 2 ** attempt);
    console.log(`Gemini ${res.status}; retrying in ${wait / 1000}s`);
    await sleep(wait);
  }
}

export { sleep };
