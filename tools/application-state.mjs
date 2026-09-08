import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

export const applicationFiles = ["workflow.md", "jd-analysis.md", "company-values.md", "cover-letter-draft.md", "hr-review.md", "cover-letter-final.md", "evidence-map.md", "interview-prep.md", "submission-checklist.md"];

async function read(file) {
  try { return await readFile(file, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function json(file) {
  const text = await read(file);
  return text === null ? null : JSON.parse(text);
}

export function createApplicationState() {
  return { version: 1, status: "intake", stopReasons: [], nextAction: "Register questions and resume evidence", steps: {} };
}

export async function saveApplicationState(packageDir, state) {
  await mkdir(packageDir, { recursive: true });
  await writeFile(path.join(packageDir, "state.json"), `${JSON.stringify(state, null, 2)}\n`);
  const file = path.join(packageDir, "workflow.md");
  let workflow = await read(file) ?? "# Application Workflow\n";
  const summary = `<!-- machine-state:start -->\n- Preparation Status: ${state.status}\n- Next Action: ${state.nextAction}\n- Stop Reasons: ${state.stopReasons.join("; ") || "none"}\n<!-- machine-state:end -->`;
  workflow = workflow.replace(/^- Status:.*$/m, `- Status: ${state.status}`);
  workflow = /<!-- machine-state:start -->[\s\S]*?<!-- machine-state:end -->/.test(workflow)
    ? workflow.replace(/<!-- machine-state:start -->[\s\S]*?<!-- machine-state:end -->/, summary)
    : `${workflow.trimEnd()}\n\n${summary}\n`;
  await writeFile(file, workflow);
}

// Reviewers write "None", "N/A.", "없음", "해결 완료" and similar phrases, so an
// exact-value list rejects ordinary wording. Negations are checked first because
// "not resolved", "미해결" and "해결 안 됨" all contain a resolved keyword.
const unresolvedMarkers = /unresolved|not\s+resolved|미해결|미해소|해결\s*(?:안|못|되지|하지)/i;
const resolvedMarkers = /^(?:(?:none|nothing|n\/a|na|not\s+applicable|resolved|clear|no\s+(?:blockers?|issues?|items?|risks?))\b|없음|없습니다|해결|해당\s*없음|특이사항\s*없음|이슈\s*없음)/i;
const blockerField = /^[-*]\s*(?:blockers?|차단\s*사유):\s*(.*)$/i;
const blockerHeading = /^#{1,6}\s*(?:blockers?|차단\s*사유)\s*:?\s*$/i;
const metadataField = /^[-*]\s*[A-Za-z][A-Za-z0-9 /()-]*:/;
const listItem = /^[-*]\s+(.+)$/;

export function isResolvedBlockerValue(value) {
  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return true;
  if (unresolvedMarkers.test(text)) return false;
  return resolvedMarkers.test(text);
}

export function unresolvedBlockerLines(markdown) {
  const blockers = [];
  let active = false;
  for (const line of markdown.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const field = blockerField.exec(trimmed);
    if (field) {
      // An inline value answers the field on its own. Only an empty field opens a
      // list section, so review prose written under "- Blockers: None" is not read
      // as a blocker.
      const value = field[1].trim();
      active = !value;
      if (value && !isResolvedBlockerValue(value)) blockers.push(trimmed);
      continue;
    }
    if (blockerHeading.test(trimmed)) { active = true; continue; }
    if (/^#/.test(trimmed) || metadataField.test(trimmed)) { active = false; continue; }
    if (!active) continue;
    const item = listItem.exec(trimmed);
    if (item && !isResolvedBlockerValue(item[1])) blockers.push(trimmed);
  }
  return blockers;
}

const validWorkflowStatuses = new Set(["intake", "resume-needed", "jd-analyzed", "drafted", "review-blocked", "ready-for-user-review", "submitted-by-user", "paused"]);
const validCareerTypes = new Set(["new-grad", "experienced", "unknown"]);
const validJobFunctions = new Set(["tech", "business", "support", "creative", "operations", "unknown"]);

function hasSubstantiveText(markdown) {
  return markdown.split(/\r?\n/).map((line) => line.trim()).some((line) => line && !line.startsWith("#") && !line.startsWith("| ---"));
}

function hasEvidenceRows(markdown) {
  return markdown.split(/\r?\n/).map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---") && !/^\|\s*Claim\s*\|/i.test(line))
    .some((line) => {
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      return cells.length >= 2 && cells[0] && cells[1];
    });
}

function parseField(markdown, field) {
  return markdown.match(new RegExp(`^-\\s*${field}:\\s*(.*)$`, "im"))?.[1]?.trim() ?? "";
}

// Package-level consistency rules. They run in both modes so the release gate keeps
// catching a final text written without a review, without evidence, or with an
// unsupported workflow field value.
function packageConsistency(files, mode, errors, warnings) {
  const workflow = files["workflow.md"] ?? "";
  const hrReview = files["hr-review.md"] ?? "";
  if (hasSubstantiveText(files["cover-letter-final.md"] ?? "")) {
    if (!hasSubstantiveText(hrReview)) errors.push("cover-letter-final.md has text but hr-review.md is empty");
    if (!hasEvidenceRows(files["evidence-map.md"] ?? "")) errors.push("cover-letter-final.md has text but evidence-map.md has no evidence rows");
    const blockers = unresolvedBlockerLines(hrReview);
    // Ready mode already reports the same blockers line by line.
    if (mode === "structure" && blockers.length) errors.push(`cover-letter-final.md exists while HR blockers remain: ${blockers.join("; ")}`);
  }
  const status = parseField(workflow, "Status");
  if (status && !validWorkflowStatuses.has(status)) errors.push(`workflow.md has unsupported Status value: ${status}`);
  const careerType = parseField(workflow, "Career Type");
  if (careerType && !validCareerTypes.has(careerType)) errors.push(`workflow.md has unsupported Career Type value: ${careerType}`);
  const jobFunction = parseField(workflow, "Job Function");
  if (jobFunction && !validJobFunctions.has(jobFunction)) errors.push(`workflow.md has unsupported Job Function value: ${jobFunction}`);
  if (/submitted-by-user/i.test(status) && !/submitted by user|사용자.*제출|user confirmed/i.test(workflow)) errors.push("workflow.md marks submitted-by-user without explicit user confirmation note");
  if (!/manual submission|직접 제출|submit manually|submits manually/i.test(`${files["submission-checklist.md"] ?? ""}${workflow}`)) warnings.push("manual submission reminder is missing or weak");
}

export async function applicationHashes(packageDir, { resumePath = path.resolve("resume.md") } = {}) {
  const inputs = { resume: resumePath, jd: path.join(packageDir, "jd-analysis.md"), questions: path.join(packageDir, "questions.json"), answers: path.join(packageDir, "answers.json"), evidence: path.join(packageDir, "evidence-map.md"), final: path.join(packageDir, "cover-letter-final.md"), hr: path.join(packageDir, "hr-review.md") };
  const hashes = {};
  for (const [key, file] of Object.entries(inputs)) {
    const value = await read(file);
    hashes[key] = value === null ? null : createHash("sha256").update(value).digest("hex");
  }
  return hashes;
}

export async function captureReview(packageDir, { resumePath, status = "completed", blockers = [], warnings = [], reviewer = "" } = {}) {
  if (!reviewer.trim()) throw new Error("An identified HR reviewer is required");
  const review = { status, reviewer, reviewedAt: new Date().toISOString(), hashes: await applicationHashes(packageDir, { resumePath }), blockers, warnings };
  await writeFile(path.join(packageDir, "review.json"), `${JSON.stringify(review, null, 2)}\n`);
  return review;
}

export function resumeEvidence(markdown) {
  const entries = [];
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    for (const match of line.matchAll(/\b(?:E|EXP|EV)-[A-Za-z0-9_-]+\b/g)) entries.push({ id: match[0], line: index + 1, source: line.trim() });
  }
  return entries;
}

export async function validateApplication(packageDir, { mode = "structure", resumePath = path.resolve("resume.md"), writeState = false } = {}) {
  if (!["structure", "ready"].includes(mode)) throw new Error("Validation mode must be structure or ready");
  const errors = [];
  const warnings = [];
  const files = {};
  for (const name of applicationFiles) {
    files[name] = await read(path.join(packageDir, name));
    if (files[name] === null) errors.push(`missing required file: ${name}`);
  }
  const state = await json(path.join(packageDir, "state.json")) ?? createApplicationState();
  const counts = [];
  packageConsistency(files, mode, errors, warnings);
  if (mode === "ready") {
    const resume = await read(resumePath);
    if (!resume) errors.push("resume.md is missing or empty");
    const evidence = new Set(resumeEvidence(resume ?? "").map((entry) => entry.id));
    const questions = (await json(path.join(packageDir, "questions.json")))?.questions;
    const answers = (await json(path.join(packageDir, "answers.json")))?.answers;
    if (!Array.isArray(questions) || questions.length === 0) errors.push("questions are missing: register all company questions before ready validation");
    if (!Array.isArray(answers)) errors.push("answers are missing");
    const ids = new Set();
    for (const question of Array.isArray(questions) ? questions : []) {
      if (!question.id || ids.has(question.id)) errors.push("question IDs must be present and unique");
      ids.add(question.id);
      const matches = Array.isArray(answers) ? answers.filter((answer) => answer.questionId === question.id) : [];
      if (matches.length > 1) errors.push(`${question.id}: duplicate answers`);
      const answer = matches[0];
      if (!answer?.text?.trim()) {
        if (question.required !== false) errors.push(`${question.id}: required answer is missing`);
        continue;
      }
      if (!Array.isArray(answer.evidenceIds) || !answer.evidenceIds.length) errors.push(`${question.id}: evidence IDs are missing`);
      for (const id of answer.evidenceIds ?? []) {
        if (!evidence.has(id)) errors.push(`${question.id}: unknown resume evidence ID ${id}`);
        if (!files["evidence-map.md"]?.includes(id)) errors.push(`${question.id}: ${id} is absent from evidence map`);
      }
      if (!files["evidence-map.md"]?.includes(question.id)) errors.push(`${question.id}: absent from evidence map`);
      if (!files["cover-letter-final.md"]?.includes(answer.text)) errors.push(`${question.id}: final text does not contain the reviewed answer`);
      const limit = question.limit;
      if (!limit || !Number.isFinite(limit.max) || limit.max <= 0 || !["characters", "bytes"].includes(limit.unit) || typeof limit.includeSpaces !== "boolean" || (limit.unit === "bytes" && limit.encoding !== "utf8")) {
        errors.push(`${question.id}: length rule requires confirmation`);
        counts.push({ questionId: question.id, status: "confirmation-needed", charactersIncludingSpaces: [...answer.text].length });
      } else {
        const value = limit.includeSpaces ? answer.text : answer.text.replace(/\s/gu, "");
        const count = limit.unit === "bytes" ? Buffer.byteLength(value, "utf8") : [...value].length;
        counts.push({ questionId: question.id, count, ...limit });
        if (count > limit.max) errors.push(`${question.id}: length ${count} exceeds ${limit.max}`);
      }
    }
    for (const answer of Array.isArray(answers) ? answers : []) if (!ids.has(answer.questionId)) errors.push(`unknown answer question ID ${answer.questionId}`);
    const review = await json(path.join(packageDir, "review.json"));
    if (!review || review.status !== "completed" || !review.reviewer || !review.reviewedAt || !Array.isArray(review.blockers)) errors.push("completed HR review is missing; revalidation required");
    else {
      for (const blocker of review.blockers) if (blocker.status !== "resolved") errors.push(`unresolved HR blocker: ${blocker.reason ?? blocker.id ?? "unknown"}`);
      const hashes = await applicationHashes(packageDir, { resumePath });
      for (const [key, hash] of Object.entries(hashes)) if (!hash || review.hashes?.[key] !== hash) errors.push(`HR review expired: ${key} changed or missing`);
      warnings.push(...(Array.isArray(review.warnings) ? review.warnings : []));
    }
    const hr = files["hr-review.md"] ?? "";
    if (!hr.split(/\r?\n/).some((line) => line.trim() && !/^#/.test(line.trim()) && !/^-\s*[^:]+:\s*$/.test(line.trim()))) errors.push("HR review text is empty");
    errors.push(...unresolvedBlockerLines(hr).map((line) => `HR blocker: ${line}`));
    state.status = errors.length ? "review-blocked" : "ready-for-user-review";
    state.stopReasons = errors;
    state.nextAction = errors.length ? "Resolve blockers and review changed inputs" : "User reviews files and submits manually";
    state.steps.validation = { valid: errors.length === 0, checkedAt: new Date().toISOString(), mode };
    if (writeState) await saveApplicationState(packageDir, state);
  } else if (!(await json(path.join(packageDir, "review.json")))) warnings.push("revalidation required before ready status");
  return { ok: errors.length === 0, mode, errors, warnings, counts, state };
}
