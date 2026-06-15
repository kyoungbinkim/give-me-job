import { readFile } from "node:fs/promises";
import { readJobs } from "../../tools/job-store.mjs";
import { extractResumeProfile, scoreJob } from "../../tools/rank-jobs.mjs";

const errors = [];
const resumeText = await readFile("tests/fixtures/resume-new-grad.md", "utf8");
const resume = extractResumeProfile(resumeText);
const jobs = await readJobs(["tests/fixtures/jobs-normalized"]);
const today = new Date("2026-06-10T00:00:00Z");
const results = jobs.map((job) => scoreJob(job, resume, today));

const byId = new Map(results.map((result) => [result.job.sourceId, result]));

if ((byId.get("TODAY-001")?.fitScore ?? 0) < 75) {
  errors.push("TODAY-001 should be a high-fit backend job");
}
if (byId.get("ROLLING-001")?.applyPriority !== "Do not apply yet") {
  errors.push("ROLLING-001 should not be recommended for a new-grad backend resume");
}
if (!byId.get("EXPIRED-001")?.risk.includes("Posting is expired or inactive")) {
  errors.push("EXPIRED-001 should include expired risk");
}
if ((byId.get("WEEK-001")?.recommendedResumeEvidence.length ?? 0) === 0) {
  errors.push("WEEK-001 should recommend resume evidence");
}

if (errors.length > 0) {
  console.error("Job ranking validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Job ranking validation passed");
