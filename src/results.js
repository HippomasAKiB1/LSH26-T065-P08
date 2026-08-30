function assertNumber(value, min, max, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a number from ${min} to ${max}.`);
  }
}

export function gradePointFromMark(total) {
  assertNumber(total, 0, 100, "Subject mark");
  if (total >= 80) return 5.0;
  if (total >= 70) return 4.0;
  if (total >= 60) return 3.5;
  if (total >= 50) return 3.0;
  if (total >= 40) return 2.0;
  if (total >= 33) return 1.0;
  return 0;
}

export function subjectLetterFromGp(gp) {
  return new Map([
    [5, "A+"],
    [4, "A"],
    [3.5, "A-"],
    [3, "B"],
    [2, "C"],
    [1, "D"],
    [0, "F"],
  ]).get(gp) ?? "F";
}

export function finalLetterFromGpa(gpa, hasCompulsoryFailure = false) {
  if (hasCompulsoryFailure) return "F";
  if (gpa === 5) return "A+";
  if (gpa >= 4) return "A";
  if (gpa >= 3.5) return "A-";
  if (gpa >= 3) return "B";
  if (gpa >= 2) return "C";
  if (gpa >= 1) return "D";
  return "F";
}

export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function evaluateSubject(subject, mark) {
  if (!subject || typeof subject !== "object") throw new Error("Subject definition is missing.");

  if (mark === "AB") {
    return {
      code: subject.code,
      name: subject.name,
      practicalSubject: Boolean(subject.practical),
      absent: true,
      markDisplay: "AB",
      total: null,
      gp: 0,
      grade: "F",
      failed: true,
      theoryFailed: false,
      practicalFailed: false,
      rule: "Absent (AB) → subject GP 0.00",
      reason: "Student was absent in this subject.",
    };
  }

  if (subject.practical) {
    if (!mark || typeof mark !== "object" || Array.isArray(mark)) {
      throw new Error(`${subject.code} requires separate theory and practical marks.`);
    }
    assertNumber(mark.theory, 0, 75, `${subject.code} theory`);
    assertNumber(mark.practical, 0, 25, `${subject.code} practical`);
    const theoryFailed = mark.theory < 25;
    const practicalFailed = mark.practical < 8;
    const total = mark.theory + mark.practical;
    const failed = theoryFailed || practicalFailed;
    const gp = failed ? 0 : gradePointFromMark(total);
    const failureParts = [theoryFailed ? `theory ${mark.theory}<25` : "", practicalFailed ? `practical ${mark.practical}<8` : ""]
      .filter(Boolean)
      .join(" and ");
    return {
      code: subject.code,
      name: subject.name,
      practicalSubject: true,
      absent: false,
      markDisplay: `${mark.theory} + ${mark.practical} = ${total}`,
      theory: mark.theory,
      practical: mark.practical,
      total,
      gp,
      grade: subjectLetterFromGp(gp),
      failed,
      theoryFailed,
      practicalFailed,
      rule: failed
        ? `${failureParts} → subject failed → GP 0.00`
        : `Theory ${mark.theory}≥25 and practical ${mark.practical}≥8; total ${total} → GP ${gp.toFixed(1)}`,
      reason: failed ? `Separate component pass rule failed: ${failureParts}.` : "Both components passed.",
    };
  }

  assertNumber(mark, 0, 100, `${subject.code} mark`);
  const gp = gradePointFromMark(mark);
  return {
    code: subject.code,
    name: subject.name,
    practicalSubject: false,
    absent: false,
    markDisplay: String(mark),
    total: mark,
    gp,
    grade: subjectLetterFromGp(gp),
    failed: gp === 0,
    theoryFailed: false,
    practicalFailed: false,
    rule: `${mark} / 100 → GP ${gp.toFixed(1)} (${subjectLetterFromGp(gp)})`,
    reason: gp === 0 ? `Whole-subject mark ${mark} is below 33.` : "Whole-subject grading threshold applied.",
  };
}

export function normalizeCase(input) {
  if (!input || typeof input !== "object") throw new Error("Case must be a JSON object.");
  if (!Array.isArray(input.subjects) || !input.subjects.length) throw new Error("Case is missing subjects.");
  if (!Array.isArray(input.compulsory) || input.compulsory.length !== 6) throw new Error("Case must define exactly 6 compulsory subjects.");
  if (!Array.isArray(input.students)) throw new Error("Case is missing students.");

  const subjects = input.subjects.map((subject) => ({
    code: String(subject.code),
    name: String(subject.name),
    practical: Boolean(subject.practical),
  }));
  const subjectMap = new Map(subjects.map((subject) => [subject.code, subject]));
  if (subjectMap.size !== subjects.length) throw new Error("Subject codes must be unique.");
  for (const code of input.compulsory) {
    if (!subjectMap.has(String(code))) throw new Error(`Compulsory subject ${code} is not defined.`);
  }

  const students = input.students.map((student, index) => {
    if (!student || typeof student !== "object") throw new Error(`Student ${index + 1} is invalid.`);
    for (const field of ["id", "name", "class", "optional", "marks"]) {
      if (student[field] === undefined || student[field] === null) throw new Error(`Student ${index + 1} is missing ${field}.`);
    }
    const optional = String(student.optional);
    if (!subjectMap.has(optional)) throw new Error(`${student.id}: optional subject ${optional} is not defined.`);
    if (input.compulsory.includes(optional)) throw new Error(`${student.id}: optional subject cannot also be compulsory.`);
    const requiredCodes = [...input.compulsory.map(String), optional];
    for (const code of requiredCodes) {
      if (!(code in student.marks)) throw new Error(`${student.id}: missing mark for ${code}.`);
      evaluateSubject(subjectMap.get(code), student.marks[code]);
    }
    return {
      id: String(student.id),
      name: String(student.name),
      class: String(student.class),
      optional,
      marks: structuredClone(student.marks),
    };
  });

  const ids = new Set();
  for (const student of students) {
    if (ids.has(student.id)) throw new Error(`Duplicate student id: ${student.id}`);
    ids.add(student.id);
  }

  return {
    case_id: String(input.case_id ?? "IMPORTED"),
    subjects,
    compulsory: input.compulsory.map(String),
    students,
  };
}

export function validateCaseRows(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Import must be one P08 case JSON object.");
  }
  if (!Array.isArray(raw.students) || !raw.students.length) {
    throw new Error("The imported case needs a non-empty students array.");
  }

  const accepted = [];
  const rejected = [];
  const seenIds = new Set();

  raw.students.forEach((student, index) => {
    const row = index + 1;
    const id = student?.id === undefined ? "Unknown ID" : String(student.id);
    if (seenIds.has(id)) {
      rejected.push({ row, id, reason: `Duplicate student id: ${id}` });
      return;
    }
    try {
      normalizeCase({ ...raw, students: [student] });
      seenIds.add(id);
      accepted.push(student);
    } catch (error) {
      rejected.push({ row, id, reason: error.message });
    }
  });

  if (!accepted.length) {
    throw new Error(`All ${raw.students.length} student rows were rejected.`);
  }

  const sanitized = { ...raw, students: accepted, case_id: raw.case_id ?? "IMPORTED" };
  normalizeCase(sanitized);
  return { sanitized, accepted: accepted.length, rejected };
}

export function evaluateStudent(caseData, student) {
  const subjectMap = new Map(caseData.subjects.map((subject) => [subject.code, subject]));
  const compulsoryResults = caseData.compulsory.map((code) => {
    const result = evaluateSubject(subjectMap.get(code), student.marks[code]);
    return { ...result, role: "Compulsory" };
  });
  const optionalResult = {
    ...evaluateSubject(subjectMap.get(student.optional), student.marks[student.optional]),
    role: "Optional",
  };

  const compulsoryGpSum = compulsoryResults.reduce((sum, result) => sum + result.gp, 0);
  const optionalBonus = Math.max(0, optionalResult.gp - 2);
  const uncappedAverage = (compulsoryGpSum + optionalBonus) / 6;
  const uncancelledAverage = Math.min(5, uncappedAverage);
  const compulsoryFailures = compulsoryResults.filter((result) => result.failed);
  const hasCompulsoryFailure = compulsoryFailures.length > 0;
  const finalGpa = hasCompulsoryFailure ? 0 : round2(uncancelledAverage);
  const letter = finalLetterFromGpa(finalGpa, hasCompulsoryFailure);
  const allResults = [...compulsoryResults, optionalResult];

  const flags = {
    optionalCheck: optionalResult.absent || optionalResult.gp <= 2,
    practicalFail: allResults.some((result) => result.practicalSubject && !result.absent && result.practicalFailed),
    absent: allResults.some((result) => result.absent),
  };

  return {
    id: student.id,
    name: student.name,
    class: student.class,
    optional: student.optional,
    compulsoryResults,
    optionalResult,
    allResults,
    compulsoryGpSum,
    optionalBonus,
    uncappedAverage,
    uncancelledAverage,
    compulsoryFailures,
    hasCompulsoryFailure,
    finalGpa,
    letter,
    passed: !hasCompulsoryFailure,
    flags,
  };
}

export function evaluateCase(caseData) {
  return caseData.students.map((student) => evaluateStudent(caseData, student));
}

export function checkingLists(results) {
  return {
    optional: results.filter((student) => student.flags.optionalCheck),
    practical: results.filter((student) => student.flags.practicalFail),
    absent: results.filter((student) => student.flags.absent),
  };
}

export function classSummary(results) {
  const byClass = new Map();
  for (const student of results) {
    if (!byClass.has(student.class)) byClass.set(student.class, []);
    byClass.get(student.class).push(student);
  }
  return [...byClass.entries()].map(([className, students]) => {
    const passed = students.filter((student) => student.passed).length;
    const grades = ["A+", "A", "A-", "B", "C", "D", "F"].map((grade) => ({
      grade,
      count: students.filter((student) => student.letter === grade).length,
    }));
    return { className, total: students.length, passed, passRate: students.length ? (passed / students.length) * 100 : 0, grades };
  });
}

export function subjectFailureSummary(results) {
  const map = new Map();
  for (const student of results) {
    for (const result of student.allResults) {
      if (!map.has(result.code)) map.set(result.code, { code: result.code, name: result.name, failed: 0 });
      if (result.failed) map.get(result.code).failed += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.failed - a.failed || a.code.localeCompare(b.code));
}
