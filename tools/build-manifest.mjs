// Writes content/manifest.json: every content file with a short content hash.
// The app compares these hashes with what it already has and downloads only changed files.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'content';
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.json') && name !== 'manifest.json' && !name.startsWith('seen')) files.push(p);
  }
}
walk(ROOT);
const entries = files
  .map((p) => {
    const text = readFileSync(p, 'utf8');
    JSON.parse(text); // fail the build on invalid JSON
    const normalized = text.replace(/\r\n/g, '\n');
    return { path: relative(ROOT, p).split('\\').join('/'), sha: createHash('sha1').update(normalized).digest('hex').slice(0, 12) };
  })
  .sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), files: entries }, null, 1) + '\n');
console.log(`manifest: ${entries.length} files`);
