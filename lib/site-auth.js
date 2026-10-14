import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export function credentialDigest(username, detail1, detail2, password, salt) {
  return createHash("sha256")
    .update([username, detail1, detail2, password, salt].join("\0"), "utf8")
    .digest("hex");
}

export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSession(payload) {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SESSION_SECRET must be at least 32 characters.");
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return encoded + "." + signature;
}

export function verifySession(token) {
  try {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret || secret.length < 32 || typeof token !== "string") return null;
    const [encoded, signature, extra] = token.split(".");
    if (!encoded || !signature || extra) return null;
    const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
    if (!safeEqual(signature, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload || payload.sub !== "site-owner" || !Number.isFinite(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function cookieValue(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return "";
}

export function requireSession(req) {
  return verifySession(cookieValue(req, "site_session"));
}

export async function supabaseRest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return fetch(url.replace(/\/$/, "") + "/rest/v1/" + path, {
    ...options,
    headers: {
      apikey: key,
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
}