# TNPSC Group 4 (Jan 10, 2027): Research Review, Final Study Plan, and App Architecture Brief

Prepared: Saturday, November 7, 2026. Days to exam: 64 study days (Nov 7 to Jan 9), exam on Sunday Jan 10, 2027.

---

## 1. Summary

- Both AI reports have a usable core, but both contain errors that would cost you marks. ChatGPT got the paper structure and the marking rule wrong. Gemini is mostly right on structure and strategy, but its Thirukkural chapter list is from the **old** syllabus, and some of its numbers can't be checked.
- The current official syllabus (Notification 11/2026, Code 496) lists **20 specific Thirukkural chapters**, not the 25 both reports gave you. About 60% of the chapter names differ. This is the most important correction in this document.
- Your time budget is fixed: **83 hours** (45 weekdays × 1 h + 19 weekend days × 2 h). Gemini's arithmetic here is correct.
- Nobody can promise a "98% plan". In 2025, 13.9 lakh candidates sat the exam. With 6,574 vacancies now, roughly 1 in 200 gets a post. What you can control is studying the highest-mark areas first and making no avoidable OMR mistakes.
- On the app: build less than either report suggests. Ship content as pre-built offline packs, keep AI out of the phone at runtime, and do not take build time out of your 83 study hours.
- **Action this week:** the application correction window is **Nov 9, 12:01 AM to Nov 11, 11:59 PM**. Log in and check your post options and details. The last date to apply was extended to Nov 8 because the upper age limit was raised by 5 years ([Jagran Josh](https://www.jagranjosh.com/articles/tnpsc-group-4-apply-online-2026-last-date-extended-to-nov-8-check-direct-link-fees-and-more-1800018698-1)).

---

## 2. Verified facts (what the plan and app must be built on)

| Fact | Value | Source |
|---|---|---|
| Notification | No. 11/2026, Advt. No. 747, dated Oct 6, 2026 | [FreeJobAlert summary of notification](https://www.freejobalert.com/articles/tnpsc-group-iv-recruitment-2026-apply-online-for-6-574-posts-3071375), [Adda247](https://www.adda247.com/exams/tn/tnpsc-group-4-notification-2026-out/) |
| Exam | Sunday Jan 10, 2027, 9:30 AM to 12:30 PM, OMR, single paper | [Times of India](https://timesofindia.indiatimes.com/education/news/tnpsc-group-4-notification-2026-released-at-tnpsc-gov-in-for-6574-vacancies-apply-here/articleshow/134779019.cms), [Indian Express](https://indianexpress.com/article/education/tnpsc-group-4-notification-2026-applications-begin-6574-posts-tnpsc-gov-in-10912245/) |
| Vacancies | 6,574 across 46 post entries (Junior Assistant Non-Security alone: 2,610; Typist posts: 1,570; VAO: 291) | [Jagran Josh](https://www.jagranjosh.com/articles/tnpsc-group-4-apply-online-2026-last-date-extended-to-nov-8-check-direct-link-fees-and-more-1800018698-1) |
| Last year's field | 13,89,738 candidates admitted (July 12, 2025 exam, 3,935 vacancies) | [TNPSC Press Release 142/2025](https://tnpsc.gov.in/document/pressenglish/PR_1422025_ENG.pdf) |
| Paper | 200 Qs, 300 marks (1.5 per Q), 3 hours, SSLC standard | Notification syllabus (Annexure III, Code 496) |
| **Part A** | **Tamil Eligibility-cum-Scoring Test**, 100 Qs, 150 marks. You need ≥ 60 marks (40 correct) or Parts B and C are **not evaluated**. Part A marks count toward rank. | Annexure III, Code 496 |
| Part B | General Studies, 75 Qs | Annexure III |
| Part C | Aptitude & Mental Ability, 25 Qs (15 Aptitude + 10 Reasoning) | Annexure III |
| Wrong answer | **No penalty** | [TNPSC Addendum 7A/2025](https://tnpsc.gov.in/Document/english/Addendum%207A%202025_ENGLISH_GROUP4.pdf) (deduction list contains no wrong-answer penalty) |
| Blank question | **0.5 mark deducted** if no bubble (A to E) is shaded | Addendum 7A/2025, para 1.10.2.1 |
| Option [E] | "Answer not known". Allowed, scores 0, no deduction | Addendum 7A/2025, para 1.6.2.6 |
| Missing left-thumb impression | 0.5 mark deducted | Addendum 7A/2025, para 1.10.2.2; **confirmed in the 2026 notification, para 1.10.2.3** |
| Non-personalised OMR with a wrongly filled register number | 2 marks deducted | 2026 notification, para 1.10.2.1 |
| Question Booklet Number not shaded correctly (even one bubble blank) | **Answer sheet invalidated** (not "−5 marks") | Addendum 7A/2025, para 1.10.1.4; **confirmed in the 2026 notification, para 1.10.1.15** |
| Other invalidation | Pen other than black ballpoint; stray remarks/marks; no signature | Addendum 7A/2025, para 1.10.1 |
| Cut-off | TNPSC does **not** publish cut-off marks. It publishes rank lists and register numbers called for verification. All cut-off numbers online are coaching estimates. StudyIQ estimated ~155 to 160 marks for General category in 2025. | [StudyIQ](https://www.studyiq.com/articles/tnpsc-group-4-cut-off/); I checked the official 2025 counselling list and it contains register numbers only |

Update (Nov 7): I have since read the official 2026 notification ([Tamil PDF](https://tnpsc.gov.in/document/tamil/group4_tamil.pdf), pages 23 and 79). The scheme, the 40% Part A gate, the −0.5 blank deduction, the −0.5 thumb-impression deduction and the booklet-number invalidation are all unchanged. It adds a −2 mark rule for a wrongly filled register number on a non-personalised OMR sheet. See `docs/ARCHITECTURE_AND_ANALYSIS.md`, Section 1.1.

**Current affairs warning:** Tamil Nadu's government changed in May 2026. C. Joseph Vijay (TVK) has been Chief Minister since May 10, 2026, and the new government presented a revised Budget 2026-27 in August. Scheme lists from the 2021 to 2026 government are history now, not current affairs.

### 2.1 Official unit-wise question distribution (Notification 11/2026)

TNPSC says the unit split is "indicative" and may vary slightly.

**Part A: Tamil (100 Qs)**

| Unit | Topic | Qs |
|---|---|---|
| I | இலக்கணம் (எழுத்து + சொல்): பிரித்து/சேர்த்து எழுதுதல், சந்திப்பிழை, குறில்/நெடில், ல/ள/ழ, ன/ண, ர/ற, இனவெழுத்து, சுட்டு/வினா எழுத்து, ஒருமை-பன்மை, வேர்ச்சொல் → வினைமுற்று/வினையெச்சம்/பெயரெச்சம்/வினையாலணையும் பெயர், அயற்சொல், எதிர்ச்சொல், எழுத்துப்/ஒற்றுப்பிழை | 25 |
| II | சொல்லகராதி: ஓரெழுத்து ஒருமொழி, ஒருபொருள் பன்மொழி, பொருந்தாச் சொல், அகர வரிசை, கோடிட்ட இடம், ஊர்ப்பெயர் மரூஉ, ஒரு/ஓர், பேச்சு வழக்கு → தூய தமிழ், இணைப்புச் சொற்கள் | 15 |
| III | எழுதும் திறன்: சொற்றொடர் அமைத்தல், செய்வினை/செயப்பாட்டுவினை, தன்வினை/பிறவினை, மரபுத் தமிழ் (திணை, பால், காலம், இளமைப்பெயர், ஒலிமரபு, வினைமரபு, தொகைமரபு), நிறுத்தற்குறிகள் | 15 |
| IV | கலைச்சொற்கள் (science, education, medicine, management, law, geography, technology, media, IT) | 10 |
| V | வாசித்தல்/புரிதல்: passages, news, editorials, government notices, உவமைத்தொடர், மரபுத்தொடர், பழமொழி, document contents | 15 |
| VI | எளிய மொழிபெயர்ப்பு: English → Tamil words (pendrive, printer...), document titles, files, letters, petitions | 5 |
| VII | இலக்கியம், தமிழ் அறிஞர்கள், தமிழ்த்தொண்டு (based on textbooks up to SSLC) | 15 |

**Unit VII Thirukkural: the official 20 chapters (only these)**

ஒழுக்கமுடைமை, பொறையுடைமை, ஊக்கமுடைமை, விருந்தோம்பல், அறன் வலியுறுத்தல், ஈகை, பெரியாரைத் துணைக்கோடல், வினை செயல்வகை, அவையஞ்சாமை, கண்ணோட்டம், அன்புடைமை, கல்வி, நடுநிலைமை, கூடா ஒழுக்கம், கல்லாமை, செங்கோன்மை, பண்புடைமை, நட்பாராய்தல், புறங்கூறாமை, அருளுடைமை.

Other Unit VII items: அறநூல்கள் (நாலடியார், நான்மணிக்கடிகை, பழமொழி நானூறு, முதுமொழிக்காஞ்சி, திரிகடுகம், இன்னா நாற்பது, சிறுபஞ்சமூலம், ஏலாதி, ஔவையார் பாடல்கள்); antiquity of Tamil and Dravidian languages; உ.வே.சா, தெ.பொ.மீ, சி.இலக்குவனார், தேவநேயப் பாவாணர், அகரமுதலி, பெருஞ்சித்திரனார், ஜி.யு.போப், வீரமாமுனிவர்; பாவேந்தர், டி.கே.சி, குன்றக்குடி அடிகளார், கண்ணதாசன், காயிதே மில்லத், தாரா பாரதி, வேலுநாச்சியார், பட்டுக்கோட்டை கல்யாணசுந்தரம், முடியரசன், தமிழ் ஒளி, உருத்திரங்கண்ணனார், கி.வா.ஜ, நாமக்கல் கவிஞர்.

Sources: the official Annexure III text (Code 496) as hosted by [Adda247 (PDF)](https://www.adda247.com/jobs/wp-content/uploads/sites/22/2026/05/06161206/TNPSC-Group-4-Syllabus.pdf), and the same text reproduced from Notification 11/2026 by [Veranda RACE](https://verandarace.com/blog/tnpsc-group-4-exam-syllabus). Some coaching web pages (including Adda247's own syllabus article) still print the old 25-chapter list. Trust the notification PDF.

**Part B: General Studies (75 Qs)**

| Unit | Topic | Qs |
|---|---|---|
| I | General Science | 5 |
| II | Geography | 5 |
| III | History & Culture of India + Indian National Movement (named leaders list) | 10 |
| IV | Indian Polity | 15 |
| V | Indian Economy + Development Administration in Tamil Nadu | 20 |
| VI | History, Culture, Heritage & Socio-Political Movements of Tamil Nadu (includes Thirukkural as secular literature) | 20 |

Current affairs is not a separate unit. It is listed inside Units I, II, IV, V and VI.

**Part C: Aptitude (15):** Simplification, Percentage, HCF, LCM, Ratio & Proportion, Simple Interest, Compound Interest, Area, Volume, Time & Work. **Reasoning (10):** Logical reasoning, Puzzles, Dice, Visual reasoning, Alpha-numeric reasoning, Number series.

---

## 3. Line-by-line audit of the two AI reports

### 3.1 ChatGPT report

| Claim | Verdict | Correct fact |
|---|---|---|
| Part C is the Tamil test | **Wrong** | Part A is Tamil. Part C is Aptitude. |
| "−0.5 penalty for each wrong answer" | **Wrong** | Wrong answers carry no penalty. The 0.5 deduction is for a **blank** (no bubble shaded). |
| "Use E for blanks" | Half right | [E] avoids the blank deduction but scores 0. With no wrong-answer penalty, a guess among A to D is worth +0.375 marks on average (1.5 × 1/4), and +0.75 if you narrow it to two options. |
| "Exam gate is 60/100" | Wrong unit | The gate is 60 **marks** out of 150, which is 40 correct out of 100. |
| "If you choose English-medium, Part A will be English grammar" | **Wrong** | General English replaces Tamil only for eligible differently-abled candidates. You will write the Tamil test. |
| Tamil = 37% literature, 26% grammar | Outdated | That describes the old syllabus. Under the current one, literature is 15 of 100 Qs. |
| Current affairs ≈ 2 to 3% | Unverified, and misleading | Current affairs is spread across five GS units. It is not one small bucket. |
| "Two full 200-Q mocks per week from Week 8" | Not possible | A mock takes 3 hours. Your weekend budget is 4 hours. Two mocks a week would leave no review time. |
| Weekly 100-Q Tamil mock | Too expensive | That is 75 minutes a week. Three Tamil sectionals over the whole plan is enough. |
| "Read Samacheer TN History, make notes" | Too slow | You have 83 hours. Reading textbooks end to end does not fit. |
| App: runtime scraping, RSS + auto-generated Qs, ML analytics, peer rank, badges | Over-scoped | See Section 6. |
| Agent prompt: "scrape 2013 to 2026 papers" | Partly impossible | There was no Group 4 exam in 2026. Old papers follow the old Tamil syllabus. |

**What to keep from ChatGPT:** the error log, the weekend review habit, the advice not to cram new material in the last week, and the idea of tagging questions by unit.

### 3.2 Gemini report

| Claim | Verdict | Notes |
|---|---|---|
| Dates, 6,574 vacancies, correction window, 83-hour budget | **Correct** | Verified. |
| Part A Tamil 100 / B GS 75 / C Aptitude 25, gate 60 marks | **Correct** | |
| 7-unit Tamil split 25/15/15/10/15/5/15 | **Correct** | Matches Annexure III. |
| Thirukkural: "25 chapters: Anbu, Panbu, Kalvi, Kelvi, Arivu..." | **Wrong (outdated)** | The current list is the 20 chapters in Section 2.1. Only 8 chapters appear in both lists (அன்புடைமை, பண்புடைமை, கல்வி, ஈகை, பெரியாரைத் துணைக்கோடல், ஊக்கமுடைமை, ஒழுக்கமுடைமை, பொறையுடைமை). The other 12 are new. If the app had been seeded with the old list, you would have memorised the wrong chapters. |
| No negative marking, −0.5 per blank, never leave a blank, prefer guessing over [E] | **Correct** | Matches Addendum 7A. One ambiguity: the official text can be read as 0.5 per blank question or 0.5 once in total. It doesn't change the strategy. The app should model the stricter reading (0.5 per blank). |
| "−5 marks for missing booklet number" | **Wrong (outdated)** | Under the 2025 rules, an unshaded or wrong booklet number **invalidates the answer sheet**. The −5 rule appeared in 2021 news reports. |
| Thumb impression rule | Missing | Missing left-thumb impression costs 0.5 marks. |
| July 2025 actual unit tally (24/17/14/10/7/3) and "84% statement-format GS" | **Unverified** | Attributed to PrepMatic. I couldn't find the source. Treat it as a hypothesis. The app's first analysis job is to measure this from the actual 2025 paper. |
| Cut-off quotes (Asan Academy 200 to 215, etc.) | Unverifiable | All coaching estimates. See Section 4 for a planning target. |
| "Group 2 Prelims shares the same GS syllabus" | Overstated | Group 2 is degree standard. Its GS topics overlap, but the questions are harder. Use it only for practising statement-style questions. |
| Polynomial HCF/LCM as a time sink | Plausible | Polynomial HCF/LCM is in the SSLC maths syllabus. Practise a few, but don't build the plan around it. |
| Science/Geo: PYQs only, no textbook reading | **Agree** | 10 Qs combined. |
| Vibe-code the app in 3 hours | Unrealistic for content | The UI can be built fast. Extracting and verifying the papers is the real work (Section 6). |
| Multimodal LLM extraction instead of PDF text/OCR | **Agree, and confirmed** | The official 2025 final answer key PDF has **no text layer** (scanned). Older Tamil PDFs extract as legacy-font garbage (for example "kw;Wk" instead of Tamil). |
| Hard-coded model names ("Gemini 2.5 Flash") | Fix | Choose the model at build time. Don't hard-code it into the design. |
| Target 140 correct (210 marks) | Ambitious | See Section 4. |

**What to keep from Gemini:** the Pareto ordering (Part A, then Units V and VI, then Aptitude, then Polity), studying Part A Unit VII together with GS Unit VI as one block, statement-style practice for GS, the exam-day time split (70/30/60/20), the error classification buckets, multimodal ingestion, and the warning about spending your prep time on building.

---

## 4. Realistic targets

The exam ranks you against ~14 lakh candidates. No plan guarantees selection. Plan against estimated cut-offs and leave a margin.

| Level | Correct Qs | Marks | Part A / C / B |
|---|---|---|---|
| Gate (must clear) | 40 in Part A | 60 | Non-negotiable |
| Estimated 2025 General cut-off (coaching estimate) | ~104 to 107 | ~155 to 160 | |
| **Your planning target** | **120** | **180** | 72 / 20 / 28 |
| Stretch target | 135 | ~200 | 78 / 22 / 35 |

Why this split: your Tamil reading ability helps directly in Part A Units I to VI (85 Qs of rule-based language questions), and your MCA background makes Part C the cheapest marks per hour. GS gives the fewest marks per hour, so the plan concentrates on its two Tamil Nadu units (40 Qs indicative).

Track progress with these mock numbers. Change the plan if you miss them.

- Mock 1 (Dec 13): 100+ correct
- Mock 2 (Dec 27): 112+ correct
- Mock 3 (Jan 3): 120+ correct, with zero blanks every time

---

## 5. Final study plan (83 hours)

### 5.1 Hour allocation

| Area | Qs | Hours | Why |
|---|---|---|---|
| Part A Units I to VI (functional Tamil) | 85 | 24 | Biggest block, rule-based, and you already read Tamil |
| Part A Unit VII + 20 Thirukkural chapters | 15 (+ GS overlap) | 8 | Bounded list. Kural questions also appear in GS Unit VI. |
| GS Unit VI (TN history, culture, movements) | 20 | 9 | Overlaps with Unit VII |
| GS Unit V (Economy + TN development admin) | 20 | 8 | Schemes, social justice, TN economy |
| GS Unit IV (Polity) | 15 | 6 | Statement-style practice |
| GS Unit III (History + INM) | 10 | 3 | Named leaders, TN movements |
| GS Units I and II (Science, Geography) | 10 | 2 | Past papers only |
| Part C Aptitude + Reasoning | 25 | 8 | Listed topics only, speed drills |
| Diagnostic + 3 full mocks + 1 Tamil sectional | | 12 | Real timing and OMR practice |
| Mock review and error log | | 3 | |
| **Total** | | **83** | |

### 5.2 Daily templates

**Weekday (60 min)**
1. 0 to 10 min: review queue in the app (yesterday's errors, Thirukkural cards, கலைச்சொல் cards).
2. 10 to 40 min: the week's main topic (micro-notes, then examples).
3. 40 to 55 min: 15 timed questions on the same topic (past papers first, then app-generated).
4. 55 to 60 min: tag each error with a reason (Concept gap / Memory slip / Misread "NOT/incorrect" / Calculation / Guess / Time).

**Weekend (120 min)**
1. 60 min of a heavier topic.
2. 45 min timed sectional on the week's topics.
3. 15 min error review.

**Mock weekends (Dec 12 to 13, Dec 26 to 27, Jan 2 to 3):** Saturday 1 h of light revision. Sunday 3 h mock at the real exam time (9:30 to 12:30) on a printed OMR sheet. Review the mistakes in the following weekday sessions. This assumes you can move one hour from Saturday to Sunday on those weekends (see Section 8).

### 5.3 Week-by-week schedule

| Week | Dates | Main focus | Side tracks | Checkpoint |
|---|---|---|---|---|
| 1 | Sat Nov 7 to Fri Nov 13 | **Sat Nov 7:** `docs/study/DAY01_SAT_NOV07.md` (correction-window checklist, syllabus self-rating, 20-question aptitude baseline, first 2 Kural chapters). **Sun Nov 8 to Fri:** Unit I எழுத்து (சந்திப்பிழை, ல/ள/ழ, ன/ண, ர/ற, குறில்/நெடில், பிரித்து/சேர்த்து) | Aptitude: simplification, %, HCF/LCM. Kural chapters 3 to 5. | Correction window Nov 9 to 11 |
| 2 | Nov 14 to 20 | **Sat Nov 14: diagnostic** in the app (clean 2025 Part A 70 min + Part C 30 min + 20 min review). The official PDFs have answers ticked, so the clean copy comes from the app. Then Unit I சொல் (வேர்ச்சொல் → verb forms, அயற்சொல், எதிர்ச்சொல்) + Unit II (ஓரெழுத்து ஒருமொழி, மரூஉ, பேச்சு → எழுத்து வழக்கு, connectors) | Aptitude: ratio, SI, CI. Kural 6 to 9. | |
| 3 | Nov 21 to 27 | Unit III (மரபுத் தமிழ், voice, punctuation) + Unit IV கலைச்சொற்கள் (end-of-lesson glossaries, Samacheer 6 to 10) | Aptitude: area, volume, time & work. Reasoning: series, alpha-numeric, dice, puzzles. Kural 9 to 13. | Part C ≥ 20/25 on a timed set |
| 4 | Nov 28 to Dec 4 | Unit V (passages, மரபுத்தொடர், பழமொழி) + Unit VI (translation) + Unit VII (அறநூல்கள், scholars list). **Sun Nov 29: Tamil sectional, 100 Qs in 70 min.** | Kural 14 to 20 (all 20 done). | Part A ≥ 70/100 |
| 5 | Dec 5 to 11 | GS Unit VI: Tamil society and archaeology, Sangam to modern literature, Thirukkural (secular values), TN in the freedom struggle, early uprisings, women, social reform movements | 10 min aptitude drill twice a week | |
| 6 | Dec 12 to 18 | GS Unit V: economy basics (plans, NITI Aayog, RBI, Finance Commission, GST), TN social justice and reservation history, TN welfare schemes, education and health systems, TN geography and the economy. **Sun Dec 13: Full Mock 1** (official 2024 Group 4 paper) | | ≥ 100 correct |
| 7 | Dec 19 to 25 | GS Unit IV Polity, practised as true/false statement sets (Preamble, FR, DPSP, FD, Union/State executive and legislature, local government, federalism, judiciary, Lokpal/RTI, consumer rights, human rights) | Kural revision | |
| 8 | Dec 26 to Jan 1 | GS Unit III (dynasties at speed, INM + the syllabus's named leaders, TN agitations) + Units I and II via past-paper questions. **Sun Dec 27: Full Mock 2** (assembled to the 2026 blueprint) | | ≥ 112 correct |
| 9 | Jan 2 to 8 | **Sun Jan 3: Full Mock 3** (assembled, or a free online mock with a printed OMR sheet). Rest of week: error-log review only, no new topics | | ≥ 120 correct, 0 blanks |
| | Sat Jan 9 | 2 h light review: formula sheet, ஓரெழுத்து, கலைச்சொற்கள், scheme launch years, 20 Kural chapter names. Check hall ticket, black ballpoint pens, ID photocopy, route. | | |

About past papers: only the 2025 paper follows the current Tamil syllabus. Older papers (2024, 2022, 2019 and earlier) are still good for GS, Aptitude, and the grammar items that carried over. Keep the 2025 paper's Part B unseen so it can be part of Mock 2 or 3. Use its Part A + C only for the diagnostic.

### 5.4 Exam-day protocol (rehearse in every mock)

1. Part A first (70 min). Clearing the gate comes first. Shade the OMR as you go.
2. Part C next (30 min). Skip any question that takes more than 90 seconds and come back to it.
3. Part B (60 min). Underline "NOT" and "incorrect" in every statement-style question.
4. Buffer (20 min): go back to skipped questions. **Shade A to D for every question.** Don't leave any blank, and don't fall back on [E] when you can eliminate even one option.
5. In the 15 minutes after the exam, write and shade the counts of A, B, C, D and E. Check the booklet number (a mistake here invalidates the sheet), your signature, and your left-thumb impression (missing costs 0.5). Black ballpoint pen only.

---

## 6. App architecture review (as your principal architect)

### 6.1 What to correct in your original idea

| Your idea | Problem | Recommendation |
|---|---|---|
| The app fetches live questions and answers from the internet | Coaching sites are unstructured, often paid content, and break scrapers. Runtime AI on the phone means shipping an API key inside the APK, and anyone can extract it. | **Pre-built content packs.** A script on your laptop builds versioned JSON packs. The phone downloads a pack or loads it on install. No scraping and no secrets on the device. |
| AI generates daily questions | LLMs make up Tamil grammar rules and article numbers. The official answer key has to stay the authority. | AI can **format, tag, explain and vary** questions only when it is given source text. AI never decides the answer to a past-paper question; the official key does. Every AI item carries a `source` and a `verified` flag. |
| 10 years of question papers | Pre-2025 papers follow the old Tamil syllabus. | Ingest everything available, but tag each question with its `syllabusEra` (`OLD` / `2025+`) and map it to the current unit. Practice selection prefers `2025+` for Part A. |
| A full-featured platform | Builder's trap: you would be maintaining an app instead of studying. | MVP = 5 screens (6.3). App building time is **separate** from your 83 study hours. |

### 6.2 Recommended architecture

```
LAPTOP (one-time + weekly)                       PHONE (offline-first)
-----------------------------                    -----------------------------
Official PDFs (tnpsc.gov.in,                     Android app (React + TS UI)
  tntextbooks.in)                                  ├─ Content packs (JSON, versioned)
   │  render pages → PNG                           ├─ Local DB (SQLite via Capacitor
   ▼                                               │    or IndexedDB/Dexie)
Multimodal LLM extraction → JSON per page          ├─ Practice / PYQ / Flashcards /
   ▼                                               │    Mock (OMR) / Error log
Join with official final answer key                └─ Optional: "Update pack" button
   ▼                                                    (downloads JSON from a static URL,
Validator (schema, 4 options, key present,              e.g. GitHub Pages; no API keys)
  unit tag, Tamil Unicode check)
   ▼
10% human spot-check → publish pack
Weekly: "daily pack" script = current-affairs
  items generated from cited sources + PYQ
  variants → validator → publish
```

**Android packaging (you decide, see Section 8):**

| Option | Effort | Result | My pick |
|---|---|---|---|
| A. PWA (Vite + React), installed to home screen | Lowest | Works offline. Not in the Play Store. | Good |
| B. Same React app wrapped with **Capacitor** → APK | +30 to 60 min | Real Android app, SQLite available. The same code still runs on the web. | **Recommended** |
| C. Expo / React Native | Higher | Fully native UI | Not worth it for 64 days |

### 6.3 MVP scope (build only this first)

1. **Today**: the day's plan from Section 5.3, the review queue, and 15-question sets.
2. **Practice**: filter by Part, Unit, year, format; one question at a time; tap to eliminate options; confidence tag (Sure / 50-50 / Guess); explanation after answering.
3. **Flashcards**: 20 Kural chapters (couplets + meaning + chapter), கலைச்சொற்கள், ஓரெழுத்து ஒருமொழி, ஊர்ப்பெயர் மரூஉ, scheme → year, leader → event. Leitner boxes at 1/3/7/14 days, which is enough for 64 days. Skip FSRS.
4. **Mock (OMR)**: 200 Qs, 180-min timer with a 70/30/60/20 pacing guide, five bubbles A to E. Scoring: +1.5 correct, 0 wrong, 0 for E, −0.5 per blank. A Part A < 60 warning that zeroes B + C. Separate accuracy for "Sure" vs "Guess" answers.
5. **Error log**: every wrong or guessed question with its reason tag, fed back into the review queue.

**Defer (YAGNI):** charts, adaptive difficulty, badges, notifications, peer ranking, cloud sync. A one-tap JSON export/import is enough for backup.

### 6.4 Data model essentials

- `Question`: id, part (A/B/C), unit (A1 to A7, B1 to B6, C1 to C2), format (ONE_LINER, STATEMENT, ASSERTION_REASON, MATCH, CHRONOLOGY, PASSAGE), `stem {ta, en}`, `statements[]`, `matchTable {left[], right[]}`, `passageId`, `options[4] {ta, en}`, `answer` (A to D), `explanation {ta, en, source, aiGenerated}`, `source` (PYQ_G4_2025, PYQ_G4_2024, ..., SAMACHEER_10_TAMIL, AI_VARIANT, CA_2026_11), `year`, `syllabusEra`, `verified`, `deletedByTnpsc` (some questions get dropped in final keys).
- `Attempt`: questionId, chosen (A to E or BLANK), eliminated[], confidence, ms, correct, mode (practice/mock), timestamp.
- `ErrorItem`: questionId, reason, box (Leitner), nextReview.
- `Card`: deck, front, back, source.

### 6.5 Content pipeline effort (the real cost)

| Item | Approx. size | Notes |
|---|---|---|
| 2025 Group 4 paper + final key | 200 Qs | Priority 1. The only past paper on the current Tamil syllabus. |
| 2024, 2022, 2019 Group 4 papers + keys | 600 Qs | Priority 2 (GS + Aptitude + grammar) |
| Samacheer 6 to 10 Tamil: கலைச்சொற்கள், book-back questions, author/work tables | ~1,000 cards | Priority 1 for Units II, IV, VII |
| 20 Kural chapters | 200 couplets | Priority 1. Use a public-domain text and verify every couplet. |
| GS micro-notes per unit | ~40 pages | Generated only from Samacheer/government text that you supply as input |

Final answer keys are listed at [tnpsc.gov.in/English/answerkeys.aspx](https://www.tnpsc.gov.in/English/answerkeys.aspx) (2025, 2022, 2019, 2016 and others are listed there).

Rule: don't wait for the pipeline. Weeks 1 and 2 of the study plan can run on the PDFs themselves while the app is being built.

---

## 7. Final prompt for your agentic IDE (Phase 1: analysis only)

**Done.** The analysis this prompt asks for is in `docs/ARCHITECTURE_AND_ANALYSIS.md`. The prompt is kept below for reference only.

```
ROLE
Act as a principal software architect (offline-first mobile apps, content pipelines,
applied LLMs) and a TNPSC Group 4 exam strategist.

CONTEXT
I am a software engineer (MCA) preparing for TNPSC Group 4 (CCSE-IV), Notification
No. 11/2026, exam on Sunday 10 Jan 2027, 9:30 AM–12:30 PM. Study budget: 83 hours
(1 h Mon–Fri, 2 h Sat–Sun, Nov 7 2026 – Jan 9 2027). App-building time is separate
from study time. I want a personal Android app (single user) for learning, past-
paper practice, flashcards, OMR mock tests and an error log. My approved study
plan is in docs/TNPSC_G4_FINAL_PLAN.md — read it fully first; treat Sections 2 and
5 as requirements.

THIS TURN: ANALYSIS ONLY
Do NOT write application code or scaffold the project. Produce
docs/ARCHITECTURE_AND_ANALYSIS.md for my review.

VERIFIED EXAM RULES (do not change; flag anything you believe is outdated)
- 200 Qs, 1.5 marks each, 300 marks, 180 min, SSLC standard, OMR with bubbles A–E.
- Part A Tamil Eligibility-cum-Scoring Test: 100 Qs. Must score ≥ 60 marks (40
  correct) or Parts B and C are not evaluated. Part A counts toward rank.
  Units: I Grammar 25, II Vocabulary 15, III Writing skills 15, IV Technical terms
  10, V Reading/idioms/proverbs 15, VI Translation 5, VII Literature & scholars 15.
  Thirukkural: ONLY these 20 chapters: ஒழுக்கமுடைமை, பொறையுடைமை, ஊக்கமுடைமை,
  விருந்தோம்பல், அறன் வலியுறுத்தல், ஈகை, பெரியாரைத் துணைக்கோடல், வினை செயல்வகை,
  அவையஞ்சாமை, கண்ணோட்டம், அன்புடைமை, கல்வி, நடுநிலைமை, கூடா ஒழுக்கம், கல்லாமை,
  செங்கோன்மை, பண்புடைமை, நட்பாராய்தல், புறங்கூறாமை, அருளுடைமை.
- Part B General Studies: 75 Qs. I Science 5, II Geography 5, III History & INM 10,
  IV Polity 15, V Economy & TN Development Administration 20, VI TN History,
  Culture & Socio-Political Movements 20 (indicative).
- Part C Aptitude 15 (Simplification, %, HCF, LCM, Ratio, SI, CI, Area, Volume,
  Time & Work) + Reasoning 10 (Logical, Puzzles, Dice, Visual, Alpha-numeric,
  Number series).
- Scoring: correct +1.5; wrong 0; [E] 0; blank (no bubble) −0.5 (model per blank);
  missing thumb impression −0.5; wrong/unshaded booklet number = sheet invalid.

HARD CONSTRAINTS
1. Offline-first. All study content ships as versioned JSON content packs. No
   runtime web scraping. No LLM API keys inside the app.
2. Content is produced by a laptop-side pipeline (scripts), not by the app.
3. Past-paper answers come ONLY from official TNPSC final answer keys. LLMs may
   extract text, tag units/formats, write explanations and create variants, but
   never decide a PYQ answer. Every item carries source + verified flag; AI items
   are visibly labelled.
4. PDFs are scanned or use legacy Tamil fonts: use page images + multimodal LLM
   extraction to UTF-8 Tamil/English JSON. Do not rely on PDF text layers or
   Tesseract.
5. Single user. No auth, no backend servers, no Docker, no queues. An optional
   static URL (e.g. GitHub Pages) for downloading new packs is allowed.
6. Model/provider must be configurable; do not hard-code a model version.
7. MVP = Today, Practice, Flashcards (Leitner 1/3/7/14), OMR Mock, Error log.
   Everything else is listed as "deferred".

REQUIRED SECTIONS
1. Packaging decision: compare (A) PWA, (B) React + Capacitor APK, (C) Expo on
   build time, offline storage, Tamil font rendering, APK install path. Recommend one.
2. Content inventory: list every official source to ingest (TNPSC Group 4 papers
   and final keys by year with URLs where found; Samacheer 6–10 Tamil and Social
   Science books; TN government free study material), mark syllabusEra, and
   estimate item counts. Mark anything you could not verify.
3. Ingestion pipeline: step-by-step (download → render → extract → key join →
   validate → spot-check → pack), including handling of multiple booklet series,
   questions deleted in final keys, passages shared across questions, match tables,
   and bilingual stems. Include the validation rules and a cost/time estimate.
4. Data schemas as TypeScript interfaces: Question (bilingual, statements[],
   matchTable, passageId, unit, format, source, year, syllabusEra, verified,
   deletedByTnpsc, explanation{ta,en,source,aiGenerated}), Attempt (chosen A–E or
   BLANK, eliminated[], confidence SURE/FIFTY_FIFTY/GUESS, ms, mode), ErrorItem
   (reason CONCEPT/MEMORY/MISREAD_NOT/CALC/GUESS/TIME, Leitner box, nextReview),
   Card, ContentPack manifest.
5. Pattern analysis job: specify the script that, after ingestion, reports per paper
   and per unit: question counts, format mix (one-liner / statement / assertion-
   reason / match / chronology / passage), and top recurring topics. This replaces
   any unverified third-party percentages.
6. LLM prompts (exact system prompts + JSON output schemas) for: (a) page extraction,
   (b) unit/format tagging, (c) grounded explanation from supplied source text,
   (d) statement/assertion-reason variant from a supplied fact, (e) weekly current-
   affairs items from supplied cited articles. Each must refuse when source text is
   insufficient.
7. Screen-by-screen mobile UX for the 5 MVP screens, including option elimination,
   confidence tagging, Tamil/English toggle, OMR mock with 70/30/60/20 pacing,
   Part A gate warning, blank counter, and Sure-vs-Guess accuracy.
8. Build plan: ordered steps with a time box per step and a "usable by" milestone,
   where Week-1 study content (2025 paper Part A + C, Kural chapters, Unit I/II
   cards) is available first.
9. Risks and open questions for me.

Write precisely. Where you are unsure of a fact, say so instead of guessing.
```

---

## 8. Decisions I need from you before we build

**Answered on Nov 7:** building happens outside study hours; mock Sundays are confirmed; the APK is installed from GitHub; AI is optional (₹0 default, ₹300/month cap); preferred posts are VAO or Junior Assistant, not forest. Remaining open questions are in `docs/ARCHITECTURE_AND_ANALYSIS.md`, Section 9.

1. **Build time:** confirm that app building comes out of your free time and not the 83 study hours.
2. **Mock Sundays:** can you study 3 hours on Dec 13, Dec 27 and Jan 3 (and only 1 hour on the Saturday before each)?
3. **Android packaging:** Option B (Capacitor APK) is my recommendation. Do you agree, or would you rather have A or C?
4. **LLM access:** which API do you have (Gemini, OpenAI, Claude) and what monthly budget? Extracting about 1,000 past-paper questions is a one-time cost.
5. **Post interest:** Junior Assistant or VAO? Typist and Steno posts need typewriting/shorthand certificates. This doesn't change the study plan, but it matters at counselling.

---

## 9. Sources

- Notification 11/2026 summaries: [FreeJobAlert](https://www.freejobalert.com/articles/tnpsc-group-iv-recruitment-2026-apply-online-for-6-574-posts-3071375), [Adda247](https://www.adda247.com/exams/tn/tnpsc-group-4-notification-2026-out/), [Times of India](https://timesofindia.indiatimes.com/education/news/tnpsc-group-4-notification-2026-released-at-tnpsc-gov-in-for-6574-vacancies-apply-here/articleshow/134779019.cms), [Indian Express](https://indianexpress.com/article/education/tnpsc-group-4-notification-2026-applications-begin-6574-posts-tnpsc-gov-in-10912245/)
- Deadline extension and age limit: [Jagran Josh](https://www.jagranjosh.com/articles/tnpsc-group-4-apply-online-2026-last-date-extended-to-nov-8-check-direct-link-fees-and-more-1800018698-1), [Careers360](https://news.careers360.com/tnpsc-group-4-2026-5-year-age-limit-increase-application-deadline-nov-8-tamil-nadu-govt-jobs)
- Syllabus (Annexure III, Code 496): [PDF via Adda247](https://www.adda247.com/jobs/wp-content/uploads/sites/22/2026/05/06161206/TNPSC-Group-4-Syllabus.pdf), [Veranda RACE transcription of 11/2026](https://verandarace.com/blog/tnpsc-group-4-exam-syllabus)
- OMR and marking rules: [TNPSC Addendum 7A/2025](https://tnpsc.gov.in/Document/english/Addendum%207A%202025_ENGLISH_GROUP4.pdf), [TNPSC invigilator instructions](https://tnpsc.gov.in/static_pdf/ci_inst/05_Duties%20of%20Invigilator_OBJ.pdf)
- 2025 results and candidate count: [TNPSC Press Release 142/2025](https://tnpsc.gov.in/document/pressenglish/PR_1422025_ENG.pdf)
- Answer keys index: [tnpsc.gov.in/English/answerkeys.aspx](https://www.tnpsc.gov.in/English/answerkeys.aspx)
- Cut-off estimate: [StudyIQ](https://www.studyiq.com/articles/tnpsc-group-4-cut-off/)

Content from these sources was rephrased for compliance with licensing restrictions, except the official syllabus lists, which are reproduced because they are the requirement.
