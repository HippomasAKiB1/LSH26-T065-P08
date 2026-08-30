import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkingLists,
  evaluateCase,
  evaluateStudent,
  evaluateSubject,
  finalLetterFromGpa,
  gradePointFromMark,
  normalizeCase,
  validateCaseRows,
} from "../src/results.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/P08_school_results_public.json"), "utf8"));

const nonPractical = { code: "BAN", name: "Bangla", practical: false };
const practical = { code: "PHY", name: "Physics", practical: true };

test("subject grading thresholds exactly match the problem", () => {
  const cases = [
    [0,0],[32,0],[33,1],[39,1],[40,2],[49,2],[50,3],[59,3],[60,3.5],[69,3.5],[70,4],[79,4],[80,5],[100,5],
  ];
  for (const [mark, gp] of cases) assert.equal(gradePointFromMark(mark), gp, `${mark} should be ${gp}`);
});

test("practical subject must pass theory and practical separately", () => {
  assert.equal(evaluateSubject(practical, { theory: 25, practical: 8 }).failed, false);
  const theoryFail = evaluateSubject(practical, { theory: 24, practical: 25 });
  assert.equal(theoryFail.gp, 0);
  assert.equal(theoryFail.theoryFailed, true);
  const practicalFail = evaluateSubject(practical, { theory: 75, practical: 7 });
  assert.equal(practicalFail.gp, 0);
  assert.equal(practicalFail.practicalFailed, true);
});

test("absent is distinct from numeric zero", () => {
  const absent = evaluateSubject(nonPractical, "AB");
  const zero = evaluateSubject(nonPractical, 0);
  assert.equal(absent.absent, true);
  assert.equal(absent.markDisplay, "AB");
  assert.equal(zero.absent, false);
  assert.equal(zero.markDisplay, "0");
  assert.equal(absent.gp, 0);
  assert.equal(zero.gp, 0);
});

test("optional bonus adds only GP above 2 and divisor remains 6", () => {
  const c = normalizeCase({
    subjects: [
      { code: "A", name: "A", practical: false },{ code: "B", name: "B", practical: false },{ code: "C", name: "C", practical: false },
      { code: "D", name: "D", practical: false },{ code: "E", name: "E", practical: false },{ code: "F", name: "F", practical: false },
      { code: "O", name: "O", practical: false }
    ],
    compulsory: ["A","B","C","D","E","F"],
    students: [{ id: "S", name: "S", class: "9", optional: "O", marks: { A:70,B:70,C:70,D:70,E:70,F:70,O:80 } }]
  });
  const r = evaluateStudent(c, c.students[0]);
  assert.equal(r.optionalBonus, 3);
  assert.equal(r.uncancelledAverage, 4.5);
  assert.equal(r.finalGpa, 4.5);
  assert.equal(r.letter, "A");
});

test("any compulsory failure cancels a strong average but preserves uncancelled trace", () => {
  const c = normalizeCase({
    subjects: [
      { code: "A", name: "A", practical: false },{ code: "B", name: "B", practical: false },{ code: "C", name: "C", practical: false },
      { code: "D", name: "D", practical: false },{ code: "E", name: "E", practical: false },{ code: "F", name: "F", practical: false },
      { code: "O", name: "O", practical: false }
    ],
    compulsory: ["A","B","C","D","E","F"],
    students: [{ id: "S", name: "S", class: "9", optional: "O", marks: { A:100,B:100,C:100,D:100,E:100,F:32,O:100 } }]
  });
  const r = evaluateStudent(c, c.students[0]);
  assert.ok(r.uncancelledAverage > 4);
  assert.equal(r.finalGpa, 0);
  assert.equal(r.letter, "F");
  assert.equal(r.hasCompulsoryFailure, true);
});

test("checking lists follow clarification R-29", () => {
  const c = normalizeCase({
    subjects: [
      { code: "A", name: "A", practical: false },{ code: "B", name: "B", practical: false },{ code: "C", name: "C", practical: false },
      { code: "D", name: "D", practical: false },{ code: "E", name: "E", practical: false },{ code: "P", name: "P", practical: true },
      { code: "O", name: "O", practical: true }
    ],
    compulsory: ["A","B","C","D","E","P"],
    students: [
      { id: "S1", name: "S1", class: "9", optional: "O", marks: { A:80,B:80,C:80,D:80,E:80,P:{theory:60,practical:7},O:{theory:30,practical:10} } },
      { id: "S2", name: "S2", class: "9", optional: "O", marks: { A:80,B:80,C:80,D:80,E:80,P:{theory:60,practical:20},O:"AB" } }
    ]
  });
  const lists = checkingLists(evaluateCase(c));
  assert.deepEqual(lists.practical.map((s) => s.id), ["S1"]);
  assert.deepEqual(lists.optional.map((s) => s.id), ["S1","S2"]);
  assert.deepEqual(lists.absent.map((s) => s.id), ["S2"]);
});

test("final GPA letter boundaries follow clarification", () => {
  assert.equal(finalLetterFromGpa(5), "A+");
  assert.equal(finalLetterFromGpa(4), "A");
  assert.equal(finalLetterFromGpa(3.5), "A-");
  assert.equal(finalLetterFromGpa(3), "B");
  assert.equal(finalLetterFromGpa(2), "C");
  assert.equal(finalLetterFromGpa(1), "D");
  assert.equal(finalLetterFromGpa(4.8, true), "F");
});

test("all 25 public cases normalize and calculate without errors", () => {
  assert.equal(fixture.cases.length, 25);
  for (const source of fixture.cases) {
    const c = normalizeCase(source);
    assert.ok(c.students.length >= 60, `${c.case_id} has fewer than 60 students`);
    assert.ok(new Set(c.students.map((s) => s.class)).size >= 2, `${c.case_id} does not span two classes`);
    const results = evaluateCase(c);
    assert.equal(results.length, c.students.length);
    for (const result of results) {
      assert.ok(result.finalGpa >= 0 && result.finalGpa <= 5);
      assert.equal(result.allResults.length, 7);
      if (result.hasCompulsoryFailure) {
        assert.equal(result.finalGpa, 0);
        assert.equal(result.letter, "F");
      }
    }
  }
});

test("row validation accepts good rows and reports malformed rows with exact reasons", () => {
  const raw = {
    case_id: "IMPORT_TEST",
    subjects: [
      { code: "BAN", name: "Bangla", practical: false },
      { code: "ENG", name: "English", practical: false },
      { code: "MAT", name: "Math", practical: false },
      { code: "SCI", name: "Science", practical: false },
      { code: "BGS", name: "BGS", practical: false },
      { code: "REL", name: "Religion", practical: false },
      { code: "ICT", name: "ICT", practical: true },
    ],
    compulsory: ["BAN", "ENG", "MAT", "SCI", "BGS", "REL"],
    students: [
      {
        id: "S1",
        name: "Valid Student",
        class: "Class 9",
        optional: "ICT",
        marks: { BAN: 80, ENG: 70, MAT: 60, SCI: 50, BGS: 40, REL: 33, ICT: { theory: 60, practical: 20 } },
      },
      {
        id: "S2",
        name: "Broken Student",
        class: "Class 9",
        optional: "ICT",
        marks: { BAN: 80, ENG: 70, MAT: 60, SCI: 50, BGS: 40, REL: 33, ICT: { theory: 60, practical: 30 } },
      },
    ],
  };

  const report = validateCaseRows(raw);
  assert.equal(report.accepted, 1);
  assert.equal(report.rejected.length, 1);
  assert.equal(report.rejected[0].id, "S2");
  assert.match(report.rejected[0].reason, /practical must be a number from 0 to 25/);
  assert.equal(report.sanitized.students.length, 1);
});
