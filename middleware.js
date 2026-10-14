const PUBLIC_PATHS = new Set([
  "/login.html", "/login.js", "/login.css",
  "/setup.html", "/setup.js", "/setup.css",
  "/api/auth/login", "/api/auth/logout", "/api/auth/setup",
  "/favicon.ico", "/robots.txt"
]);

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function validSession(token, secret) {
  try {
    if (!token || !secret || secret.length < 32) return false;
    const parts = token.split(".");
    if (parts.length !== 2) return false;
    const [payloadPart, signaturePart] = parts;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(signaturePart),
      new TextEncoder().encode(payloadPart)
    );
    if (!verified) return false;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)));
    return payload?.sub === "site-owner" && Number.isFinite(payload.exp) && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC_PATHS.has(url.pathname) || url.pathname.startsWith("/_vercel/")) {
    return;
  }
  const cookie = request.headers.get("cookie") || "";
  const session = cookie.split(";").map(x => x.trim()).find(x => x.startsWith("site_session="))?.slice("site_session=".length) || "";
  if (await validSession(decodeURIComponent(session), process.env.AUTH_SESSION_SECRET)) {
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  const login = new URL("/login.html", url.origin);
  login.searchParams.set("next", url.pathname + url.search);
  return Response.redirect(login, 302);
}

export const config = {
  matcher: ["/((?!_vercel/).*)"]
};