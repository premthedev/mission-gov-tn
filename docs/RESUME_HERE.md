# Resume point (paused Tue 10 Nov 2026)

## State
- **GitHub:** `premthedev/mission-gov-tn`, branch `main`, last pushed commit `6d73c2c` (v0.1). Pushed as premthedev; the remote URL is pinned to `https://premthedev@github.com/...`. **Never use the bounteous account.**
- **Local:** v0.2 work is **not committed and not pushed** (43 changed/new files).
- **Checks passed locally:** `npx tsc` (0 errors), `npm run build` (OK), `npx tsx tools/work/check-engines.ts` (ALL CHECKS PASSED: 83 h schedule, planner minutes for every day type, scoring, 1,800 generated aptitude questions, 27 decks / 475 items / 899 deck questions, option shuffling, 16 lessons vs curriculum).
- **Interrupted:** the headless-Edge smoke test of v0.2 (`node tools/work/smoke.mjs` with `npx vite preview --port 4173 --strictPort` running). There is no result yet, so it needs to be re-run.

## What v0.2 changed (uncommitted)
- Daily session redesigned as short varied steps: warm-up (5) → Thirukkural cards (5 new kurals/day, flip cards + quiz, spaced review) → Brilliant-style lesson (teach card → question → …) → practice with combos/XP (18) → 90-second speed round (4) → wrap-up with confetti + mistake tagging (5).
- XP, levels, streak, progress ring, sounds/haptics, slide-up feedback panel, projected-score dashboard.
- Dynamic content: the app downloads new files listed in `content/manifest.json` from raw.githubusercontent (`src/data/sync.ts`, `src/config.ts`), so no reinstall is needed. `tools/build-manifest.mjs` runs on every build.
- Memory decks (`content/decks/*.json`) generate fresh shuffled questions in both directions. PYQ options are shuffled in practice and kept in paper order in mocks.
- `content/curriculum.json`: the full 9-week lesson map. Lessons written so far: weeks 1–2 (16).
- Daily GitHub Action `.github/workflows/content.yml` (06:00 IST): `tools/daily-news.mjs` (RSS → Gemini → `content/feed/ca-DATE.json`; the dry run fetched 75 items) and `tools/extract-paper.mjs` (Gemini vision → `content/questions/pyq-*.json`, then final-key cross-check). Both skip quietly without the `GEMINI_API_KEY` secret.
- `pages.yml` is now manual-only, so it won't fail on push.

## Next steps, in order
1. Re-run the smoke test and fix anything it finds.
2. Commit v0.2 and push to `origin main` (premthedev).
3. User: add secrets in GitHub → Settings → Secrets → Actions: the 4 `ANDROID_*` values from `android-release.secrets.txt`, plus `GEMINI_API_KEY` (from aistudio.google.com). Back up `android-release.p12` and `android-release.secrets.txt` to Google Drive.
4. Tag `v0.2.0` → the APK builds → install it from Releases on the phone.
5. Run the `content.yml` workflow manually with exam `G4-2025` so the full 2025 paper is ready before the **Sat 14 Nov diagnostic**. Spot-check the extracted questions.
6. Write week 3 lessons (A3 writing skills, A4, aptitude area/volume/time-work, reasoning) before Sat 21 Nov; after that, one week ahead each week.
