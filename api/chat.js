const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requests = new Map();

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST to send a message." });
  }

  // Accept requests only from this deployment's own origin when a browser Origin is supplied.
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) return send(res, 403, { error: "Cross-site requests are not allowed." });
    } catch {
      return send(res, 403, { error: "Invalid request origin." });
    }
  }

  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
  const now = Date.now();
  const entry = requests.get(ip);
  if (entry && now - entry.start < WINDOW_MS && entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return send(res, 429, { error: "Too many messages in a short time. Please wait a minute and try again." });
  }
  if (!entry || now - entry.start >= WINDOW_MS) requests.set(ip, { start: now, count: 1 });
  else entry.count += 1;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return send(res, 503, { error: "Gemini is not configured on the server. Add GEMINI_API_KEY to the Vercel project's Production environment, then redeploy." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: "Invalid JSON request." }); }
  }
  if (!body || typeof body !== "object") return send(res, 400, { error: "Invalid request body." });

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return send(res, 400, { error: "Please type a message first." });
  if (message.length > 8000) return send(res, 413, { error: "Messages must be 8,000 characters or fewer." });

  const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
  const contents = [];
  for (const item of history) {
    if (!item || !["user", "model"].includes(item.role) || typeof item.text !== "string") continue;
    const text = item.text.trim().slice(0, 8000);
    if (text) contents.push({ role: item.role, parts: [{ text }] });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  try {
    const models = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
    let lastStatus = 503;
    let lastMessage = "Gemini is temporarily busy.";
    for (const model of models) {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "You are Shyam's helpful personal AI assistant. Give clear, practical, age-appropriate answers. For coding help, explain errors accurately and provide safe examples. If uncertain, say so." }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        }),
        signal: AbortSignal.timeout(25_000)
      });
      const result = await upstream.json().catch(() => ({}));
      if (upstream.ok) {
        const reply = (result?.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("").trim();
        if (!reply) return send(res, 502, { error: "Gemini returned no text. Please try a different message." });
        return send(res, 200, { reply });
      }

      lastStatus = upstream.status;
      lastMessage = result?.error?.message || "Gemini could not complete the request.";
      // A busy or unavailable model can be retried using the next supported model.
      if (upstream.status === 503 || upstream.status === 404) continue;
      if (upstream.status === 401 || upstream.status === 403) {
        return send(res, 502, { error: "Gemini rejected the API key. Check that GEMINI_API_KEY is correct and enabled for the Gemini API in Google AI Studio." });
      }
      if (upstream.status === 429) {
        return send(res, 429, { error: "Gemini's usage limit was reached. Please wait and try again." });
      }
      console.error("Gemini upstream error:", upstream.status, lastMessage.slice(0, 300));
      return send(res, 502, { error: "Gemini could not answer right now. Please try again shortly." });
    }

    console.error("Gemini models unavailable:", lastStatus, lastMessage.slice(0, 300));
    if (lastStatus === 503) {
      return send(res, 503, { error: "Gemini is temporarily busy across its available models. Please try again in a minute." });
    }
    return send(res, 502, { error: "Gemini could not answer right now. Please try again shortly." });

  } catch (error) {
    console.error("Gemini request failed:", error?.name || "Error");
    return send(res, 504, { error: "The AI request timed out or the service is unavailable. Please try again." });
  }
}
