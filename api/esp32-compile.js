import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { inflateRawSync } from "node:zlib";

function ownerAuthenticated(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const token = String(req.headers.cookie || "").split(";").map(v => v.trim())
    .find(v => v.startsWith("owner_session="))?.slice("owner_session=".length) || "";
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.sub === "owner" && Number.isFinite(claims.exp) && claims.exp > Date.now();
  } catch { return false; }
}

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch {} }
  return {};
}

function parseArtifactZip(buffer) {
  const files = {};
  let eocd = -1;
  for (let i = Math.max(0, buffer.length - 65557); i <= buffer.length - 22; i++) {
    if (buffer.readUInt32LE(i) === 0x06054b50) eocd = i;
  }
  if (eocd < 0) throw new Error("Compiler artifact was not a valid ZIP archive.");
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  for (let i = 0; i < count && cursor + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString("utf8", cursor + 46, cursor + 46 + nameLength);
    if (buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localName = buffer.readUInt16LE(localOffset + 26);
      const localExtra = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localName + localExtra;
      const compressed = buffer.subarray(start, start + compressedSize);
      const data = method === 0 ? Buffer.from(compressed) : method === 8 ? inflateRawSync(compressed) : null;
      if (data) files[name.split("/").pop()] = data;
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

async function github(path, options = {}) {
  const token = process.env.GITHUB_ACTIONS_TOKEN;
  if (!token) throw Object.assign(new Error("Native compiler setup is incomplete: add GITHUB_ACTIONS_TOKEN to the Vercel project environment."), { status: 503 });
  const repo = process.env.GITHUB_ACTIONS_REPOSITORY || "mindsclub20/personal";
  const response = await fetch("https://api.github.com/repos/" + repo + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(25000)
  });
  if (response.status === 204) return { response, data: null };
  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json().catch(() => ({})) : Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : "GitHub Actions request failed.";
    throw Object.assign(new Error(message), { status: response.status === 401 || response.status === 403 ? 503 : 502 });
  }
  return { response, data };
}

function validateRequestId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!ownerAuthenticated(req)) return res.status(401).json({ error: "Owner authentication required." });
  try {
    if (req.method === "POST") {
      const body = bodyOf(req);
      if (body.action !== "start") return res.status(400).json({ error: "Unknown compiler action." });
      if (typeof body.code !== "string" || !body.code.trim() || body.code.length > 50000) {
        return res.status(400).json({ error: "Provide a non-empty sketch of at most 50,000 characters." });
      }
      const board = body.board || "esp32";
      if (!["esp32", "esp32c3"].includes(board)) return res.status(400).json({ error: "Supported Arduino targets are ESP32 DevKit and ESP32-C3." });
      const requestId = randomUUID();
      const repo = process.env.GITHUB_ACTIONS_REPOSITORY || "mindsclub20/personal";
      const workflowPath = "/actions/workflows/esp32-compile.yml/dispatches";
      await github(workflowPath, {
        method: "POST",
        body: JSON.stringify({ ref: process.env.GITHUB_ACTIONS_REF || "main", inputs: { request_id: requestId, sketch: body.code, board } })
      });
      return res.status(202).json({ jobId: requestId, status: "queued", message: "Native ESP32 build queued in GitHub Actions." });
    }

    const action = String(req.query?.action || "status");
    const jobId = String(req.query?.id || "");
    if (!validateRequestId(jobId)) return res.status(400).json({ error: "A valid build job ID is required." });
    const workflowPath = "/actions/workflows/esp32-compile.yml/runs?event=workflow_dispatch&per_page=100";
    const { data: runsData } = await github(workflowPath);
    const run = (runsData?.workflow_runs || []).find(r => r.display_title === "ESP32 build " + jobId);
    if (!run) return res.status(202).json({ jobId, status: "queued", message: "Waiting for the GitHub Actions runner." });
    if (run.status !== "completed") return res.status(202).json({ jobId, status: run.status || "in_progress", message: "ESP32 compiler is running." });

    const { data: artifactsData } = await github("/actions/runs/" + run.id + "/artifacts");
    const artifact = (artifactsData?.artifacts || []).find(a => a.name === "esp32-firmware-" + jobId && !a.expired);
    if (!artifact) {
      return res.status(200).json({ jobId, status: run.conclusion === "success" ? "failed" : (run.conclusion || "failed"), error: "No compiler artifact was produced.", diagnostics: "Open the GitHub Actions run to inspect the compiler job." });
    }
    const { data: zip } = await github("/actions/artifacts/" + artifact.id + "/zip", { headers: { Accept: "application/vnd.github+json" } });
    const files = parseArtifactZip(zip);
    const log = files["build.log"] ? files["build.log"].toString("utf8").slice(-16000) : "";
    const result = files["BUILD-RESULT.txt"] ? files["BUILD-RESULT.txt"].toString("utf8") : "";
    if (run.conclusion !== "success" || !files["firmware.bin"]) {
      return res.status(200).json({ jobId, status: "failed", error: "Native ESP32 compilation failed.", diagnostics: log || result || "No compiler diagnostics were captured." });
    }
    return res.status(200).json({
      jobId,
      status: "success",
      success: true,
      filename: "firmware.bin",
      firmwareBase64: files["firmware.bin"].toString("base64"),
      sha256: files["SHA256SUMS.txt"]?.toString("utf8").trim() || "",
      diagnostics: (result + "\n" + log).slice(-16000)
    });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 502;
    return res.status(status).json({ error: status >= 500 ? error.message : "Compiler request failed." });
  }
}
