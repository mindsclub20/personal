import { createHmac, timingSafeEqual } from "node:crypto";

function ownerAuthenticated(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const cookies = Object.fromEntries(String(req.headers.cookie || "")
    .split(";").map(part => part.trim()).filter(Boolean)
    .map(part => {
      const i = part.indexOf("=");
      return i < 0 ? [part, ""] : [part.slice(0, i), part.slice(i + 1)];
    }));
  const token = cookies.owner_session || "";
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, "base64url"); } catch { return false; }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.sub === "owner" && Number.isFinite(claims.exp) && claims.exp > Date.now();
  } catch { return false; }
}

function bodyOf(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

function uuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function rpc(name, args) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw Object.assign(new Error("Cloud storage is not configured."), { status: 503 });
  const response = await fetch(url.replace(/\/$/, "") + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(args)
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const message = typeof data?.message === "string" ? data.message : "Cloud database request failed.";
    const status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw Object.assign(new Error(message), { status });
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!ownerAuthenticated(req)) return res.status(401).json({ error: "Please log in to use VisualRobotics cloud storage." });

  try {
    const body = bodyOf(req);
    const action = String(req.query?.action || body.action || (req.method === "DELETE" ? "delete" : req.method === "GET" ? "list" : ""));
    if (req.method === "GET" && action === "list") {
      const rows = await rpc("visualrobotics_list_projects", { p_include_deleted: req.query?.includeDeleted === "1" });
      return res.status(200).json({ projects: Array.isArray(rows) ? rows : [] });
    }
    if (req.method === "GET" && action === "get") {
      if (!uuid(req.query?.id)) return res.status(400).json({ error: "A valid project ID is required." });
      return res.status(200).json({ project: await rpc("visualrobotics_get_project", { p_id: req.query.id }) });
    }
    if (req.method === "GET" && action === "revisions") {
      if (!uuid(req.query?.id)) return res.status(400).json({ error: "A valid project ID is required." });
      return res.status(200).json({ revisions: await rpc("visualrobotics_project_revisions", { p_id: req.query.id }) });
    }
    if (req.method === "POST" && action === "save") {
      const p = body.project || {};
      const id = p.id || null;
      if (id !== null && !uuid(id)) return res.status(400).json({ error: "Invalid cloud project ID." });
      if (typeof p.title !== "string" || !p.title.trim() || p.title.trim().length > 90) return res.status(400).json({ error: "Project name must be 1–90 characters." });
      if (typeof p.code !== "string" || p.code.length > 100000) return res.status(400).json({ error: "Firmware source is invalid or too large." });
      const parts = Array.isArray(p.parts) ? p.parts : [];
      if (parts.length > 500) return res.status(400).json({ error: "Too many components." });
      const result = await rpc("visualrobotics_save_project", {
        p_id: id,
        p_name: p.title.trim(),
        p_description: typeof p.description === "string" ? p.description.slice(0, 4000) : "",
        p_board: p.board || "esp32",
        p_code: p.code,
        p_components: parts,
        p_diagram: p.diagram && typeof p.diagram === "object" && !Array.isArray(p.diagram) ? p.diagram : {}
      });
      return res.status(200).json({ project: result });
    }
    if ((req.method === "DELETE" && action === "delete") || (req.method === "POST" && action === "delete")) {
      const id = req.method === "DELETE" ? req.query?.id : body.id;
      if (!uuid(id)) return res.status(400).json({ error: "A valid project ID is required." });
      return res.status(200).json({ project: await rpc("visualrobotics_delete_project", { p_id: id }) });
    }
    if (req.method === "POST" && action === "restore") {
      if (!uuid(body.id)) return res.status(400).json({ error: "A valid project ID is required." });
      return res.status(200).json({ project: await rpc("visualrobotics_restore_project", { p_id: body.id }) });
    }
    if (req.method === "POST" && action === "restoreRevision") {
      if (!uuid(body.id) || !Number.isSafeInteger(Number(body.revisionId))) return res.status(400).json({ error: "A valid project and revision are required." });
      return res.status(200).json({ project: await rpc("visualrobotics_restore_revision", { p_project_id: body.id, p_revision_id: Number(body.revisionId) }) });
    }
    return res.status(400).json({ error: "Unknown VisualRobotics cloud action." });
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return res.status(status).json({ error: status >= 500 ? "VisualRobotics cloud storage request failed." : error.message });
  }
}
