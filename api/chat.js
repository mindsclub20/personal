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
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!validOwnerSession(req)) return res.status(401).json({ error: "Please sign in through Owner login before chatting with Gemini." });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Gemini is not configured. Add GEMINI_API_KEY in Vercel Production environment variables." });

  const incoming = req.body && Array.isArray(req.body.messages) ? req.body.messages : [];
  const messages = incoming
    .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string")
    .slice(-12)
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text.trim().slice(0, 4000) }]
    }))
    .filter(m => m.parts[0].text.length > 0);

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return res.status(400).json({ error: "Send a message to Gemini first." });
  }
  const totalChars = messages.reduce((sum, m) => sum + m.parts[0].text.length, 0);
  if (totalChars > 16000) return res.status(413).json({ error: "That conversation is too long. Start a new chat or shorten your message." });

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You are the AI assistant inside Shyam's personal workspace. Be helpful, accurate, clear, and age-appropriate. Explain things simply when useful. Never claim to have performed actions outside this chat." }]
        },
        contents: messages,
        generationConfig: { temperature: 0.7, maxOutputTokens: 1200 }
      }),
      signal: AbortSignal.timeout(25000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return res.status(502).json({ error: "Gemini rejected the API key. Check GEMINI_API_KEY in Vercel." });
      }
      if (response.status === 429) {
        return res.status(429).json({ error: "Gemini rate limit reached. Please wait a little and try again." });
      }
      return res.status(502).json({ error: "Gemini could not answer right now. Please try again shortly." });
    }
    const answer = (data.candidates || [])
      .flatMap(c => c.content && Array.isArray(c.content.parts) ? c.content.parts : [])
      .map(p => typeof p.text === "string" ? p.text : "")
      .join("")
      .trim();
    if (!answer) return res.status(502).json({ error: "Gemini returned an empty reply. Please try again." });
    return res.status(200).json({ reply: answer });
  } catch {
    return res.status(504).json({ error: "Gemini took too long to respond. Please try again." });
  }
}
