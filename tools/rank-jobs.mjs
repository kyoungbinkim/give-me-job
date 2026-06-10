import { readFile } from "node:fs/promises";
import { readJobs, parseTargetList } from "./job-store.mjs";
import { statusFor } from "./schedule-jobs.mjs";
import { isMainModule } from "./platform.mjs";

const TECH_TERMS = [
  "java",
  "spring",
  "spring boot",
  "mysql",
  "api",
  "backend",
  "백엔드",
  "sql",
  "transaction",
  "test",
  "testing",
  "테스트",
  "reliability",
  "consistency",
  "data consistency",
  "git",
  "postman",
  "kubernetes",
  "sre",
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  return `Usage:
node tools/rank-jobs.mjs --resume resume.md --jobs data/jobs
node tools/rank-jobs.mjs --resume tests/fixtures/resume-new-grad.md --jobs tests/fixtures/jobs-normalized --today-date 2026-06-10
`;
}

function normalizeText(value) {
  return String(value ?? "").toLowerCase();
}

function containsAny(text, terms) {
  return terms.filter((term) => text.includes(term.toLowerCase()));
}

function locationMatches(jobLocation, resumeLocation) {
  const job = normalizeText(jobLocation);
  const resume = normalizeText(resumeLocation);
  if (!job || !resume) return false;
  const aliases = {
    seoul: ["서울", "seoul"],
    서울: ["서울", "seoul"],
    gyeonggi: ["경기", "gyeonggi"],
    경기: ["경기", "gyeonggi"],
    incheon: ["인천", "incheon"],
    인천: ["인천", "incheon"],
    remote: ["원격", "재택", "remote"],
    원격: ["원격", "재택", "remote"],
  };
  const resumeAliases = aliases[resume] ?? [resume];
  return resumeAliases.some((alias) => job.includes(alias));
}

function extractResumeProfile(resumeText) {
  const lower = normalizeText(resumeText);
  const targetRoles = resumeText.match(/Target Roles:\s*(.*)/i)?.[1] ?? "";
  const location = resumeText.match(/Location Preference:\s*(.*)/i)?.[1] ?? "";
  const careerType = resumeText.match(/Career Type:\s*(.*)/i)?.[1] ?? "";
  const skills = resumeText.match(/Technical Skills:\s*(.*)/i)?.[1] ?? "";
  const competencies = [...resumeText.matchAll(/Related Competencies:\s*(.*)/gi)].map((match) => match[1]).join(", ");
  const evidenceIds = [...resumeText.matchAll(/^###\s+([A-Z0-9-]+)/gim)].map((match) => match[1]);

  return {
    raw: resumeText,
    lower,
    targetRoles,
    location,
    careerType,
    skills,
    competencies,
    evidenceIds,
    terms: [...new Set(containsAny(lower, TECH_TERMS))],
  };
}

function deadlineScore(status) {
  if (status === "today") return { score: 5, note: "deadline today" };
  if (status === "tomorrow") return { score: 4, note: "deadline tomorrow" };
  if (status === "this-week") return { score: 3, note: "deadline this week" };
  if (status === "rolling") return { score: 1, note: "rolling or always open" };
  if (status === "expired") return { score: -30, note: "expired or inactive" };
  return { score: 0, note: "later deadline" };
}

function priority(score) {
  if (score >= 75) return "High";
  if (score >= 55) return "Medium";
  if (score >= 40) return "Low";
  return "Do not apply yet";
}

function scoreJob(job, resume, today) {
  let score = 25;
  const strongMatches = [];
  const weakMatches = [];
  const missingEvidence = [];
  const risk = [];
  const recommendedEvidence = [];

  const jobText = normalizeText([
    job.title,
    job.role,
    job.careerLevel,
    job.education,
    job.location,
    job.employmentType,
    ...(job.keywords ?? []),
  ].join(" "));

  const matchingTerms = resume.terms.filter((term) => jobText.includes(term));
  if (matchingTerms.length > 0) {
    const points = Math.min(25, matchingTerms.length * 5);
    score += points;
    strongMatches.push(`Skill/keyword overlap: ${matchingTerms.join(", ")}`);
  } else {
    score -= 10;
    missingEvidence.push("No clear technical keyword overlap with resume.md");
  }

  const roleText = normalizeText(`${job.role} ${job.title}`);
  if (/backend|백엔드|api/.test(roleText) && /backend|백엔드|api/i.test(`${resume.targetRoles} ${resume.skills} ${resume.competencies}`)) {
    score += 20;
    strongMatches.push("Target role matches backend/API evidence");
  } else {
    score -= 5;
    weakMatches.push("Role match is not direct");
  }

  const careerText = normalizeText(job.careerLevel);
  const resumeCareer = normalizeText(resume.careerType);
  if (/신입|new grad|0/.test(careerText) && /new grad|신입/i.test(resumeCareer)) {
    score += 15;
    strongMatches.push("Career level matches new-grad profile");
  } else if (/경력/.test(careerText) && /new grad|신입/i.test(resumeCareer) && Number(job.experienceMin ?? 0) >= 2) {
    score -= 20;
    risk.push("Career-level mismatch for new-grad profile");
  } else {
    weakMatches.push("Career level needs manual confirmation");
  }

  if (locationMatches(job.location, resume.location)) {
    score += 5;
    strongMatches.push("Location preference matches");
  } else if (job.location) {
    weakMatches.push(`Location differs or needs confirmation: ${job.location}`);
  }

  if (/대졸|학력무관|bachelor|4년/i.test(`${job.education}`)) {
    score += 5;
  } else if (job.education) {
    weakMatches.push(`Education requirement needs confirmation: ${job.education}`);
  }

  if (matchingTerms.length < 2) {
    missingEvidence.push("Add stronger evidence for required job keywords before drafting");
  }
  if (resume.evidenceIds.length > 0 && matchingTerms.length > 0) {
    recommendedEvidence.push(...resume.evidenceIds.slice(0, 3));
  }

  const status = statusFor(job, today);
  const deadline = deadlineScore(status);
  score += deadline.score;
  if (deadline.note) strongMatches.push(deadline.note);
  if (status === "expired") risk.push("Posting is expired or inactive");

  score = Math.max(0, Math.min(100, score));
  return {
    job,
    fitScore: score,
    applyPriority: priority(score),
    scheduleStatus: status,
    strongMatches,
    weakMatches,
    missingEvidence,
    recommendedResumeEvidence: [...new Set(recommendedEvidence)],
    risk,
  };
}

function printMarkdown(results) {
  console.log("## Job Fit Ranking");
  for (const result of results) {
    console.log("");
    console.log(`### ${result.job.company} - ${result.job.title}`);
    console.log(`- Fit Score: ${result.fitScore}`);
    console.log(`- Apply Priority: ${result.applyPriority}`);
    console.log(`- Deadline Status: ${result.scheduleStatus}`);
    console.log(`- URL: ${result.job.url}`);
    console.log(`- Strong Matches: ${result.strongMatches.join("; ") || "None"}`);
    console.log(`- Weak Matches: ${result.weakMatches.join("; ") || "None"}`);
    console.log(`- Missing Evidence: ${result.missingEvidence.join("; ") || "None"}`);
    console.log(`- Recommended Resume Evidence: ${result.recommendedResumeEvidence.join(", ") || "None"}`);
    console.log(`- Risk: ${result.risk.join("; ") || "None"}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.resume || args.help) {
    console.error(usage());
    process.exit(args.help ? 0 : 1);
  }

  const resumeText = await readFile(args.resume, "utf8");
  const resume = extractResumeProfile(resumeText);
  const jobs = await readJobs(parseTargetList(args.jobs));
  const today = args["today-date"] ? new Date(`${args["today-date"]}T00:00:00Z`) : new Date();
  const results = jobs.map((job) => scoreJob(job, resume, today)).sort((a, b) => b.fitScore - a.fitScore);

  if (args.format === "json") {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printMarkdown(results);
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export { extractResumeProfile, scoreJob, priority };
