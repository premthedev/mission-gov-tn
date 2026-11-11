# Mission-GOV: End-to-End Analysis for the TNPSC Group 4 Study App

Prepared: Saturday, November 7, 2026. Exam: Sunday, January 10, 2027.
Companion to `docs/TNPSC_G4_FINAL_PLAN.md`. That file covers the study plan; this one covers the app.
This document replaces the "Phase 1 prompt" in Section 7 of the plan. The analysis that prompt asked for is done here.

---

## 0. Decisions recorded

| Question | Your answer | Effect on design |
|---|---|---|
| Build time | Outside the 83 study hours | Build in short sessions. Content is ready one week ahead of when you study it. |
| Mock Sundays | Yes: 3 h on Dec 13, Dec 27, Jan 3, with 1 h the Saturday before | The planner hard-codes these days. |
| App type | Android app installed from GitHub, not the Play Store | Capacitor APK, built on GitHub Actions, published on GitHub Releases |
| AI | Has "Gemini Pro" (to confirm), budget up to ₹300/month or ₹0 | Default path costs ₹0. AI is optional and never needed for the app to work. |
| Posts | VAO, Junior Assistant and similar; no forest posts | No study impact. Check your post selection in the correction window (Nov 9 to 11). |

New requirements from your message, all covered below:
- **Teach** each topic simply, with explanations.
- **Daily plan by date** (a 1-hour plan on Monday, 2 hours on weekends), strict timing, and tracking.
- Tell you each day whether it is a mock day, a short-mock day or a study day, and guide you through it.
- Simple UI.
- Questions from the last 10+ years of papers, with the best ones shown first.
- Fresh questions every day.

---

## 1. Research findings that shape the design

### 1.1 Official notification rules, now read from the 2026 notification itself

Source: the official Tamil notification, [tnpsc.gov.in/document/tamil/group4_tamil.pdf](https://tnpsc.gov.in/document/tamil/group4_tamil.pdf) (Advt. 747, Notification 11/2026, dated 06.10.2026, 92 pages). I rendered and read pages 23 and 79 directly.

| Rule | Paragraph | App behaviour |
|---|---|---|
| Part A 100 Qs / 150 marks; Parts B + C 100 Qs / 150 marks; 3 hours; OMR; minimum qualifying 90 marks for all categories | Scheme table, page 23 | Mock scoring and the readiness dashboard |
| Parts B and C are evaluated only if Part A ≥ 40% (60 marks). Ranking uses A + B + C. Part A is in Tamil only; B and C are in Tamil and English. | 6.1 | "Gate" warning in every mock |
| Unit-wise distribution is indicative | 6.3 | Mock blueprints use the official unit counts |
| If in doubt, the English version is final | 6.5 | Note only |
| Non-personalised OMR with a wrongly filled register number: **−2 marks** | 1.10.2.1 | Exam-day checklist item |
| Any question with no bubble shaded: **−0.5** from total | 1.10.2.2 | Blank counter and penalty in the mock |
| Left-thumb impression missing: **−0.5** | 1.10.2.3 | Checklist item |
| Question booklet number not shaded, or any of its bubbles blank: **answer sheet invalidated** | 1.10.1.15 | Checklist item, shown in red |
| Completely blank OMR: invalidated | 1.10.1.16 | |
| Shade one of A to E for all 200 questions. [E] = answer not known. | 1.6.2.5 | The OMR simulator has 5 bubbles |

Wrong answers carry no deduction. Paragraph 1.10.2 lists every deduction, and wrong answers are not among them.

### 1.2 What the official past papers look like

I downloaded and inspected the files listed on [tnpsc.gov.in/English/answerkeys.aspx](https://www.tnpsc.gov.in/English/answerkeys.aspx).

- **Every question booklet is a scanned image.** No PDF has a text layer. The 2025 booklet has 128 pages (35 MB); 2024 and 2022 have 96 pages each.
- **The pages are rotated.** In the 2025 booklet, pages are scanned in landscape (3507×2480 px) and some are turned 90°. The pipeline must rotate them before reading.
- **The booklets are the "tentative key" versions. The correct option is ticked on the page** (I saw ticks on Q24, Q25 and Q120 of 2025). That has two consequences:
  - Good: the tick gives us the tentative answer for every question.
  - Bad: you **cannot practise from these PDFs**, because the answer is visible. The app has to show clean, re-typed questions.
- **Final answer keys** are separate 1 to 2 page scans:
  - 2024 and 2022: readable. Some questions are marked "ALL" or with two letters (for example "B/C") where TNPSC accepted several answers or dropped the question.
  - **2025: the scan is so faint I could not read it, even after contrast enhancement.** For 2025 the app uses the tentative ticks and labels the answer "Tentative key". We cross-check against a coaching transcription of the final key where one exists.
- Part B and C pages are bilingual. Each question is printed in English and then in Tamil (seen on Q120).
- Part A in 2025 already uses statement and assertion-reason formats in Tamil (கூற்று / காரணம், Q25). The data model needs these formats for Part A as well as Part B.
- I read these Tamil scans correctly myself, including the tick marks. That makes a ₹0 extraction path possible: Kiro reads the page images in this IDE and you spot-check (Section 5).

### 1.3 Official question paper inventory (10+ years)

There was no Group 4 exam in 2017, 2020, 2021 or 2023. Paths are relative to `https://www.tnpsc.gov.in/`.

| Exam | Date | Pattern | Question booklet(s) | Final key |
|---|---|---|---|---|
| Group IV 2025 (Code 496) | 12 Jul 2025 | **Current pattern** (Tamil eligibility-cum-scoring, 7 units) | `Tentative/Document/07_2025_GENEAL_TAMIL_GS.pdf` | `Document/Answerkeyfinalresult/07_2025_CCSE_IV_FINAL_ANSWER_KEY.pdf` (unreadable) |
| Group IV 2024 (Code 003) | 9 Jun 2024 | Tamil eligibility + GS (earlier Tamil syllabus) | `Tentative/Document/01_2024_GR_IV_GENERAL_TAMIL.pdf` | `Document/Answerkeyfinalresult/01_2024_Final _Answer_Key_GT_GE.pdf` |
| Group IV 2022 | 24 Jul 2022 | Tamil eligibility + GS | `Tentative/Document/CCS4T_2022_OPT.pdf` | `Document/Answerkeyfinalresult/07_22_GR_IV_FINAL_KEY.pdf` |
| Group IV 2019 | 1 Sep 2019 | Old: GS 100 + General Tamil 100 | `Tentative/Document/10_09_2019_GS.pdf`, `..._GT.pdf` | `Document/Answerkeyfinalresult/2019_19_GR_IV_FINANS_KEY.pdf` |
| Group IV 2018 | 11 Feb 2018 | Old | `Tentative/Document/14_02_2018_CCSE_IV_GS.pdf`, `23_2017_GR_IV_SERVICES_GT.pdf` | `Document/Answerkeyfinalresult/GROUP_IV_FIN_ANS_KEY_23_2017.pdf` |
| Group IV 2016 | 6 Nov 2016 | Old | `Tentative/Document/06_11_2016_g4_gs.pdf`, `..._gt.pdf` | `Document/Answerkeyfinalresult/06_11_2016_GROUP_IV_FIN_ANS_KEYS.pdf` |
| VAO 2016 | 28 Feb 2016 | Old (VAO was a separate exam then) | `Tentative/Document/28_02_2016_vao2k14_gs.pdf`, `..._gt.pdf` | not listed |
| Group IV 2014, 2013 | Dec 2014, Aug 2013 | Old | **Not available.** TNPSC's link points to an unrelated memo. | Final keys exist |
| Group IV 2012 | 7 Jul 2012 | Old | `Tentative/Document/GK_07_07_2012_NEW.pdf`, `GT_07_07_2012_NEW.pdf` | not listed |
| Group 2/2A prelims (extra GS practice, degree standard) | 2025, 2024, 2022, 2018, 2017 | Overlapping GS units, harder questions | e.g. `Tentative/Document/11_2025_GT_WITH_GS_GRP_II_IIA.pdf` | |

**Usable official Group 4-level questions:** 8 papers (2012, 2016 G4, 2016 VAO, 2018, 2019, 2022, 2024, 2025), about **1,600 questions**. The 2016 to 2025 window alone is about 1,400. Group 2/2A adds about 1,000 harder GS questions for practising statement-style questions.

**Syllabus era matters.** Only the 2025 paper follows the current Tamil syllabus. Older Tamil questions remain useful where the topic is still on the syllabus (grammar, word meanings, the 20 Kural chapters, the listed scholars). Older GS and aptitude questions remain useful almost everywhere. Each question is tagged `CURRENT`, `OVERLAP` (old paper, topic still on the syllabus) or `OFF_SYLLABUS` (hidden by default).

### 1.4 Thirukkural data

- Dataset: [tk120404/thirukkural](https://github.com/tk120404/thirukkural). License Apache-2.0, updated Sep 2026. It has all 1,330 couplets in NFC-normalised Unicode, the G.U. Pope translation, and the chapter → kural ranges.
- **The 20 syllabus chapters, mapped to chapter numbers:** 4 அறன் வலியுறுத்தல், 8 அன்புடைமை, 9 விருந்தோம்பல், 12 நடுவு நிலைமை, 14 ஒழுக்கமுடைமை, 16 பொறையுடைமை, 19 புறங்கூறாமை, 23 ஈகை, 25 அருளுடைமை, 28 கூடா ஒழுக்கம், 40 கல்வி, 41 கல்லாமை, 45 பெரியாரைத் துணைக்கோடல், 55 செங்கோன்மை, 58 கண்ணோட்டம், 60 ஊக்கமுடைமை, 68 வினை செயல்வகை, 73 அவை அஞ்சாமை, 80 நட்பாராய்தல், 100 பண்புடைமை. That is **200 kurals** in total.
- The dataset also carries modern Tamil commentaries (மு.வ, சாலமன் பாப்பையா, மு.க). Their copyright status is unclear. The app can use them on your phone, but they must not go into a public repository. Public packs carry only the couplet, the Pope translation (public domain) and our own simple meaning.

### 1.5 Tamil Nadu current affairs: the government changed

- TVK won the May 2026 election. **C. Joseph Vijay was sworn in as the 22nd Chief Minister on May 10, 2026** ([The Hindu](https://www.thehindu.com/elections/tamil-nadu-assembly/tn-government-formation-a-timeline-of-events/article70954587.ece), [AIR News](https://newsonair.gov.in/tvk-founder-c-joseph-vijay-to-take-oath-as-tamil-nadu-chief-minister-today/)).
- The new government presented its first (revised) **Budget 2026-27 in early August 2026**. It includes the Vetri laptop scheme (₹2,000 crore), a gold-ring scheme for newborns in government hospitals (₹560 crore), Perunthalaivar Kamarajar Model Schools, the TN-SUDAR hostel project and "Super Clean, Super Campus" ([NDTV Profit](https://www.ndtvprofit.com/india/tamil-nadu-2026-budget-live-updates-tn-finance-minister-n-marie-wilson-presents-tvks-maiden-budget-cm-vijay-vetri-tamilagam-schemes-11867645), [New Indian Express](https://www.newindianexpress.com/states/tamil-nadu/2026/Aug/05/first-tvk-budget-puts-welfare-upfront-backs-it-with-infrastructure-and-human-capital-investments-in-tn), [Times of India](https://timesofindia.indiatimes.com/city/chennai/tamil-nadu-budget-2026-5-major-announcements-for-students-and-families/articleshow/132906755.cms)).
- Effect: both AI reports listed schemes from 2021 to 2026 (the previous government) as "current". Those schemes are still valid for GS Unit V questions on development administration. **Current affairs content needs refreshing for May 2026 onward.** This is the main job of the weekly content pack.

### 1.6 Installing an APK from GitHub (sideloading)

- Google's developer-verification rule took effect on **Sept 30, 2026 only in Brazil, Indonesia, Singapore and Thailand**, and only for installs from listed app stores. A **global rollout is planned for 2027** ([Android Developers](https://developer.android.com/developer-verification/guides)).
- The same page says installing over ADB is unchanged, and offers a free "limited distribution" path for students and hobbyists (up to 20 devices, no ID verification).
- Risk for you: low before the exam, but the 2027 date is not fixed.
- Mitigation:
  1. Install the APK in November.
  2. Keep the same signing key for every update.
  3. The same code runs as a PWA in Chrome, as a fallback.
  4. ADB install from your laptop always works.

### 1.7 Your machine

Node 22.21, npm 10.9 and Git 2.55 are installed. Java and the Android SDK are not. **Build the APK on GitHub Actions**, not locally. That avoids a ~10 GB Android Studio install. GitHub Free includes 2,000 Actions minutes/month for private repos and unlimited minutes for public ones.

### 1.8 AI options and cost

| Fact | Source |
|---|---|
| A Google AI Pro subscription does **not** include a Gemini API key or API usage by itself | [AIONX](https://aionx.co/gemini-advanced-reviews/gemini-advanced-api-access/), [ScriptByAI](https://www.scriptbyai.com/gemini-api-free-tier-limits/) |
| Since Jan 2026, **Google AI Pro subscribers get $10/month in Google Cloud credits**, usable for the Gemini API, after activating Google Developer Program benefits | [Google blog](https://blog.google/innovation-and-ai/technology/developers-tools/gdp-premium-ai-pro-ultra/) |
| The free API tier exists but is small: reported as about 20 requests/day on current Flash models and about 500/day on Flash-Lite. Limits change often; check AI Studio. | [ScriptByAI](https://www.scriptbyai.com/gemini-api-free-tier-limits/) (third-party) |
| On the free tier, Google may use your prompts to improve its products. That is fine for public TNPSC papers. Never send personal data. | same |
| Model IDs change often (several were deprecated in Oct 2026) | same |

**Approximate extraction cost with Gemini:** about 1,000 page images × (~1.2k input + ~1k output tokens) ≈ 1.2 M input + 1 M output tokens. At the reported Flash promo price ($0.75 / $3.75 per M until Dec 31, 2026) that is about **$5**, which fits inside the $10 monthly credit. Prices are from third-party trackers, so treat this as a rough estimate.

---

## 2. Recommended approach (₹0 by default)

| Concern | Decision | Why |
|---|---|---|
| Question extraction | **Kiro reads the scans in this IDE** (₹0). If your AI Pro credits are active, a Gemini script can do bulk pages faster, and Kiro reviews the output. | I have shown I can read these scans. You verify a 10% sample. |
| Answers | Official final key → else the tentative tick → else hidden from mocks. Never decided by AI. | Correctness |
| Lessons and explanations | Written at build time by Kiro from the syllabus and Samacheer textbook pages, each with a source reference. You can report errors from inside the app. | Teaching without runtime AI |
| "Fresh questions daily" | A **weekly content pack**, built every Sunday night, gives 7 days of new items: current affairs from cited sources, plus variants of past-paper topics. The app downloads it when online. | No scraping, no API key on the phone, works offline |
| Runtime AI in the app | **Off by default.** Optional "Explain more" button using your own Gemini key, stored only on your phone. | Not needed to pass. Kept for later. |
| Hosting | One **public** GitHub repo for code, packs and APK releases. No secrets, no third-party copyrighted text. | Download without logging in |

---

## 3. Product specification

### 3.1 Design rules (simple UI)

- Four tabs: **Today · Learn · Practice · Progress**. Mock tests start from Today or Practice.
- One primary action per screen (a large button at the bottom, within thumb reach).
- Tamil-first text with a ta/en toggle on bilingual questions. Base font size 18 sp, with the Noto Sans Tamil font bundled.
- No charts in the first version. Use plain numbers with one-line meanings ("Part A: 64% → gate safe").
- Dark mode follows the system setting.

### 3.2 Today (the planner)

This is the first screen you see every day. It reads the phone's date, looks it up in `schedule.json`, and shows:

```
Monday, 9 Nov · Day 3 of 64 · 62 days to exam
[ STUDY DAY · 60 min ]
1. Review queue          10 min   (12 cards due)
2. Learn: சந்திப்பிழை – part 1   30 min
3. Drill: 15 questions   15 min
4. Tag your mistakes      5 min
          [ Start session ]
Study hours: 3.0 / 83 h   ·   Streak: 3 days
```

**Day types**, assigned by date, so the plan stays fixed until the exam:

| Type | When | Length | What the screen shows |
|---|---|---|---|
| `STUDY_WEEKDAY` | Mon to Fri | 60 min | 4 blocks: Review 10 · Learn 30 · Drill 15 · Tag 5 |
| `STUDY_WEEKEND` | Sat/Sun, normal weeks | 120 min | Learn 60 · **Short mock** 45 (sectional on the week's topics) · Review 15 |
| `DIAGNOSTIC` | Sat Nov 14 | 120 min | Clean 2025 Part A (70 min) + Part C (30 min) + 20 min review |
| `SECTIONAL_BIG` | Sun Nov 29 | 120 min | Tamil 100 questions in 70 min + review |
| `PRE_MOCK_LIGHT` | Sat Dec 12, Dec 26, Jan 2 | 60 min | Light revision + "Tomorrow is mock day" checklist (printed OMR sheet, black pen, 3 h free from 9:30) |
| `FULL_MOCK` | Sun Dec 13, Dec 27, Jan 3 | 180 min + review on later weekdays | Starts at 9:30 AM. Pacing guide: Part A 70 → Part C 30 → Part B 60 → check 20 |
| `MOCK_REVIEW` | Mon/Tue after each mock | 60 min | Re-solve every wrong and guessed mock question |
| `FINAL_REVIEW` | Sat Jan 9 | 120 min | Formula sheet, ஓரெழுத்து, கலைச்சொற்கள், scheme years, Kural chapter names; hall ticket check |
| `EXAM_DAY` | Sun Jan 10 | | Checklist only: report by 8:30, black ballpoint pen, ID copy, booklet number, thumb impression, zero blanks |

**Strict timing:**
- "Start session" runs the blocks in order with a countdown.
- When a block ends, the phone vibrates and moves to the next block.
- Pause is allowed. Skipping a block asks for confirmation and is logged.
- Minutes actually studied are saved and fill the "x / 83 h" bar.

**Missed days (dynamic, exam date fixed):**
1. An unfinished block goes into a **backlog**.
2. Weekdays never grow past 60 minutes. The next weekend's Learn block works through the backlog first.
3. If the backlog is more than 2 sessions, the planner drops the lowest-weight items (Science/Geography PYQ sweep first, then Unit III medieval history) and says what it dropped.
4. Mock days never move.

**Evening reminder** (local notification at a time you choose): "Today's session not done yet," or on Saturday nights, "Tomorrow 9:30 AM full mock."

### 3.3 Learn (teaching)

Each lesson follows the same 5-part format and takes about 10 to 30 minutes:
1. **In one line:** what the rule or fact is.
2. **Simple explanation:** short Tamil paragraph plus an English gloss. For GS, plain English with Tamil key terms.
3. **3 to 5 examples:** taken from Samacheer textbooks or past papers where possible.
4. **Traps:** how TNPSC tries to catch you (e.g. "இல்லை / NOT questions", look-alike letters).
5. **Check yourself:** 5 questions. Missed ones go to the review queue automatically.

Every lesson shows its source (e.g. "Samacheer 8th Tamil, p. 54" or "TNPSC 2024 Q37"), and has a **Report error** button that logs the problem for the next pack.

About **110 lessons** in total: Part A ≈ 45, GS ≈ 50, Aptitude/Reasoning ≈ 16. They are written one week ahead of the schedule, so content never blocks your study.

### 3.4 Practice (past papers + fresh questions)

**Filters:** Part · Unit · Year (2012 to 2025) · Format (one-liner, statement, assertion-reason, match, chronology, passage) · "Most asked" · "My weak topics".

**"Best questions first" ranking.** The default order for Practice and for Today's drill:

```
score = 0.35 × relevance   (syllabus era CURRENT=1, OVERLAP=0.7; × unit weight from official counts)
      + 0.25 × recurrence  (how many papers asked this topic, normalised)
      + 0.25 × weakness    (1 − your accuracy on this topic; 0.5 if never attempted)
      + 0.15 × recency     (2025=1.0 … 2012=0.3)
Due spaced-repetition items always come first. Questions answered correctly twice in a row are skipped for 7 days.
```

**"Most asked" topics** come from the frequency job (Section 5.4). For example, if the Justice Party appears in 6 of 8 papers, that topic gets a "Most asked" badge.

**Question screen:**
- Stem, statements or match table, then options A to D.
- Tap and hold an option to strike it out.
- Before submitting, a confidence tag: Sure / 50-50 / Guess.
- After submitting: the correct answer, why each option is right or wrong, and a source badge (`TNPSC 2024 · Final key`, `TNPSC 2025 · Tentative key`, `Lesson-based`, `Current affairs · source link`).

### 3.5 Mock tests

| Mock | Questions | Time | Used on |
|---|---|---|---|
| Short mock (sectional) | 20 to 30 on the week's topics | 45 min | Every normal weekend |
| Diagnostic | 2025 Part A + Part C, clean | 100 min + review | Sat Nov 14 |
| Tamil sectional | 100 Part A | 70 min | Sun Nov 29 |
| Full mock | 200, official unit blueprint (A 25/15/15/10/15/5/15 · B 5/5/10/15/20/20 · C 15/10) | 180 min | Dec 13, Dec 27, Jan 3 |

**OMR mode:**
- 5 bubbles (A to E) per question, plus a section timer with the 70/30/60/20 pacing guide.
- A blank counter is always visible.
- At submit: +1.5 per correct answer, 0 for wrong, 0 for E, −0.5 per blank. If Part A is below 60, B + C are shown as "not evaluated".
- Results show accuracy separately for Sure, 50-50 and Guess answers, so you can see whether guessing is helping.
- For full mocks the app can also generate a printable OMR sheet (PDF). You mark on paper, then type the 200 answers into a fast entry grid.

Full mocks are assembled in this order:
1. Unseen 2025 Part B questions (kept back from practice for Mock 2 or 3).
2. The 2024 paper.
3. Highest-ranked OVERLAP questions to fill the blueprint.

### 3.6 Progress

- Hours studied vs the 83 h budget.
- Target tracker: projected correct answers vs target (120 planning target, 135 stretch).
- Part A gate status.
- Accuracy by Part and Unit.
- Error log by reason: Concept / Memory / Misread NOT / Calculation / Guess / Time.
- **Backup:** automatic daily JSON backup to the phone's Documents folder, plus Export/Import buttons.

### 3.7 Review queue (flashcards and mistakes)

- Decks:
  - 20 Kural chapters (200 couplets: kural → chapter, meaning, key words)
  - கலைச்சொற்கள்
  - ஓரெழுத்து ஒருமொழி
  - ஊர்ப்பெயர் மரூஉ
  - Look-alike letters (ல/ள/ழ, ன/ண, ர/ற)
  - Scheme → year/purpose
  - Leader → event
  - Constitution articles
  - Aptitude formulas
  - Every wrong or guessed question
- Leitner boxes with intervals of 1, 3, 7 and 14 days. This is enough for 64 days and simpler than FSRS.

---

## 4. Architecture

```
LAPTOP (build time, Kiro + scripts)                    GITHUB (public repo)
--------------------------------------                 -----------------------------
tnpsc.gov.in PDFs ─► render pages ─► rotate ─►          main branch: app code + content/
  Kiro reads page images (or Gemini script)             Actions: build signed APK
  ─► questions.jsonl ─► join final key / ticks          Releases:
  ─► validate ─► 10% human check                          app-vX.Y.Z.apk
Samacheer + syllabus ─► Kiro writes lessons/cards         pack-2026-W46.zip (weekly)
Cited news sources ─► weekly CA items                     packs/latest.json (manifest)
  ─► pack builder ─► pack-YYYY-Www.zip ───────────────►
                                                              │ download when online
PHONE (offline-first)                                         ▼
-------------------------------------------------------------------------------
Capacitor 8 Android shell ─► WebView ─► React + TypeScript app
  ├─ Built-in base pack (Kural, schedule, first lessons, 2025 paper) in the APK
  ├─ Dexie (IndexedDB): content cache + attempts + errors + cards + sessions
  ├─ Planner engine (pure TS: date → day type → blocks)
  ├─ Scoring engine (pure TS: OMR rules from 1.10.2)
  ├─ @capacitor/local-notifications (evening reminder)
  ├─ @capacitor/filesystem (daily backup JSON)
  └─ Optional: "Explain more" via your own Gemini key (off by default)
```

### 4.1 Stack

| Layer | Choice | Reason |
|---|---|---|
| UI | Vite + React + TypeScript + Tailwind CSS | Fast to build. The same code runs as a PWA fallback. |
| Android | Capacitor 8 (the stable major line; 9.0 is in beta since Oct 28, 2026) | Real APK, mature plugins |
| Storage | Dexie on IndexedDB, plus automatic JSON file backup | Simple. The backup covers the rare case of WebView data loss. |
| Fonts | Noto Sans Tamil (SIL OFL), bundled | Same Tamil rendering on every phone |
| Build | GitHub Actions: `npm ci && npm run build && npx cap sync android && ./gradlew assembleRelease` | No Android SDK on your laptop |
| Signing | One release keystore, created once and stored as a GitHub Actions secret | **Updates must use the same key.** Otherwise Android makes you uninstall, which deletes your progress. |
| Pipeline | Node/TS scripts in `tools/`, plus Python only for PDF → PNG rendering (pypdfium2 works on your machine) | |

### 4.2 Repository layout

```
Mission-GOV/
  app/                 React app (src/planner, src/scoring, src/screens, src/db)
  android/             generated by Capacitor
  content/
    schedule.json      64 days + exam day
    lessons/           *.json by unit
    questions/         pyq-2025.json, pyq-2024.json, ...
    cards/             kural.json, kalaichol.json, ...
    packs/             weekly pack sources
  tools/               render_pdf_pages.py, make_kural_doc.py (both exist), extract (prompt + runner), validate.ts, build-pack.ts, frequency.ts
  docs/
  .github/workflows/   android.yml, pack.yml
```

---

## 5. Content pipeline

### 5.1 Past-paper extraction, step by step

1. **Download** the booklet and final key from the inventory (1.3).
2. **Render** each page to PNG at 150 to 200 dpi. Auto-rotate pages wider than they are tall, and check the orientation by reading the page number.
3. **Read** the page. Kiro (or the Gemini script) produces one JSON object per question:
   - stem in Tamil and English
   - statements[] or matchTable
   - options A to D
   - the **ticked option** (tentative answer)
   - question number
   - continuation flag, for questions that run across two pages
4. **Stitch** questions split across pages. Attach passages to their question group (`passageId`).
5. **Join the final key.**
   - Use the final key's letter wherever it is readable. If it differs from the tick, the final key wins and the item is flagged `keyChanged`.
   - "ALL" / dropped questions → `deletedByTnpsc: true`, excluded from mocks.
   - Multi-answer items ("B/C") → `acceptedAnswers: ["B","C"]`.
6. **Tag** each question with Part, Unit, format, topic (from a fixed topic list per unit) and syllabus era. Kiro proposes the tags and the validator checks them against the allowed list.
7. **Validate** automatically:
   - 4 options
   - answer present
   - question numbers continuous (1 to 200)
   - Part ranges correct (2025: Part A = Q1 to 100)
   - Tamil text is real Tamil Unicode, not legacy-font characters
   - no duplicate IDs
8. **Spot-check:** you compare 10% of questions against the PDF (about 20 per paper, ~15 min). If more than 1 error turns up, check another 10%.
9. **Write explanations:** Kiro writes a short explanation for each answer and cites a lesson or textbook. Explanations are labelled "Kiro explanation" until you mark them verified.
10. **Publish** to `content/questions/pyq-YYYY.json`.

**Order:** 2025 Part A + C (for the diagnostic) → 2025 Part B → 2024 → 2022 → 2019 → 2018 → 2016 + VAO 2016 → 2012 → Group 2/2A GS.

### 5.2 Lessons and cards

- Sources: the Annexure III syllabus text, Samacheer Tamil 6 to 10 textbook PDFs (for grammar sections, கலைச்சொற்கள் glossaries and author tables), Samacheer Social Science for GS, and past papers.
- Kural cards are generated from the Apache-2.0 dataset for the 20 chapter numbers in 1.4.
- Lessons are written per the schedule, one week ahead.

### 5.3 Weekly pack (fresh daily questions)

Every Sunday, built in about 30 minutes, outside study time:
- **Current affairs:** about 35 MCQs from that week's TN government press releases, PIB, the TN budget documents and reputable newspapers. Each item carries its source URL and date. TN items come first: new schemes, appointments, budget figures, places in news.
- **Topic variants:** about 35 new questions on the coming week's topics, written in the same style as the most-asked past-paper questions. Each is grounded in a lesson. Labelled "Practice variant".
- **Next week's lessons and cards.**
- The app's Today drill mixes about 10 fresh items per day with ranked past-paper questions.

### 5.4 Frequency job (replaces unverified percentages)

After each paper is ingested, `tools/frequency.ts` reports:
- question counts per Unit and format, for each paper
- the top 20 recurring topics across papers

This replaces the PrepMatic-style numbers neither of us could verify. The output feeds the "Most asked" badge and the recurrence term in the ranking.

---

## 6. Data model (TypeScript)

```ts
type Part = 'A' | 'B' | 'C';
type Unit = 'A1'|'A2'|'A3'|'A4'|'A5'|'A6'|'A7'|'B1'|'B2'|'B3'|'B4'|'B5'|'B6'|'C1'|'C2';
type Format = 'ONE_LINER'|'STATEMENT'|'ASSERTION_REASON'|'MATCH'|'CHRONOLOGY'|'PASSAGE'|'FILL_BLANK';
type Letter = 'A'|'B'|'C'|'D';
type Bi = { ta?: string; en?: string };

interface Question {
  id: string;                        // "pyq-2025-q025"
  part: Part; unit: Unit; topic: string; format: Format;
  stem: Bi;
  statements?: Bi[];                 // numbered statements / assertion+reason
  matchTable?: { left: Bi[]; right: Bi[] };
  passageId?: string;
  options: Record<Letter, Bi>;       // [E] is added by the OMR UI, not stored
  answer: Letter;
  acceptedAnswers?: Letter[];        // multi-answer keys
  keySource: 'FINAL_KEY' | 'TENTATIVE_TICK' | 'LESSON' | 'CITED_SOURCE';
  keyChanged?: boolean;              // final key differs from tick
  deletedByTnpsc?: boolean;
  source: { kind: 'PYQ' | 'VARIANT' | 'CURRENT_AFFAIRS'; exam?: string; year?: number; qNo?: number; url?: string; date?: string };
  syllabusEra: 'CURRENT' | 'OVERLAP' | 'OFF_SYLLABUS';
  explanation?: { ta?: string; en?: string; perOption?: Partial<Record<Letter, Bi>>; ref?: string; verified: boolean };
}

interface Lesson { id: string; unit: Unit; topic: string; title: Bi; oneLine: Bi; body: Bi;
  examples: Bi[]; traps: Bi[]; checkQuestionIds: string[]; sourceRef: string; minutes: number }

interface Card { id: string; deck: string; front: Bi; back: Bi; sourceRef?: string }

interface DayPlan { date: string; dayNo: number; type: DayType; minutes: number;
  blocks: { kind: 'REVIEW'|'LEARN'|'DRILL'|'TAG'|'SHORT_MOCK'|'MOCK'|'CHECKLIST'; minutes: number;
            lessonIds?: string[]; topicFilter?: string[]; mockBlueprint?: string }[] }

interface Attempt { questionId: string; chosen: Letter | 'E' | 'BLANK'; eliminated: Letter[];
  confidence: 'SURE'|'FIFTY_FIFTY'|'GUESS'; ms: number; correct: boolean;
  mode: 'PRACTICE'|'DRILL'|'SHORT_MOCK'|'MOCK'; sessionId: string; at: string }

interface ErrorItem { questionId: string; reason: 'CONCEPT'|'MEMORY'|'MISREAD_NOT'|'CALC'|'GUESS'|'TIME';
  box: 1|2|3|4; nextReview: string }

interface StudySession { id: string; date: string; plannedMin: number; actualMin: number;
  blocksDone: string[]; skipped: string[] }

interface PackManifest { id: string; week: string; createdAt: string; minAppVersion: string;
  files: { path: string; sha256: string }[] }
```

**Scoring (pure function, matches notification 1.10.2):**

```
marks = 1.5 × correct − 0.5 × blanks
(wrong answers and E score 0)
if Part A marks < 60 → Parts B and C are "not evaluated"
```

This uses the stricter reading of "0.5 per blank question".

---

## 7. Build plan (outside study hours)

| Step | Work | Time box | Usable by |
|---|---|---|---|
| B1 | Repo, Vite/React/TS, Capacitor 8, GitHub Actions APK build, release keystore, Dexie, planner engine + `schedule.json`, **Today screen with timer**, Kural cards (20 chapters) | 3 to 4 h | **Mon Nov 9** |
| B2 | Extract 2025 Part A + Part C (125 Qs), validate, spot-check; OMR mock screen + scoring | 4 to 5 h | **Sat Nov 14 (diagnostic)** |
| B3 | Learn screen + lessons for Week 1 and 2 topics (Unit I எழுத்து/சொல், Unit II); cards: ஓரெழுத்து, மரூஉ, look-alike letters | 3 h | Nov 11 onward |
| B4 | Practice screen with filters and ranking; error log; review queue; 2025 Part B + 2024 + 2022 extraction | 5 h | Nov 21 |
| B5 | 2019, 2018, 2016, VAO 2016, 2012 extraction; frequency job; "Most asked" badges; Progress screen; backup | 5 h | Dec 5 |
| B6 | Weekly pack workflow (CA + variants), in-app pack download | 2 h, then ~30 min/week | First pack Sun Nov 15 |
| B7 | Lessons for Weeks 3 to 9, written one week ahead | ~1 h/week | Rolling |

Total: about 22 to 24 hours of building across Weeks 1 to 4, plus about 1.5 h/week after that. All of it is outside your study hours.

---

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Building eats into study time | Medium | Build steps are time-boxed. If a step runs over, study wins and the step moves. Weeks 1 and 2 can be studied with the starter file and textbooks. |
| Extraction errors (wrong option text or answer) | Medium | Final key join, validator, 10% spot-check, Report-error button |
| 2025 final key unreadable | Confirmed | Use tentative ticks, labelled "Tentative key". Cross-check with a coaching transcription of the final key. |
| Lesson errors (Tamil grammar) | Medium | Lessons cite the Samacheer page. You can report errors. Grammar lessons use textbook examples. |
| Update wipes progress (signing key mismatch) | Low if handled | One keystore from day 1, plus daily backup file |
| Android sideloading rules tighten in 2027 before Jan 10 | Low | Install now. PWA fallback. ADB install. |
| Gemini free-tier limits or model names change | High | ₹0 path doesn't depend on Gemini. Model name lives in config. |
| Current affairs after May 2026 not covered by older material | Confirmed | Weekly pack, TN items first |

---

## 9. Open questions for you

1. **Gemini plan:** open the Gemini app → Settings → Subscriptions. Does it say "Google AI Pro"? If yes, activating the Google Developer Program benefits gives the $10/month credit for faster extraction. If not, the ₹0 Kiro path is enough.
2. **Repo visibility:** is a public GitHub repo acceptable? It holds code, TNPSC questions and our own lessons, with no personal data. It makes APK and pack downloads easy. A private repo works too, but downloads then need you to be logged in.
3. **Evening reminder time:** what time should the app remind you (e.g. 8:30 PM)?
4. **Do you have a printer** for the OMR sheet on mock days? If not, the app offers an on-screen OMR grid.

Once you approve this document, B1 can start.
