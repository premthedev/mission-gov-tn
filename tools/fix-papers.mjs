// Repairs extracted past papers in place:
//  1. Part labels: in combined booklets (2022+) Q1–100 are Part A (Tamil); Q101–200 are Part B (GS) or
//     Part C (aptitude), and literature/Thirukkural questions there belong to GS Unit VI.
//  2. LaTeX left by the vision model ($\frac{1}{3}$ …) is turned into plain text.
// Usage: node tools/fix-papers.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cleanMath } from './clean-math.mjs';

const COMBINED = new Set(['G4-2022', 'G4-2024', 'G4-2025']);
const PASSAGE = /passage|compre|reading|spa|geograph|tourism|falls|news/i;

function cleanDeep(v) {
  if (typeof v === 'string') return cleanMath(v);
  if (Array.isArray(v)) return v.map(cleanDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleanDeep(x)]));
  return v;
}

for (const f of readdirSync('content/questions').filter((x) => x.endsWith('.json'))) {
  const path = `content/questions/${f}`;
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  let parts = 0;
  let maths = 0;
  doc.questions = doc.questions.map((q0) => {
    const before = JSON.stringify(q0);
    const q = { ...q0, ...cleanDeep({ stem: q0.stem, statements: q0.statements, matchTable: q0.matchTable, options: q0.options, explain: q0.explain }) };
    for (const k of ['statements', 'matchTable', 'explain']) if (q[k] === undefined) delete q[k];
    if (JSON.stringify(q) !== before) maths++;
    const old = `${q.part}/${q.unit}`;
    const tamilBooklet = /-GT$/.test(doc.exam);
    const gsBooklet = /-GS$/.test(doc.exam);
    if ((COMBINED.has(doc.exam) && q.qNo <= 100) || tamilBooklet) {
      q.part = 'A';
      if (q.unit[0] !== 'A') q.unit = PASSAGE.test(q.topic) || q.passageId ? 'A5' : 'A7';
    } else if (COMBINED.has(doc.exam) || gsBooklet) {
      if (q.unit[0] === 'A') q.unit = 'B6';
      q.part = q.unit[0];
    }
    if (`${q.part}/${q.unit}` !== old) parts++;
    return q;
  });
  writeFileSync(path, JSON.stringify(doc, null, 1) + '\n');
  console.log(`${f}: ${parts} part/unit fixes, ${maths} questions cleaned`);
}
