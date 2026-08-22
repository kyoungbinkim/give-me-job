import path from "node:path";
import { summarizeJobs, writeJobs } from "./normalize-job.mjs";
import { relativeDisplayPath } from "./platform.mjs";
import { fetchManualUrlJobs } from "./job-sources/manual-url.mjs";

// Automated discovery adapters remain a TODO. The url adapter handles a single
// public posting supplied by the user. Each adapter is an async function
// that takes the parsed `options` object and returns an array of jobs already
// shaped by `normalizeJob` from ./normalize-job.mjs.
//
// An adapter must not require an API key, access token, or any other issued
// credential. This tool reads no credentials and loads no `.env` file.
//
// Example:
//   import { fetchExampleJobs } from "./job-sources/example.mjs";
//   const JOB_SOURCES = { example: fetchExampleJobs };
const JOB_SOURCES = { url: fetchManualUrlJobs };

function workspacePath(value, flag) {
  if (!value) return undefined;
  const base = path.resolve(process.cwd());
  const resolved = path.resolve(base, String(value));
  const relative = path.relative(base, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${flag} must stay inside the current workspace.`);
  }
  return resolved;
}

function parseArgs(argv) {
  const args = { params: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const rawFlag = current.slice(2);
    const equalsIndex = rawFlag.indexOf("=");
    const key = equalsIndex === -1 ? rawFlag : rawFlag.slice(0, equalsIndex);
    const inlineValue = equalsIndex === -1 ? undefined : rawFlag.slice(equalsIndex + 1);
    const next = argv[i + 1];
    const value = inlineValue ?? (!next || next.startsWith("--") ? true : next);
    if (inlineValue === undefined && value !== true) i += 1;

    if (key.startsWith("param.")) {
      args.params[key.slice("param.".length)] = value;
    } else {
      args[key] = value;
    }
  }
  return args;
}

function availableSources() {
  return Object.keys(JOB_SOURCES);
}

function usage() {
  const sources = availableSources();
  const sourceList = sources.length > 0 ? sources.join("|") : "(none registered yet — TODO)";
  return `Usage:
node tools/fetch-jobs.mjs --source ${sourceList} [flags...]
node tools/fetch-jobs.mjs --source <source> --fixture <path> --dry-run
node tools/fetch-jobs.mjs --source url --url <posting-url>

Common options:
  --source <name>          One of: ${sources.length > 0 ? sources.join(", ") : "no sources registered yet"}
  --url <posting-url>      Public JobKorea, Linkareer, SK Careers, or LG Careers detail URL
  --fixture <path>         Read a fixture instead of calling a live API
  --out <dir>              Default: data/jobs
  --date <YYYY-MM-DD>      Output date folder
  --dry-run                Print normalized jobs without writing files
  --param.<name> <value>   Pass source-specific query parameters

Automated job discovery is still a TODO. The url source handles one public
posting URL supplied by the user without credentials.
`;
}

function sourceOptions(args) {
  return {
    fixture: workspacePath(args.fixture, "--fixture"),
    url: args.url,
    keywords: args.keywords,
    deadline: args.deadline,
    count: args.count,
    params: args.params,
  };
}

async function fetchBySource(source, options) {
  const adapter = JOB_SOURCES[source];
  if (!adapter) {
    const sources = availableSources();
    const hint =
      sources.length > 0
        ? `Available sources: ${sources.join(", ")}.`
        : "Job-source integrations are not implemented yet (TODO). No sources are registered.";
    throw new Error(`Unsupported source: ${source || "(none)"}. ${hint}`);
  }
  return adapter(options);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = String(args.source ?? "").toLowerCase();
  if (!source || args.help) {
    console.error(usage());
    process.exit(source ? 0 : 1);
  }

  const out = args.out ? workspacePath(args.out, "--out") : undefined;

  const jobs = await fetchBySource(source, sourceOptions(args));
  if (args["dry-run"]) {
    console.log(JSON.stringify(summarizeJobs(jobs), null, 2));
    return;
  }

  const written = await writeJobs(jobs, {
    out,
    date: args.date,
  });

  console.log(`Fetched ${jobs.length} ${source} jobs`);
  for (const file of written) {
    console.log(relativeDisplayPath(process.cwd(), file));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
