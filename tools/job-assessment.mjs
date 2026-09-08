import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractExperiences } from "./experience-store.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

export async function getAssessment(root, job) {
  const resume = await readFile(path.join(root, "resume.md"), "utf8").catch((error) => error.code === "ENOENT" ? "" : Promise.reject(error));
  const jd = String(job.raw?.postingText ?? job.title ?? "");
  let saved = null;
  try { saved = JSON.parse(await readFile(path.join(root, "data/assessments", `${job.id}.json`), "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const hashes = { jd: hash(jd), resume: hash(resume) };
  if (!saved) return { status: "needs-analysis", eligibility: "확인 필요", fit: "확인 필요", preparationBurden: "확인 필요", requirements: [], hashes };
  const errors = [];
  if (saved.hashes?.jd !== hashes.jd) errors.push("JD changed");
  if (saved.hashes?.resume !== hashes.resume) errors.push("resume changed");
  const evidence = new Set(extractExperiences(resume).map((item) => item.id));
  for (const requirement of saved.requirements ?? []) {
    for (const id of requirement.evidenceIds ?? []) if (!evidence.has(id)) errors.push(`unknown evidence ID ${id}`);
  }
  const mandatoryUnmet = (saved.requirements ?? []).some((item) => item.importance === "mandatory" && item.status === "unmet");
  return {
    ...saved,
    status: errors.length ? "revalidation-required" : "current",
    errors,
    hashes,
    eligibility: mandatoryUnmet ? "미충족" : saved.eligibility ?? "확인 필요",
    recommendation: mandatoryUnmet ? "보류" : saved.recommendation,
  };
}
