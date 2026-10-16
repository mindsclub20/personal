import { createHmac, timingSafeEqual } from "node:crypto";

function validOwnerSession(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const cookieHeader = req.headers.cookie || "";
  const token = cookieHeader.split(";").map(v => v.trim()).find(v => v.startsWith("owner_session="))?.slice("owner_session=".length);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.sub === "owner" && Number(session.exp) > Date.now();
  } catch { return false; }
}

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).json({ error: "Method not allowed" });
  if (!validOwnerSession(req)) return res.status(401).json({ authenticated: false });
  return res.status(200).json({ authenticated: true });
}
