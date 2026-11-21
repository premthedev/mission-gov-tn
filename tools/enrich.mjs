// Adds teaching explanations to past-paper and lesson questions with Gemini:
// hint (before answering), why the official answer is right, why each other option is wrong,
// the rule to remember, one more example and an exam tip. Tamil first, short English alongside.
//
// The official TNPSC key is never changed: the model is told the answer and only explains it.
// Output goes to content/explain/<name>.json (keyed by the app's question id), so the daily
// paper-extraction job and this job never edit the same file.
//
// Usage: node tools/enrich.mjs [--max-batches N] [--parts A,C] [--only G4-2025] [--size 6]
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { apiKey, generateJson, pickModel, sleep } from './gemini.mjs';
import { cleanMath } from './clean-math.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const MAX_BATCHES = Number(arg('max-batches', '1000'));
const SIZE = Number(arg('size', '6'));
const ONLY = arg('only', '');
const PARTS = arg('parts', '').split(',').filter(Boolean);
const OUT = 'content/explain';
const L = ['A', 'B', 'C', 'D'];

const key = apiKey();
let model = await pickModel(key, process.env.ENRICH_PREFER || 'flash');
console.log(`model: ${model}`);

const t = (v) => (v == null ? '' : typeof v === 'string' ? v : [v.ta, v.en].filter(Boolean).join(' / '));
const ta = (v) => (v == null ? '' : typeof v === 'string' ? v : v.ta || v.en || '');

// ---------- cheat sheets used as the grammar reference ----------
function cheatsFor(unit) {
  if (!existsSync('content/cheats')) return '';
  const all = readdirSync('content/cheats').filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(`content/cheats/${f}`, 'utf8')));
  const mine = all.filter((c) => c.unit === unit);
  const text = mine.map((c) => [
    `## ${c.title}`,
    c.oneLine,
    ...(c.patterns ?? []).map((p) => `- ${p.see} → ${p.do}`),
    ...(c.blocks ?? []).map((b) => `${b.h}: ${b.body ?? ''}${b.table ? '\n' + b.table.map((r) => r.join(' | ')).join('\n') : ''}`),
    ...(c.traps ?? []).map((x) => `! ${x}`),
  ].join('\n')).join('\n\n');
  return text.slice(0, 14000);
}

// ---------- question sources ----------
function sources() {
  const out = [];
  for (const f of readdirSync('content/questions').filter((x) => x.endsWith('.json')).sort().reverse()) {
    const doc = JSON.parse(readFileSync(`content/questions/${f}`, 'utf8'));
    if (ONLY && doc.exam !== ONLY) continue;
    const passages = Object.fromEntries((doc.passages ?? []).map((p) => [p.id, ta(p.text)]));
    out.push({
      name: doc.exam,
      items: doc.questions.filter((q) => !q.deleted).map((q) => ({
        id: `pyq-${doc.exam}-q${String(q.qNo).padStart(3, '0')}`,
        part: q.part, unit: q.unit, topic: q.topic,
        stem: q.stem, statements: q.statements, matchTable: q.matchTable, options: q.options,
        answer: q.answer, accepted: q.acceptedAnswers, passage: q.passageId ? passages[q.passageId] : undefined,
        key: q.keySource, old: q.explain,
      })),
    });
  }
  if (!ONLY || ONLY === 'lessons') {
    const items = [];
    for (const f of readdirSync('content/lessons').filter((x) => x.endsWith('.json')).sort()) {
      for (const l of JSON.parse(readFileSync(`content/lessons/${f}`, 'utf8'))) {
        l.check.forEach((c, i) => items.push({
          id: `${l.id}-c${i + 1}`, part: l.unit[0], unit: l.unit, topic: l.topic,
          stem: c.stem, statements: c.statements, options: Object.fromEntries(L.map((x, j) => [x, c.options[j]])),
          answer: c.answer, key: 'LESSON', old: c.explain,
        }));
      }
    }
    out.push({ name: 'lessons', items });
  }
  return out;
}

function describe(q) {
  const lines = [`### id: ${q.id}`, `unit: ${q.unit} · topic: ${q.topic}`];
  if (q.passage) lines.push(`passage: ${q.passage.slice(0, 1500)}`);
  lines.push(`question: ${t(q.stem)}`);
  (q.statements ?? []).forEach((s, i) => lines.push(`  statement ${i + 1}: ${t(s)}`));
  if (q.matchTable) {
    q.matchTable.left.forEach((l, i) => lines.push(`  left ${i + 1}: ${t(l)}`));
    q.matchTable.right.forEach((r, i) => lines.push(`  right ${i + 1}: ${t(r)}`));
  }
  L.forEach((x) => lines.push(`  ${x}) ${t(q.options[x])}`));
  lines.push(`OFFICIAL ANSWER: ${q.answer}) ${t(q.options[q.answer])}${q.accepted?.length ? ` (also accepted: ${q.accepted.join(', ')})` : ''}`);
  if (q.old) lines.push(`existing short note: ${t(q.old)}`);
  return lines.join('\n');
}

const PROMPT = `You are the best TNPSC Group 4 tutor in Tamil Nadu. The learner studies in Tamil (Samacheer textbook Tamil).
For each question below the OFFICIAL ANSWER is given and is final. Teach it so the learner can solve any similar question.

Return a JSON array, one object per question, in the same order:
{
 "id": "<same id>",
 "hint": {"ta": "...", "en": "..."},      // shown BEFORE answering: how to attack THIS TYPE of question ("இப்படிக் கேட்டால் ... என்பதைப் பாருங்கள்"). Must NOT reveal the answer.
 "explain": {"ta": "...", "en": "..."},   // why the official answer is right: 2-4 short sentences with the key fact or rule applied to this question.
 "why": {"<letter>": {"ta": "...", "en": "..."}},  // for EVERY option except the official answer: one sentence on why it is wrong (what it really is / means / belongs to).
 "rule": {"ta": "...", "en": "..."},      // the general rule or fact to remember, one line.
 "eg": {"ta": "...", "en": "..."},        // one more short example of the same rule, or a closely related exam fact.
 "tip": {"ta": "...", "en": "..."},       // a memory trick or exam tip, one line.
 "doubt": false                            // true only if you are confident the official answer is wrong or the question is defective.
}

Rules:
- Tamil ("ta") is the main text: simple, correct Tamil in Tamil script. "en" is a short English gloss (one sentence).
- Inside the text NEVER refer to options by letter or position (no "A", "விடை B", "option C", "முதல் விடை"): the app shuffles options. Quote the option content instead.
- Never contradict the official answer. If it looks wrong, still explain the official answer ("TNPSC விடைக்குறிப்பின்படி ...") and set "doubt": true.
- Match questions: explain each correct pair. Statement questions: say which statements are true/false and why.
- Aptitude: show the working step by step with numbers; give the shortcut in "tip".
- Plain text only: no LaTeX, no markdown, no emoji. Use 3/4, ×, ÷, √, ².
- Be factually careful. Prefer facts from Samacheer Kalvi textbooks (6th-12th) and the reference notes below.`;

function clean(v) {
  if (typeof v === 'string') {
    return cleanMath(v)
      .replace(/\s*\((?:option\s*)?[A-D]\)\s*/gi, ' ')
      .replace(/\b(?:option|விடை)\s*[A-D]\b\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]));
  return v;
}

function valid(out, q) {
  if (!out || out.id !== q.id || !out.explain?.ta || !out.hint?.ta) return null;
  const why = {};
  for (const x of L) if (x !== q.answer && !(q.accepted ?? []).includes(x) && out.why?.[x]?.ta) why[x] = out.why[x];
  const pick = (b) => (b && (b.ta || b.en) ? { ta: b.ta, en: b.en } : undefined);
  return clean({
    hint: pick(out.hint), explain: pick(out.explain), why,
    rule: pick(out.rule), eg: pick(out.eg), tip: pick(out.tip),
    ...(out.doubt ? { doubt: true } : {}),
  });
}

// ---------- run ----------
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
let batches = 0;
let done = 0;
const order = (PARTS.length ? PARTS : ['A', 'C', 'B']);

outer: for (const pass of order) {
  for (const src of sources()) {
    const path = `${OUT}/${src.name.toLowerCase()}.json`;
    const file = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : { name: src.name, items: {} };
    const todo = src.items.filter((q) => q.part === pass && !file.items[q.id]);
    // Group by unit so each prompt carries the right reference notes.
    const byUnit = new Map();
    for (const q of todo) byUnit.set(q.unit, [...(byUnit.get(q.unit) ?? []), q]);
    for (const [unit, qs] of byUnit) {
      const notes = cheatsFor(unit);
      for (let i = 0; i < qs.length; i += SIZE) {
        if (batches >= MAX_BATCHES) break outer;
        const batch = qs.slice(i, i + SIZE);
        const text = `${PROMPT}\n\n${notes ? `Reference notes for this unit:\n${notes}\n\n` : ''}Questions:\n\n${batch.map(describe).join('\n\n')}`;
        let res;
        try {
          res = await generateJson(key, model, [{ text }], { temperature: 0.3 });
        } catch (e) {
          const msg = String(e.message);
          console.log(`batch failed (${src.name} ${unit}): ${msg.slice(0, 200)}`);
          if (/Daily quota/.test(msg) && !/lite/.test(model)) {
            model = await pickModel(key, 'flash-lite');
            console.log(`switching to ${model}`);
            i -= SIZE;
            continue;
          }
          if (/Daily quota/.test(msg)) break outer;
          continue;
        }
        batches++;
        const arr = Array.isArray(res) ? res : res.items ?? res.questions ?? [];
        let ok = 0;
        for (const q of batch) {
          const v = valid(arr.find((x) => x?.id === q.id), q);
          if (v) {
            file.items[q.id] = { ...v, model };
            ok++;
          }
        }
        done += ok;
        file.updated = new Date().toISOString().slice(0, 10);
        writeFileSync(path, JSON.stringify(file, null, 1) + '\n');
        console.log(`${src.name} ${unit}: +${ok}/${batch.length} (total ${Object.keys(file.items).length}) · batch ${batches}`);
        await sleep(4000);
      }
    }
  }
}
console.log(`done: ${done} questions explained in ${batches} calls`);
