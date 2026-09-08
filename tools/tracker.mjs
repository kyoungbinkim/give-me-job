import { randomUUID } from "node:crypto";
import { readJson, workspacePath, writeJson } from "./workspace-files.mjs";

export async function listTracker(root) {
  return readJson(await workspacePath(root, "data/tracker.json"), []);
}

function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

export async function updateTracker(root, input) {
  const applicationId = text(input.applicationId, "applicationId");
  const entries = await listTracker(root);
  const previous = entries.find((entry) => entry.applicationId === applicationId);
  const status = input.status ?? previous?.status ?? "active";
  if (!["active", "submitted", "passed", "rejected", "withdrawn"].includes(status)) throw new Error("Invalid tracker status");
  if (status === "submitted" && input.confirmed !== true && !(previous?.status === "submitted" && previous.confirmed)) throw new Error("Submission requires explicit user confirmation");
  const stage = text(input.stage ?? previous?.stage, "stage");
  const source = text(input.source ?? "user", "source");
  const note = input.note ?? "";
  if (typeof note !== "string") throw new Error("note must be text");
  const events = input.events ?? previous?.events ?? [];
  if (!Array.isArray(events)) throw new Error("events must be an array");
  const normalizedEvents = events.map((event) => {
    if (!["deadline", "assignment", "interview", "other"].includes(event.kind)) throw new Error("Invalid event kind");
    const at = text(event.at, "event.at");
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(at) || !Number.isFinite(Date.parse(at))) throw new Error("Event time requires ISO date/time with timezone; use +09:00 for Seoul");
    return { id: event.id ?? randomUUID(), kind: event.kind, title: text(event.title, "event.title"), at, timezone: "Asia/Seoul" };
  });
  const debrief = input.debrief ?? previous?.debrief ?? null;
  if (debrief !== null) {
    for (const field of ["questions", "answers", "improvements"]) {
      if (!Array.isArray(debrief[field]) || debrief[field].some((item) => typeof item !== "string")) throw new Error(`debrief.${field} must be text array`);
    }
    if (typeof debrief.notes !== "string") throw new Error("debrief.notes must be text");
  }
  const at = new Date().toISOString();
  const changedStatus = !previous || previous.status !== status;
  const confirmed = input.confirmed === true || (!changedStatus && previous?.confirmed === true);
  const entry = { ...previous, applicationId, stage, status, confirmed, events: normalizedEvents, debrief, updatedAt: at,
    history: [...(previous?.history ?? []), { at, source, note, stage, status, confirmed }] };
  await writeJson(await workspacePath(root, "data/tracker.json"), [...entries.filter((item) => item.applicationId !== applicationId), entry]);
  return entry;
}

export function summarizeResults(entries) {
  const confirmed = entries.filter((entry) => entry.confirmed && ["passed", "rejected", "withdrawn"].includes(entry.status));
  const results = Object.fromEntries(["passed", "rejected", "withdrawn"].map((status) => [status, confirmed.filter((entry) => entry.status === status).length]));
  const improvements = new Map();
  for (const entry of confirmed) for (const item of new Set(entry.debrief?.improvements ?? [])) improvements.set(item, (improvements.get(item) ?? 0) + 1);
  return { confirmedResults: results, recurringImprovements: [...improvements].filter(([, count]) => count > 1).map(([text, count]) => ({ text, count })) };
}
