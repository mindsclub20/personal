import { createHmac, timingSafeEqual } from "node:crypto";

function validSession(token, secret) {
  if (!token || !secret) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp > Date.now() && session.sub === "owner";
  } catch { return false; }
}

export default function middleware(request) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/dashboard")) return;
  const token = request.cookies.get("owner_session")?.value;
  if (!validSession(token, process.env.SESSION_SECRET)) {
    return Response.redirect(new URL("/login.html?next=%2Fdashboard.html", request.url), 307);
  }
}

export const config = { matcher: ["/dashboard", "/dashboard.html"] };
