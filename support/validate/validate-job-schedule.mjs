import { readJobs } from "../../tools/job-store.mjs";
import { filterJobs, statusFor } from "../../tools/schedule-jobs.mjs";

const errors = [];
const today = new Date("2026-06-10T00:00:00Z");
const jobs = await readJobs(["tests/fixtures/jobs-normalized"]);

const expected = {
  "TODAY-001": "today",
  "TOMORROW-001": "tomorrow",
  "WEEK-001": "this-week",
  "ROLLING-001": "rolling",
  "EXPIRED-001": "expired",
};

for (const job of jobs) {
  const actual = statusFor(job, today);
  if (expected[job.sourceId] !== actual) {
    errors.push(`${job.sourceId}: expected ${expected[job.sourceId]}, got ${actual}`);
  }
}

const weekJobs = filterJobs(jobs, { week: true }, today).map((job) => job.sourceId);
for (const required of ["TODAY-001", "TOMORROW-001", "WEEK-001"]) {
  if (!weekJobs.includes(required)) errors.push(`week schedule missing ${required}`);
}
if (weekJobs.includes("EXPIRED-001")) errors.push("week schedule included expired job");
if (weekJobs.includes("ROLLING-001")) errors.push("week schedule included rolling job");

if (errors.length > 0) {
  console.error("Job schedule validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Job schedule validation passed");
