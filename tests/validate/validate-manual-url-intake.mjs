import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  fetchManualUrlJobs,
  jobKoreaDetailPath,
  parseJobKorea,
  parseLgCareers,
  parseLinkareer,
  parseSkCareers,
  validatePostingUrl,
} from "../../tools/job-sources/manual-url.mjs";
import { writeJobs } from "../../tools/normalize-job.mjs";

const root = process.cwd();
const fixture = (name) => path.join(root, "tests", "fixtures", "job-pages", name);

async function text(name) {
  return readFile(fixture(name), "utf8");
}

async function main() {
  const jobKoreaHtml = await text("jobkorea.html");
  const jobKorea = parseJobKorea(
    jobKoreaHtml,
    "https://www.jobkorea.co.kr/Recruit/GI_Read/49771879",
    await text("jobkorea-detail.html"),
  );
  assert.equal(jobKorea.company, "테스트제약");
  assert.equal(jobKorea.sourceId, "49771879");
  assert.match(jobKorea.raw.postingText, /LLM\/RAG 기반/);
  assert.match(jobKoreaDetailPath(jobKoreaHtml), /Gno=49771879&M_ID=1/);
  const queryIdJob = parseJobKorea(
    '<script type="application/ld+json">{"@type":"JobPosting","title":"채용","description":"상세 업무","hiringOrganization":{"name":"회사"}}</script>',
    "https://www.jobkorea.co.kr/Recruit/GI_Read?Gno=42",
  );
  assert.equal(queryIdJob.sourceId, "42");

  const linkareer = parseLinkareer(await text("linkareer.html"), "https://linkareer.com/activity/344084");
  assert.equal(linkareer.company, "테스트반도체");
  assert.equal(linkareer.sourceId, "344084");
  assert.deepEqual(linkareer.raw.positions, ["AI 서비스 개발", "데이터 분석"]);
  assert.equal(linkareer.raw.questions.length, 2);
  assert.deepEqual(linkareer.raw.attachments, ["https://media-cdn.linkareer.com/activity_manager/applications/2"]);
  assert.equal(linkareer.raw.applyUrl, "https://www.skcareers.com/Recruit/Detail/R000001");

  const sk = parseSkCareers(await text("skcareers.html"), "https://www.skcareers.com/Recruit/Detail/R261767");
  assert.equal(sk.company, "SK test");
  assert.equal(sk.role, "Tech R&D - Data Engineering");
  assert.equal(sk.deadline, "2026-08-26");
  assert.match(sk.raw.postingText, /AI 서비스 개발 경력 5년 이상/);
  assert.equal(sk.raw.attachments.length, 1);

  const lgPayload = JSON.parse(await text("lgcareers.json"));
  const lg = parseLgCareers(lgPayload, "https://careers.lg.com/apply/detail?id=1002029");
  assert.equal(lg.company, "LG테스트");
  assert.equal(lg.role, "IT보안");
  assert.equal(lg.deadline, "2026-08-30");
  assert.match(lg.raw.positions[0].responsibilities, /AWS 클라우드/);

  const [fixtureJob] = await fetchManualUrlJobs({
    url: "https://careers.lg.com/apply/detail?id=1002029",
    fixture: fixture("lgcareers.json"),
  });
  assert.equal(fixtureJob.sourceId, "1002029");

  assert.throws(() => validatePostingUrl("http://linkareer.com/activity/1"), /must use HTTPS/);
  assert.throws(() => validatePostingUrl("https://example.com/jobs/1"), /Unsupported posting host/);
  assert.throws(() => validatePostingUrl("https://linkareer.com:444/activity/1"), /default port/);
  assert.throws(() => validatePostingUrl("https://linkareer.com/community/1"), /Unsupported linkareer posting path/);
  await assert.rejects(writeJobs([], { date: "../../escape" }), /YYYY-MM-DD/);
  await assert.rejects(
    fetchManualUrlJobs({
      url: "https://careers.lg.com/apply/detail?id=99999999999999999999",
      fixture: fixture("lgcareers.json"),
    }),
    /safe numeric id/,
  );

  const inlineArgs = spawnSync(
    process.execPath,
    [
      "tools/fetch-jobs.mjs",
      "--source=url",
      "--url=https://careers.lg.com/apply/detail?id=1002029",
      `--fixture=${fixture("lgcareers.json")}`,
      "--dry-run",
    ],
    { cwd: root, encoding: "utf8" },
  );
  assert.equal(inlineArgs.status, 0, inlineArgs.stderr);
  assert.equal(JSON.parse(inlineArgs.stdout)[0].sourceId, "1002029");

  for (const args of [
    ["--source=url", "--url=https://linkareer.com/activity/344084", `--fixture=${path.resolve(root, "..", "outside.html")}`, "--dry-run"],
    ["--source=url", "--url=https://linkareer.com/activity/344084", "--out=../outside", "--dry-run"],
  ]) {
    const confined = spawnSync(process.execPath, ["tools/fetch-jobs.mjs", ...args], { cwd: root, encoding: "utf8" });
    assert.notEqual(confined.status, 0);
    assert.match(confined.stderr, /must stay inside the current workspace/);
  }

  console.log("Manual URL intake validation passed: 4 sources");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
