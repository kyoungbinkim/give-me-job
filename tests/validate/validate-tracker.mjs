import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { listTracker, updateTracker, summarizeResults } from "../../tools/tracker.mjs";
import { workspacePath } from "../../tools/workspace-files.mjs";

const root = await mkdtemp(path.join(os.tmpdir(), "gmj-tracker-"));
try {
  await assert.rejects(updateTracker(root, { applicationId: "demo", stage: "서류", status: "submitted" }), /confirmation/);
  assert.equal((await listTracker(root)).length, 0);
  await updateTracker(root, { applicationId: "demo", stage: "과제 먼저", status: "submitted", confirmed: true,
    events: [{ kind: "assignment", title: "과제", at: "2026-09-10T15:00:00+09:00" }] });
  const result = await updateTracker(root, { applicationId: "demo", stage: "전화", note: "사용자 입력" });
  assert.equal(result.events.length, 1);
  assert.equal(result.history.length, 2);
  assert.equal(result.confirmed, true);
  await updateTracker(root, { applicationId: "demo", stage: "전화", status: "rejected" });
  assert.equal(summarizeResults(await listTracker(root)).confirmedResults.rejected, 0);
  await updateTracker(root, { applicationId: "demo", stage: "전화", status: "rejected", confirmed: true });
  assert.equal(summarizeResults(await listTracker(root)).confirmedResults.rejected, 1);
  await assert.rejects(workspacePath(root, "../outside"), /workspace/);
  await assert.rejects(updateTracker(root, { applicationId: "bad", stage: "면접", events: [{ kind: "interview", title: "면접", at: "2026-09-08T12:00:00" }] }), /timezone/);
  console.log("Tracker persistence, confirmation, outcome and boundary checks passed");
} finally { await rm(root, { recursive: true, force: true }); }
