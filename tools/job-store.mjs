import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export function normalizeJobUrl(value) {
  if (!value) return "";
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("A public HTTP(S) URL without credentials is required.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return url.href;
}

// Stored records can hold a malformed URL. Reading the store must not fail because
// of one bad record, so dedup and identity fall back to the other keys instead.
export function safeJobUrl(value) {
  try { return normalizeJobUrl(value); }
  catch { return ""; }
}

export function jobIdentity(job) {
  if (job.id) return job.id;
  const url = safeJobUrl(job.url);
  const key = job.source && job.sourceId ? `${job.source}:${job.sourceId}` : url || `${job.company}:${job.title}:${job.raw?.postingText ?? ""}`;
  return `job-${createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
}

// Only timestamps order records; a file path is not comparable with an ISO date and
// used to let a stale record win depending on the platform's path prefix. Records
// without a timestamp sort first, and the sort is stable, so file order breaks ties.
function observedOrder(job) {
  return String(job.lastCheckedAt || job.observedAt || "");
}

export function latestJobs(jobs) {
  const latest = [];
  const sorted = [...jobs].sort((a, b) => observedOrder(a).localeCompare(observedOrder(b)));
  for (const job of sorted) {
    const url = safeJobUrl(job.url);
    const index = latest.findIndex((old) => (old.source && old.sourceId && old.source === job.source && old.sourceId === job.sourceId) || (url && safeJobUrl(old.url) === url) || (old.id && old.id === job.id));
    const record = { ...job, id: index < 0 ? jobIdentity(job) : latest[index].id };
    if (index < 0) latest.push(record);
    else latest[index] = record;
  }
  return latest;
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function listJsonFiles(target) {
  const resolved = path.resolve(process.cwd(), target);
  if (!(await exists(resolved))) return [];
  const info = await stat(resolved);
  if (info.isFile()) return resolved.endsWith(".json") ? [resolved] : [];

  const files = [];
  for (const entry of await readdir(resolved, { withFileTypes: true })) {
    const child = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(child)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(child);
    }
  }
  return files;
}

export async function readJobs(targets = ["data/jobs"]) {
  const files = [];
  for (const target of targets) files.push(...(await listJsonFiles(target)));

  const jobs = [];
  for (const file of [...new Set(files)]) {
    const text = await readFile(file, "utf8");
    const parsed = JSON.parse(text);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    for (const job of entries) {
      jobs.push({ ...job, file });
    }
  }
  return latestJobs(jobs);
}

export function parseTargetList(value) {
  if (!value) return ["data/jobs"];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
