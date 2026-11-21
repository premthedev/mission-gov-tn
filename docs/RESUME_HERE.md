# Resume point (updated Sun 22 Nov 2026)

## State
- **GitHub:** `premthedev/mission-gov-tn`, `main` = 10e79fe. Push only as premthedev.
- **Release v0.3.0** is published (https://github.com/premthedev/mission-gov-tn/releases/tag/v0.3.0, `MissionGOV-v0.3.0.apk`). Built by pushing the `v0.3.0` tag.
- Content after the APK (cheat sheets for Units III–VII and aptitude) arrives through in-app sync; no reinstall needed.

## What v0.3 has
- Tamil-first questions (setting `lang3`, default `ta`) with a per-question "English-உம் காட்டு" toggle; Thirukkural questions fully in Tamil.
- Explanation panel after each answer (right answer, why, why each wrong option is wrong, rule, example, tip, cheat-sheet link) and a hint button before answering.
- Gemini tutor notes in `content/explain/*.json` (862 questions so far). The daily `content.yml` job now runs `tools/enrich.mjs --max-batches 40` (flash-lite), so the rest fill in automatically.
- 42 cheat sheets in `content/cheats/` (Units I–VII + aptitude/reasoning); Learn → குறிப்புகள், Practice → தலைப்பு வாரியாக. Curriculum entries with `cheat` become lessons (w1-ezhuthu, w2 vetrumai/thogai/peyar-vagai/ethirsol/porunthaa, w4 reading/idioms/translation/literature/antiquity/puzzles).
- Kural: learned on first show, revision only via quiz (2/5/10/21 days), fixed daily set.
- Planner: weekday 1–2 lessons, weekend 2–3 by backlog; **+15/+30/+60 min extra time** any day, any number of times (next lessons first, reading ahead across weeks).
- Guide: first-run walkthrough, coach card on Today, what/how card before each step.
- Sync applies downloads only if newer than the APK (`gen` vs bundled `generatedAt`); stale rows deleted.

## Checks
- `npx --yes tsx tools/work/check-engines.ts` (planner minutes, extensions, Kural Tamil-only, cheat schema, coverage) → ALL PASSED.
- Smoke: `npx vite preview --port 4173 --strictPort` then `node tools/work/smoke.mjs` (full session + +30 extension) and `node tools/work/smoke2.mjs` (cheat lessons) → no JS errors.

## Next
1. GS (Part B) lessons/cheat sheets before Week 5 (Sat 5 Dec): B6 TN history & movements first, then B5, B4, B3, B1/B2.
2. Re-extract missing 2025 questions (`START_PAGE`), remaining papers (VAO 2016, 2012) via the daily job.
3. Optional: Tamil numerals sheet (A1 "numbers" questions), speed-distance-time sheet (C1).

## Reminders
- Back up `android-release.p12` and `android-release.secrets.txt` (e.g. Google Drive).
