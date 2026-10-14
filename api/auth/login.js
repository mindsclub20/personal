import { createSession, credentialDigest, safeEqual, supabaseRest } from "../../lib/site-auth.js";

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

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
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && now - record.start < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    return send(res, 429, { error: "Too many attempts. Wait 15 minutes before trying again." });
  }
  if (!record || now - record.start >= WINDOW_MS) attempts.set(ip, { start: now, count: 1 });
  else record.count += 1;

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: "Invalid request." }); }
  }
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const detail1 = typeof body?.detail1 === "string" ? body.detail1 : "";
  const detail2 = typeof body?.detail2 === "string" ? body.detail2 : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!username || !detail1 || !detail2 || !password) return send(res, 400, { error: "Enter all four credentials." });

  try {
    const response = await supabaseRest("site_access_credentials?select=username,salt,credential_hash&id=eq.true&limit=1");
    if (!response.ok) return send(res, 503, { error: "Authentication storage is unavailable. Try again later." });
    const rows = await response.json();
    const config = rows[0];
    if (!config?.credential_hash || username !== config.username) {
      return send(res, 401, { error: "Credentials are incorrect or initial setup is incomplete." });
    }
    const supplied = credentialDigest(username, detail1, detail2, password, config.salt);
    if (!safeEqual(supplied, config.credential_hash)) return send(res, 401, { error: "Credentials are incorrect." });
    const token = createSession({ sub: "site-owner", iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + 8 * 60 * 60 });
    res.setHeader("Set-Cookie", "site_session=" + encodeURIComponent(token) + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800");
    attempts.delete(ip);
    return send(res, 200, { ok: true });
  } catch {
    return send(res, 503, { error: "Login service is not configured yet." });
  }
}