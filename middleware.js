function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
}

async function validSession(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
    const raw = decodeBase64Url(signature);
    const supplied = Uint8Array.from(raw, c => c.charCodeAt(0));
    if (mac.length !== supplied.length) return false;
    let diff = 0;
    for (let i = 0; i < mac.length; i++) diff |= mac[i] ^ supplied[i];
    if (diff !== 0) return false;
    const session = JSON.parse(decodeBase64Url(payload));
    return Number(session.exp) > Date.now() && session.sub === "owner";
  } catch { return false; }
}

function readCookie(request, name) {
  const cookieHeader = request.headers?.get?.("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}

export default async function middleware(request) {
  const path = new URL(request.url).pathname;
  // The robotics lab is a self-contained, browser-only learning demo. It stores
  // projects in the visitor's own localStorage and has no owner data or APIs.
  if (path === "/" || path === "/login.html" || path === "/api/login" || path === "/robotics-lab.html") return;

  const token = readCookie(request, "owner_session");
  if (await validSession(token, process.env.SESSION_SECRET)) return;

  if (path.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  return Response.redirect(new URL("/login.html", request.url), 307);
}

export const config = { matcher: ["/((?!_vercel).*)"] };
