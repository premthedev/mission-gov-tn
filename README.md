# Mission GOV

A personal, guided study app for **TNPSC Group 4 (CCSE-IV, Notification 11/2026)**, exam on **Sunday 10 January 2027**.

Open the app and press **Start**. It tells you what to do today (60 minutes on weekdays, 120 on weekends, 3-hour mocks on 13 Dec, 27 Dec and 3 Jan) and walks you through it step by step:

1. **Thirukkural**: one syllabus chapter at a time (all 20 chapters, 200 kurals) with Mu. Va. and Solomon Pappaiah commentaries and G.U. Pope's English, followed by quick questions.
2. **Review**: your past mistakes come back after 1, 3, 7 and 14 days.
3. **Lesson**: a simple explanation, examples, TNPSC traps, then check questions.
4. **Practice**: real TNPSC questions (best first) mixed with fresh aptitude questions generated every day.
5. **Tag**: say why each mistake happened.

Mock tests use an on-screen OMR sheet with TNPSC scoring (+1.5 correct, 0 wrong, 0 for E, −0.5 per blank, Part A 40% gate).

Plans and research: `docs/TNPSC_G4_FINAL_PLAN.md`, `docs/ARCHITECTURE_AND_ANALYSIS.md`.

---

## One-time setup (about 15 minutes)

### 1. Put the code on GitHub
1. Create an empty **public** repository on github.com, e.g. `mission-gov` (no README).
2. In this folder:
   ```powershell
   git remote add origin https://github.com/<your-username>/mission-gov.git
   git push -u origin main
   ```

### 2. Add the signing secrets (needed for the APK)
`android-release.p12` and `android-release.secrets.txt` were created here and are **git-ignored**. Copy both to Google Drive now. If they are lost, future updates cannot install over the app, and you would lose your progress.

On GitHub: **Settings → Secrets and variables → Actions → New repository secret**. Add the four lines from `android-release.secrets.txt`:
`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

### 3. Build the APK
```powershell
git tag v0.1.0
git push origin v0.1.0
```
GitHub Actions builds a signed APK in about 8 minutes and attaches it to **Releases**.

### 4. Install on your phone
Open `https://github.com/<your-username>/mission-gov/releases` on the phone and tap `MissionGOV-v0.1.0.apk`. Allow "Install unknown apps" for your browser when asked. Open the app once while online so it downloads the Tamil commentaries.

### 5. (Optional) Web version
**Settings → Pages → Source: GitHub Actions**. The app is then also available at `https://<your-username>.github.io/mission-gov/`. It is a fallback only: progress in the browser and in the APK is separate (use Progress → Export / Import to move it).

## Updating
New lessons and past-paper questions are added to `content/`. To release: commit, then `git tag v0.1.N && git push origin v0.1.N`. Install the new APK over the old one; progress is kept.

## Developer notes
- `npm run dev`: local preview in the browser
- `npm run build`: type-check and build
- `python tools/build_kural_content.py`: regenerate `content/kural20.json`
- `python tools/render_pdf_pages.py G4-2025 2-14`: render official booklet pages for question extraction (list in `tools/papers.json`)
- Content formats: `content/lessons/*.json`, `content/questions/pyq-*.json` (picked up automatically at build time)

Sources: TNPSC (tnpsc.gov.in) official papers and keys; Thirukkural data from [tk120404/thirukkural](https://github.com/tk120404/thirukkural) (Apache-2.0), with Tamil commentaries downloaded on the device for personal study only.
