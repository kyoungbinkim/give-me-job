import { fetchSaraminJobs } from "./job-sources/saramin.mjs";
import { fetchWork24Jobs } from "./job-sources/work24.mjs";
import { fetchJobKoreaJobs } from "./job-sources/jobkorea.mjs";

const fixtures = [
  ["saramin", "tests/fixtures/saramin-job-search.json", fetchSaraminJobs],
  ["work24", "tests/fixtures/work24-jobs.xml", fetchWork24Jobs],
  ["jobkorea", "tests/fixtures/jobkorea-jobs.xml", fetchJobKoreaJobs],
];

const requiredFields = ["source", "sourceId", "url", "company", "title", "deadline", "active"];
const errors = [];

function validateJob(source, job, index) {
  for (const field of requiredFields) {
    if (job[field] === undefined || job[field] === null || job[field] === "") {
      errors.push(`${source}[${index}]: missing ${field}`);
    }
  }
  if (!Array.isArray(job.keywords)) {
    errors.push(`${source}[${index}]: keywords must be an array`);
  }
}

async function main() {
  for (const [source, fixture, fetcher] of fixtures) {
    const jobs = await fetcher({ fixture });
    if (jobs.length === 0) {
      errors.push(`${source}: fixture produced no jobs`);
      continue;
    }
    jobs.forEach((job, index) => validateJob(source, job, index));
  }

  if (errors.length > 0) {
    console.error("Job source validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Job source validation passed: ${fixtures.length} sources`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
