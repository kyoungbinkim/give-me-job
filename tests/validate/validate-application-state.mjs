import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { initializeApplication } from "../../tools/init-application.mjs";
import { validateApplication, captureReview, unresolvedBlockerLines } from "../../tools/application-state.mjs";

const root = await mkdtemp(path.join(tmpdir(), "gmj-state-"));
try {
  const packageDir = await initializeApplication({ company: "demo", role: "backend", out: root });
  const resumePath = path.join(root, "resume.md");
  const options = { mode: "ready", resumePath, writeState: true };
  assert.equal((await validateApplication(packageDir)).ok, true);
  assert.equal((await validateApplication(packageDir, options)).ok, false);
  for (const value of ["unresolved", "not resolved", "미해결", "해결 안 됨"]) assert.equal(unresolvedBlockerLines(`- Blockers: ${value}`).length, 1);
  for (const value of ["None", "resolved", "없음", "해결 완료"]) assert.equal(unresolvedBlockerLines(`- Blockers: ${value}`).length, 0);
  const put = (name, value) => writeFile(path.join(packageDir, name), typeof value === "string" ? value : JSON.stringify(value));
  await writeFile(resumePath, "# Resume\n## E-001\n테스트를 구현했다.\n");
  const question = { id: "Q1", required: true, prompt: "경험", limit: { max: 100, unit: "characters", includeSpaces: true } };
  const answer = { questionId: "Q1", text: "테스트를 구현했다.", evidenceIds: ["E-001"] };
  await put("questions.json", { questions: [question] });
  await put("answers.json", { answers: [answer] });
  await put("evidence-map.md", "| Q1 | E-001 | 테스트 구현 |\n");
  await put("cover-letter-final.md", `## Q1\n${answer.text}\n`);
  await put("hr-review.md", "# HR Review\n- Review: Evidence checked against resume.\n- Blockers: None\n");
  await captureReview(packageDir, { resumePath, reviewer: "fixture HR" });
  assert.equal((await validateApplication(packageDir, options)).ok, true);
  assert.equal(JSON.parse(await readFile(path.join(packageDir, "state.json"))).status, "ready-for-user-review");
  await put("cover-letter-final.md", `${answer.text}\n새로운 사실`);
  assert((await validateApplication(packageDir, options)).errors.some((error) => error.includes("final changed")));
  await put("answers.json", { answers: [{ ...answer, evidenceIds: ["E-999"] }] });
  assert((await validateApplication(packageDir, options)).errors.some((error) => error.includes("unknown resume evidence")));
  await put("questions.json", { questions: [{ ...question, limit: { ...question.limit, max: 1 } }, { id: "Q2", required: true }] });
  const result = await validateApplication(packageDir, options);
  assert(result.errors.some((error) => error.includes("exceeds")));
  assert(result.errors.some((error) => error.includes("Q2: required")));
  await captureReview(packageDir, { resumePath, reviewer: "fixture HR", blockers: [{ status: "unresolved", reason: "fact" }] });
  assert((await validateApplication(packageDir, options)).errors.some((error) => error.includes("unresolved HR blocker")));
  console.log("Application state validation passed");
} finally {
  await rm(root, { recursive: true, force: true });
}
