import { readFile } from "node:fs/promises";
import { cleanText, normalizeJob, timestampToIso, toArray } from "../normalize-job.mjs";

const ENDPOINT = "https://oapi.saramin.co.kr/job-search";

function attr(value, key) {
  if (!value || typeof value !== "object") return "";
  return value[key] ?? value[`@${key}`] ?? value["@attributes"]?.[key] ?? "";
}

function pickText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return cleanText(value);
  if (typeof value === "object") {
    return cleanText(value["#text"] ?? value.text ?? value.name ?? value.value ?? "");
  }
  return "";
}

function firstObject(...values) {
  for (const value of values) {
    if (value && typeof value === "object") return value;
  }
  return {};
}

function keywordList(keyword) {
  return pickText(keyword)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSaraminJob(rawJob) {
  const company = firstObject(rawJob.company);
  const position = firstObject(rawJob.position);
  const location = firstObject(position.location);
  const industry = firstObject(position.industry);
  const jobType = firstObject(position["job-type"]);
  const jobMidCode = firstObject(position["job-mid-code"]);
  const jobCode = firstObject(position["job-code"]);
  const experience = firstObject(position["experience-level"]);
  const education = firstObject(position["required-education-level"]);

  const deadline =
    timestampToIso(rawJob["expiration-timestamp"]) ||
    cleanText(rawJob["expiration-date"]) ||
    cleanText(rawJob.deadline);

  const postingDate =
    timestampToIso(rawJob["posting-timestamp"]) ||
    cleanText(rawJob["posting-date"]) ||
    cleanText(rawJob.published);

  const careerLevel = pickText(experience) || cleanText(attr(experience, "code"));
  const role = pickText(jobCode) || pickText(jobMidCode) || pickText(position.title);

  return normalizeJob({
    source: "saramin",
    sourceId: rawJob.id,
    url: rawJob.url,
    company: pickText(company),
    title: pickText(position.title),
    role,
    careerLevel,
    experienceMin: attr(experience, "min"),
    experienceMax: attr(experience, "max"),
    education: pickText(education),
    location: pickText(location),
    employmentType: pickText(jobType),
    postingDate,
    deadline,
    closeType: cleanText(rawJob["close-type"]),
    active: rawJob.active,
    keywords: [
      ...keywordList(rawJob.keyword),
      pickText(industry),
      pickText(jobMidCode),
      pickText(jobCode),
    ],
    raw: rawJob,
  });
}

function extractJobs(payload) {
  const root = payload["job-search"] ?? payload.jobSearch ?? payload;
  const jobs = root.jobs?.job ?? root.job ?? root.jobs ?? [];
  return toArray(jobs);
}

export function normalizeSaraminResponse(payload) {
  return extractJobs(payload).map(normalizeSaraminJob);
}

export function buildSaraminUrl(options = {}) {
  const accessKey = options.accessKey ?? process.env.SARAMIN_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("Missing SARAMIN_ACCESS_KEY. Add it to .env or pass --access-key.");
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("access-key", accessKey);

  const mapping = {
    keywords: "keywords",
    location: "loc_cd",
    locCd: "loc_cd",
    industry: "ind_cd",
    indCd: "ind_cd",
    jobMidCd: "job_mid_cd",
    jobCd: "job_cd",
    jobType: "job_type",
    education: "edu_lv",
    deadline: "deadline",
    published: "published",
    updated: "updated",
    sort: "sort",
    start: "start",
    count: "count",
    fields: "fields",
    bbsGb: "bbs_gb",
  };

  for (const [optionKey, paramName] of Object.entries(mapping)) {
    const value = options[optionKey];
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(paramName, String(value));
    }
  }

  if (!url.searchParams.has("count")) url.searchParams.set("count", "10");
  if (!url.searchParams.has("sort")) url.searchParams.set("sort", "pd");
  return url;
}

export async function fetchSaraminJobs(options = {}) {
  if (options.fixture) {
    const text = await readFile(options.fixture, "utf8");
    return normalizeSaraminResponse(JSON.parse(text));
  }

  const url = buildSaraminUrl(options);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Saramin API request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  return normalizeSaraminResponse(payload);
}
