import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { executeAction } from "./workspace-service.mjs";

const actions = new Set(["jobs.list", "jobs.import", "jobs.refresh", "jobs.rank", "profile.show", "profile.set", "application.prepare", "application.validate", "tracker.list", "tracker.update", "digest", "request", "file.read"]);
const assets = new Map([["/", ["index.html", "text/html; charset=utf-8"]], ["/app.mjs", ["app.mjs", "text/javascript; charset=utf-8"]], ["/actions.mjs", ["actions.mjs", "text/javascript; charset=utf-8"]], ["/style.css", ["style.css", "text/css; charset=utf-8"]]]);

export async function startDashboard(workspace, { port = 0 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("Invalid dashboard port");
  const server = createServer(async (request, response) => {
    const origin = `http://127.0.0.1:${server.address().port}`;
    response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "no-store");
    const send = (status, value) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" }); response.end(JSON.stringify(value)); };
    if (request.headers.host !== new URL(origin).host || (request.headers.origin && request.headers.origin !== origin) || (request.headers["sec-fetch-site"] && !["same-origin", "none"].includes(request.headers["sec-fetch-site"]))) return send(403, { error: "Local same-origin requests only" });
    try {
      if (request.method === "GET" && assets.has(request.url)) {
        const [file, type] = assets.get(request.url);
        const content = await readFile(new URL(`./dashboard-assets/${file}`, import.meta.url));
        response.writeHead(200, { "Content-Type": type }); response.end(content); return;
      }
      if (request.url !== "/api/action") return send(404, { error: "Not found" });
      if (request.method !== "POST") return send(405, { error: "POST required" });
      if (request.headers.origin !== origin || request.headers["x-give-me-job"] !== "workspace" || request.headers["content-type"] !== "application/json") return send(403, { error: "Same-origin JSON action required" });
      let body = "";
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 1048576) { send(413, { error: "Input exceeds 1 MiB" }); request.resume(); return; }
        body += chunk.toString("utf8");
      }
      const payload = JSON.parse(body);
      if (!payload || !actions.has(payload.action) || !payload.input || typeof payload.input !== "object" || Array.isArray(payload.input) || Object.keys(payload).some((key) => !["action", "input"].includes(key))) return send(400, { error: "Invalid action or input" });
      send(200, { result: await executeAction(workspace, payload.action, payload.input) });
    } catch (error) { send(400, { error: error.message }); }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  return server;
}
