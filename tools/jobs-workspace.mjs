import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJobs, jobIdentity, normalizeJobUrl, safeJobUrl } from "./job-store.mjs";
import { normalizeJob } from "./normalize-job.mjs";
import { fetchManualUrlJobs } from "./job-sources/manual-url.mjs";
import { getProfile, writeWorkspaceJson } from "./profile.mjs";
import { getAssessment } from "./job-assessment.mjs";

const MAX_URL_IMPORTS = 20;
const MAX_URL_INPUT_CHARS = 20_000;
const MAX_URL_IMPORT_TEXT_CHARS = 2_000_000;

export function parseCsv(text) {
  const rows = [];
  let cells = [], value = "", quoted = false, closed = false, line = 1, start = 1;
  const finish = () => { cells.push(value); rows.push({ row: start, cells }); cells = []; value = ""; closed = false; };
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
      else if (c === '"') { quoted = false; closed = true; }
      else { value += c; if (c === "\n") line += 1; }
    } else if (c === '"') {
      if (value || closed) throw new Error(`Invalid CSV quote at line ${line}.`);
      quoted = true;
    } else if (c === ",") { cells.push(value); value = ""; closed = false; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      finish(); line += 1; start = line;
    } else {
      if (closed) throw new Error(`Unexpected text after CSV quote at line ${line}.`);
      value += c;
    }
  }
  if (quoted) throw new Error(`Unclosed CSV quote at line ${start}.`);
  if (value || cells.length || closed) finish();
  return rows.filter((row) => row.cells.some((cell) => cell.trim()));
}

function seoulDateStamp(now) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function isExpiredJob(job, now = new Date()) {
  const deadline = String(job.deadline ?? "").trim();
  if (!deadline) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline < seoulDateStamp(now);
  const timestamp = Date.parse(deadline);
  return Number.isFinite(timestamp) && seoulDateStamp(new Date(timestamp)) < seoulDateStamp(now);
}

function removeExpiredJobs(jobs, now = new Date()) {
  const active = [];
  const expiredRemoved = [];
  for (const job of jobs) {
    if (isExpiredJob(job, now)) expiredRemoved.push({ jobId: job.id, company: job.company, title: job.title, deadline: job.deadline });
    else active.push(job);
  }
  return { active, expiredRemoved };
}

async function pruneWorkspaceJobs(root, now = new Date()) {
  const target = path.join(root, "data/jobs/workspace.json");
  let jobs;
  try { jobs = JSON.parse(await readFile(target, "utf8")); }
  catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  if (!Array.isArray(jobs)) return [];
  const { active, expiredRemoved } = removeExpiredJobs(jobs, now);
  if (expiredRemoved.length) await writeWorkspaceJson(target, active);
  return expiredRemoved;
}

async function inputRows(options) {
  if (options.retry) {
    if (!/^[a-zA-Z0-9-]+$/.test(options.retry)) throw new Error("Invalid import report ID.");
    const report = JSON.parse(await readFile(path.join(options.root, "data/job-imports", `${options.retry}.json`), "utf8"));
    return report.results.filter((item) => item.status === "failed").map(({ row, input }) => ({ row, input }));
  }
  const encoding = options.encoding ?? "utf-8";
  if (!["utf-8", "euc-kr"].includes(encoding)) throw new Error("Choose encoding utf-8 or euc-kr explicitly.");
  const text = options.file ? new TextDecoder(encoding, { fatal: true }).decode(await readFile(path.resolve(options.root, options.file))) : String(options.input ?? "");
  if (text.includes("\uFFFD")) throw new Error("Input contains replacement characters; verify its encoding.");
  if (options.kind === "csv") {
    const [header, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
    if (!header) return [];
    const mapping = options.mapping ?? Object.fromEntries(header.cells.map((cell) => [cell, cell]));
    for (const column of Object.values(mapping)) if (!header.cells.includes(column)) throw new Error(`Missing CSV column: ${column}`);
    return rows.map(({ row, cells }) => ({ row, input: Object.fromEntries(Object.entries(mapping).map(([field, column]) => [field, cells[header.cells.indexOf(column)] ?? ""])), error: cells.length === header.cells.length ? "" : "CSV column count differs from header." }));
  }
  if (options.kind === "urls") {
    if (text.length > MAX_URL_INPUT_CHARS) throw new Error(`URL input must be at most ${MAX_URL_INPUT_CHARS} characters.`);
    const rows = text.split(/\r?\n/).map((url, index) => ({ row: index + 1, input: { url: url.trim() } })).filter(({ input }) => input.url);
    if (rows.length > MAX_URL_IMPORTS) throw new Error(`Import at most ${MAX_URL_IMPORTS} URLs at a time.`);
    return rows;
  }
  if (options.kind !== "text") throw new Error("Import kind must be csv, urls, or text.");
  return [{ row: 1, input: { ...options.metadata, postingText: text } }];
}

export async function listWorkspaceJobs({ root = process.cwd(), role, location, status, search, query, sort } = {}) {
  const now = new Date();
  await pruneWorkspaceJobs(root, now);
  const jobs = await readJobs([path.join(root, "data/jobs")]);
  const term = search ?? query;
  const filtered = jobs.filter((job) => !isExpiredJob(job, now) && (!role || `${job.role} ${job.title}`.includes(role)) && (!location || String(job.location ?? "").includes(location)) && (!status || job.availability === status) && (!term || `${job.company} ${job.title} ${job.role}`.toLowerCase().includes(term.toLowerCase())));
  if (sort === "company") filtered.sort((a, b) => String(a.company).localeCompare(String(b.company), "ko"));
  else if (sort === "updated") filtered.sort((a, b) => String(b.lastCheckedAt ?? "").localeCompare(String(a.lastCheckedAt ?? "")));
  else if (sort === "deadline") filtered.sort((a, b) => String(a.deadline || "9999").localeCompare(String(b.deadline || "9999")));
  return filtered;
}

function changes(previous, next) {
  return ["company", "title", "role", "careerLevel", "education", "location", "employmentType", "deadline", "active", "raw"].filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]));
}

function upsert(jobs, input, now, origin) {
  const url = normalizeJobUrl(input.url);
  const candidateId = jobIdentity(input);
  const previous = jobs.find((job) => job.id === candidateId || (url && safeJobUrl(job.url) === url) || (input.source && input.sourceId && job.source === input.source && job.sourceId === input.sourceId));
  const next = { ...previous, ...normalizeJob({ ...previous, ...input, url }), selectedRole: input.selectedRole ?? previous?.selectedRole ?? "", id: previous?.id || candidateId, lastCheckedAt: now };
  next.availability = input.active === false ? "closed" : "open";
  next.changedFields = previous ? changes(previous, next) : [];
  next.reviewRequired = Boolean(previous?.reviewRequired || next.changedFields.some((key) => ["raw", "role", "careerLevel", "education"].includes(key)));
  next.observations = [...previous?.observations ?? [], { at: now, source: origin, changedFields: next.changedFields, snapshot: { ...normalizeJob(input), url } }];
  next.duplicateCandidates = jobs.filter((job) => job.id !== next.id && job.company && job.company === next.company && job.title === next.title).map((job) => job.id);
  if (previous) jobs[jobs.indexOf(previous)] = next;
  else jobs.push(next);
  return { job: next, status: previous ? next.changedFields.length ? "updated" : "duplicate" : "new" };
}

export async function importJobs(options = {}) {
  const root = options.root ?? process.cwd();
  const rows = await inputRows({ ...options, root });
  const jobs = await listWorkspaceJobs({ root });
  const report = { id: randomUUID(), createdAt: new Date().toISOString(), counts: { new: 0, updated: 0, duplicate: 0, "needs-confirmation": 0, failed: 0 }, results: [] };
  let importedTextChars = 0;
  for (const item of rows) {
    try {
      if (item.error) throw new Error(item.error);
      let input = item.input;
      if (input.url && !input.postingText && !input.company && !input.title) {
        try {
          const [fetched] = await (options.fetcher ?? fetchManualUrlJobs)({ url: input.url });
          // Keep the other columns the user supplied for this row; only the fields
          // the row left empty come from the fetched posting.
          const supplied = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== undefined && value !== null));
          input = { ...fetched, ...supplied };
        } catch (error) {
          if (!/Unsupported posting/.test(error.message)) throw error;
          const result = upsert(jobs, { ...input, source: "manual", raw: { postingText: "", extractionWarnings: [error.message] } }, report.createdAt, { row: item.row });
          result.job.availability = "unverifiable";
          report.results.push({ ...item, status: "needs-confirmation", jobId: result.job.id, message: error.message });
          continue;
        }
      }
      if (options.kind === "urls") {
        importedTextChars += String(input.raw?.postingText ?? input.postingText ?? "").length;
        if (importedTextChars > MAX_URL_IMPORT_TEXT_CHARS) throw new Error("Imported posting text exceeds the 2,000,000 character batch limit.");
      }
      if (!input.company || !input.title) throw new Error("Company and title are required for supplied JD content.");
      if (typeof input.active === "string") {
        if (!["true", "false", "1", "0", ""].includes(input.active)) throw new Error("active must be true, false, 1, or 0.");
        input = { ...input, active: !["false", "0"].includes(input.active) };
      }
      input = { ...input, source: input.source || "manual", raw: input.raw ?? { postingText: input.postingText ?? "", positions: [], questions: [] } };
      const result = upsert(jobs, input, report.createdAt, { row: item.row, file: options.file ?? "user-input" });
      report.results.push({ ...item, status: result.status, jobId: result.job.id, changedFields: result.job.changedFields });
    } catch (error) { report.results.push({ ...item, status: "failed", message: error.message }); }
  }
  for (const item of report.results) report.counts[item.status] += 1;
  const { active, expiredRemoved } = removeExpiredJobs(jobs);
  report.expiredRemoved = expiredRemoved;
  await writeWorkspaceJson(path.join(root, "data/jobs/workspace.json"), active.map(({ file, ...job }) => job));
  await writeWorkspaceJson(path.join(root, "data/job-imports", `${report.id}.json`), report);
  return report;
}

export async function refreshJobs({ root = process.cwd(), ids, fetcher = fetchManualUrlJobs } = {}) {
  const jobs = await listWorkspaceJobs({ root });
  const requested = jobs.filter((job) => !ids || ids.includes(job.id));
  // Text and CSV imports legitimately have no posting URL. Refetching them always
  // fails, so they are reported as skipped instead of being marked unverifiable.
  const selected = requested.filter((job) => Boolean(safeJobUrl(job.url)));
  const results = requested.filter((job) => !safeJobUrl(job.url)).map((job) => ({ jobId: job.id, status: "skipped", availability: job.availability, message: "Manually entered job without a public posting URL." }));
  let cursor = 0;
  async function worker() {
    while (cursor < selected.length) {
      const job = selected[cursor++];
      let attempts = 0;
      while (true) {
        attempts += 1;
        try {
          const [input] = await fetcher({ url: job.url, timeout: 30_000 });
          const result = upsert(jobs, input, new Date().toISOString(), "refresh");
          results.push({ jobId: job.id, status: result.status, availability: result.job.availability, changedFields: result.job.changedFields, attempts });
          break;
        } catch (error) {
          const transient = /fetch failed|network|ECONN|ETIMEDOUT|timeout|timed out|failed: 5\d\d/i.test(`${error.name} ${error.message}`);
          if (transient && attempts < 3) continue;
          job.lastCheckedAt = new Date().toISOString();
          job.availability = "unverifiable";
          job.observations = [...job.observations ?? [], { at: job.lastCheckedAt, source: "refresh", error: error.message }];
          results.push({ jobId: job.id, status: "needs-confirmation", availability: "unverifiable", message: error.message, attempts });
          break;
        }
      }
    }
  }
  await Promise.all([worker(), worker()]);
  const { active, expiredRemoved } = removeExpiredJobs(jobs);
  await writeWorkspaceJson(path.join(root, "data/jobs/workspace.json"), active.map(({ file, ...job }) => job));
  return { results, expiredRemoved };
}

export async function rankWorkspaceJobs({ root = process.cwd() } = {}) {
  const profile = await getProfile({ root });
  const ranked = await Promise.all((await listWorkspaceJobs({ root })).map(async (job) => {
    const conditions = [["roles", `${job.role} ${job.title}`], ["locations", job.location], ["employmentTypes", job.employmentType]].filter(([key]) => profile[key].length).map(([key, actual]) => ({ field: key, actual, status: !actual ? "확인 필요" : profile[key].some((value) => actual.includes(value)) ? "충족" : "미충족" }));
    const excluded = profile.excludedKeywords.filter((word) => `${job.company} ${job.title} ${job.raw?.postingText ?? ""}`.includes(word));
    const assessment = await getAssessment(root, job);
    return { ...job, conditions, excluded, ...assessment, recommendation: excluded.length || job.active === false ? "보류" : assessment.recommendation ?? "정보 보완", nextAction: assessment.status === "current" ? assessment.nextAction : "JD 기준 요구사항을 먼저 고정한 후 이력서 근거와 연결하세요.", conditionScore: conditions.filter((condition) => condition.status === "충족").length };
  }));
  return ranked.sort((a, b) => a.excluded.length - b.excluded.length || (a.eligibility === "미충족") - (b.eligibility === "미충족") || b.conditionScore - a.conditionScore || (a.deadline || "9999").localeCompare(b.deadline || "9999"));
}
