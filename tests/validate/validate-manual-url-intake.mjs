import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import {
  fetchManualUrlJobs,
  jobKoreaDetailPath,
  parseJobKorea,
  parseGenericPosting,
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
  assert.equal(validatePostingUrl("https://careers.example.com/jobs/1").source, "web");
  assert.throws(() => validatePostingUrl("https://127.0.0.1/jobs/1"), /public hostname/);
  assert.throws(() => validatePostingUrl("https://localhost/jobs/1"), /public hostname/);
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

  const generic = parseGenericPosting(jobKoreaHtml, "https://careers.example.com/jobs/49771879");
  assert.equal(generic.source, "web");
  assert.equal(generic.company, "테스트제약");
  assert.equal(generic.title, "2026 공개채용");
  assert.equal(generic.url, "https://careers.example.com/jobs/49771879");
  assert.equal(generic.sourceId, "careers.example.com:49771879");
  const genericFallback = parseGenericPosting(
    '<html><head><meta property="og:title" content="백엔드 개발자"><meta property="og:site_name" content="예시회사"></head><body><main><h1>백엔드 개발자</h1><p>API를 설계하고 운영합니다.</p></main></body></html>',
    "https://careers.example.com/jobs/backend",
  );
  assert.equal(genericFallback.company, "예시회사");
  assert.match(genericFallback.raw.postingText, /API를 설계/);
  const genericQueryA = parseGenericPosting(
    '<html><head><meta property="og:title" content="백엔드 개발자"><meta property="og:site_name" content="예시회사"></head><body><main>첫 번째 공고</main></body></html>',
    "https://boards.example.com/job?gh_jid=111",
  );
  const genericQueryB = parseGenericPosting(
    '<html><head><meta property="og:title" content="백엔드 개발자"><meta property="og:site_name" content="예시회사"></head><body><main>두 번째 공고</main></body></html>',
    "https://boards.example.com/job?gh_jid=222",
  );
  assert.notEqual(genericQueryA.sourceId, genericQueryB.sourceId);
  const manualUrlModule = await import("../../tools/job-sources/manual-url.mjs");
  assert.equal(typeof manualUrlModule.isPublicAddress, "function");
  for (const address of ["192.0.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "100:0:0:1::1", "2001::1", "2001:2::1", "2001:10::1", "2001:db8::1", "3fff::1", "4000::1", "5f00::1", "fec0::1", "::192.168.1.1", "::ffff:192.168.1.1"]) {
    assert.equal(manualUrlModule.isPublicAddress(address), false, `${address} must not be treated as public`);
  }
  assert.equal(manualUrlModule.isPublicAddress("93.184.216.34"), true);
  assert.equal(manualUrlModule.isPublicAddress("2606:2800:220:1:248:1893:25c8:1946"), true);
  assert.equal(typeof manualUrlModule.createPinnedLookup, "function");
  const pinnedLookup = manualUrlModule.createPinnedLookup({ address: "93.184.216.34", family: 4 });
  await new Promise((resolve, reject) => pinnedLookup("careers.example.com", {}, (error, address, family) => {
    if (error) reject(error);
    else {
      assert.equal(address, "93.184.216.34");
      assert.equal(family, 4);
      resolve();
    }
  }));
  assert.equal(typeof manualUrlModule.readLimitedResponse, "function");
  const response = Readable.from([Buffer.from("public posting")]);
  response.headers = {};
  assert.equal(await manualUrlModule.readLimitedResponse(response), "public posting");
  const [genericFixture] = await fetchManualUrlJobs({
    url: "https://careers.example.com/jobs/49771879",
    fixture: fixture("jobkorea.html"),
  });
  assert.equal(genericFixture.company, "테스트제약");

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

  console.log("Manual URL intake validation passed: 4 dedicated sources plus generic public pages");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
