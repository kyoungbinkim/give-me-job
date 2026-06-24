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
const expectedRegressionScores = new Map([
  ["TODAY-001", { fitScore: 100, applyPriority: "High" }],
  ["TOMORROW-001", { fitScore: 79, applyPriority: "High" }],
  ["WEEK-001", { fitScore: 98, applyPriority: "High" }],
  ["ROLLING-001", { fitScore: 26, applyPriority: "Do not apply yet" }],
  ["EXPIRED-001", { fitScore: 45, applyPriority: "Low" }],
]);

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
for (const [sourceId, expected] of expectedRegressionScores.entries()) {
  const actual = byId.get(sourceId);
  if (!actual) {
    errors.push(`${sourceId} should be present in ranking results`);
    continue;
  }
  if (actual.fitScore !== expected.fitScore) {
    errors.push(`${sourceId} fit score changed unexpectedly: expected ${expected.fitScore}, got ${actual.fitScore}`);
  }
  if (actual.applyPriority !== expected.applyPriority) {
    errors.push(`${sourceId} priority changed unexpectedly: expected ${expected.applyPriority}, got ${actual.applyPriority}`);
  }
}
if (!byId.get("TODAY-001")?.strongMatches.includes("Career level matches new-grad profile")) {
  errors.push("TODAY-001 should explicitly match new-grad career level");
}
if (!byId.get("TODAY-001")?.strongMatches.includes("Location preference matches")) {
  errors.push("TODAY-001 should explicitly match Seoul location preference");
}

const businessResume = extractResumeProfile(`<!--
career-type: new-grad
target-role: Business Planning
-->

## Personal Info
- Location: Seoul

## Target Role
Business Planning

## Projects

### Market Strategy Project
- Built a market analysis and service planning proposal for a class project.

## Skills
- **Frameworks & tools:** market analysis, strategy, planning, stakeholder communication
`);
const businessJob = {
  source: "fixture",
  sourceId: "BUSINESS-001",
  url: "https://example.com/jobs/business-001",
  company: "Business Fixture",
  title: "신입 사업기획 담당자",
  role: "사업기획",
  careerLevel: "신입",
  education: "대졸",
  location: "서울",
  employmentType: "정규직",
  deadline: "2026-06-17",
  closeType: "접수마감일",
  active: true,
  keywords: ["시장 분석", "전략", "기획", "stakeholder"],
};
const businessResult = scoreJob(businessJob, businessResume, today);
if (businessResult.fitScore < 70) {
  errors.push(`BUSINESS-001 should score as a viable business role, got ${businessResult.fitScore}`);
}
if (!businessResult.strongMatches.some((match) => match.includes("business evidence"))) {
  errors.push("BUSINESS-001 should use business profile role matching");
}

if (errors.length > 0) {
  console.error("Job ranking validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Job ranking validation passed");
