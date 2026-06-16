import path from "node:path";
import { loadDotEnv } from "./env.mjs";
import { summarizeJobs, writeJobs } from "./normalize-job.mjs";
import { relativeDisplayPath } from "./platform.mjs";
import { fetchSaraminJobs } from "./job-sources/saramin.mjs";
import { fetchWork24Companies, fetchWork24Jobs } from "./job-sources/work24.mjs";
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
node tools/fetch-jobs.mjs --source work24 --active-only --param.empWantedTitle "데이터 사이언스" --dry-run
node tools/fetch-jobs.mjs --source work24 --active-only --match-keyword "엘지" --pages 30 --param.display 100 --dry-run
node tools/fetch-jobs.mjs --source work24 --mode company --param.coNm "삼성" --dry-run
node tools/fetch-jobs.mjs --source jobkorea --endpoint <issued-call-url>
node tools/fetch-jobs.mjs --source saramin --fixture tests/fixtures/saramin-job-search.json --dry-run

Common options:
  --source saramin|work24|jobkorea
  --mode jobs|company      Work24 only. Default: jobs
  --fixture <path>         Read fixture instead of calling a live API
  --out <dir>              Default: data/jobs
  --date <YYYY-MM-DD>      Output date folder
  --dry-run                Print normalized jobs without writing files
  --active-only            Work24 jobs only. Keep postings whose deadline has not passed
  --match-keyword <text>   Work24 jobs only. Locally filter company/title/url when API filters are insufficient
  --pages <number>         Work24 jobs only. Fetch multiple pages before local filtering. Default: 1
  --company-endpoint <url> Work24 company-info endpoint for L31 enrichment/search
  --no-company-enrichment  Work24 jobs only, without L31 company-info enrichment
  --param.<name> <value>   Pass source-specific query parameters
`;
}

function sourceOptions(args) {
  return {
    accessKey: args["access-key"],
    authKey: args["auth-key"],
    endpoint: args.endpoint,
    companyEndpoint: args["company-endpoint"],
    mode: args.mode,
    noCompanyEnrichment: Boolean(args["no-company-enrichment"]),
    activeOnly: Boolean(args["active-only"]),
    matchKeyword: args["match-keyword"],
    pages: args.pages,
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
  if (source === "work24" && options.mode === "company") return fetchWork24Companies(options);
  if (source === "work24") return fetchWork24Jobs(options);
  if (source === "jobkorea") return fetchJobKoreaJobs(options);
  throw new Error(`Unsupported source: ${source}`);
}

function summarizeCompanies(companies) {
  return companies.map((company) => ({
    source: company.source,
    sourceId: company.sourceId,
    company: company.company,
    companyType: company.companyType,
    summary: company.summary,
    url: company.homepg,
  }));
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
    const summary = source === "work24" && args.mode === "company" ? summarizeCompanies(jobs) : summarizeJobs(jobs);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  if (source === "work24" && args.mode === "company") {
    throw new Error("Work24 company search is dry-run only. Use jobs mode to write normalized job files.");
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
