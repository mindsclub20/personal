import { createHmac, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCb);

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && timingSafeEqual(x, y);
}
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip = req.headers["x-forwarded-for"] || "unknown";
  // Vercel's edge protections can complement this endpoint; never log credentials.
  const { username, password } = req.body || {};
  const configuredUser = process.env.OWNER_USERNAME;
  const stored = process.env.OWNER_PASSWORD_HASH || "";
  const secret = process.env.SESSION_SECRET;
  if (!configuredUser || !stored.startsWith("scrypt:") || !secret) {
    return res.status(503).json({ error: "Login is not configured yet. Set the three owner secrets in Vercel." });
  }
  let valid = false;
  try {
    const [, salt, expectedHex] = stored.split(":");
    const expected = Buffer.from(expectedHex, "hex");
    const actual = await scrypt(String(password || ""), salt, expected.length);
    valid = safeEqual(username, configuredUser) && actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch { valid = false; }
  if (!valid) return res.status(401).json({ error: "Username or password is incorrect." });
  const payload = Buffer.from(JSON.stringify({ sub: "owner", exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  res.setHeader("Set-Cookie", `owner_session=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`);
  return res.status(200).json({ ok: true, redirect: "/dashboard.html" });
}
