// Shared with src/lib/text.ts (keep the two in sync): turns simple LaTeX into readable plain text.
const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', n: 'ⁿ' };

export function cleanMath(s) {
  if (typeof s !== 'string' || !/[\\$^]/.test(s)) return s;
  let t = s;
  for (let i = 0; i < 3; i++) {
    t = t
      .replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]*)\}/g, '√($1)')
      .replace(/\\(?:underline|overline)\{[^{}]*\}/g, '____')
      .replace(/\\(?:text|mathrm|mathbf|textbf|mathit|operatorname)\{([^{}]*)\}/g, '$1');
  }
  t = t
    .replace(/\$\$?/g, '')
    .replace(/\\times/g, '×').replace(/\\div/g, '÷').replace(/\\cdot/g, '·')
    .replace(/\\[lc]?dots|\\ldots/g, '…').replace(/\\pi/g, 'π').replace(/\\%/g, '%')
    .replace(/\\leq?/g, '≤').replace(/\\geq?/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\^\{?\\circ\}?|\\degree/g, '°').replace(/\\(?:rightarrow|to)\b/g, '→')
    .replace(/\\(?:left|right)/g, '').replace(/\\(?:quad|qquad|,|;|!|:)/g, ' ')
    .replace(/\\\{/g, '{').replace(/\\\}/g, '}')
    .replace(/\^\{([^{}]+)\}/g, (_, x) => [...x].map((c) => SUP[c] ?? c).join(''))
    .replace(/\^([0-9n-])/g, (_, c) => SUP[c])
    .replace(/\\([a-zA-Z]+)/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
  return t.trim();
}
