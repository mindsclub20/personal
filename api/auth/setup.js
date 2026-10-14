import { credentialDigest, safeEqual, supabaseRest } from "../../lib/site-auth.js";

function send(res, status, payload) {
  res.status(status).setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST." });
  }
  const expectedToken = process.env.SITE_SETUP_TOKEN;
  if (!expectedToken || expectedToken.length < 24) return send(res, 503, { error: "Initial setup is not enabled. Configure SITE_SETUP_TOKEN in Vercel first." });
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: "Invalid request." }); }
  }
  const setupToken = typeof body?.setupToken === "string" ? body.setupToken : "";
  if (!safeEqual(setupToken, expectedToken)) return send(res, 403, { error: "Setup token is incorrect." });
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const detail1 = typeof body?.detail1 === "string" ? body.detail1 : "";
  const detail2 = typeof body?.detail2 === "string" ? body.detail2 : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || detail1.length < 12 || detail2.length < 12 || password.length < 16) {
    return send(res, 400, { error: "Use the assigned username, two distinct secondary secrets of at least 12 characters, and a password of at least 16 characters." });
  }
  try {
    const lookup = await supabaseRest("site_access_credentials?select=username,salt,credential_hash&id=eq.true&limit=1");
    if (!lookup.ok) return send(res, 503, { error: "Authentication storage is unavailable." });
    const rows = await lookup.json();
    const config = rows[0];
    if (!config) return send(res, 503, { error: "The initial credential record is missing." });
    if (config.credential_hash) return send(res, 409, { error: "Initial setup is already complete. Use the Supabase dashboard recovery process." });
    if (username !== config.username) return send(res, 400, { error: "The username does not match the configured account." });
    const hash = credentialDigest(username, detail1, detail2, password, config.salt);
    const update = await supabaseRest("site_access_credentials?id=eq.true", {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ credential_hash: hash, updated_at: new Date().toISOString() })
    });
    if (!update.ok) return send(res, 503, { error: "Could not save credentials." });
    return send(res, 200, { ok: true, message: "Credentials saved. You can now sign in." });
  } catch {
    return send(res, 503, { error: "Setup service is not configured yet." });
  }
}