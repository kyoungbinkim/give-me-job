import { cp, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const fixtureDir = path.join(root, "tests", "fixtures", "workflows", "lg-electronics-backend");
const packageDisplayPath = ".tmp-workflow-check/lg-electronics-backend";
const packageDir = path.join(root, packageDisplayPath);
const officialTalentUrl = "https://www.lge.co.kr/company/recruit/talent";

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function prepareWorkflowPackage() {
  await rm(packageDir, { recursive: true, force: true });
  await cp(fixtureDir, packageDir, { recursive: true });
}

async function readPackageFile(fileName) {
  return readFile(path.join(packageDir, fileName), "utf8");
}

function finalAnswer(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => line.startsWith("LG전자가 인재상에서 강조하는")) ?? "";
}

async function main() {
  await prepareWorkflowPackage();

  const validation = spawnSync(
    process.execPath,
    ["support/validate/validate-application.mjs", packageDisplayPath],
    { cwd: root, encoding: "utf8" },
  );
  if (validation.status !== 0) {
    process.stderr.write(validation.stdout);
    process.stderr.write(validation.stderr);
    process.exit(validation.status ?? 1);
  }

  const files = Object.fromEntries(
    await Promise.all(requiredFiles.map(async (file) => [file, await readPackageFile(file)])),
  );

  for (const file of requiredFiles) {
    assert(files[file].trim().length > 0, `${file} is empty`);
  }

  assert(files["workflow.md"].includes("- Company: LG전자"), "workflow.md must target LG전자");
  assert(files["workflow.md"].includes("- Status: ready-for-user-review"), "workflow.md must be ready for user review");
  assert(files["company-values.md"].includes(officialTalentUrl), "company-values.md must cite the official LG전자 talent source");

  for (const value of ["LG WAY", "고객 최우선", "혁신", "팀워크", "자율", "창의", "실력 배양", "정정당당"]) {
    assert(files["company-values.md"].includes(value), `company-values.md missing official value: ${value}`);
  }

  const answer = finalAnswer(files["cover-letter-final.md"]);
  assert(answer, "cover-letter-final.md final answer was not found");
  assert(answer.length === 631, `expected final answer length 631, got ${answer.length}`);
  assert(answer.length <= 700, "final answer exceeds 700 characters");
  assert(answer.length >= 630, "final answer should use at least 90% of the 700-character limit");

  for (const fragment of ["고객 최우선과 혁신", "팀워크와 자율적 실행", "실력을 배양", "정정당당하게 개선"]) {
    assert(answer.includes(fragment), `final answer missing LG talent positioning: ${fragment}`);
  }

  for (const evidenceId of ["E1", "E2"]) {
    assert(files["evidence-map.md"].includes(evidenceId), `evidence-map.md missing ${evidenceId}`);
    assert(files["interview-prep.md"].includes(evidenceId), `interview-prep.md missing ${evidenceId}`);
  }

  assert(files["hr-review.md"].replace(/\r\n/g, "\n").includes("- Blockers:\n  - None"), "hr-review.md must have no blockers");
  assert(files["submission-checklist.md"].includes("Submit manually"), "submission-checklist.md must remind manual submission");

  console.log("LG Electronics full workflow validation passed");
  console.log("");
  console.log(`Generated package: ${packageDisplayPath} (ignored by git)`);
  console.log(`Official talent source: ${officialTalentUrl}`);
  console.log(`Final answer length: ${answer.length}/700 characters including spaces`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
