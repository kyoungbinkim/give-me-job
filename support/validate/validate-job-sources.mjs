import { fetchSaraminJobs } from "../../tools/job-sources/saramin.mjs";
import { fetchWork24Companies, fetchWork24Jobs } from "../../tools/job-sources/work24.mjs";
import { fetchJobKoreaJobs } from "../../tools/job-sources/jobkorea.mjs";
import { createServer } from "node:http";

const fixtures = [
  ["saramin", "tests/fixtures/saramin-job-search.json", fetchSaraminJobs],
  ["work24", "tests/fixtures/work24-jobs.xml", fetchWork24Jobs],
  ["jobkorea", "tests/fixtures/jobkorea-jobs.xml", fetchJobKoreaJobs],
];

const requiredFields = ["source", "sourceId", "url", "company", "title", "deadline", "active"];
const errors = [];

function work24RecruitXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <dhsOpenEmpInfo>
    <empSeqno>env-auth-1</empSeqno>
    <empBusiNm>환경변수테스트</empBusiNm>
    <empWantedTitle>백엔드 개발자</empWantedTitle>
    <empWantedHomepgDetail>https://example.com/jobs/env-auth-1</empWantedHomepgDetail>
    <empWantedCareerNm>신입</empWantedCareerNm>
    <empWantedEduNm>대졸</empWantedEduNm>
    <regionNm>서울</regionNm>
    <empWantedTypeNm>정규직</empWantedTypeNm>
    <empWantedStdt>20260601</empWantedStdt>
    <empWantedEndt>20991231</empWantedEndt>
  </dhsOpenEmpInfo>
</root>`;
}

async function withHttpServer(handler, callback) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push(new URL(request.url, "http://127.0.0.1"));
    response.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" });
    response.end(handler(requests.at(-1)));
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const { port } = server.address();
    return await callback({ endpoint: `http://127.0.0.1:${port}/work24`, requests });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

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

  const companies = await fetchWork24Companies({ fixture: "tests/fixtures/work24-company-info.xml" });
  if (companies.length !== 1) {
    errors.push("work24-company: fixture should produce one company");
  } else {
    const [company] = companies;
    for (const field of ["sourceId", "company", "companyType", "homepg", "summary"]) {
      if (!company[field]) errors.push(`work24-company[0]: missing ${field}`);
    }
  }

  const previousWork24Key = process.env.WORK24_AUTH_KEY;
  process.env.WORK24_AUTH_KEY = "env-auth-key";
  try {
    await withHttpServer(() => work24RecruitXml(), async ({ endpoint, requests }) => {
      const jobs = await fetchWork24Jobs({
        endpoint,
        noCompanyEnrichment: true,
        params: { display: 1 },
      });
      if (jobs.length !== 1) errors.push("work24-env-auth: expected one job from local API");
      if (requests[0]?.searchParams.get("authKey") !== "env-auth-key") {
        errors.push("work24-env-auth: WORK24_AUTH_KEY environment variable was not sent as authKey");
      }
    });
  } finally {
    if (previousWork24Key === undefined) {
      delete process.env.WORK24_AUTH_KEY;
    } else {
      process.env.WORK24_AUTH_KEY = previousWork24Key;
    }
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
