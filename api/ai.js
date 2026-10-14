const MAX_MESSAGE_LENGTH = 8000;
const MAX_HISTORY_ITEMS = 12;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to send a message." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "The server is missing GEMINI_API_KEY. Add it to the Vercel Production environment and redeploy." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "Please enter a message." });
    if (message.length > MAX_MESSAGE_LENGTH) return res.status(413).json({ error: "Your message is too long. Please keep it under 8,000 characters." });

    const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_ITEMS) : [];
    const contents = history
      .filter(item => item && (item.role === "user" || item.role === "model") && typeof item.text === "string")
      .map(item => ({ role: item.role, parts: [{ text: item.text.slice(0, MAX_MESSAGE_LENGTH) }] }));
    contents.push({ role: "user", parts: [{ text: message }] });

    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });

    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const providerMessage = result && result.error && result.error.message;
      if (upstream.status === 401 || upstream.status === 403) {
        return res.status(502).json({ error: "Gemini rejected the API key. Check the key and its API permissions in Google AI Studio, then update Vercel." });
      }
      if (upstream.status === 429) {
        return res.status(429).json({ error: "Gemini is rate-limiting requests or the API quota is exhausted. Please wait and try again." });
      }
      console.error("Gemini API error:", upstream.status, providerMessage || "No provider message");
      return res.status(502).json({ error: "Gemini could not complete the request. Please try again shortly." });
    }

    const text = (result.candidates || [])
      .flatMap(candidate => candidate.content && candidate.content.parts || [])
      .map(part => typeof part.text === "string" ? part.text : "")
      .join("\n")
      .trim();

    if (!text) return res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
    return res.status(200).json({ text });
  } catch (error) {
    console.error("AI endpoint error:", error && error.message ? error.message : "Unknown error");
    return res.status(500).json({ error: "The AI request could not be processed. Please try again." });
  }
};