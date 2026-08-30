# ResultLens — Explainable School GPA Engine

**Team ID:** `LSH26-T065`  
**Problem ID:** `P08`  
**Tier:** `02`  
**Repository:** `lsh26-t065-p08`  
**Live URL:** `TODO: add deployed URL before submission`

ResultLens converts raw student marks into deterministic subject grade points, final GPA and letter results, then keeps a full calculation trace so the school can explain *why* each result happened before publishing it.

## Run and verify

There is **no build step and no third-party runtime dependency**.

```bash
npm run serve
# open http://127.0.0.1:4174
```

Run the grading-engine suite:

```bash
npm test
```

The organizer fixture `data/P08_school_results_public.json` loads automatically. **Load JSON** accepts the public wrapper or one hidden/judge P08 case in the same published shape.

## 60-second judge verification path

1. Open the live URL and switch between organizer cases. Confirm 60+ students across two classes are processed from raw marks. **R1**
2. In **Student results**, inspect GPA, letter and pass/fail for several students. Practical subjects, optional bonus and compulsory-failure override use only the published rules. **R2**
3. Click **View trace** on a student. Every subject shows the actual mark(s), GP and exact deciding rule. For a strong-average student with a compulsory failure, the uncancelled average remains visible while the final result is `0.00 / F`. **R3**
4. Open all three **Teacher checking lists**. Optional `<=2/AB`, practical `<8` and any `AB` are generated independently, so one student may appear in multiple lists. **R4**
5. Optional bonus proof: use **Paste JSON** with a malformed student row. Valid rows are processed while rejected rows are displayed with the exact validation reason.

## Required-item proof

| Requirement | Implementation evidence |
|---|---|
| **R1 — Student dataset** | Public judge cases load directly with 60+ students, two classes, exactly six compulsory subjects plus one optional subject/student. Practical marks remain separate theory/practical values and `AB` remains a distinct state. |
| **R2 — Exact result engine** | `src/results.js` implements the supplied grade bands, theory `>=25/75`, practical `>=8/25`, optional `max(0, GP-2)`, divisor `6`, cap `5.00`, and compulsory-failure override. Automated tests cover every boundary. |
| **R3 — Per-student trace** | The trace is rendered from the same evaluated result objects as the GPA. It includes real marks, per-subject GP, exact applied rule, failure reason, optional contribution, uncancelled average and final GPA. |
| **R4 — Checking lists** | Clarification R-29 is implemented literally: optional GP `<=2.0`/AB, practical part `<8`, and any `AB`; list membership can overlap. |

## Published grading rules used

Whole-subject grade points:

- `80-100 -> 5.0`
- `70-79 -> 4.0`
- `60-69 -> 3.5`
- `50-59 -> 3.0`
- `40-49 -> 2.0`
- `33-39 -> 1.0`
- `<33 -> 0 / fail`

Practical subjects must pass **both components separately**: theory `>=25/75` and practical `>=8/25`.

Optional contribution:

```text
max(0, optional GP - 2)
```

Uncancelled GPA:

```text
(sum of 6 compulsory GPs + optional contribution) / 6
```

It is capped at `5.00`. Any compulsory failure forces final GPA `0.00` and letter `F`, while the uncancelled average remains visible in the trace.

## Bonus and UX work

- Search/filter by student, class and final grade.
- Class pass-rate and grade-distribution analytics.
- Subject-failure ranking.
- Printable individual marksheet/evidence view.
- Paste-import workflow with **row-level accepted/rejected reporting and exact reasons** for P08 JSON marks data.
- Publication-readiness surface showing the unique number of students requiring manual checks.
- Explicit loading, success, error and empty states.
- Responsive layout, accessible dialog controls and keyboard-visible focus states.

## Architecture

```text
index.html                 semantic application shell
styles.css                 responsive design system and print view
src/results.js             pure validation and grading engine
src/app.js                 case state, rendering, trace and import workflows
data/                       organizer public fixture
scripts/serve.mjs           dependency-free local static server
tests/results.test.js       boundary, clarification, fixture and import tests
docs/TEST-MATRIX.md         explicit QA matrix
```

The UI does not recalculate GPA itself. It renders result objects produced by `src/results.js`, so the visible trace and the final arithmetic cannot silently drift apart.

## Major decisions

1. **One source of truth for grades and explanations.** The trace uses the same evaluated subject/result objects as the final GPA.
2. **`AB` is not numeric zero.** It has its own state and explanation but still produces the required GP/final-result effects.
3. **Component pass gates happen before total-mark grading.** A practical subject cannot pass from a high combined mark if theory or practical fails separately.
4. **Compulsory failure preserves evidence.** Final GPA becomes `0.00/F`, but the uncancelled average is retained and shown to explain the override.
5. **Clarifications override interpretation.** R-10, R-11, R-12, R-13 and R-29 are treated as binding calculation rules.
6. **Import QA is isolated from the grading engine.** Malformed pasted rows are rejected with exact reasons; accepted rows still pass through the same `normalizeCase` and evaluation functions.
7. **Dependency-free runtime.** No framework/API failure can prevent the judge from opening the live application.

See [`docs/TEST-MATRIX.md`](docs/TEST-MATRIX.md) for the exact rule and edge-case matrix.

## Mocked / production boundaries

No required GPA, trace or checking-list logic is mocked. The application calculates directly from organizer judge-shaped input.

The bonus row-rejection workflow supports pasted P08 JSON case data rather than XLSX/CSV parsing. Data is session-only; authentication, permanent school storage and role-based publishing controls are production follow-ups rather than hackathon requirements.

## Approach and member contributions

**Approach:** translate the published grading rules and clarifications into pure functions; prove threshold, practical, absence, optional and compulsory-failure edge cases; run every public case through the engine; then build explainable UI, teacher checks and bonus analytics over that verified output.

Update before submission:

| Registered member | Major contribution |
|---|---|
| TODO | TODO |
| TODO | TODO |

## AI assistance disclosure

AI assistance was used during the event for decomposition, implementation drafting/review, rule and edge-case analysis, test design, UI iteration, documentation drafting and debugging support. Team members reviewed the output, ran the tests and remain responsible for the submitted implementation.

## Final submission preflight

After this build is copied into the real repository (which already contains the organizer `EVENT.md`) and after repository URLs, live URLs, exact 40-character SHAs, and member contributions are final, run:

```bash
npm run preflight
```

The preflight checks the required repository files, event identifiers, manifest structure, final URLs/SHAs, requirement statuses, and leftover submission placeholders. It is intentionally expected to report placeholders until the final submission metadata is filled.
