#!/usr/bin/env node
// Workspace-only entry point. The installed workflow tool runs this file instead of
// give-me-job-cli.mjs so an agent can never reach install or uninstall through it.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { executeAction } from "./workspace-service.mjs";

export const workflowGroups = new Set(["jobs", "profile", "application", "tracker"]);
export const directWorkflowCommands = new Set(["digest", "request", "tui", "dashboard"]);
const workflowActions = new Set(["jobs.import", "jobs.list", "jobs.refresh", "jobs.rank", "profile.show", "profile.set", "application.prepare", "application.validate", "tracker.list", "tracker.update", "digest", "request"]);

export function workspaceUsage() {
  return `Usage:
give-me-job jobs import|list|refresh|rank [--workspace .] [--data JSON|--input file] [--format json]
give-me-job profile show|set [--workspace .] [--data JSON|--input file] [--format json]
give-me-job application prepare|validate [--workspace .] [--data JSON|--input file] [--format json]
give-me-job tracker list|update [--workspace .] [--data JSON|--input file] [--format json]
give-me-job digest|request|tui [--workspace .] [--data JSON|--input file]
give-me-job dashboard [--workspace .] [--port 4173] [--timeout <ms>]
`;
}

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (!current.startsWith("--")) {
      args._.push(current);
      continue;
    }

    const [rawKey, inlineValue] = current.slice(2).split("=", 2);
    const next = argv[i + 1];
    if (inlineValue !== undefined) {
      args[rawKey] = inlineValue;
    } else if (!next || next.startsWith("--")) {
      args[rawKey] = true;
    } else {
      args[rawKey] = next;
      i += 1;
    }
  }
  return args;
}

function camelKey(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

async function workflowInput(args) {
  let input = {};
  if (args.input) input = JSON.parse(await readFile(path.resolve(String(args.input)), "utf8"));
  if (args.data) input = { ...input, ...JSON.parse(String(args.data)) };
  const omitted = new Set(["_", "workspace", "format", "input", "data", "help", "h", "port", "timeout"]);
  for (const [key, value] of Object.entries(args)) {
    if (omitted.has(key)) continue;
    input[camelKey(key)] = value;
  }
  return input;
}

function printWorkflowResult(result, format) {
  if (format === "json") console.log(JSON.stringify(result, null, 2));
  else if (Array.isArray(result)) {
    if (!result.length) console.log("No records found.");
    else for (const item of result) console.log([item.id ?? item.applicationId, item.company, item.title ?? item.stage, item.status ?? item.availability].filter(Boolean).join(" | "));
  } else console.log(JSON.stringify(result, null, 2));
}

async function runDashboard(workspace, args) {
  const { startDashboard } = await import("./dashboard.mjs");
  const timeout = args.timeout === undefined ? 0 : Number(args.timeout);
  if (!Number.isFinite(timeout) || timeout < 0) throw new Error("--timeout must be a number of milliseconds");
  const server = await startDashboard(workspace, { port: Number(args.port ?? 4173) });
  console.log(`give-me-job dashboard: http://127.0.0.1:${server.address().port}`);
  return new Promise((resolve) => {
    const close = () => server.close(resolve);
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
    // A non-interactive caller cannot send a signal, so --timeout bounds the run
    // instead of leaving the caller blocked forever.
    if (timeout > 0) setTimeout(close, timeout);
  });
}

export async function runWorkflowCommand(args) {
  const command = args._[0];
  const verb = workflowGroups.has(command) ? args._[1] : command;
  const workspace = path.resolve(String(args.workspace ?? process.cwd()));
  if (command === "tui") {
    const { runTui } = await import("./tui.mjs");
    return runTui(workspace);
  }
  if (command === "dashboard") return runDashboard(workspace, args);
  const action = workflowGroups.has(command) ? `${command}.${verb}` : command;
  if (!workflowActions.has(action)) throw new Error(`Unknown workflow command: ${[command, verb].filter(Boolean).join(" ")}\n\n${workspaceUsage()}`);
  const result = await executeAction(workspace, action, await workflowInput(args));
  printWorkflowResult(result, args.format);
  // A failed validation must not report success to a script gating on the exit code.
  if (result && typeof result === "object" && !Array.isArray(result) && result.ok === false) process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h || !args._.length) {
    console.log(workspaceUsage());
    return;
  }
  await runWorkflowCommand(args);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
