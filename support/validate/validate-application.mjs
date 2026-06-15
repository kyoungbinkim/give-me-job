import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const requiredFiles = [
  "workflow.md",
  "jd-analysis.md",
  "company-values.md",
  "cover-letter-draft.md",
  "hr-review.md",
  "cover-letter-final.md",
  "evidence-map.md",
  "interview-prep.md",
  "submission-checklist.md",
];

const errors = [];
const warnings = [];
const validWorkflowStatuses = new Set([
  "intake",
  "resume-needed",
  "jd-analyzed",
  "drafted",
  "review-blocked",
  "ready-for-user-review",
  "submitted-by-user",
  "paused",
]);
const validJobFunctions = new Set([
  "tech",
  "business",
  "support",
  "creative",
  "operations",
  "unknown",
]);

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readIfExists(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function hasSubstantiveText(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line && !line.startsWith("#") && !line.startsWith("| ---"));
}

function hasEvidenceRows(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---") && !/^\|\s*Claim\s*\|/i.test(line))
    .some((line) => {
      const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
      return cells.length >= 2 && cells[0] && cells[1];
    });
}

function unresolvedBlockerLines(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blockers = [];
  let inBlockers = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^#{1,6}\s+/i.test(trimmed) && !/^#{1,6}\s*blockers?\b/i.test(trimmed)) {
      inBlockers = false;
    }

    const blockerHeading = /^#{1,6}\s*blockers?\b/i.test(trimmed);
    const blockerField = /^-\s*blockers?:\s*(.*)$/i.exec(trimmed);

    if (blockerHeading) {
      inBlockers = true;
      continue;
    }

    if (blockerField) {
      inBlockers = true;
      const value = blockerField[1].trim();
      if (value && !/none|resolved|n\/a|없음|해결/i.test(value)) blockers.push(trimmed);
      continue;
    }

    if (inBlockers) {
      if (/^-\s*[A-Z][A-Za-z ]+:/i.test(trimmed) && !/blocker/i.test(trimmed)) {
        inBlockers = false;
        continue;
      }
      if (/^-\s+/.test(trimmed) && !/none|resolved|n\/a|없음|해결/i.test(trimmed)) {
        blockers.push(trimmed);
      }
      continue;
    }

    if (/blocker/i.test(trimmed) && !/none|resolved|n\/a|없음|해결/i.test(trimmed)) {
      blockers.push(trimmed);
    }
  }

  return blockers;
}

function parseField(markdown, field) {
  const pattern = new RegExp(`^-\\s*${field}:\\s*(.*)$`, "im");
  return markdown.match(pattern)?.[1]?.trim() ?? "";
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node tools/validate-application.mjs <application-package-dir>");
    process.exit(1);
  }

  const packageDir = path.resolve(process.cwd(), target);
  if (!(await exists(packageDir))) {
    errors.push(`missing package directory: ${packageDir}`);
  } else {
    const entries = new Set(await readdir(packageDir));
    for (const file of requiredFiles) {
      if (!entries.has(file)) errors.push(`missing required file: ${file}`);
    }
  }

  const workflow = await readIfExists(path.join(packageDir, "workflow.md"));
  const finalText = await readIfExists(path.join(packageDir, "cover-letter-final.md"));
  const hrReview = await readIfExists(path.join(packageDir, "hr-review.md"));
  const evidenceMap = await readIfExists(path.join(packageDir, "evidence-map.md"));
  const checklist = await readIfExists(path.join(packageDir, "submission-checklist.md"));

  const finalHasText = hasSubstantiveText(finalText);
  if (finalHasText && !hasSubstantiveText(hrReview)) {
    errors.push("cover-letter-final.md has text but hr-review.md is empty");
  }
  if (finalHasText && !hasEvidenceRows(evidenceMap)) {
    errors.push("cover-letter-final.md has text but evidence-map.md has no evidence rows");
  }

  const blockers = unresolvedBlockerLines(hrReview);
  if (finalHasText && blockers.length > 0) {
    errors.push(`cover-letter-final.md exists while HR blockers remain: ${blockers.join("; ")}`);
  }

  const status = parseField(workflow, "Status");
  if (status && !validWorkflowStatuses.has(status)) {
    errors.push(`workflow.md has unsupported Status value: ${status}`);
  }
  const jobFunction = parseField(workflow, "Job Function");
  if (jobFunction && !validJobFunctions.has(jobFunction)) {
    errors.push(`workflow.md has unsupported Job Function value: ${jobFunction}`);
  }
  if (/submitted-by-user/i.test(status) && !/submitted by user|사용자.*제출|user confirmed/i.test(workflow)) {
    errors.push("workflow.md marks submitted-by-user without explicit user confirmation note");
  }

  if (!/manual submission|직접 제출|submit manually|submits manually/i.test(checklist + workflow)) {
    warnings.push("manual submission reminder is missing or weak");
  }

  if (errors.length > 0) {
    console.error("Application validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    if (warnings.length > 0) {
      console.error("Warnings:");
      for (const warning of warnings) console.error(`- ${warning}`);
    }
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn("Application validation passed with warnings:");
    for (const warning of warnings) console.warn(`- ${warning}`);
    return;
  }

  console.log("Application validation passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
