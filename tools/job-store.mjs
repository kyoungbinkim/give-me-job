import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

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
  return jobs;
}

export function parseTargetList(value) {
  if (!value) return ["data/jobs"];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
