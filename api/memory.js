import { requireSession, supabaseRest } from "../lib/site-auth.js";

function send(res, status, payload) {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (!requireSession(req)) return send(res, 401, { error: "Authentication required." });
  try {
    if (req.method === "GET") {
      const response = await supabaseRest("ai_memories?select=id,category,content,source,created_at,updated_at&order=updated_at.desc&limit=100");
      if (!response.ok) return send(res, 503, { error: "Could not load saved memories." });
      return send(res, 200, { memories: await response.json() });
    }
    if (req.method === "POST") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { return send(res, 400, { error: "Invalid request." }); }
      }
      const category = typeof body?.category === "string" ? body.category.trim().slice(0, 80) : "general";
      const content = typeof body?.content === "string" ? body.content.trim() : "";
      if (!content || content.length > 12000) return send(res, 400, { error: "Memory must contain 1–12,000 characters." });
      const response = await supabaseRest("ai_memories", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ category: category || "general", content, source: "user_saved" })
      });
      if (!response.ok) return send(res, 503, { error: "Could not save this memory." });
      const rows = await response.json();
      return send(res, 201, { memory: rows[0] });
    }
    if (req.method === "DELETE") {
      const id = typeof req.query?.id === "string" ? req.query.id : "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) return send(res, 400, { error: "A valid memory ID is required." });
      const response = await supabaseRest("ai_memories?id=eq." + encodeURIComponent(id), { method: "DELETE" });
      if (!response.ok) return send(res, 503, { error: "Could not delete this memory." });
      return send(res, 200, { ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return send(res, 405, { error: "Method not allowed." });
  } catch {
    return send(res, 503, { error: "Memory storage is not configured yet." });
  }
}