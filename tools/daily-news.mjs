// Daily current-affairs job (GitHub Actions, ~06:00 IST):
// reads Tamil Nadu + national news feeds, asks Gemini for exam-style MCQs grounded ONLY in those items,
// validates them, and writes content/feed/ca-YYYY-MM-DD.json. The app downloads it on next open.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { apiKey, generateJson, pickModel } from './gemini.mjs';

const FEEDS = [
  { name: 'The Hindu · Tamil Nadu', url: 'https://www.thehindu.com/news/national/tamil-nadu/feeder/default.rss', take: 25 },
  { name: 'Google News · TN government', url: 'https://news.google.com/rss/search?q=%22Tamil+Nadu%22+government+scheme+OR+launched+OR+announced+when:2d&hl=en-IN&gl=IN&ceid=IN:en', take: 20 },
  { name: 'PIB · Government of India', url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', take: 15 },
  { name: 'Google News · India', url: 'https://news.google.com/rss/search?q=India+appointed+OR+award+OR+launched+OR+first+when:2d&hl=en-IN&gl=IN&ceid=IN:en', take: 15 },
];
const PER_DAY = Number(process.env.CA_PER_DAY || 12);
const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10); // IST date
const OUT = `content/feed/ca-${today}.json`;
const SEEN = 'content/feed/seen.json';

const decode = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const strip = (s) => decode(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (block, t) => strip(block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))?.[1] ?? '');

async function readFeed(f) {
  try {
    const res = await fetch(f.url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
        accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, f.take).map((m) => ({
      source: f.name,
      title: tag(m[1], 'title'),
      summary: tag(m[1], 'description').slice(0, 400),
      url: tag(m[1], 'link'),
      date: tag(m[1], 'pubDate'),
    })).filter((x) => x.title && x.url);
  } catch (e) {
    console.log(`feed failed: ${f.name}: ${e.message}`);
    return [];
  }
}

const PROMPT = `You write current-affairs multiple-choice questions for the TNPSC Group 4 exam (Tamil Nadu, SSLC level).
Use ONLY facts stated in the news items below. Never add facts from memory. If an item is crime, accident, court gossip, party politics or opinion, skip it.
Prefer: Tamil Nadu government schemes and their purpose/beneficiaries, budget numbers, appointments, awards, firsts, places in news, science & technology, sports, national schemes, international events involving India.
Write up to ${PER_DAY} questions. Each question must be answerable from exactly one item.

Return JSON: {"questions":[{"item":<item number>,"unit":"B1|B2|B3|B4|B5|B6","stem_ta":"Tamil question","stem_en":"English question","options_ta":["...","...","...","..."],"options_en":["...","...","...","..."],"answer":"A|B|C|D","explain_ta":"one short Tamil sentence quoting the fact","explain_en":"same in English"}]}
Units: B1 science/tech, B2 geography/environment, B3 India history/culture, B4 polity/governance/rights, B5 economy/schemes/development (incl. Tamil Nadu), B6 Tamil Nadu culture/heritage/society.
Rules: 4 distinct, plausible options of the same type (all people, all places, all numbers...). Tamil must be natural written Tamil; proper nouns may stay in English letters inside Tamil text. answer = letter of the correct option in both lists (same order).`;

function valid(q, items) {
  const L = ['A', 'B', 'C', 'D'];
  const ok = (a) => Array.isArray(a) && a.length === 4 && a.every((s) => typeof s === 'string' && s.trim()) && new Set(a.map((s) => s.trim())).size === 4;
  return q && Number.isInteger(q.item) && items[q.item - 1] && /^B[1-6]$/.test(q.unit) && q.stem_ta && q.stem_en && ok(q.options_ta) && ok(q.options_en) && L.includes(q.answer);
}

async function main() {
  if (existsSync(OUT) && !process.env.FORCE) {
    console.log(`${OUT} already exists`);
    return;
  }
  const key = process.env.DRY_RUN ? '' : apiKey();
  const seen = new Set(existsSync(SEEN) ? JSON.parse(readFileSync(SEEN, 'utf8')) : []);
  const all = (await Promise.all(FEEDS.map(readFeed))).flat();
  const items = [];
  const titles = new Set();
  for (const it of all) {
    const k = it.title.toLowerCase().slice(0, 60);
    if (seen.has(it.url) || titles.has(k)) continue;
    titles.add(k);
    items.push(it);
  }
  console.log(`news items: ${all.length} fetched, ${items.length} new`);
  if (items.length < 5) return;
  const list = items.slice(0, 70).map((it, i) => `${i + 1}. [${it.source}] ${it.title}${it.summary && it.summary !== it.title ? ` — ${it.summary}` : ''}`).join('\n');
  if (process.env.DRY_RUN) {
    console.log(`prompt size: ${list.length} chars\n${list.split('\n').slice(0, 8).join('\n')}`);
    return;
  }
  const model = await pickModel(key, 'flash-lite');
  console.log(`model: ${model}`);
  const out = await generateJson(key, model, [{ text: `${PROMPT}\n\nNEWS ITEMS (${today}):\n${list}` }]);
  const qs = (out.questions ?? []).filter((q) => valid(q, items)).slice(0, PER_DAY);
  const questions = qs.map((q, i) => {
    const it = items[q.item - 1];
    return {
      id: `${today}-${i + 1}`,
      unit: q.unit,
      topic: 'current-affairs',
      stem: { ta: q.stem_ta.trim(), en: q.stem_en.trim() },
      options: q.options_ta.map((t, j) => ({ ta: t.trim(), en: q.options_en[j].trim() })),
      answer: q.answer,
      explain: { ta: (q.explain_ta ?? '').trim(), en: (q.explain_en ?? '').trim() },
      url: it.url,
      headline: it.title,
    };
  });
  console.log(`questions: ${questions.length} valid of ${(out.questions ?? []).length}`);
  if (!questions.length) return;
  mkdirSync('content/feed', { recursive: true });
  writeFileSync(OUT, JSON.stringify({ date: today, model, questions }, null, 1) + '\n');
  questions.forEach((q) => seen.add(q.url));
  items.slice(0, 70).forEach((it) => seen.add(it.url));
  writeFileSync(SEEN, JSON.stringify([...seen].slice(-3000)) + '\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
