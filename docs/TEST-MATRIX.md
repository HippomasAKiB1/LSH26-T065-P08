# P08 Test Matrix

This matrix documents the grading rules and high-risk edge cases verified by the automated suite.

| Area | Cases verified | Why it matters |
|---|---|---|
| Whole-subject grade bands | 0, 32, 33, 39, 40, 49, 50, 59, 60, 69, 70, 79, 80, 100 | Proves every published grading boundary. |
| Practical pass rule | theory 24/25 boundary; practical 7/8 boundary | Proves each component must pass separately. |
| Absence | `AB` versus numeric `0` | Satisfies the explicit requirement that absence and zero remain distinct. |
| Optional subject | GP <=2 gives 0 bonus; higher GP contributes only GP-2 | Covers clarification R-13 with a fixed divisor of 6. |
| Compulsory failure | strong uncancelled average plus one failed compulsory subject | Proves final GPA becomes 0.00/F while the raw average remains visible. |
| Final letter | 1.00, 2.00, 3.00, 3.50, 4.00, 5.00 boundaries | Proves clarification R-10. |
| Checking lists | optional <=2/AB, practical <8, any AB, overlap allowed | Directly covers clarification R-29. |
| Public input | all 25 organizer cases normalize and calculate | Confirms hidden judge cases in the same shape can use the same engine. |
| Import QA | valid and malformed student rows mixed in one pasted case | Confirms bonus row-level rejection reporting gives exact reasons. |

## Manual UI smoke test

1. Load the public fixture and switch between cases.
2. Open a passing student's trace and verify every subject mark, GP and rule is visible.
3. Open a student with a compulsory failure and confirm the uncancelled average is still shown beside final 0.00/F.
4. Open students from all three teacher checking lists; confirm list membership matches their trace.
5. Use **Paste JSON** with one malformed student and confirm valid rows load while the rejected row and reason are reported.
6. Use **Print marksheet** from a trace and confirm the print view contains only the student's evidence.
