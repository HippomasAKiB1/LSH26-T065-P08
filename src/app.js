import {
  checkingLists,
  classSummary,
  evaluateCase,
  normalizeCase,
  subjectFailureSummary,
  validateCaseRows,
} from "./results.js";

const state = {
  cases: [],
  caseIndex: 0,
  currentCase: null,
  results: [],
  query: "",
  classFilter: "all",
  gradeFilter: "all",
  selectedId: null,
  importReport: null,
};

const $ = (selector) => document.querySelector(selector);
const refs = {
  status: $("#app-status"),
  statusText: $("#app-status .status-text"),
  fileInput: $("#file-input"),
  caseSelect: $("#case-select"),
  resetCase: $("#reset-case"),
  caseInfo: $("#case-info"),
  importReport: $("#import-report"),
  search: $("#search"),
  classFilter: $("#class-filter"),
  gradeFilter: $("#grade-filter"),
  clearFilters: $("#clear-filters"),
  studentsBody: $("#students-body"),
  studentsEmpty: $("#students-empty"),
  optionalList: $("#optional-list"),
  practicalList: $("#practical-list"),
  absentList: $("#absent-list"),
  classSummary: $("#class-summary"),
  subjectFailures: $("#subject-failures"),
  traceDialog: $("#trace-dialog"),
  traceContent: $("#trace-content"),
  closeTrace: $("#close-trace"),
  printTrace: $("#print-trace"),
  pasteDialog: $("#paste-dialog"),
  pasteButton: $("#paste-json"),
  pasteInput: $("#paste-input"),
  processPaste: $("#process-paste"),
  closePaste: $("#close-paste"),
  toast: $("#toast"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setStatus(kind, message) {
  refs.status.dataset.kind = kind;
  refs.statusText.textContent = message;
  refs.status.hidden = !message;
}

function toast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => refs.toast.classList.remove("show"), 2200);
}

function resetFilters(render = true) {
  state.query = "";
  state.classFilter = "all";
  state.gradeFilter = "all";
  refs.search.value = "";
  refs.classFilter.value = "all";
  refs.gradeFilter.value = "all";
  if (render) renderStudents();
}

function ingestJson(data, sourceName = "file", options = {}) {
  const cases = Array.isArray(data?.cases) ? data.cases : Array.isArray(data?.students) ? [data] : null;
  if (!cases?.length) throw new Error("Unsupported JSON. Load a P08 fixture wrapper or one P08 case object.");
  state.cases = cases;
  state.importReport = options.importReport ?? null;
  refs.caseSelect.innerHTML = cases
    .map((entry, index) => `<option value="${index}">${escapeHtml(entry.case_id ?? `Case ${index + 1}`)}</option>`)
    .join("");
  refs.caseSelect.disabled = cases.length === 1;
  loadCase(0);
  renderImportReport();
  toast(`${sourceName} loaded successfully`);
}

function loadCase(index) {
  try {
    const current = normalizeCase(state.cases[index]);
    state.caseIndex = index;
    state.currentCase = current;
    state.results = evaluateCase(current);
    resetFilters(false);
    renderAll();
    setStatus(
      "success",
      `Processed ${current.case_id}: ${current.students.length} students with the published GPA, practical, optional, absence, and compulsory-failure rules.`,
    );
  } catch (error) {
    setStatus("error", error.message);
  }
}

async function loadPublicFixture() {
  setStatus("loading", "Loading organizer fixture and validating raw marks...");
  try {
    const response = await fetch("./data/P08_school_results_public.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load sample data (${response.status}).`);
    ingestJson(await response.json(), "Public fixture");
  } catch (error) {
    setStatus("error", `${error.message} You can still use Load JSON.`);
  }
}

function renderTopStats() {
  const total = state.results.length;
  const passed = state.results.filter((student) => student.passed).length;
  const aPlus = state.results.filter((student) => student.letter === "A+").length;
  const lists = checkingLists(state.results);
  const flaggedUnique = new Set([...lists.optional, ...lists.practical, ...lists.absent].map((student) => student.id)).size;
  const stats = {
    total,
    passed,
    failed: total - passed,
    passRate: total ? `${((passed / total) * 100).toFixed(1)}%` : "0%",
    aPlus,
    flagged: flaggedUnique,
  };
  for (const [key, value] of Object.entries(stats)) {
    for (const node of document.querySelectorAll(`[data-stat="${key}"]`)) node.textContent = value;
  }
}

function renderFilters() {
  const classes = [...new Set(state.results.map((student) => student.class))].sort();
  refs.classFilter.innerHTML = `<option value="all">All classes</option>${classes
    .map((className) => `<option value="${escapeHtml(className)}">${escapeHtml(className)}</option>`)
    .join("")}`;
  refs.classFilter.value = classes.includes(state.classFilter) ? state.classFilter : "all";
  state.classFilter = refs.classFilter.value;
}

function filteredStudents() {
  const query = state.query.trim().toLowerCase();
  return state.results.filter((student) => {
    if (query && !`${student.id} ${student.name} ${student.class}`.toLowerCase().includes(query)) return false;
    if (state.classFilter !== "all" && student.class !== state.classFilter) return false;
    if (state.gradeFilter !== "all" && student.letter !== state.gradeFilter) return false;
    return true;
  });
}

function flagBadges(student) {
  const badges = [];
  if (student.flags.optionalCheck) badges.push('<span class="flag flag-optional">Optional</span>');
  if (student.flags.practicalFail) badges.push('<span class="flag flag-practical">Practical</span>');
  if (student.flags.absent) badges.push('<span class="flag flag-absent">Absent</span>');
  return badges.length ? badges.join("") : '<span class="muted">None</span>';
}

function renderStudents() {
  const rows = filteredStudents();
  refs.studentsBody.innerHTML = rows
    .map(
      (student) => `
      <tr>
        <td data-label="Student"><button class="student-link" data-student-id="${escapeHtml(student.id)}"><strong>${escapeHtml(student.name)}</strong><span class="muted mono">${escapeHtml(student.id)}</span></button></td>
        <td data-label="Class">${escapeHtml(student.class)}</td>
        <td data-label="Optional" class="mono">${escapeHtml(student.optional)}</td>
        <td data-label="GPA" class="number"><strong>${student.finalGpa.toFixed(2)}</strong>${student.hasCompulsoryFailure && student.uncancelledAverage > 0 ? `<span class="muted">raw ${student.uncancelledAverage.toFixed(2)}</span>` : ""}</td>
        <td data-label="Grade"><span class="grade grade-${student.letter.replace("+", "plus").replace("-", "minus")}">${student.letter}</span></td>
        <td data-label="Result"><span class="result ${student.passed ? "pass" : "fail"}">${student.passed ? "PASS" : "FAIL"}</span></td>
        <td data-label="Checks"><div class="flag-wrap">${flagBadges(student)}</div></td>
        <td data-label="Evidence"><button class="btn btn-small btn-ghost" data-student-id="${escapeHtml(student.id)}">View trace</button></td>
      </tr>`,
    )
    .join("");
  refs.studentsEmpty.hidden = rows.length > 0;
}

function renderCheckList(container, students, reason) {
  container.innerHTML = students.length
    ? students
        .map(
          (student) => `<button class="check-row" data-student-id="${escapeHtml(student.id)}">
            <span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.id)} / ${escapeHtml(student.class)}</small></span>
            <span class="check-meta">${escapeHtml(reason(student))}</span>
          </button>`,
        )
        .join("")
    : '<div class="mini-empty">No students in this check.</div>';
}

function renderCheckingLists() {
  const lists = checkingLists(state.results);
  $("#optional-count").textContent = lists.optional.length;
  $("#practical-count").textContent = lists.practical.length;
  $("#absent-count").textContent = lists.absent.length;

  renderCheckList(refs.optionalList, lists.optional, (student) =>
    student.optionalResult.absent ? `${student.optional} / AB` : `${student.optional} / GP ${student.optionalResult.gp.toFixed(1)}`,
  );
  renderCheckList(refs.practicalList, lists.practical, (student) =>
    student.allResults.filter((result) => result.practicalFailed && !result.absent).map((result) => result.code).join(", "),
  );
  renderCheckList(refs.absentList, lists.absent, (student) =>
    student.allResults.filter((result) => result.absent).map((result) => result.code).join(", "),
  );
}

function renderClassSummary() {
  const summaries = classSummary(state.results);
  refs.classSummary.innerHTML = summaries
    .map((summary) => {
      const maxGrade = Math.max(1, ...summary.grades.map((grade) => grade.count));
      const bars = summary.grades
        .map(
          (grade) => `<div class="grade-bar-row"><span>${grade.grade}</span><div class="grade-track"><div class="grade-bar" style="width:${(grade.count / maxGrade) * 100}%"></div></div><strong>${grade.count}</strong></div>`,
        )
        .join("");
      return `<article class="summary-card">
        <div class="summary-title"><div><strong>${escapeHtml(summary.className)}</strong><span>${summary.total} students</span></div><div class="pass-rate">${summary.passRate.toFixed(1)}% <span>pass rate</span></div></div>
        <div class="grade-bars">${bars}</div>
      </article>`;
    })
    .join("");

  const failures = subjectFailureSummary(state.results);
  const max = Math.max(1, ...failures.map((entry) => entry.failed));
  refs.subjectFailures.innerHTML = failures
    .map(
      (subject) => `<div class="failure-row"><span><strong>${escapeHtml(subject.code)}</strong><small>${escapeHtml(subject.name)}</small></span><div class="failure-track"><div class="failure-bar" style="width:${(subject.failed / max) * 100}%"></div></div><strong>${subject.failed}</strong></div>`,
    )
    .join("");
}

function renderCaseInfo() {
  refs.caseInfo.innerHTML = `
    <strong>${escapeHtml(state.currentCase.case_id)}</strong>
    <span>${state.currentCase.students.length} students</span>
    <span>${new Set(state.currentCase.students.map((student) => student.class)).size} classes</span>
    <span>${state.currentCase.compulsory.length} compulsory + 1 optional/student</span>
  `;
}

function renderImportReport() {
  const report = state.importReport;
  if (!report) {
    refs.importReport.hidden = true;
    refs.importReport.innerHTML = "";
    return;
  }
  refs.importReport.hidden = false;
  const rejected = report.rejected ?? [];
  refs.importReport.innerHTML = `
    <div class="import-report-head">
      <strong>Import validation: ${report.accepted} accepted / ${rejected.length} rejected</strong>
      <span>${rejected.length ? "Rejected rows were excluded from result processing." : "Every student row passed validation."}</span>
    </div>
    ${rejected.length ? `<div class="rejected-list">${rejected
      .slice(0, 8)
      .map((row) => `<div class="rejected-row"><strong>Row ${row.row}</strong><span>${escapeHtml(row.id)}</span><span>${escapeHtml(row.reason)}</span></div>`)
      .join("")}${rejected.length > 8 ? `<div class="rejected-row"><strong>+${rejected.length - 8}</strong><span>more</span><span>Additional rejected rows omitted from this compact report.</span></div>` : ""}</div>` : ""}
  `;
}

function markDisplay(result) {
  if (result.absent) return '<span class="ab-mark">AB</span>';
  if (result.practicalSubject) {
    return `<span>${result.theory} theory + ${result.practical} practical</span><small>Total ${result.total}</small>`;
  }
  return `<span>${result.total}</span><small>out of 100</small>`;
}

function showTrace(studentId) {
  const student = state.results.find((entry) => entry.id === studentId);
  if (!student) return;
  state.selectedId = studentId;
  const failureText = student.compulsoryFailures.length
    ? `<div class="failure-callout"><strong>Overall result forced to F</strong><span>${student.compulsoryFailures
        .map((result) => `${escapeHtml(result.code)}: ${escapeHtml(result.reason)}`)
        .join(" / ")}</span></div>`
    : '<div class="success-callout"><strong>No compulsory subject failure</strong><span>The uncancelled average becomes the final GPA after the optional-subject rule and 5.00 cap.</span></div>';

  refs.traceContent.innerHTML = `
    <div class="trace-header">
      <div><span class="section-kicker">Calculation trace / ${escapeHtml(student.class)}</span><h2>${escapeHtml(student.name)}</h2><span class="muted mono">${escapeHtml(student.id)}</span></div>
      <div class="trace-result ${student.passed ? "trace-pass" : "trace-fail"}"><span>Final result</span><strong>${student.finalGpa.toFixed(2)} / ${student.letter}</strong><small>${student.passed ? "PASS" : "FAIL"}</small></div>
    </div>
    ${failureText}
    <div class="trace-table-wrap">
      <table class="trace-table">
        <thead><tr><th>Subject</th><th>Role</th><th>Mark used</th><th>GP</th><th>Exact rule applied</th></tr></thead>
        <tbody>${student.allResults
          .map(
            (result) => `<tr class="${result.failed ? "subject-failed" : ""}">
              <td><strong>${escapeHtml(result.name)}</strong><span class="muted mono">${escapeHtml(result.code)}</span></td>
              <td>${result.role}</td>
              <td class="mark-cell">${markDisplay(result)}</td>
              <td><strong>${result.gp.toFixed(1)}</strong><span class="muted">${result.grade}</span></td>
              <td><span>${escapeHtml(result.rule)}</span>${result.failed ? `<small class="rule-reason">${escapeHtml(result.reason)}</small>` : ""}</td>
            </tr>`,
          )
          .join("")}</tbody>
      </table>
    </div>
    <div class="formula-grid">
      <div><span>Compulsory GP sum</span><strong>${student.compulsoryGpSum.toFixed(1)}</strong><small>Sum of the six compulsory subject grade points.</small></div>
      <div><span>Optional contribution</span><strong>+${student.optionalBonus.toFixed(1)}</strong><small>max(0, ${student.optionalResult.gp.toFixed(1)} - 2) from optional ${escapeHtml(student.optional)}.</small></div>
      <div><span>Uncancelled average</span><strong>${student.uncancelledAverage.toFixed(2)}</strong><small>(${student.compulsoryGpSum.toFixed(1)} + ${student.optionalBonus.toFixed(1)}) / 6, capped at 5.00.</small></div>
      <div class="formula-final"><span>Final GPA</span><strong>${student.finalGpa.toFixed(2)}</strong><small>${student.hasCompulsoryFailure ? "Compulsory failure overrides the otherwise visible average." : `Published GPA letter band gives ${student.letter}.`}</small></div>
    </div>
  `;
  refs.traceDialog.showModal();
}

function renderAll() {
  renderFilters();
  renderTopStats();
  renderStudents();
  renderCheckingLists();
  renderClassSummary();
  renderCaseInfo();
  renderImportReport();
}

refs.fileInput.addEventListener("change", async () => {
  const file = refs.fileInput.files?.[0];
  if (!file) return;
  setStatus("loading", `Reading and validating ${file.name}...`);
  try {
    state.importReport = null;
    ingestJson(JSON.parse(await file.text()), file.name);
  } catch (error) {
    setStatus("error", `Could not load JSON: ${error.message}`);
  } finally {
    refs.fileInput.value = "";
  }
});

refs.caseSelect.addEventListener("change", () => loadCase(Number(refs.caseSelect.value)));
refs.resetCase.addEventListener("click", () => loadCase(state.caseIndex));
refs.search.addEventListener("input", () => {
  state.query = refs.search.value;
  renderStudents();
});
refs.classFilter.addEventListener("change", () => {
  state.classFilter = refs.classFilter.value;
  renderStudents();
});
refs.gradeFilter.addEventListener("change", () => {
  state.gradeFilter = refs.gradeFilter.value;
  renderStudents();
});
refs.clearFilters.addEventListener("click", () => {
  resetFilters();
  toast("Result filters cleared");
});

for (const container of [refs.studentsBody, refs.optionalList, refs.practicalList, refs.absentList]) {
  container.addEventListener("click", (event) => {
    const target = event.target.closest("[data-student-id]");
    if (target) showTrace(target.dataset.studentId);
  });
}

refs.closeTrace.addEventListener("click", () => refs.traceDialog.close());
refs.traceDialog.addEventListener("click", (event) => {
  if (event.target === refs.traceDialog) refs.traceDialog.close();
});
refs.printTrace.addEventListener("click", () => window.print());

refs.pasteButton.addEventListener("click", () => refs.pasteDialog.showModal());
refs.closePaste.addEventListener("click", () => refs.pasteDialog.close());
refs.pasteDialog.addEventListener("click", (event) => {
  if (event.target === refs.pasteDialog) refs.pasteDialog.close();
});
refs.processPaste.addEventListener("click", () => {
  try {
    const raw = JSON.parse(refs.pasteInput.value);
    const validated = validateCaseRows(raw);
    const report = { accepted: validated.accepted, rejected: validated.rejected };
    ingestJson(validated.sanitized, "Pasted marks case", { importReport: report });
    refs.pasteDialog.close();
    refs.pasteInput.value = "";
    const rejectedText = report.rejected.length ? `; ${report.rejected.length} rejected row(s) reported` : "; no rejected rows";
    setStatus("success", `Imported ${report.accepted} valid student rows${rejectedText}. Results were recalculated from accepted raw marks.`);
  } catch (error) {
    setStatus("error", `Paste import failed: ${error.message}`);
  }
});

loadPublicFixture();
