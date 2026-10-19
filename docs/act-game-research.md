# ACT campaign: research and implementation

Research checked October 18, 2026. The approved white/navy/cobalt/lilac design remains the visual authority. The new work changes how students play through practice, using actual passage and problem contexts rather than four abstract puzzle mechanics.

## Primary sources inspected

- [ACT English description](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-english-test.html): editing in passage context, highlighted text online, NO CHANGE where offered, whole-passage writing decisions, and the three reporting categories.
- [ACT Math description](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-math-test.html): predominantly self-contained problems plus some shared stimulus sets; higher mathematics, essential skills, and modeling across categories.
- [ACT Reading description](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-reading-test.html): single/paired texts, evidence, inference, craft, purpose, and visual or quantitative information. Vocabulary remains contextual.
- [ACT Science description](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/description-of-science-test.html): interpreting data, evaluating experiments, reasoning about models and explanations; data representation, research summaries, and conflicting viewpoints. Science does not permit a calculator.
- [Enhanced ACT FAQ](https://www.act.org/content/act/en/products-and-services/the-act-educator/the-act-test/enhancements-k12/faqs.html): current section sizes and standard timing: English 50/35 minutes, Math 45/50, Reading 36/40, Science 40/40. School-contract Science optionality differs from individual registration; our account switch controls study planning, not test eligibility.
- [Preparing for the ACT 2025–2026](https://www.act.org/content/dam/act/unsecured/documents/Preparing-for-the-ACT-e.pdf), especially the English instructions and sample pages: nearby and whole-passage context matters. Not every question asks for an edit, and an unchanged original can be correct. The paper layouts were examined for numbered edits and passage references.
- [Official Practice Test 2](https://www.act.org/content/dam/act/unsecured/documents/ACT-Test-Prep-ACT-Practice-Test-2-Form.pdf): inspected the second full practice form's structure rather than treating one sample as the entire domain.
- [2026 design framework](https://www.act.org/content/dam/act/unsecured/documents/R2519-Design-Framework-for-the-ACT-Enhancements-2026-02.pdf), current blueprint tables around printed pages 72–73 and the English/Reading panel discussion: English includes argumentative writing, claims, supporting evidence, and counterarguments. Passage lengths and item counts vary. Reading uses literary/informational material, paired sources, and visual information across forms. This campaign is short practice; it does not claim to duplicate the full blueprint's distribution or field-test construction.
- [Official free-practice directory](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep.html) and [sample-question directory](https://www.act.org/content/act/en/products-and-services/the-act/test-preparation/free-act-test-prep/act-online-test-sample-questions.html): verified current access to digital/paper forms and the subject samples. The English sample interface was inspected directly in Codex's browser: complete passage, selected highlight, answer options, navigation, and tools. A legacy count in its illustrative help image was not treated as the current instructions; its actual English directions specify 50 questions.
- [ACT calculator policy](https://www.act.org/content/dam/act/unsecured/documents/ACT-calculator-policy.pdf): calculator use belongs to Math. The campaign reuses the app's ACT Desmos tool there and provides no calculator in Science.

## Translation into play

The game loop is **read the board → choose an answer → lock the move → see the rule and trap → next round → clear the mission**. The question itself remains an ACT-style multiple-choice decision. Feedback comes after a saved answer, so the rule name does not give away which method to use before committing.

- **English:** five new, original passages and 37 original questions cover 14 topic families. They include narrative/informational and argumentative material; grammatical edits, valid NO CHANGE answers, transitions, tone, concision, logical placement, additions/deletions, claims, counterarguments, and conclusions. Highlighted spans, numbered references, paragraph labels, and placement markers remain in the full passage. These short missions are not full official-length forms.
- **Math:** the existing independent problem bank is divided into short, stable sets while retaining each problem, diagram, notation, four choices, and canonical answer. Calculator access remains optional.
- **Reading:** questions remain with their complete shared passage, including paired/source-comparison contexts and existing visuals. Students must interpret the actual text rather than move a sentence token in an unrelated puzzle.
- **Science:** questions remain attached to the actual experimental context and tables/graphs/diagrams. Comparisons, variables, controls, trends, predictions, scientific knowledge, and competing explanations retain their original stems and choices.

The frozen manifest contains 199 existing-bank missions (892 questions); the five English passage missions bring the campaign to **204 missions and 929 questions**. Reserved timed-test questions and teaching-only checks are excluded. Existing banks, their IDs, their choices, and historical grades are unchanged. Some campaign questions may have been practiced elsewhere; first-attempt stars refer to this mission, not a guaranteed unseen assessment.

## Game and persistence contract

Each mission has a connected map node, saved round markers, a clear ending, and up to three stars: one for completion, two at 60% first-attempt accuracy, three at 85%. These are product rules, not ACT scoring rules. Reviews earn no additional stars. A wrong first answer remains wrong in the saved record; its explanation supports learning without rewriting evidence.

Mission records use a separate versioned record type and stable per-account/per-mission identity in the existing owner-isolated storage. Answer and next-round writes use revision checks; duplicate retries cannot mint new progress, and a stale tab cannot replace another tab's move. Current position and feedback survive reload. Daily XP, course coverage, saved exams, preferences, and earlier answers keep their existing identities and behavior.

The familiar course and Daily teaching remain available. Campaign entry is integrated into Today, Play navigation, the practice hub, lesson transfer, and progress. Phone views switch between the complete passage/evidence and the current question; desktop shows them side by side.

## Limits

Research establishes format requirements, not the effectiveness of this implementation. Stars are not an official scaled score or a guarantee of proficiency. Original content receives automated structure/key checks and a source/answer review, but is not ACT-approved or independently calibrated. Official questions and passages were studied and linked, not republished into this bank. Physical-device, screen-reader, and controlled learning-outcome validation remain separate from browser and integration QA.
