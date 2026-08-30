# ResultLens — Explainable School GPA Engine

**Team ID:** `LSH26-T065`  
**Problem ID:** `P08`  
**Tier:** `02`  
**Repository:** `lsh26-t065-p08`  
**Live URL:** https://lsh-26-t065-p08.vercel.app/

ResultLens converts raw student marks into deterministic subject grade points, final GPA, and letter results. It also preserves a calculation trace so each result can be reviewed and explained before publication.

## Run locally

There is **no build step and no third-party runtime dependency**. Node.js is used only for the local static server and automated tests.

```bash
npm run serve
```

Open:

```text
http://127.0.0.1:4174
```

Run the grading-engine test suite:

```bash
npm test
```

The application automatically loads:

```text
data/P08_school_results_public.json
```

The **Load JSON** control accepts the organizer fixture wrapper or a single compatible P08 case object in the published shape. The **Paste JSON** workflow accepts a compatible case and reports malformed student rows with specific validation reasons.

## Judge verification path

1. Open the live URL and switch between organizer cases. Confirm the student dataset is processed from raw marks. **R1**
2. In **Student results**, inspect GPA, final letter, and pass/fail status. Practical subjects, optional bonus, absences, and compulsory-failure override follow the published rules. **R2**
3. Select **View trace** for a student. Confirm the trace shows subject marks, grade points, applied rules, failure reasons, optional contribution, uncancelled average, and final result. **R3**
4. Open the three **Teacher checking lists**. Confirm optional `<= 2.0 / AB`, practical `< 8`, and any `AB` are generated independently and may overlap. **R4**

## Requirement evidence

| Requirement | Implementation evidence |
|---|---|
| **R1 — Student dataset** | Public judge cases load directly with compulsory subjects, optional subjects, practical components, and absence values. Case validation and normalization are implemented in `src/results.js`; loading workflows are handled in `src/app.js`. |
| **R2 — Exact result engine** | `src/results.js` implements the published grade bands, theory `>=25/75`, practical `>=8/25`, optional `max(0, GP-2)`, divisor `6`, cap `5.00`, absence handling, and compulsory-failure override. Automated tests cover the important boundaries. |
| **R3 — Per-student calculation trace** | The trace is rendered from the same evaluated result objects as the final GPA. It includes actual marks, per-subject GP, applied rule, failure reason, optional contribution, uncancelled average, and final GPA. |
| **R4 — Teacher checking lists** | Clarification R-29 is implemented directly: optional GP `<=2.0` or optional `AB`, practical component `<8`, and any `AB`. A student may correctly appear in more than one list. |

## Published grading rules used

Whole-subject grade points:

- `80-100 -> 5.0`
- `70-79 -> 4.0`
- `60-69 -> 3.5`
- `50-59 -> 3.0`
- `40-49 -> 2.0`
- `33-39 -> 1.0`
- `<33 -> 0 / fail`

Practical subjects must pass **both components separately**:

```text
theory >= 25/75
practical >= 8/25
```

Optional contribution:

```text
max(0, optional GP - 2)
```

Uncancelled GPA:

```text
(sum of 6 compulsory GPs + optional contribution) / 6
```

The GPA is capped at `5.00`. Any compulsory failure forces final GPA `0.00` and letter `F`, while the uncancelled average remains visible in the trace for verification.

## Additional UX and review features

- Search/filter by student, class, and final grade.
- Class pass-rate and grade-distribution analytics.
- Subject-failure ranking.
- Printable individual result/trace view.
- Paste-import workflow with row-level accepted/rejected reporting and exact validation reasons.
- Publication-readiness summary showing the unique number of students requiring manual checks.
- Explicit loading, success, error, and empty states.
- Responsive layout and keyboard-visible focus states.

## Architecture

```text
index.html                 semantic application shell
styles.css                 responsive design system and print view
src/results.js             validation and deterministic grading engine
src/app.js                 case state, rendering, trace, and import workflows
data/                       organizer public fixture
scripts/serve.mjs          dependency-free local static server
tests/results.test.js      boundary, clarification, fixture, and import tests
docs/TEST-MATRIX.md        explicit QA matrix
```

The UI does not independently recalculate GPA. It renders evaluated result objects produced by `src/results.js`, so the visible trace and final result remain aligned.

## Major design decisions

1. **Use one source of truth for grades and explanations.** The trace uses the same evaluated subject/result objects as the final GPA.
2. **Keep `AB` distinct from numeric zero.** Absence has its own state and explanation while still producing the required grade-point and final-result effects.
3. **Apply practical component gates before total-mark grading.** A practical subject cannot pass if either theory or practical fails separately.
4. **Preserve the uncancelled GPA for traceability.** A compulsory failure forces final GPA `0.00/F`, but the pre-override average remains visible.
5. **Treat published clarifications as binding rules.** The grading and checking-list implementation follows the clarified thresholds and list membership conditions.
6. **Keep import validation separate from grading.** Rejected rows receive specific reasons; accepted rows still pass through the same normalization and evaluation functions.
7. **Keep the runtime dependency-free.** The deployed application has no framework, backend, or third-party API dependency that could prevent the judge from opening it.

See [`docs/TEST-MATRIX.md`](docs/TEST-MATRIX.md) for the exact rule and edge-case matrix.

## Mocked / production boundaries

No required GPA, trace, or checking-list logic is mocked. The application calculates directly from organizer judge-shaped input.

The row-level rejection workflow supports pasted P08 JSON case data rather than XLSX/CSV parsing. Data is session-only. Authentication, permanent school storage, role-based publishing controls, and institutional integrations are production follow-ups rather than hackathon requirements.

## Approach and member contributions

**Approach:** translate the published grading rules and clarifications into pure functions; verify threshold, practical, absence, optional-subject, compulsory-failure, and checking-list edge cases; process the public cases through the same engine; then build the result-review UI over the verified output.

| Registered member | Major contribution |
|---|---|
| Akib Hasan Pyil (`HippomasAKiB1`) | Led repository integration and implementation of the GPA engine, result workflow, calculation trace, automated testing, Git workflow, deployment, and final submission preparation. |
| Nazat E Rose (`Rhythm-099`) | Contributed to result-review interface refinement, teacher checking workflow review, responsive testing, and manual verification of grading and edge-case behaviour. |

## AI assistance disclosure

AI assistance was used during the event for decomposition, implementation drafting and review, grading-rule and edge-case analysis, test design, UI iteration, documentation drafting, and debugging support.

The team reviewed the assisted output against the published P08 specification and clarifications, ran the automated grading and boundary tests, processed the organizer fixtures, and manually verified the deployed result, trace, absence, practical-failure, and checking-list workflows.

## Known limitations

- The application processes results entirely in the browser and does not persist cases or calculated results to a remote database.
- Imported or pasted data must follow the expected P08 structure; malformed rows are rejected and reported rather than automatically repaired.
- Printable result views rely on the browser's native print functionality, so final print formatting may vary slightly between browsers.

## Final submission preflight

Before submitting the repository, run:

```bash
npm test
npm run preflight
```

The preflight checks required repository files, event identifiers, manifest structure, submission metadata, requirement statuses, and leftover placeholders.

After the final commit is pushed, verify the deployed URL in a private/incognito window and record the exact 40-character commit SHA for the submission form.
