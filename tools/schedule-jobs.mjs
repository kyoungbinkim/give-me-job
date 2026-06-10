import { readJobs, parseTargetList } from "./job-store.mjs";
import { pathToFileURL } from "node:url";

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
node tools/schedule-jobs.mjs --today --jobs data/jobs
node tools/schedule-jobs.mjs --tomorrow --jobs tests/fixtures/jobs-normalized --today-date 2026-06-10
node tools/schedule-jobs.mjs --week --format json
`;
}

function dayStart(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDeadline(deadline) {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function statusFor(job, today) {
  if (job.active === false) return "expired";
  const closeType = `${job.closeType ?? ""}`;
  if (!job.deadline || /상시|수시|채용시|rolling|always/i.test(closeType)) return "rolling";

  const deadline = parseDeadline(job.deadline);
  if (!deadline) return "unknown";

  const todayStart = dayStart(today);
  const deadlineStart = dayStart(deadline);
  const diffDays = Math.round((deadlineStart - todayStart) / 86400000);

  if (diffDays < 0) return "expired";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return "this-week";
  return "later";
}

function filterJobs(jobs, args, today) {
  const mode = args.today ? "today" : args.tomorrow ? "tomorrow" : args.week ? "week" : "all";
  return jobs
    .map((job) => ({ ...job, scheduleStatus: statusFor(job, today) }))
    .filter((job) => {
      if (mode === "today") return job.scheduleStatus === "today";
      if (mode === "tomorrow") return job.scheduleStatus === "tomorrow";
      if (mode === "week") return ["today", "tomorrow", "this-week"].includes(job.scheduleStatus);
      return true;
    })
    .sort((a, b) => {
      const aTime = parseDeadline(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDeadline(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime || String(a.company).localeCompare(String(b.company), "ko");
    });
}

function toSummary(job) {
  return {
    status: job.scheduleStatus,
    deadline: job.deadline || job.closeType || "unknown",
    company: job.company,
    title: job.title,
    source: job.source,
    sourceId: job.sourceId,
    url: job.url,
  };
}

function printMarkdown(jobs) {
  console.log("## Job Schedule");
  console.log("");
  console.log("| Status | Deadline | Company | Title | Source |");
  console.log("| --- | --- | --- | --- | --- |");
  for (const job of jobs) {
    console.log(
      `| ${job.scheduleStatus} | ${job.deadline || job.closeType || "unknown"} | ${job.company} | ${job.title} | ${job.source} |`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const today = args["today-date"] ? new Date(`${args["today-date"]}T00:00:00Z`) : new Date();
  const jobs = await readJobs(parseTargetList(args.jobs));
  const filtered = filterJobs(jobs, args, today);

  if (args.format === "json") {
    console.log(JSON.stringify(filtered.map(toSummary), null, 2));
  } else {
    printMarkdown(filtered);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

export { statusFor, filterJobs, parseDeadline, addDays };
