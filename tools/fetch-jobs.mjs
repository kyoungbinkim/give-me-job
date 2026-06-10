import path from "node:path";
import { loadDotEnv } from "./env.mjs";
import { summarizeJobs, writeJobs } from "./normalize-job.mjs";
import { fetchSaraminJobs } from "./job-sources/saramin.mjs";
import { fetchWork24Jobs } from "./job-sources/work24.mjs";
import { fetchJobKoreaJobs } from "./job-sources/jobkorea.mjs";

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

function usage() {
  return `Usage:
node tools/fetch-jobs.mjs --source saramin --keywords "백엔드 Java" [--deadline tomorrow] [--count 20]
node tools/fetch-jobs.mjs --source work24 --endpoint <approved-url> --auth-key <key>
node tools/fetch-jobs.mjs --source jobkorea --endpoint <issued-call-url>
node tools/fetch-jobs.mjs --source saramin --fixture tests/fixtures/saramin-job-search.json --dry-run

Common options:
  --source saramin|work24|jobkorea
  --fixture <path>         Read fixture instead of calling a live API
  --out <dir>              Default: data/jobs
  --date <YYYY-MM-DD>      Output date folder
  --dry-run                Print normalized jobs without writing files
  --param.<name> <value>   Pass source-specific query parameters
`;
}

function sourceOptions(args) {
  return {
    accessKey: args["access-key"],
    authKey: args["auth-key"],
    endpoint: args.endpoint,
    fixture: args.fixture ? path.resolve(process.cwd(), String(args.fixture)) : undefined,
    keywords: args.keywords,
    location: args.location,
    locCd: args["loc-cd"],
    industry: args.industry,
    indCd: args["ind-cd"],
    jobMidCd: args["job-mid-cd"],
    jobCd: args["job-cd"],
    jobType: args["job-type"],
    education: args.education,
    deadline: args.deadline,
    published: args.published,
    updated: args.updated,
    sort: args.sort,
    start: args.start,
    count: args.count,
    fields: args.fields,
    bbsGb: args["bbs-gb"],
    params: args.params,
  };
}

async function fetchBySource(source, options) {
  if (source === "saramin") return fetchSaraminJobs(options);
  if (source === "work24") return fetchWork24Jobs(options);
  if (source === "jobkorea") return fetchJobKoreaJobs(options);
  throw new Error(`Unsupported source: ${source}`);
}

async function main() {
  await loadDotEnv();

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
    console.log(path.relative(process.cwd(), file));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
