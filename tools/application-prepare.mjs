import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { initializeApplication } from "./init-application.mjs";
import { createApplicationState, saveApplicationState } from "./application-state.mjs";

export async function prepareApplication(root, { job, role } = {}) {
  if (!job?.id) throw new Error("A registered job is required");
  const selectedRole = role || job.role || job.title;
  if (!selectedRole) throw new Error("Select an application role");
  const postingRoles = job.roles ?? job.raw?.positions ?? [];
  if (Array.isArray(postingRoles) && postingRoles.length > 1 && !role) throw new Error("Select one role for this multi-role posting");
  const suffix = createHash("sha256").update(`${job.id}:${selectedRole}`).digest("hex").slice(0, 20);
  const out = path.join(root, "applications");
  const company = job.company || job.companyName || "company";
  const packageDir = path.join(out, `application-${suffix}`);
  let state;
  try { state = JSON.parse(await readFile(path.join(packageDir, "state.json"), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const source = String(job.raw?.postingText ?? job.body ?? job.description ?? job.rawText ?? job.title ?? "");
  const questions = job.raw?.questions ?? job.questions;
  const questionSource = `${JSON.stringify({ questions: Array.isArray(questions) ? questions : [] }, null, 2)}\n`;
  const sourceHash = createHash("sha256").update(`${source}\n${questionSource}`).digest("hex");
  const sourceUpdatedAt = job.updatedAt ?? job.lastCheckedAt ?? null;
  if (state) {
    const sourceFile = path.join(packageDir, "source-jd.md");
    const questionsFile = path.join(packageDir, "questions.json");
    const previousSource = await readFile(sourceFile, "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error));
    const sourceChanged = state.sourceHash
      ? state.sourceHash !== sourceHash
      : previousSource !== source || (state.sourceUpdatedAt !== sourceUpdatedAt && (job.changedFields ?? []).includes("raw"));
    if (sourceChanged) {
      await Promise.all([writeFile(sourceFile, source), writeFile(questionsFile, questionSource)]);
      state = {
        ...state,
        status: "review-blocked",
        sourceHash,
        sourceUpdatedAt,
        stopReasons: [...new Set([...(state.stopReasons ?? []), "Posting source changed: review the current JD and questions"])],
        nextAction: "Review changed posting fields and repeat affected steps",
      };
      await saveApplicationState(packageDir, state);
    } else if (!state.sourceHash) {
      state = { ...state, sourceHash };
      await saveApplicationState(packageDir, state);
    }
    return { packageDir, state, reused: true };
  }
  await initializeApplication({ company, role: selectedRole, out: packageDir, exactDirectory: true });
  state = { ...createApplicationState(), jobId: job.id, selectedRole, sourceHash, sourceUpdatedAt };
  await writeFile(path.join(packageDir, "source-jd.md"), source);
  if (Array.isArray(questions)) await writeFile(path.join(packageDir, "questions.json"), questionSource);
  await saveApplicationState(packageDir, state);
  return { packageDir, state, reused: false };
}
