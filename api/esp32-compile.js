export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Cookie");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  // The site's middleware validates owner_session before this handler runs.
  // Validate it again so the endpoint remains protected if routing changes.
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const secret = process.env.SESSION_SECRET;
  const cookie = String(req.headers.cookie || "").split(";").map(v => v.trim()).find(v => v.startsWith("owner_session="))?.slice("owner_session=".length) || "";
  const dot = cookie.lastIndexOf(".");
  let authenticated = false;
  if (secret && dot > 0) {
    const payload = cookie.slice(0, dot);
    const signature = cookie.slice(dot + 1);
    const expected = createHmac("sha256", secret).update(payload).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) {
      try {
        const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
        authenticated = claims.sub === "owner" && Number(claims.exp) > Date.now();
      } catch { authenticated = false; }
    }
  }
  if (!authenticated) return res.status(401).json({ error: "Owner authentication required." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  if (typeof body.code !== "string" || !body.code.trim() || body.code.length > 100000) {
    return res.status(400).json({ error: "Provide a non-empty Arduino sketch under 100 KB." });
  }
  if (body.board && body.board !== "esp32") return res.status(400).json({ error: "Only the ESP32 Arduino target is supported." });

  const workerUrl = process.env.ESP32_COMPILER_URL;
  if (!workerUrl) {
    return res.status(503).json({
      error: "The genuine ESP32 compiler worker is not configured yet. This site currently has only the limited virtual simulator; no firmware binary was compiled."
    });
  }
  let parsed;
  try { parsed = new URL(workerUrl); } catch { return res.status(503).json({ error: "Compiler worker URL is invalid." }); }
  if (parsed.protocol !== "https:") return res.status(503).json({ error: "Compiler worker must use HTTPS." });

  try {
    const headers = { "Content-Type": "application/json", "Accept": "application/json" };
    if (process.env.ESP32_COMPILER_TOKEN) headers.Authorization = "Bearer " + process.env.ESP32_COMPILER_TOKEN;
    const upstream = await fetch(parsed.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({ board: "esp32:esp32:esp32", fqbn: "esp32:esp32:esp32", sketch: body.code }),
      signal: AbortSignal.timeout(55000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) return res.status(502).json({ error: "ESP32 compiler worker failed.", diagnostics: result.diagnostics || result.error || "No diagnostics returned." });
    if (result.success !== true || typeof result.firmwareBase64 !== "string") {
      return res.status(502).json({ error: "Compiler worker returned no verified firmware binary.", diagnostics: result.diagnostics || "Expected success=true and firmwareBase64." });
    }
    return res.status(200).json({
      success: true,
      filename: typeof result.filename === "string" && result.filename.endsWith(".bin") ? result.filename : "firmware.bin",
      firmwareBase64: result.firmwareBase64,
      diagnostics: result.diagnostics || ""
    });
  } catch {
    return res.status(502).json({ error: "Could not reach the ESP32 compiler worker." });
  }
}
