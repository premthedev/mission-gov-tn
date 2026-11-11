import type { Bi, Question, Unit } from '../../data/types';
import { type Rng, int, pick, sample, seeded } from '../../lib/rng';
import { makeMcq } from '../make';

/**
 * Parametric Part C questions (syllabus Unit I Aptitude + Unit II Reasoning).
 * Answers are computed, so every key is correct by construction.
 */
export type GenTopic =
  | 'simplification' | 'percentage' | 'hcf_lcm' | 'ratio' | 'si' | 'ci'
  | 'time_work' | 'area' | 'volume' | 'series' | 'alpha' | 'direction';

type Gen = (r: Rng, id: string) => Question;

const round2 = (n: number) => Math.round(n * 100) / 100;
export const fmt = (n: number): string => {
  const v = round2(n);
  return Number.isInteger(v) ? v.toLocaleString('en-IN') : String(v);
};
const N = (n: number, suffix = '', prefix = ''): Bi => ({ en: `${prefix}${fmt(n)}${suffix}` });
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** Three distinct positive distractors near `correct`, preferring the plausible mistakes given. */
function near(correct: number, mistakes: number[], step = 1): number[] {
  const seen = new Set([round2(correct)]);
  const out: number[] = [];
  const add = (v: number) => {
    const x = round2(v);
    if (x > 0 && Number.isFinite(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  };
  mistakes.forEach(add);
  for (let k = 1; out.length < 6 && k < 60; k++) add(correct + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * step);
  return out.slice(0, 3);
}

function numQ(p: {
  r: Rng; id: string; unit: Unit; topic: string; stem: Bi; value: number;
  mistakes: number[]; step?: number; suffix?: string; prefix?: string; explanation: Bi;
}): Question {
  return makeMcq({
    id: p.id, unit: p.unit, topic: p.topic, r: p.r, stem: p.stem,
    correct: N(p.value, p.suffix, p.prefix),
    wrong: near(p.value, p.mistakes, p.step).map((x) => N(x, p.suffix, p.prefix)),
    explanation: p.explanation,
  });
}

// ---------- Unit I: Aptitude ----------

const simplification: Gen = (r, id) => {
  const b = pick(r, [2, 3, 4, 5, 6, 8, 9, 12]);
  const k = int(r, 3, 15);
  const a = b * k;
  const c = int(r, 2, 9);
  const e = int(r, 2, 9);
  const f = int(r, 2, 9);
  const d = int(r, e * f, e * f + 40);
  const v = k * c + d - e * f;
  const expr = `${a} ÷ ${b} × ${c} + ${d} − ${e} × ${f}`;
  return numQ({
    r, id, unit: 'C1', topic: 'simplification', value: v,
    stem: { en: `Simplify: ${expr}`, ta: `சுருக்குக: ${expr}` },
    mistakes: [(k * c + d - e) * f, k * c + d + e * f, v + c, v - e],
    explanation: {
      ta: `BODMAS: முதலில் வகுத்தல், பெருக்கல் (இடமிருந்து வலம்), பிறகு கூட்டல், கழித்தல். ${a} ÷ ${b} = ${k}; ${k} × ${c} = ${k * c}; ${e} × ${f} = ${e * f}; ${k * c} + ${d} − ${e * f} = ${v}.`,
      en: `BODMAS: ÷ and × first (left to right), then + and −. ${a} ÷ ${b} = ${k}; ${k} × ${c} = ${k * c}; ${e} × ${f} = ${e * f}; ${k * c} + ${d} − ${e * f} = ${v}.`,
    },
  });
};

const PCTS = [5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75];
const changeLabel = (n: number): Bi =>
  round2(n) === 0
    ? { en: 'No change', ta: 'மாற்றமில்லை' }
    : n > 0
      ? { en: `${fmt(n)}% increase`, ta: `${fmt(n)}% அதிகரிப்பு` }
      : { en: `${fmt(-n)}% decrease`, ta: `${fmt(-n)}% குறைவு` };

const percentage: Gen = (r, id) => {
  const v = int(r, 0, 2);
  if (v === 0) {
    const x = pick(r, PCTS), y = pick(r, PCTS);
    const n1 = 40 * int(r, 2, 30), n2 = 40 * int(r, 2, 30);
    const val = (x * n1) / 100 + (y * n2) / 100;
    return numQ({
      r, id, unit: 'C1', topic: 'percentage', value: val,
      stem: { en: `${x}% of ${n1} + ${y}% of ${n2} = ?`, ta: `${n1}-இன் ${x}% + ${n2}-இன் ${y}% = ?` },
      mistakes: [(x * n2) / 100 + (y * n1) / 100, val + 10, val * 2, (x * n1) / 100],
      step: 5,
      explanation: {
        ta: `${n1} × ${x}/100 = ${fmt((x * n1) / 100)}; ${n2} × ${y}/100 = ${fmt((y * n2) / 100)}; கூட்டுத்தொகை = ${fmt(val)}.`,
        en: `${n1} × ${x}/100 = ${fmt((x * n1) / 100)}; ${n2} × ${y}/100 = ${fmt((y * n2) / 100)}; total = ${fmt(val)}.`,
      },
    });
  }
  if (v === 1) {
    const a = pick(r, [10, 20, 25, 30, 40, 50]);
    const b = pick(r, [10, 20, 25, 30, 40, 50]);
    const net = a - b - (a * b) / 100;
    const cands = [a - b, -net, -(a * b) / 100, net + 1, net - 1, net + 2].map(changeLabel);
    return makeMcq({
      id, unit: 'C1', topic: 'percentage', r,
      stem: {
        en: `A number is increased by ${a}% and then decreased by ${b}%. What is the net change?`,
        ta: `ஒரு எண் ${a}% அதிகரிக்கப்பட்டு, பின்னர் ${b}% குறைக்கப்படுகிறது. நிகர மாற்றம் என்ன?`,
      },
      correct: changeLabel(net),
      wrong: cands,
      explanation: {
        ta: `அடுத்தடுத்த மாற்றம் = a + b + ab/100 = ${a} + (−${b}) + (${a} × −${b})/100 = ${fmt(net)}%.`,
        en: `Successive change = a + b + ab/100 = ${a} − ${b} − ${a}×${b}/100 = ${fmt(net)}%.`,
      },
    });
  }
  const table: Record<number, string> = { 20: '16⅔', 25: '20', 50: '33⅓', 60: '37.5', 100: '50' };
  const rise = pick(r, [20, 25, 50, 60, 100]);
  const others = Object.values(table).filter((s) => s !== table[rise]);
  return makeMcq({
    id, unit: 'C1', topic: 'percentage', r,
    stem: {
      en: `The price of rice rises by ${rise}%. By what percent must a family reduce its consumption to keep its spending the same?`,
      ta: `அரிசியின் விலை ${rise}% உயர்கிறது. செலவு மாறாமல் இருக்க, ஒரு குடும்பம் நுகர்வை எத்தனை சதவீதம் குறைக்க வேண்டும்?`,
    },
    correct: { en: `${table[rise]}%` },
    wrong: [{ en: `${rise}%` }, { en: `${rise / 2}%` }, ...others.map((s) => ({ en: `${s}%` }))],
    explanation: {
      ta: `குறைப்பு = r/(100 + r) × 100 = ${rise}/${100 + rise} × 100 = ${table[rise]}%.`,
      en: `Reduction = r/(100 + r) × 100 = ${rise}/${100 + rise} × 100 = ${table[rise]}%.`,
    },
  });
};

const hcf_lcm: Gen = (r, id) => {
  const v = int(r, 0, 3);
  if (v === 0) {
    const h = pick(r, [6, 7, 8, 9, 12, 14, 15, 18, 21, 24]);
    const ps = sample(r, [2, 3, 5, 7, 11, 13], 3).sort((x, y) => x - y);
    const nums = ps.map((p) => h * p);
    return numQ({
      r, id, unit: 'C1', topic: 'hcf_lcm', value: h,
      stem: { en: `Find the HCF of ${nums.join(', ')}.`, ta: `${nums.join(', ')} ஆகியவற்றின் மீ.பெ.வ (HCF) காண்க.` },
      mistakes: [h * 2, h / 2, nums[0], h * ps[0]],
      explanation: {
        ta: `${nums.map((n, i) => `${n} = ${h} × ${ps[i]}`).join('; ')}. பொதுவான பெரிய வகுத்தி = ${h}.`,
        en: `${nums.map((n, i) => `${n} = ${h} × ${ps[i]}`).join('; ')}. Highest common factor = ${h}.`,
      },
    });
  }
  if (v === 1) {
    const nums = sample(r, [4, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30], 3).sort((x, y) => x - y);
    const l = nums.reduce(lcm);
    return numQ({
      r, id, unit: 'C1', topic: 'hcf_lcm', value: l,
      stem: { en: `Find the LCM of ${nums.join(', ')}.`, ta: `${nums.join(', ')} ஆகியவற்றின் மீ.சி.ம (LCM) காண்க.` },
      mistakes: [l * 2, l / 2, nums[0] * nums[1], l + nums[0]],
      step: nums[0],
      explanation: {
        ta: `பகாக் காரணிகளின் உயர்ந்த அடுக்குகளைப் பெருக்க: மீ.சி.ம = ${l}. சரிபார்: ${nums.map((n) => `${l} ÷ ${n} = ${l / n}`).join(', ')}.`,
        en: `Multiply the highest powers of all prime factors: LCM = ${l}. Check: ${nums.map((n) => `${l} ÷ ${n} = ${l / n}`).join(', ')}.`,
      },
    });
  }
  if (v === 2) {
    const nums = sample(r, [6, 8, 9, 10, 12, 15, 18, 20, 24, 30], 3).sort((x, y) => x - y);
    const l = nums.reduce(lcm);
    const rem = int(r, 1, nums[0] - 1);
    const val = l + rem;
    return numQ({
      r, id, unit: 'C1', topic: 'hcf_lcm', value: val,
      stem: {
        en: `Find the least number which leaves remainder ${rem} when divided by ${nums.join(', ')}.`,
        ta: `${nums.join(', ')} ஆல் வகுக்கும்போது மீதி ${rem} வரும் மிகச் சிறிய எண் எது?`,
      },
      mistakes: [l, l - rem, 2 * l + rem, l + rem + 1],
      explanation: {
        ta: `மீ.சி.ம(${nums.join(', ')}) = ${l}; மீதியைக் கூட்ட: ${l} + ${rem} = ${val}.`,
        en: `LCM(${nums.join(', ')}) = ${l}; add the remainder: ${l} + ${rem} = ${val}.`,
      },
    });
  }
  const h = pick(r, [4, 6, 8, 12, 15]);
  const [m, n] = pick(r, [[2, 3], [3, 4], [3, 5], [4, 5], [2, 5], [5, 7]] as const);
  const a = h * m, b = h * n, L = h * m * n;
  return numQ({
    r, id, unit: 'C1', topic: 'hcf_lcm', value: b,
    stem: {
      en: `The HCF of two numbers is ${h} and their LCM is ${L}. If one number is ${a}, find the other.`,
      ta: `இரு எண்களின் மீ.பெ.வ ${h}, மீ.சி.ம ${L}. ஒரு எண் ${a} எனில், மற்றொரு எண் எது?`,
    },
    mistakes: [L / h, L - a, a + h, (L * a) / h / 10],
    step: h,
    explanation: {
      ta: `மீ.பெ.வ × மீ.சி.ம = இரு எண்களின் பெருக்கல். ${h} × ${L} = ${a} × x ⇒ x = ${b}.`,
      en: `HCF × LCM = product of the numbers. ${h} × ${L} = ${a} × x ⇒ x = ${b}.`,
    },
  });
};

const ratio: Gen = (r, id) => {
  const v = int(r, 0, 2);
  if (v === 0) {
    const [a, b] = pick(r, [[2, 3], [3, 4], [1, 2], [4, 5], [3, 5]] as const);
    const [c, d] = pick(r, [[4, 5], [2, 3], [3, 4], [5, 6], [2, 5]] as const);
    let x = a * c, y = b * c, z = b * d;
    const g = gcd(gcd(x, y), z);
    x /= g; y /= g; z /= g;
    const lab = (p: number, q: number, s: number): Bi => ({ en: `${p} : ${q} : ${s}` });
    return makeMcq({
      id, unit: 'C1', topic: 'ratio', r,
      stem: { en: `If A : B = ${a} : ${b} and B : C = ${c} : ${d}, find A : B : C.`, ta: `A : B = ${a} : ${b}, B : C = ${c} : ${d} எனில் A : B : C காண்க.` },
      correct: lab(x, y, z),
      wrong: [lab(a, b, d), lab(a, b + c, d), lab(a * d, b * c, b * d), lab(x, z, y), lab(a * c, b * d, b * c)],
      explanation: {
        ta: `B-ஐ இரண்டிலும் சமமாக்க: A : B = ${a * c} : ${b * c}, B : C = ${b * c} : ${b * d}. எனவே ${x} : ${y} : ${z}.`,
        en: `Make B equal: A : B = ${a * c} : ${b * c} and B : C = ${b * c} : ${b * d}, so A : B : C = ${x} : ${y} : ${z}.`,
      },
    });
  }
  const [p, q] = pick(r, [[3, 4], [2, 5], [5, 7], [4, 9], [3, 7], [7, 8]] as const);
  const k = 25 * int(r, 4, 60);
  const total = (p + q) * k;
  if (v === 1) {
    return numQ({
      r, id, unit: 'C1', topic: 'ratio', value: q * k, prefix: '₹',
      stem: { en: `₹${fmt(total)} is divided in the ratio ${p} : ${q}. Find the larger share.`, ta: `₹${fmt(total)} ஐ ${p} : ${q} என்ற விகிதத்தில் பிரித்தால் பெரிய பங்கு எவ்வளவு?` },
      mistakes: [p * k, total / 2, q * k + k, (total * q) / (p + q + 1)],
      step: k,
      explanation: {
        ta: `மொத்தப் பங்குகள் = ${p + q}. ஒரு பங்கு = ${fmt(total)} ÷ ${p + q} = ${fmt(k)}. பெரிய பங்கு = ${q} × ${fmt(k)} = ₹${fmt(q * k)}.`,
        en: `Total parts = ${p + q}. One part = ${fmt(total)} ÷ ${p + q} = ${fmt(k)}. Larger share = ${q} × ${fmt(k)} = ₹${fmt(q * k)}.`,
      },
    });
  }
  return numQ({
    r, id, unit: 'C1', topic: 'ratio', value: p * k,
    stem: { en: `Two numbers are in the ratio ${p} : ${q} and their sum is ${fmt(total)}. Find the smaller number.`, ta: `இரு எண்கள் ${p} : ${q} என்ற விகிதத்தில் உள்ளன. அவற்றின் கூடுதல் ${fmt(total)} எனில் சிறிய எண் எது?` },
    mistakes: [q * k, total / 2, p * k - k, (total * p) / q],
    step: k,
    explanation: {
      ta: `ஒரு பங்கு = ${fmt(total)} ÷ ${p + q} = ${fmt(k)}; சிறிய எண் = ${p} × ${fmt(k)} = ${fmt(p * k)}.`,
      en: `One part = ${fmt(total)} ÷ ${p + q} = ${fmt(k)}; smaller number = ${p} × ${fmt(k)} = ${fmt(p * k)}.`,
    },
  });
};

const si: Gen = (r, id) => {
  const P = 500 * int(r, 2, 40), R = int(r, 4, 12), T = int(r, 2, 6);
  const I = (P * R * T) / 100;
  if (int(r, 0, 1) === 0) {
    return numQ({
      r, id, unit: 'C1', topic: 'si', value: I, prefix: '₹',
      stem: { en: `Find the simple interest on ₹${fmt(P)} at ${R}% per annum for ${T} years.`, ta: `₹${fmt(P)} க்கு ஆண்டுக்கு ${R}% வட்டி வீதத்தில் ${T} ஆண்டுகளுக்கான தனிவட்டி காண்க.` },
      mistakes: [(P * R) / 100, I + P, (P * R * (T + 1)) / 100, I / 2],
      step: (P * R) / 100,
      explanation: {
        ta: `தனிவட்டி = PNR/100 = ${fmt(P)} × ${T} × ${R} / 100 = ₹${fmt(I)}.`,
        en: `SI = PNR/100 = ${fmt(P)} × ${T} × ${R} / 100 = ₹${fmt(I)}.`,
      },
    });
  }
  return numQ({
    r, id, unit: 'C1', topic: 'si', value: R, suffix: '%',
    stem: { en: `The simple interest on ₹${fmt(P)} for ${T} years is ₹${fmt(I)}. Find the rate of interest per annum.`, ta: `₹${fmt(P)} க்கு ${T} ஆண்டுகளுக்கான தனிவட்டி ₹${fmt(I)} எனில், ஆண்டு வட்டி வீதம் என்ன?` },
    mistakes: [R + 1, R - 1, R * 2, R + 2],
    explanation: {
      ta: `R = 100 × I / (P × N) = 100 × ${fmt(I)} / (${fmt(P)} × ${T}) = ${R}%.`,
      en: `R = 100 × I / (P × N) = 100 × ${fmt(I)} / (${fmt(P)} × ${T}) = ${R}%.`,
    },
  });
};

const ci: Gen = (r, id) => {
  if (int(r, 0, 1) === 0) {
    const R = pick(r, [5, 10, 20]);
    const P = R === 5 ? 400 * int(r, 5, 50) : 1000 * int(r, 2, 30);
    const CI = P * ((1 + R / 100) ** 2 - 1);
    const SI = (2 * P * R) / 100;
    return numQ({
      r, id, unit: 'C1', topic: 'ci', value: CI, prefix: '₹',
      stem: { en: `Find the compound interest on ₹${fmt(P)} at ${R}% per annum for 2 years, compounded annually.`, ta: `₹${fmt(P)} க்கு ஆண்டுக்கு ${R}% வீதம், ஆண்டுதோறும் கூட்டுவட்டி கணக்கிடப்பட்டால், 2 ஆண்டுகளுக்கான கூட்டுவட்டி காண்க.` },
      mistakes: [SI, CI + P, (P * R) / 100, CI + (P * R) / 100],
      step: (P * R * R) / 10000,
      explanation: {
        ta: `தொகை = P(1 + R/100)² = ${fmt(P)} × ${fmt((1 + R / 100) ** 2)} = ${fmt(P + CI)}; கூட்டுவட்டி = ${fmt(P + CI)} − ${fmt(P)} = ₹${fmt(CI)}.`,
        en: `Amount = P(1 + R/100)² = ${fmt(P)} × ${fmt((1 + R / 100) ** 2)} = ${fmt(P + CI)}; CI = ${fmt(P + CI)} − ${fmt(P)} = ₹${fmt(CI)}.`,
      },
    });
  }
  let P = 0, R = 0, D = 0;
  for (let i = 0; i < 20; i++) {
    P = pick(r, [2500, 5000, 8000, 10000, 12500, 15000, 20000]);
    R = pick(r, [4, 5, 6, 8, 10, 12]);
    D = (P * R * R) / 10000;
    if (Number.isInteger(D)) break;
  }
  return numQ({
    r, id, unit: 'C1', topic: 'ci', value: D, prefix: '₹',
    stem: { en: `Find the difference between compound interest and simple interest on ₹${fmt(P)} at ${R}% per annum for 2 years.`, ta: `₹${fmt(P)} க்கு ஆண்டுக்கு ${R}% வீதம் 2 ஆண்டுகளுக்கான கூட்டுவட்டிக்கும் தனிவட்டிக்கும் உள்ள வேறுபாடு என்ன?` },
    mistakes: [D * 2, (P * R) / 100, D + R, D / 2],
    explanation: {
      ta: `2 ஆண்டுகளுக்கு: வேறுபாடு = P(R/100)² = ${fmt(P)} × (${R}/100)² = ₹${fmt(D)}.`,
      en: `For 2 years: CI − SI = P(R/100)² = ${fmt(P)} × (${R}/100)² = ₹${fmt(D)}.`,
    },
  });
};

const time_work: Gen = (r, id) => {
  if (int(r, 0, 1) === 0) {
    const [a, b] = pick(r, [[12, 18], [10, 15], [20, 30], [6, 12], [8, 24], [15, 10], [12, 24], [10, 40], [18, 9]] as const);
    const t = (a * b) / (a + b);
    return numQ({
      r, id, unit: 'C1', topic: 'time_work', value: t, suffix: ' days',
      stem: { en: `A can finish a work in ${a} days and B in ${b} days. In how many days can they finish it together?`, ta: `ஒரு வேலையை A ${a} நாட்களிலும் B ${b} நாட்களிலும் முடிப்பர். இருவரும் சேர்ந்து எத்தனை நாட்களில் முடிப்பர்?` },
      mistakes: [(a + b) / 2, a + b, Math.abs(a - b) || t + 3, t + 1],
      explanation: {
        ta: `ஒரு நாள் வேலை = 1/${a} + 1/${b} = ${a + b}/${a * b}. நாட்கள் = ${a * b}/${a + b} = ${fmt(t)}.`,
        en: `One day's work = 1/${a} + 1/${b} = ${a + b}/${a * b}. Days = ${a * b}/${a + b} = ${fmt(t)}.`,
      },
    });
  }
  const [a, t] = pick(r, [[12, 8], [10, 6], [20, 12], [15, 10], [18, 12], [6, 4], [24, 8], [30, 20]] as const);
  const b = (a * t) / (a - t);
  return numQ({
    r, id, unit: 'C1', topic: 'time_work', value: b, suffix: ' days',
    stem: { en: `A and B together finish a work in ${t} days. A alone can finish it in ${a} days. How many days will B alone take?`, ta: `A யும் B யும் சேர்ந்து ஒரு வேலையை ${t} நாட்களில் முடிப்பர். A தனியாக ${a} நாட்களில் முடிப்பார். B தனியாக எத்தனை நாட்களில் முடிப்பார்?` },
    mistakes: [a - t, a + t, (a * t) / (a + t), b + t],
    explanation: {
      ta: `B-யின் ஒரு நாள் வேலை = 1/${t} − 1/${a} = ${a - t}/${a * t}. நாட்கள் = ${a * t}/${a - t} = ${fmt(b)}.`,
      en: `B's one day's work = 1/${t} − 1/${a} = ${a - t}/${a * t}. Days = ${a * t}/${a - t} = ${fmt(b)}.`,
    },
  });
};

const area: Gen = (r, id) => {
  const v = int(r, 0, 2);
  if (v < 2) {
    const L = 2 * int(r, 8, 30), W = 2 * int(r, 5, 14), w = pick(r, [1, 2, 3]);
    const outside = v === 0;
    const val = outside ? (L + 2 * w) * (W + 2 * w) - L * W : L * W - (L - 2 * w) * (W - 2 * w);
    const where = outside ? { en: 'outside', ta: 'வெளிப்புறம்' } : { en: 'inside', ta: 'உட்புறம்' };
    return numQ({
      r, id, unit: 'C1', topic: 'area', value: val, suffix: ' m²',
      stem: { en: `A rectangular garden is ${L} m × ${W} m. A path ${w} m wide runs all round it on the ${where.en}. Find the area of the path.`, ta: `${L} மீ × ${W} மீ அளவுள்ள செவ்வகத் தோட்டத்தைச் சுற்றி ${where.ta} ${w} மீ அகலப் பாதை உள்ளது. பாதையின் பரப்பு காண்க.` },
      mistakes: [2 * w * (L + W), outside ? (L + w) * (W + w) - L * W : L * W - (L - w) * (W - w), val + 4 * w * w, val - 4 * w * w],
      step: 4,
      explanation: outside
        ? { ta: `வெளி அளவு = ${L + 2 * w} × ${W + 2 * w} = ${(L + 2 * w) * (W + 2 * w)}; தோட்டம் = ${L * W}; பாதை = ${val} மீ².`, en: `Outer = ${L + 2 * w} × ${W + 2 * w} = ${(L + 2 * w) * (W + 2 * w)}; garden = ${L * W}; path = ${val} m².` }
        : { ta: `உள் அளவு = ${L - 2 * w} × ${W - 2 * w} = ${(L - 2 * w) * (W - 2 * w)}; தோட்டம் = ${L * W}; பாதை = ${val} மீ².`, en: `Inner = ${L - 2 * w} × ${W - 2 * w} = ${(L - 2 * w) * (W - 2 * w)}; garden = ${L * W}; path = ${val} m².` },
    });
  }
  const rad = 7 * int(r, 1, 6);
  const A = (22 / 7) * rad * rad;
  return numQ({
    r, id, unit: 'C1', topic: 'area', value: A, suffix: ' cm²',
    stem: { en: `Find the area of a circle of radius ${rad} cm (π = 22/7).`, ta: `ஆரம் ${rad} செ.மீ உள்ள வட்டத்தின் பரப்பு காண்க (π = 22/7).` },
    mistakes: [2 * (22 / 7) * rad, (22 / 7) * rad, A * 2, A / 2],
    step: 22,
    explanation: { ta: `பரப்பு = πr² = 22/7 × ${rad} × ${rad} = ${fmt(A)} செ.மீ².`, en: `Area = πr² = 22/7 × ${rad} × ${rad} = ${fmt(A)} cm².` },
  });
};

const volume: Gen = (r, id) => {
  const v = int(r, 0, 2);
  if (v === 0) {
    const rad = 7 * int(r, 1, 3), h = int(r, 5, 20);
    const V = (22 / 7) * rad * rad * h;
    return numQ({
      r, id, unit: 'C1', topic: 'volume', value: V, suffix: ' cm³',
      stem: { en: `Find the volume of a cylinder with radius ${rad} cm and height ${h} cm (π = 22/7).`, ta: `ஆரம் ${rad} செ.மீ, உயரம் ${h} செ.மீ உள்ள உருளையின் கனஅளவு காண்க (π = 22/7).` },
      mistakes: [V / 3, 2 * (22 / 7) * rad * h, V * 2, (22 / 7) * rad * h],
      step: 22,
      explanation: { ta: `கனஅளவு = πr²h = 22/7 × ${rad}² × ${h} = ${fmt(V)} செ.மீ³.`, en: `Volume = πr²h = 22/7 × ${rad}² × ${h} = ${fmt(V)} cm³.` },
    });
  }
  if (v === 1) {
    const rad = 7 * int(r, 1, 3), h = 3 * int(r, 2, 8);
    const V = (1 / 3) * (22 / 7) * rad * rad * h;
    return numQ({
      r, id, unit: 'C1', topic: 'volume', value: V, suffix: ' cm³',
      stem: { en: `Find the volume of a cone with radius ${rad} cm and height ${h} cm (π = 22/7).`, ta: `ஆரம் ${rad} செ.மீ, உயரம் ${h} செ.மீ உள்ள கூம்பின் கனஅளவு காண்க (π = 22/7).` },
      mistakes: [V * 3, V * 2, V / 2, V + 22],
      step: 22,
      explanation: { ta: `கூம்பின் கனஅளவு = ⅓πr²h = ⅓ × 22/7 × ${rad}² × ${h} = ${fmt(V)} செ.மீ³.`, en: `Cone volume = ⅓πr²h = ⅓ × 22/7 × ${rad}² × ${h} = ${fmt(V)} cm³.` },
    });
  }
  const l = int(r, 4, 20), b = int(r, 3, 15), h = int(r, 2, 10);
  const V = l * b * h;
  return numQ({
    r, id, unit: 'C1', topic: 'volume', value: V, suffix: ' cm³',
    stem: { en: `Find the volume of a cuboid ${l} cm × ${b} cm × ${h} cm.`, ta: `${l} செ.மீ × ${b} செ.மீ × ${h} செ.மீ அளவுள்ள கனச்செவ்வகத்தின் கனஅளவு காண்க.` },
    mistakes: [2 * (l * b + b * h + h * l), l * b + h, V + l * b, V - b * h],
    step: l,
    explanation: { ta: `கனஅளவு = நீளம் × அகலம் × உயரம் = ${l} × ${b} × ${h} = ${V} செ.மீ³.`, en: `Volume = l × b × h = ${l} × ${b} × ${h} = ${V} cm³.` },
  });
};

// ---------- Unit II: Reasoning ----------

const series: Gen = (r, id) => {
  const t = int(r, 0, 5);
  let terms: number[] = [];
  let next = 0;
  let rule: Bi = {};
  if (t === 0) {
    const a = int(r, 2, 20), d = int(r, 3, 12);
    terms = [0, 1, 2, 3, 4].map((i) => a + i * d);
    next = a + 5 * d;
    rule = { ta: `ஒவ்வொரு எண்ணுக்கும் ${d} கூட்டப்படுகிறது.`, en: `Add ${d} each time.` };
  } else if (t === 1) {
    const a = int(r, 2, 5), q = pick(r, [2, 3]);
    terms = [0, 1, 2, 3, 4].map((i) => a * q ** i);
    next = a * q ** 5;
    rule = { ta: `ஒவ்வொரு எண்ணும் ${q} ஆல் பெருக்கப்படுகிறது.`, en: `Multiply by ${q} each time.` };
  } else if (t === 2) {
    const n0 = int(r, 1, 5), k = pick(r, [-1, 1, 2]);
    terms = [0, 1, 2, 3, 4].map((i) => (n0 + i) ** 2 + k);
    next = (n0 + 5) ** 2 + k;
    rule = { ta: `n² ${k > 0 ? '+' : '−'} ${Math.abs(k)} (n = ${n0}, ${n0 + 1}, ...).`, en: `n² ${k > 0 ? '+' : '−'} ${Math.abs(k)} for n = ${n0}, ${n0 + 1}, ...` };
  } else if (t === 3) {
    const n0 = int(r, 1, 5);
    terms = [0, 1, 2, 3, 4].map((i) => (n0 + i) * (n0 + i + 1));
    next = (n0 + 5) * (n0 + 6);
    rule = { ta: `n × (n + 1) (n = ${n0}, ${n0 + 1}, ...).`, en: `n × (n + 1) for n = ${n0}, ${n0 + 1}, ...` };
  } else if (t === 4) {
    const a = int(r, 1, 10), d0 = int(r, 1, 4), s = pick(r, [1, 2]);
    terms = [a];
    for (let i = 0; i < 5; i++) terms.push(terms[i] + d0 + i * s);
    next = terms.pop() as number;
    rule = { ta: `வேறுபாடுகள் ${d0}, ${d0 + s}, ${d0 + 2 * s}, ... என ${s} ஆல் கூடுகின்றன.`, en: `Differences grow by ${s}: ${d0}, ${d0 + s}, ${d0 + 2 * s}, ...` };
  } else {
    const n0 = int(r, 1, 4);
    terms = [0, 1, 2, 3, 4].map((i) => (n0 + i) ** 3);
    next = (n0 + 5) ** 3;
    rule = { ta: `கனங்கள்: ${n0}³, ${n0 + 1}³, ...`, en: `Cubes: ${n0}³, ${n0 + 1}³, ...` };
  }
  const last = terms[terms.length - 1];
  return numQ({
    r, id, unit: 'C2', topic: 'series', value: next,
    stem: { en: `Find the next number: ${terms.join(', ')}, ?`, ta: `அடுத்த எண் எது? ${terms.join(', ')}, ?` },
    mistakes: [next + 1, next - 1, 2 * last - terms[terms.length - 2], next + (last - terms[terms.length - 2])],
    explanation: { ta: `${rule.ta} அடுத்த எண் = ${next}.`, en: `${rule.en} Next = ${next}.` },
  });
};

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const pos = (ch: string) => ABC.indexOf(ch) + 1;
const shiftWord = (w: string, k: number) => [...w].map((c) => ABC[(pos(c) - 1 + k + 26) % 26]).join('');

const alpha: Gen = (r, id) => {
  const v = int(r, 0, 3);
  if (v === 0) {
    const [w1, w2] = sample(r, ['CAT', 'DOG', 'SUN', 'BOOK', 'TREE', 'LION', 'ROSE', 'MILK', 'FISH', 'BIRD', 'PEN', 'COW'], 2);
    const s = (w: string) => [...w].reduce((t, c) => t + pos(c), 0);
    return numQ({
      r, id, unit: 'C2', topic: 'alpha', value: s(w2),
      stem: { en: `If letters are numbered A = 1, B = 2, ... Z = 26 and ${w1} = ${s(w1)}, then ${w2} = ?`, ta: `A = 1, B = 2, ... Z = 26 என எண்ணிட்டால் ${w1} = ${s(w1)} எனில், ${w2} = ?` },
      mistakes: [s(w2) + 1, s(w2) - 1, s(w2) + 2, s(w1)],
      explanation: { ta: `${[...w2].map((c) => `${c}=${pos(c)}`).join(' + ')} = ${s(w2)}.`, en: `${[...w2].map((c) => `${c}=${pos(c)}`).join(' + ')} = ${s(w2)}.` },
    });
  }
  if (v === 1) {
    const k = pick(r, [1, 2, 3, -1]);
    const [w1, w2] = sample(r, ['MANGO', 'TABLE', 'WATER', 'PLANT', 'CHAIR', 'HOUSE', 'TRAIN', 'RIVER'], 2);
    const c2 = shiftWord(w2, k);
    return makeMcq({
      id, unit: 'C2', topic: 'alpha', r,
      stem: { en: `If ${w1} is coded as ${shiftWord(w1, k)}, how is ${w2} coded?`, ta: `${w1} என்பது ${shiftWord(w1, k)} எனக் குறியிடப்பட்டால், ${w2} எவ்வாறு குறியிடப்படும்?` },
      correct: { en: c2 },
      wrong: [{ en: shiftWord(w2, k + 1) }, { en: shiftWord(w2, -k) }, { en: [...c2].reverse().join('') }, { en: shiftWord(w2, k + 2) }],
      explanation: { ta: `ஒவ்வொரு எழுத்தும் ${k > 0 ? `${k} இடம் முன்னே` : `${-k} இடம் பின்னே`} நகர்கிறது: ${w2} → ${c2}.`, en: `Each letter moves ${k > 0 ? `${k} forward` : `${-k} back`}: ${w2} → ${c2}.` },
    });
  }
  if (v === 2) {
    const n = int(r, 3, 12), m = int(r, 3, 10);
    const ans = ABC[n + m - 1];
    return makeMcq({
      id, unit: 'C2', topic: 'alpha', r,
      stem: { en: `In the English alphabet, which letter is ${m}th to the right of the ${n}th letter from the left?`, ta: `ஆங்கில எழுத்து வரிசையில், இடமிருந்து ${n}-ஆவது எழுத்துக்கு வலப்புறம் ${m}-ஆவது எழுத்து எது?` },
      correct: { en: ans },
      wrong: [{ en: ABC[Math.max(0, n - m - 1)] }, { en: ABC[n + m] }, { en: ABC[n + m - 2] }, { en: ABC[(n + m + 1) % 26] }],
      explanation: { ta: `${n} + ${m} = ${n + m}; ${n + m}-ஆவது எழுத்து ${ans}.`, en: `${n} + ${m} = ${n + m}; the ${n + m}th letter is ${ans}.` },
    });
  }
  const start = int(r, 0, 4);
  const idx = [start];
  for (let g = 1; g <= 5; g++) idx.push(idx[g - 1] + g);
  const letters = idx.map((i) => ABC[i]);
  const ans = letters.pop() as string;
  return makeMcq({
    id, unit: 'C2', topic: 'alpha', r,
    stem: { en: `Find the next letter: ${letters.join(', ')}, ?`, ta: `அடுத்த எழுத்து எது? ${letters.join(', ')}, ?` },
    correct: { en: ans },
    wrong: [{ en: ABC[idx[5] - 1] }, { en: ABC[idx[5] + 1] }, { en: ABC[idx[4] + 4] }, { en: ABC[idx[5] + 2] }],
    explanation: { ta: `இடைவெளிகள் 1, 2, 3, 4, 5 எழுத்துகள்: அடுத்தது ${ans}.`, en: `Gaps of 1, 2, 3, 4, 5 letters: next is ${ans}.` },
  });
};

const direction: Gen = (r, id) => {
  const [a, b, c] = pick(r, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [9, 12, 15], [12, 5, 13], [8, 15, 17]] as const);
  return numQ({
    r, id, unit: 'C2', topic: 'direction', value: c, suffix: ' km',
    stem: {
      en: `A man walks ${a} km north, turns right and walks ${b} km. How far is he from the starting point?`,
      ta: `ஒருவர் வடக்கு நோக்கி ${a} கி.மீ நடந்து, வலப்புறம் திரும்பி ${b} கி.மீ நடக்கிறார். தொடக்க இடத்திலிருந்து அவர் எவ்வளவு தொலைவில் உள்ளார்?`,
    },
    mistakes: [a + b, Math.abs(a - b) || c + 2, c + 1, c - 1],
    explanation: {
      ta: `வடக்கு, பிறகு கிழக்கு: செங்கோண முக்கோணம். தொலைவு = √(${a}² + ${b}²) = √${a * a + b * b} = ${c} கி.மீ.`,
      en: `North then east makes a right angle. Distance = √(${a}² + ${b}²) = √${a * a + b * b} = ${c} km.`,
    },
  });
};

export const GENERATORS: Record<GenTopic, { unit: Unit; title: Bi; gen: Gen }> = {
  simplification: { unit: 'C1', title: { ta: 'சுருக்குதல்', en: 'Simplification' }, gen: simplification },
  percentage: { unit: 'C1', title: { ta: 'சதவீதம்', en: 'Percentage' }, gen: percentage },
  hcf_lcm: { unit: 'C1', title: { ta: 'மீ.பெ.வ / மீ.சி.ம', en: 'HCF & LCM' }, gen: hcf_lcm },
  ratio: { unit: 'C1', title: { ta: 'விகிதம், விகிதாசாரம்', en: 'Ratio & proportion' }, gen: ratio },
  si: { unit: 'C1', title: { ta: 'தனிவட்டி', en: 'Simple interest' }, gen: si },
  ci: { unit: 'C1', title: { ta: 'கூட்டுவட்டி', en: 'Compound interest' }, gen: ci },
  time_work: { unit: 'C1', title: { ta: 'காலம், வேலை', en: 'Time & work' }, gen: time_work },
  area: { unit: 'C1', title: { ta: 'பரப்பளவு', en: 'Area' }, gen: area },
  volume: { unit: 'C1', title: { ta: 'கனஅளவு', en: 'Volume' }, gen: volume },
  series: { unit: 'C2', title: { ta: 'எண் தொடர்', en: 'Number series' }, gen: series },
  alpha: { unit: 'C2', title: { ta: 'எழுத்து-எண் காரணவியல்', en: 'Alpha-numeric reasoning' }, gen: alpha },
  direction: { unit: 'C2', title: { ta: 'திசை அறிதல்', en: 'Directions' }, gen: direction },
};

export const ALL_GEN_TOPICS = Object.keys(GENERATORS) as GenTopic[];

/** One generated question, stable for a given seed key. */
export function generate(topic: GenTopic, seedKey: string): Question {
  const id = `gen-${topic}-${seedKey}`;
  return GENERATORS[topic].gen(seeded(id), id);
}
