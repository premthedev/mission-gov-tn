# Resume point (updated Sat 21 Nov 2026, ~2 AM)

## State
- **GitHub:** `premthedev/mission-gov-tn`, local `main` = origin c594fb3 (bot content up to 20 Nov, incl. new 2018 GS + GT papers). Push only as premthedev.
- Phone has APK v0.2.2. **Nothing from v0.3 is committed or pushed yet.**

## v0.3 work on disk (uncommitted)
- Data fixes: part labels and LaTeX in all `content/questions/pyq-*.json` (2018 papers fixed too). Tools: `fix-papers.mjs`, `clean-math.mjs`, `audit-papers.mjs`; `extract-paper.mjs` updated.
- `tools/enrich.mjs`: Gemini tutor notes (hint, why right, why each wrong option is wrong, rule, example, tip) → `content/explain/*.json`. **478 questions done** (Part A of 2025/2024/2022/2019-GT/2018-GT + 30 lesson checks). Stopped mid-run; re-running continues where it stopped:
  `$env:ENRICH_PREFER='flash-lite'; node tools/enrich.mjs` (gemini-3.8-flash keeps returning 503; flash-lite works).
- Cheat sheets: 18 topics in `content/cheats/a1-letters.json`, `a1-words.json`, `a2-vocabulary.json`.
- Code (type-checks clean with `npx tsc -p tsconfig.json`):
  - Tamil-first: default language `ta` (new setting key `lang3`); each question has an "English-உம் காட்டு" toggle.
  - Thirukkural: all-Tamil questions (chapter, 1st/2nd line, Tamil meaning, fill-the-word); new kurals marked learned when shown; revision only through quiz (2/5/10/21 days); the day's set is fixed per step (`kuralPlan`). Learn-tab chapter reading counts as learned.
  - Explanations: panel below the options (right answer text, why, why your choice was wrong, why-not under each option, rule, example, tip, cheat-sheet link). Hints ("குறிப்பு வேண்டுமா?"). First-time topic card in practice.
  - Cheat sheets: loader, `CheatSheetView`/modal, Learn → "குறிப்புகள்", Practice → "தலைப்பு வாரியாக"; curriculum entries with `cheat` become lessons automatically.
  - Planner: 1–2 lessons on weekdays, 2–3 on weekends, based on backlog; reads ahead when there's no backlog. Warm-up uses only learned material; drills use only finished lessons + 2 recent news questions.
  - Guide: first-run walkthrough, coach card on Today, "what/how" card before every session step, step list on Today.
  - SVG icons, restyled Today/Session/Learn/Practice/Lesson/Kural/nav; mock answer review list (MockResult).

## Next (in order)
1. Finish the UI pass: StepExtras, WrapUp, SpeedRound, KuralReader still use emoji/old styles (small).
2. `src/data/sync.ts`: apply a downloaded file only if it is newer than the bundled one; add `cheats|explain` to the SYNCABLE regex.
3. Curriculum: add `cheat` fields to existing entries and catch-up entries for vetrumai, thogai, peyar-vagai, ethirsol (week 2).
4. Remaining cheat sheets: A3 (thodar, vinai-vagai, marabu, punctuation), A4 kalaichol, A5 (reading, marabuthodar), A6 translation, A7 (thirukkural, aranool, tamil-antiquity, scholars, modern-poets, literature), aptitude (~10).
5. Resume `tools/enrich.mjs` (Part C, then B); add a daily enrich step to `.github/workflows/content.yml`.
6. Update `tools/work/check-engines.ts`, then `npm run build` + smoke test.
7. Commit and push as premthedev (confirm no `.env`, `.p12`, `*.secrets.txt` staged), then Actions → Android APK → Run workflow.

## Reminders
- Back up `android-release.p12` and `android-release.secrets.txt` (e.g. Google Drive).
