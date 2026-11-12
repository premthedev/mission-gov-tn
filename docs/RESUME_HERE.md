# Resume point (updated Fri 13 Nov 2026)

## State
- **GitHub:** `premthedev/mission-gov-tn`, `main` has v0.2. Push only as premthedev; never use the bounteous account.
- v0.2 smoke test passed in headless Edge: the full session runs (warm-up → Kural cards → lesson → practice → speed → wrap-up), plus Learn, Decks and Progress. No JS errors.
- The 2025 booklet PDF is in `papers/G4-2025.pdf`, so CI doesn't depend on tnpsc.gov.in.

## Waiting on the user
1. 4 Android signing secrets in GitHub (values in `android-release.secrets.txt`).
2. `GEMINI_API_KEY`: as a GitHub secret (daily automation) and/or in the local `.env` (so Kiro can extract the 2025 paper from this laptop right away).
3. Back up `android-release.p12` and `android-release.secrets.txt` to Google Drive.

## Next steps once those are in
1. Run `node tools/extract-paper.mjs G4-2025` locally (or Actions → Daily content → Run workflow, exam `G4-2025`). Spot-check 20 questions against the scans, then commit and push. The app picks them up on next open. **Needed for the Sat 14 Nov diagnostic** (Part A Q26–100 + Part C).
2. Actions → Android APK → Run workflow → install the APK from Releases.
3. Write week 3 lessons before Sat 21 Nov (A3, A4, area/volume/time-work, reasoning).
4. Extract the remaining papers, one per day, via the daily job.
