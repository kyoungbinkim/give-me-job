import path from "node:path";
import { summarizeJobs, writeJobs } from "./normalize-job.mjs";
import { relativeDisplayPath } from "./platform.mjs";

// TODO: Register job-source adapters here.
//
// Job-source integrations are intentionally left as a TODO so a single
// normalized adapter can be added later. Each adapter is an async function
// that takes the parsed `options` object and returns an array of jobs already
// shaped by `normalizeJob` from ./normalize-job.mjs.
//
// An adapter must not require an API key, access token, or any other issued
// credential. This tool reads no credentials and loads no `.env` file.
//
// Example:
//   import { fetchExampleJobs } from "./job-sources/example.mjs";
//   const JOB_SOURCES = { example: fetchExampleJobs };
const JOB_SOURCES = {};

function parseArgs(argv) {
  const args = { params: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) continue;
    const key = current.slice(2);
    const next = argv[i + 1];
    const value = !next || next.startsWith("--") ? true : next;
    if (value !== true) i += 1;

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

Common options:
  --source <name>          One of: ${sources.length > 0 ? sources.join(", ") : "no sources registered yet"}
  --fixture <path>         Read a fixture instead of calling a live API
  --out <dir>              Default: data/jobs
  --date <YYYY-MM-DD>      Output date folder
  --dry-run                Print normalized jobs without writing files
  --param.<name> <value>   Pass source-specific query parameters

Job-source integrations are a TODO. No sources are registered yet, so this
tool currently exits without fetching. See the registry note in this file to
add one.
`;
}

function sourceOptions(args) {
  return {
    fixture: args.fixture ? path.resolve(process.cwd(), String(args.fixture)) : undefined,
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

  const jobs = await fetchBySource(source, sourceOptions(args));
  if (args["dry-run"]) {
    console.log(JSON.stringify(summarizeJobs(jobs), null, 2));
    return;
  }

  const written = await writeJobs(jobs, {
    out: args.out,
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
