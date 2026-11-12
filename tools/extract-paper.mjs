// Past-paper extraction job (GitHub Actions). Usage: node tools/extract-paper.mjs <exam|next> [maxPages]
// Reads page images rendered by tools/render_pdf_pages.py, asks Gemini (vision) to transcribe every question
// with the ticked tentative answer, validates, merges into content/questions/pyq-<exam>.json.
// Questions already in the file (e.g. hand-checked ones) are never overwritten.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { apiKey, generateJson, pickModel, sleep } from './gemini.mjs';

const papers = JSON.parse(readFileSync('tools/papers.json', 'utf8'));
const fileFor = (exam) => `content/questions/pyq-${exam.toLowerCase()}.json`;
const EXPECTED = (p) => p.expected ?? (/-(GS|GT)$/.test(p.exam) ? 100 : 200);

function pickExam(arg) {
  if (arg && arg !== 'next') return papers.papers.find((p) => p.exam === arg) ?? (() => { throw new Error(`unknown exam ${arg}`); })();
  for (const p of papers.papers) {
    const f = fileFor(p.exam);
    const have = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')).questions.length : 0;
    if (have < EXPECTED(p) * 0.9) return p;
  }
  return null;
}

const UNITS = `Part A (Tamil only): A1 grammar (letters, sandhi, word forms), A2 vocabulary (opposites, one-letter words, meanings, town-name short forms, spoken→written), A3 writing skills (sentence order, voice, traditional usage/marabu, punctuation), A4 technical terms, A5 reading comprehension/idioms/proverbs, A6 translation, A7 literature & Tamil scholars & Thirukkural.
Part B (General Studies, printed in English and Tamil): B1 general science, B2 geography, B3 Indian history & national movement, B4 Indian polity, B5 Indian economy & TN development administration, B6 TN history, culture, heritage & socio-political movements.
Part C (Aptitude & mental ability): C1 aptitude (simplification, percentage, HCF/LCM, ratio, SI/CI, area, volume, time & work), C2 reasoning (series, puzzles, dice, alpha-numeric, visual).
Old papers (before 2022) may have "General Tamil" or "General Studies" booklets: map each question to the closest unit above.`;

const PROMPT = (p, page) => `You are transcribing an official TNPSC ${p.title} question booklet (scanned page ${page}). The page may be rotated; read it correctly.
A hand-drawn tick mark next to one option letter (A–D) marks the tentative answer.
Transcribe EVERY question that STARTS on the FIRST image. The SECOND image (if given) is the next page: use it only to complete a question that continues there.
Copy text exactly as printed, in proper Unicode Tamil and English. Do not translate, summarise or fix the questions. Skip option (E) "Answer not known".
For bilingual questions give both languages; for Tamil-only give "en": "".

${UNITS}

Return JSON: {"questions":[{"qNo":int,"part":"A|B|C","unit":"A1..C2","topic":"short-english-slug","format":"ONE_LINER|STATEMENT|ASSERTION_REASON|MATCH|CHRONOLOGY|PASSAGE|FILL_BLANK",
"stem":{"ta":"","en":""},"statements":[{"ta":"","en":""}],"matchLeft":[{"ta":"","en":""}],"matchRight":[{"ta":"","en":""}],
"options":{"A":{"ta":"","en":""},"B":{"ta":"","en":""},"C":{"ta":"","en":""},"D":{"ta":"","en":""}},
"ticked":"A|B|C|D|null","explain":{"ta":"one or two Tamil sentences explaining why the ticked option is right, or empty if unsure","en":""}}]}
For match questions, the options are the code rows like "3 1 4 2". For assertion/reason, put each statement in "statements". If a page has no questions (cover, instructions, blank), return {"questions":[]}.`;

const KEY_PROMPT = `This is an official TNPSC final answer key table (may be rotated). Read every question number and its answer letter.
If a cell shows two letters like "B/C" return both; if it shows "ALL", "Deleted", "*" or similar, return "DELETED".
Return JSON: {"answers":{"1":"A","2":"B/C","3":"DELETED",...}}. Only include numbers you can actually read.`;

const L = ['A', 'B', 'C', 'D'];
const bi = (x) => ({ ta: (x?.ta ?? '').trim(), en: (x?.en ?? '').trim() });
const has = (x) => !!(x && (x.ta || x.en));

function normalise(q, p) {
  if (!Number.isInteger(q?.qNo) || !/^[ABC]$/.test(q.part) || !/^[ABC][1-7]$/.test(q.unit) || q.unit[0] !== q.part) return null;
  const options = Object.fromEntries(L.map((l) => [l, bi(q.options?.[l])]));
  if (!L.every((l) => has(options[l]))) return null;
  if (!L.includes(q.ticked)) return null;
  const out = {
    qNo: q.qNo, part: q.part, unit: q.unit, topic: (q.topic || 'general').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40),
    format: q.format || 'ONE_LINER', stem: bi(q.stem), options, answer: q.ticked, keySource: 'TENTATIVE_TICK', era: p.era, ai: true,
  };
  if (!has(out.stem)) return null;
  if (q.statements?.length) out.statements = q.statements.map(bi).filter(has);
  if (q.matchLeft?.length && q.matchRight?.length) out.matchTable = { left: q.matchLeft.map(bi), right: q.matchRight.map(bi) };
  if (has(q.explain)) out.explain = bi(q.explain);
  return out;
}

async function main() {
  const p = pickExam(process.argv[2]);
  if (!p) return console.log('All papers extracted.');
  const maxPages = Number(process.argv[3] || 140);
  const key = apiKey();
  const model = await pickModel(key, process.env.EXTRACT_PREFER || 'flash-lite');
  console.log(`exam ${p.exam}, model ${model}`);

  execFileSync('python', ['tools/render_pdf_pages.py', p.exam], { stdio: 'inherit' });
  const dir = `tools/work/pages/${p.exam}`;
  const pages = readdirSync(dir).filter((f) => /^p\d{3}\.jpg$/.test(f)).sort();
  const img = (f) => ({ inline_data: { mime_type: 'image/jpeg', data: readFileSync(`${dir}/${f}`).toString('base64') } });

  const file = fileFor(p.exam);
  const doc = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { exam: p.exam, year: p.year, title: p.title, url: papers.base + p.booklet, questions: [] };
  const byNo = new Map(doc.questions.map((q) => [q.qNo, q]));
  const delay = Number(process.env.GEMINI_DELAY_MS || 7000);
  let calls = 0;

  for (let i = 0; i < pages.length && calls < maxPages; i++) {
    const parts = [{ text: PROMPT(p, i + 1) }, img(pages[i])];
    if (pages[i + 1]) parts.push(img(pages[i + 1]));
    try {
      const out = await generateJson(key, model, parts, { temperature: 0 });
      calls++;
      let added = 0;
      for (const raw of out.questions ?? []) {
        const q = normalise(raw, p);
        if (q && !byNo.has(q.qNo)) {
          byNo.set(q.qNo, q);
          added++;
        }
      }
      console.log(`${pages[i]}: +${added} (total ${byNo.size})`);
    } catch (e) {
      console.log(`${pages[i]}: ${e.message}`);
      if (/Daily quota/.test(e.message)) break;
    }
    await sleep(delay);
  }

  if (p.finalKey && p.finalKeyReadable !== false) {
    try {
      execFileSync('python', ['tools/render_pdf_pages.py', p.exam, 'key'], { stdio: 'inherit' });
      const kdir = `tools/work/pages/${p.exam}-key`;
      const answers = {};
      for (const f of readdirSync(kdir).filter((x) => x.endsWith('.jpg')).sort()) {
        const out = await generateJson(key, model, [{ text: KEY_PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: readFileSync(`${kdir}/${f}`).toString('base64') } }], { temperature: 0 });
        Object.assign(answers, out.answers ?? {});
        await sleep(delay);
      }
      let changed = 0;
      for (const q of byNo.values()) {
        const a = answers[String(q.qNo)];
        if (!a || q.keySource === 'FINAL_KEY') continue;
        if (a === 'DELETED') q.deleted = true;
        else {
          const letters = a.split('/').filter((x) => L.includes(x));
          if (!letters.length) continue;
          if (letters[0] !== q.answer) {
            q.keyChanged = true;
            changed++;
          }
          q.answer = letters[0];
          if (letters.length > 1) q.acceptedAnswers = letters;
          q.keySource = 'FINAL_KEY';
        }
      }
      console.log(`final key: ${Object.keys(answers).length} answers read, ${changed} differ from ticks`);
    } catch (e) {
      console.log(`final key skipped: ${e.message}`);
    }
  }

  doc.questions = [...byNo.values()].sort((a, b) => a.qNo - b.qNo);
  doc.extraction = `${doc.questions.filter((q) => q.ai).length} questions AI-extracted with ${model} on ${new Date().toISOString().slice(0, 10)}; others checked by hand.`;
  writeFileSync(file, JSON.stringify(doc, null, 1) + '\n');
  console.log(`wrote ${file}: ${doc.questions.length} questions`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
