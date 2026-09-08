import path from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { importJobs, listWorkspaceJobs, rankWorkspaceJobs, refreshJobs } from "./jobs-workspace.mjs";
import { getProfile, setProfile } from "./profile.mjs";
import { prepareApplication } from "./application-prepare.mjs";
import { saveApplicationState, validateApplication } from "./application-state.mjs";
import { listTracker, summarizeResults, updateTracker } from "./tracker.mjs";
import { workspacePath } from "./workspace-files.mjs";

const requestTasks = new Set(["assess", "draft", "review", "interview", "mock-interview", "debrief"]);

async function packages(root) {
  const directory = await workspacePath(root, "applications");
  let names;
  try { names = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return []; throw error; }
  const result = [];
  for (const entry of names) {
    if (!entry.isDirectory()) continue;
    const packagePath = `applications/${entry.name}`;
    let state = null;
    try { state = JSON.parse(await readFile(path.join(directory, entry.name, "state.json"), "utf8")); }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    result.push({ packagePath, state: state ?? { status: "revalidation-required" } });
  }
  return result;
}

async function invalidateApplications(root, results) {
  const changed = new Map(results.filter((item) => item.status === "updated" && (item.changedFields ?? []).some((field) => ["raw", "role", "careerLevel", "education"].includes(field))).map((item) => [item.jobId, item.changedFields]));
  if (!changed.size) return;
  for (const item of await packages(root)) {
    if (!changed.has(item.state.jobId)) continue;
    const packageDir = await workspacePath(root, item.packagePath);
    const reason = `Posting changed: ${changed.get(item.state.jobId).join(", ")}`;
    const state = { ...item.state, status: "review-blocked", stopReasons: [...new Set([...(item.state.stopReasons ?? []), reason])], nextAction: "Review changed posting fields and repeat affected steps" };
    await saveApplicationState(packageDir, state);
  }
}

async function digest(root) {
  const [jobs, applicationPackages, tracker] = await Promise.all([
    listWorkspaceJobs({ root }), packages(root), listTracker(root),
  ]);
  const now = Date.now();
  const inWeek = now + 7 * 24 * 60 * 60 * 1000;
  const upcomingStages = tracker.flatMap((entry) => (entry.events ?? [])
    .filter((event) => Date.parse(event.at) >= now && Date.parse(event.at) <= inWeek)
    .map((event) => ({ applicationId: entry.applicationId, stage: entry.stage, ...event })))
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return {
    newJobs: jobs.filter((job) => (job.observations?.length ?? 0) === 1),
    changedJobs: jobs.filter((job) => (job.changedFields?.length ?? 0) > 0),
    deadlines: jobs.filter((job) => job.deadline && Date.parse(job.deadline) >= now && Date.parse(job.deadline) <= inWeek),
    reviewRequired: applicationPackages.filter((item) => item.state.status !== "ready-for-user-review"),
    upcomingStages,
    results: summarizeResults(tracker),
  };
}

async function prepareRequest(root, input) {
  if (!requestTasks.has(input.task)) throw new Error("Unknown AI request task");
  const jobs = await listWorkspaceJobs({ root });
  const job = input.jobId ? jobs.find((item) => item.id === input.jobId) : null;
  if (input.jobId && !job) throw new Error("Job not found");
  let packagePath = "";
  if (input.packagePath) {
    await workspacePath(root, input.packagePath);
    packagePath = input.packagePath;
  }
  const sources = ["resume.md", job?.file ? path.relative(root, job.file).replaceAll("\\", "/") : "", packagePath].filter(Boolean);
  const instruction = {
    assess: "JD 요구사항의 중요도를 먼저 고정하고, 지원 자격·적합도·준비 부담을 분리해 resume.md 근거 ID와 연결하세요.",
    draft: "등록된 문항별로 resume.md 근거 ID를 사용해 답변과 evidence-map을 작성하세요.",
    review: "최종본까지 HR 검토하고 입력 해시가 연결된 review.json을 기록한 뒤 ready 검증을 실행하세요.",
    interview: "실제 제출이 확인된 답변과 근거를 바탕으로 면접 준비 자료를 갱신하세요.",
    "mock-interview": "한 번에 한 문항만 질문하고 사용자 답변 후 근거·논리·본인 기여도를 피드백하세요.",
    debrief: "사용자가 제공한 실제 질문·답변·소감만 기록하고 반복 개선점만 집계하세요.",
  }[input.task];
  return {
    status: "prepared",
    task: input.task,
    inputs: { jobId: job?.id ?? null, packagePath: packagePath || null, sources },
    prompt: `give-me-job 에이전트로 ${input.task} 작업을 실행하세요. ${instruction} 대상: ${JSON.stringify({ jobId: job?.id ?? null, packagePath: packagePath || null })}`,
  };
}

export async function executeAction(root, action, input = {}) {
  const workspace = path.resolve(root);
  await workspacePath(workspace, ".");
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Action input must be an object");
  switch (action) {
    case "jobs.import": {
      if (input.file) await workspacePath(workspace, input.file);
      const report = await importJobs({ ...input, root: workspace });
      await invalidateApplications(workspace, report.results);
      return report;
    }
    case "jobs.list": return listWorkspaceJobs({ ...input, root: workspace });
    case "jobs.refresh": {
      const report = await refreshJobs({ ...input, root: workspace });
      await invalidateApplications(workspace, report.results);
      return report;
    }
    case "jobs.rank": return rankWorkspaceJobs({ root: workspace });
    case "profile.show": return getProfile({ root: workspace });
    case "profile.set": {
      const { exclude, ...patch } = input;
      if (exclude !== undefined) patch.excludedKeywords = exclude;
      return setProfile(patch, { root: workspace });
    }
    case "application.prepare": {
      const job = (await listWorkspaceJobs({ root: workspace })).find((item) => item.id === input.jobId);
      if (!job) throw new Error("Job not found");
      const prepared = await prepareApplication(workspace, { job, role: input.role });
      return { ...prepared, packagePath: path.relative(workspace, prepared.packageDir).replaceAll("\\", "/") };
    }
    case "application.validate": {
      const packageDir = await workspacePath(workspace, input.packagePath);
      const resumePath = await workspacePath(workspace, input.resumePath ?? "resume.md");
      return validateApplication(packageDir, { mode: input.mode ?? "ready", resumePath, writeState: (input.mode ?? "ready") === "ready" });
    }
    case "tracker.list": return listTracker(workspace);
    case "tracker.update": return updateTracker(workspace, input);
    case "digest": return digest(workspace);
    case "request": return prepareRequest(workspace, input);
    case "file.read": {
      const file = await workspacePath(workspace, input.path);
      const content = await readFile(file, "utf8");
      return { path: input.path, content };
    }
    default: throw new Error(`Unknown action: ${action}`);
  }
}
