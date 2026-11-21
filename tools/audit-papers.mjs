// Audit extracted past papers: counts, part/qNo consistency, duplicates, empty options, letter references.
// Usage: node tools/audit-papers.mjs [--fix]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const FIX = process.argv.includes('--fix');
const L = ['A', 'B', 'C', 'D'];
// Question-number ranges per part, from the booklets.
const RANGES = {
  'G4-2025': { A: [1, 100], B: [101, 175], C: [176, 200] },
  'G4-2024': { A: [1, 100], B: [101, 175], C: [176, 200] },
  'G4-2022': { A: [1, 100], B: [101, 175], C: [176, 200] },
};
const txt = (b) => (typeof b === 'string' ? b : `${b?.ta ?? ''}${b?.en ?? ''}`).trim();

for (const f of readdirSync('content/questions').filter((x) => x.endsWith('.json')).sort()) {
  const path = `content/questions/${f}`;
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const qs = doc.questions;
  const issues = [];
  const seen = new Map();
  for (const q of qs) seen.set(q.qNo, (seen.get(q.qNo) ?? 0) + 1);
  const dups = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
  if (dups.length) issues.push(`duplicate qNo: ${dups.join(',')}`);
  const range = RANGES[doc.exam];
  let fixedPart = 0;
  for (const q of qs) {
    if (range) {
      const want = Object.entries(range).find(([, [a, b]]) => q.qNo >= a && q.qNo <= b)?.[0];
      if (want && q.part !== want) {
        issues.push(`Q${q.qNo} part ${q.part}→${want}`);
        if (FIX) {
          q.part = want;
          if (q.unit[0] !== want) q.unit = want === 'C' ? (/series|puzzle|dice|alpha|reason|visual|direction|logic/i.test(q.topic) ? 'C2' : 'C1') : want === 'B' ? 'B6' : 'A1';
          fixedPart++;
        }
      }
    }
    const opts = L.map((l) => txt(q.options?.[l]));
    if (opts.some((o) => !o)) issues.push(`Q${q.qNo} empty option`);
    if (new Set(opts).size < 4) issues.push(`Q${q.qNo} repeated options`);
    if (!txt(q.stem)) issues.push(`Q${q.qNo} empty stem`);
    if (!L.includes(q.answer)) issues.push(`Q${q.qNo} bad answer`);
  }
  const byPart = Object.fromEntries(['A', 'B', 'C'].map((p) => [p, qs.filter((q) => q.part === p).length]));
  const missing = [];
  const max = Math.max(...qs.map((q) => q.qNo));
  for (let i = 1; i <= max; i++) if (!seen.has(i)) missing.push(i);
  const keys = qs.reduce((m, q) => ((m[q.keySource] = (m[q.keySource] ?? 0) + 1), m), {});
  console.log(`\n${f}: ${qs.length} Qs (A ${byPart.A}, B ${byPart.B}, C ${byPart.C}) max Q${max}; keys ${JSON.stringify(keys)}; deleted ${qs.filter((q) => q.deleted).length}`);
  if (missing.length) console.log(`  missing (${missing.length}): ${missing.slice(0, 40).join(',')}${missing.length > 40 ? '…' : ''}`);
  if (issues.length) console.log(`  issues (${issues.length}): ${issues.slice(0, 25).join(' | ')}${issues.length > 25 ? ' …' : ''}`);
  if (FIX && fixedPart) {
    if (dups.length) doc.questions = [...new Map(qs.map((q) => [q.qNo, q])).values()];
    writeFileSync(path, JSON.stringify(doc, null, 1) + '\n');
    console.log(`  fixed ${fixedPart} part labels`);
  }
}
