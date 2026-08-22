import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const JOB_SCHEMA_VERSION = "0.2";

export function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

export function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export function toBooleanActive(value) {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return true;
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function timestampToIso(value) {
  const number = toNumberOrNull(value);
  if (number === null || number <= 0) return "";
  return new Date(number * 1000).toISOString();
}

export function dateStamp(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function safeFilePart(value) {
  const safe = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || "unknown";
}

export function normalizeJob(input) {
  return {
    schemaVersion: JOB_SCHEMA_VERSION,
    source: cleanText(input.source),
    sourceId: cleanText(input.sourceId),
    url: cleanText(input.url),
    company: cleanText(input.company),
    title: cleanText(input.title),
    role: cleanText(input.role),
    careerLevel: cleanText(input.careerLevel),
    experienceMin: toNumberOrNull(input.experienceMin),
    experienceMax: toNumberOrNull(input.experienceMax),
    education: cleanText(input.education),
    location: cleanText(input.location),
    employmentType: cleanText(input.employmentType),
    postingDate: cleanText(input.postingDate),
    deadline: cleanText(input.deadline),
    closeType: cleanText(input.closeType),
    active: toBooleanActive(input.active),
    keywords: [...new Set(toArray(input.keywords).map(cleanText).filter(Boolean))],
    raw: input.raw ?? {},
  };
}

export async function writeJobs(jobs, options = {}) {
  const root = options.root ?? process.cwd();
  const out = options.out ?? "data/jobs";
  const date = options.date ?? dateStamp();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Job output date must use YYYY-MM-DD format.");
  }
  const targetDir = path.resolve(root, out, date);
  await mkdir(targetDir, { recursive: true });

  const written = [];
  for (const job of jobs) {
    const source = safeFilePart(job.source);
    const id = safeFilePart(job.sourceId || job.url || job.title);
    const filePath = path.join(targetDir, `${source}-${id}.json`);
    await writeFile(filePath, `${JSON.stringify(job, null, 2)}\n`, "utf8");
    written.push(filePath);
  }

  return written;
}

export function summarizeJobs(jobs) {
  return jobs.map((job) => ({
    source: job.source,
    sourceId: job.sourceId,
    company: job.company,
    title: job.title,
    employmentType: job.employmentType,
    postingDate: job.postingDate,
    deadline: job.deadline,
    location: job.location,
    active: job.active,
    url: job.url,
  }));
}
