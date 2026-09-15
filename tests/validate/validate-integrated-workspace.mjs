import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { PassThrough } from "node:stream";
import os from "node:os";
import path from "node:path";
import { executeAction } from "../../tools/workspace-service.mjs";
import { importJobs, isExpiredJob, listWorkspaceJobs, parseCsv } from "../../tools/jobs-workspace.mjs";
import { startDashboard } from "../../tools/dashboard.mjs";
import { formatTuiResult, runTui } from "../../tools/tui.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "gmj-workspace-"));
try {
  await writeFile(path.join(root, "resume.md"), "# Resume\n## Projects\n### EXP-001 예약 API\n- 동시성 문제를 해결했다.\n");
  const csv = 'source,sourceId,company,title,role,location,postingText\nmanual,demo-1,"예시, 주식회사","백엔드\n개발자",백엔드,서울,"API를 개발합니다."\n불완전\n';
  assert.equal(parseCsv(csv)[1].row, 2);
  const boundary = new Date("2026-09-09T00:00:00+09:00");
  assert.equal(isExpiredJob({ deadline: "2026-09-08" }, boundary), true);
  assert.equal(isExpiredJob({ deadline: "2026-09-09" }, boundary), false);
  assert.equal(isExpiredJob({ deadline: "2026-09-09T09:00:00+09:00" }, new Date("2026-09-09T16:00:00+09:00")), false);
  assert.equal(isExpiredJob({ deadline: "확인 필요" }, boundary), false);
  await assert.rejects(importJobs({
    root,
    kind: "urls",
    input: Array.from({ length: 21 }, (_, index) => `https://careers.example.com/jobs/${index}`).join("\n"),
    fetcher: async () => { throw new Error("should not fetch an oversized URL batch"); },
  }), /20 URLs/);

  const multiRoot = path.join(root, "multi-url");
  const multiple = await importJobs({
    root: multiRoot,
    kind: "urls",
    input: "https://careers.example.com/jobs/active\nhttps://careers.example.com/jobs/expired",
    fetcher: async ({ url }) => [{
      source: "web",
      sourceId: new URL(url).pathname.split("/").at(-1),
      url,
      company: "예시회사",
      title: url.endsWith("expired") ? "지난 공고" : "진행 공고",
      deadline: url.endsWith("expired") ? "2000-01-01" : "2099-12-31",
      active: true,
      raw: { postingText: "업무", positions: [], questions: [] },
    }],
  });
  assert.equal(multiple.counts.new, 2);
  assert.equal(multiple.expiredRemoved.length, 1);
  assert.equal((await listWorkspaceJobs({ root: multiRoot })).length, 1);
  assert.equal(JSON.parse(await readFile(path.join(multiRoot, "data/jobs/workspace.json"), "utf8")).length, 1);
  const imported = await importJobs({ root, kind: "csv", input: csv, mapping: { source: "source", sourceId: "sourceId", company: "company", title: "title", role: "role", location: "location", postingText: "postingText" } });
  assert.deepEqual(imported.counts, { new: 1, updated: 0, duplicate: 0, "needs-confirmation": 0, failed: 1 });
  assert.equal(imported.results[0].row, 2);
  const jobId = imported.results[0].jobId;
  const duplicate = await executeAction(root, "jobs.import", { kind: "text", input: "API를 개발합니다.", metadata: { source: "manual", sourceId: "demo-1", company: "예시, 주식회사", title: "백엔드\n개발자", role: "백엔드" } });
  assert.equal(duplicate.counts.duplicate, 1);
  await executeAction(root, "profile.set", { roles: ["백엔드"], locations: ["서울"], employmentTypes: [], exclude: [] });
  const ranked = await executeAction(root, "jobs.rank", {});
  assert.equal(ranked[0].eligibility, "확인 필요");
  assert.equal(ranked[0].status, "needs-analysis");
  const prepared = await executeAction(root, "application.prepare", { jobId, role: "백엔드" });
  assert.equal(prepared.reused, false);
  await writeFile(path.join(root, prepared.packagePath, "questions.json"), `${JSON.stringify({ questions: [{ id: "Q1", prompt: "사용자가 보완한 문항" }] }, null, 2)}\n`);
  assert.equal((await executeAction(root, "application.prepare", { jobId, role: "백엔드" })).reused, true);
  assert.deepEqual(JSON.parse(await readFile(path.join(root, prepared.packagePath, "questions.json"), "utf8")).questions, [{ id: "Q1", prompt: "사용자가 보완한 문항" }]);
  assert.equal((await executeAction(root, "application.validate", { packagePath: prepared.packagePath, mode: "structure" })).ok, true);
  assert.equal((await executeAction(root, "application.validate", { packagePath: prepared.packagePath, mode: "ready" })).ok, false);
  const changed = await executeAction(root, "jobs.import", { kind: "text", input: "필수 자격과 문항이 변경되었습니다.", metadata: { source: "manual", sourceId: "demo-1", company: "예시, 주식회사", title: "백엔드\n개발자", role: "백엔드", raw: { postingText: "필수 자격과 문항이 변경되었습니다.", questions: [{ id: "Q2", prompt: "변경된 문항" }] } } });
  assert.equal(changed.counts.updated, 1);
  assert.equal(JSON.parse(await readFile(path.join(root, prepared.packagePath, "state.json"), "utf8")).status, "review-blocked");
  const refreshed = await executeAction(root, "application.prepare", { jobId, role: "백엔드" });
  assert.equal(refreshed.reused, true);
  assert.equal(await readFile(path.join(root, prepared.packagePath, "source-jd.md"), "utf8"), "필수 자격과 문항이 변경되었습니다.");
  assert.deepEqual(JSON.parse(await readFile(path.join(root, prepared.packagePath, "questions.json"), "utf8")).questions, [{ id: "Q2", prompt: "변경된 문항" }]);
  const request = await executeAction(root, "request", { task: "assess", jobId });
  assert.equal(request.status, "prepared");
  assert.match(request.prompt, /지원 자격/);
  await assert.rejects(executeAction(root, "tracker.update", { applicationId: prepared.packagePath, stage: "서류", status: "submitted" }), /confirmation/);
  await executeAction(root, "tracker.update", { applicationId: prepared.packagePath, stage: "서류", status: "submitted", confirmed: true, source: "user", events: [{ kind: "interview", title: "1차 면접", at: "2099-01-02T10:00:00+09:00" }] });
  assert.equal((await executeAction(root, "tracker.list", {})).length, 1);
  assert.equal((await executeAction(root, "digest", {})).reviewRequired.length, 1);
  await assert.rejects(executeAction(root, "file.read", { path: "../outside.md" }), /workspace/);

  const server = await startDashboard(root, { port: 0 });
  try {
    const address = server.address();
    const origin = `http://127.0.0.1:${address.port}`;
    const page = await fetch(origin);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /지원 작업공간/);
    const response = await fetch(`${origin}/api/action`, { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "X-Give-Me-Job": "workspace" }, body: JSON.stringify({ action: "jobs.list", input: {} }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result.length, 1);
    const blocked = await fetch(`${origin}/api/action`, { method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json", "X-Give-Me-Job": "workspace" }, body: JSON.stringify({ action: "jobs.list", input: {} }) });
    assert.equal(blocked.status, 403);
  } finally { await new Promise((resolve) => server.close(resolve)); }

  const input = new PassThrough(); const output = new PassThrough(); input.isTTY = false; output.isTTY = false;
  let tuiText = ""; output.on("data", (chunk) => { tuiText += chunk; });
  await runTui(root, { input, output });
  assert.match(tuiText, /digest/);
  const ttyInput = new PassThrough(); const ttyOutput = new PassThrough();
  ttyInput.isTTY = true; ttyInput.isRaw = false; ttyInput.setRawMode = () => {}; ttyOutput.isTTY = true; ttyOutput.columns = 80; ttyOutput.rows = 24;
  let ttyText = ""; ttyOutput.on("data", (chunk) => { ttyText += chunk; });
  process.nextTick(() => ttyInput.write("q"));
  await runTui(root, { input: ttyInput, output: ttyOutput });
  assert.match(ttyText, /지원 작업공간/);
  assert.match(ttyText, /오늘/);
  assert.match(ttyText, /마감·재검토·예정 일정/);
  assert.deepEqual((await import("../../tools/tui.mjs")).terminalLines("👩‍💻개발", 4), ["👩‍💻개", "발"]);
  assert.match(formatTuiResult("jobs.list", [imported.results[0]])[0], /\[공고\]/);
  assert.doesNotMatch(formatTuiResult("digest", await executeAction(root, "digest", {})).join("\n"), /"newJobs"/);
  const plainTty = ttyText.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "");
  assert(plainTty.split(/\r?\n/).every((line) => [...line].reduce((width, char) => width + (/\p{Mark}/u.test(char) ? 0 : char.codePointAt(0) >= 0x1100 ? 2 : 1), 0) <= 80));

  const narrowMenuInput = new PassThrough(); const narrowMenuOutput = new PassThrough();
  narrowMenuInput.isTTY = true; narrowMenuInput.isRaw = false; narrowMenuInput.setRawMode = () => {}; narrowMenuOutput.isTTY = true; narrowMenuOutput.columns = 40; narrowMenuOutput.rows = 24;
  let narrowMenuText = ""; narrowMenuOutput.on("data", (chunk) => { narrowMenuText += chunk; });
  process.nextTick(() => narrowMenuInput.write("q"));
  await runTui(root, { input: narrowMenuInput, output: narrowMenuOutput });
  assert.match(narrowMenuText.replace(/\r?\n/g, ""), /마감·재검토·예정 일정을 한번에 확인합니다/);

  const narrowFormInput = new PassThrough(); const narrowFormOutput = new PassThrough();
  narrowFormInput.isTTY = true; narrowFormInput.isRaw = false; narrowFormInput.setRawMode = () => {}; narrowFormOutput.isTTY = true; narrowFormOutput.columns = 40; narrowFormOutput.rows = 12; narrowFormOutput.getColorDepth = () => 8;
  let narrowFormText = ""; narrowFormOutput.on("data", (chunk) => { narrowFormText += chunk; });
  const previousNoColor = process.env.NO_COLOR;
  delete process.env.NO_COLOR;
  process.nextTick(() => {
    narrowFormInput.write("\x1b[B\r");
    setTimeout(() => narrowFormInput.write("\x03"), 20);
  });
  try { await runTui(root, { input: narrowFormInput, output: narrowFormOutput }); }
  finally {
    if (previousNoColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = previousNoColor;
  }
  assert.match(narrowFormText, /s 실행/);
  assert.match(narrowFormText, /\x1b\[1;7m/);

  await writeFile(path.join(root, "long.md"), Array.from({ length: 30 }, (_, index) => `줄 ${index + 1}`).join("\n"));
  const scrollInput = new PassThrough(); const scrollOutput = new PassThrough();
  scrollInput.isTTY = true; scrollInput.isRaw = false; scrollInput.setRawMode = () => {}; scrollOutput.isTTY = true; scrollOutput.columns = 40; scrollOutput.rows = 12;
  let scrollText = ""; scrollOutput.on("data", (chunk) => { scrollText += chunk; });
  process.nextTick(() => {
    scrollInput.write("\x1b[B".repeat(7) + "\r\rlong.md\rs");
    setTimeout(() => scrollInput.write("\x1b[B".repeat(30) + "q"), 50);
  });
  await runTui(root, { input: scrollInput, output: scrollOutput });
  assert.match(scrollText, /줄 30/);

  const cliPath = path.resolve("bin/give-me-job.js");
  const runCli = (...args) => spawnSync(process.execPath, [cliPath, ...args, "--workspace", root, "--format", "json"], { encoding: "utf8" });
  const cli = runCli("jobs", "list");
  assert.equal(cli.status, 0, cli.stderr);
  assert.equal(JSON.parse(cli.stdout).length, 1);
  const cliProfile = runCli("profile", "show");
  assert.equal(cliProfile.status, 0, cliProfile.stderr);
  assert.deepEqual(JSON.parse(cliProfile.stdout).roles, ["백엔드"]);
  const cliRequest = runCli("request", "--task", "review", "--package-path", prepared.packagePath);
  assert.equal(cliRequest.status, 0, cliRequest.stderr);
  assert.equal(JSON.parse(cliRequest.stdout).status, "prepared");
  const cliTracker = runCli("tracker", "list");
  assert.equal(cliTracker.status, 0, cliTracker.stderr);
  assert.equal(JSON.parse(cliTracker.stdout)[0].status, "submitted");
  const cliDigest = runCli("digest");
  assert.equal(cliDigest.status, 0, cliDigest.stderr);
  assert.equal(JSON.parse(cliDigest.stdout).reviewRequired.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(root, "data/jobs/workspace.json"), "utf8")).length, 1);
  console.log("Integrated CLI, jobs, package, tracker, TUI and dashboard validation passed");
} finally { await rm(root, { recursive: true, force: true }); }
