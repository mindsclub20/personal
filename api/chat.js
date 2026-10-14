import { requireSession, supabaseRest } from "../lib/site-auth.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requests = new Map();

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (!requireSession(req)) return send(res, 401, { error: "Authentication required." });
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
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (!message && !attachments.length) return send(res, 400, { error: "Type a message or attach a file first." });

  // Explicit "Remember: ..." requests are saved persistently in Altrav.
  const rememberMatch = !attachments.length ? message.match(/^\\s*(?:remember|save memory)\\s*:\\s*([\\s\\S]+)$/i) : null;
  if (rememberMatch) {
    const memoryText = rememberMatch[1].trim().slice(0, 12000);
    if (!memoryText) return send(res, 400, { error: "Write the memory after 'Remember:'." });
    try {
      const saved = await supabaseRest("ai_memories", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ category: "general", content: memoryText, source: "user_saved" })
      });
      if (!saved.ok) return send(res, 503, { error: "I couldn't save that memory. Check Supabase server configuration." });
      return send(res, 200, { reply: "Saved to your persistent AI memory. You can review or delete it on the AI Memory page." });
    } catch {
      return send(res, 503, { error: "Memory storage is not configured yet." });
    }
  }

  let memoryContext = "";
  try {
    const memoryResponse = await supabaseRest("ai_memories?select=category,content,updated_at&order=updated_at.desc&limit=40");
    if (memoryResponse.ok) {
      const savedMemories = await memoryResponse.json();
      memoryContext = savedMemories.map((m, i) => (i + 1) + ". [" + m.category + "] " + m.content).join("\\n").slice(0, 10000);
    }
  } catch {
    // Chat can still answer if memory storage is temporarily unavailable.
  }
  if (message.length > 8000) return send(res, 413, { error: "Messages must be 8,000 characters or fewer." });
  if (attachments.length > 4) return send(res, 400, { error: "Attach no more than 4 files per message." });

  const MAX_FILE_BYTES = 2 * 1024 * 1024;
  const MAX_TOTAL_FILE_BYTES = 3 * 1024 * 1024;
  const allowedInlineTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
  const preparedParts = [];
  let totalAttachmentBytes = 0;
  for (const file of attachments) {
    if (!file || typeof file !== "object" || typeof file.name !== "string" || file.name.length > 180) {
      return send(res, 400, { error: "One of the attachments has invalid file details." });
    }
    const size = Number(file.size);
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_FILE_BYTES) {
      return send(res, 413, { error: "Each attachment must be 2 MB or smaller." });
    }
    totalAttachmentBytes += size;
    if (totalAttachmentBytes > MAX_TOTAL_FILE_BYTES) {
      return send(res, 413, { error: "The combined attachment size must be 3 MB or smaller." });
    }
    const safeName = file.name.replace(/[\\r\n]/g, " ").slice(0, 180);
    const mimeType = typeof file.mimeType === "string" ? file.mimeType.toLowerCase() : "";
    if (typeof file.text === "string") {
      if (file.text.length > MAX_FILE_BYTES) return send(res, 413, { error: "A text attachment is too large to process." });
      preparedParts.push({ text: "\n\n--- File: " + safeName + " ---\n" + file.text + "\n--- End file ---\n" });
    } else if (typeof file.dataBase64 === "string" && allowedInlineTypes.has(mimeType)) {
      if (file.dataBase64.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 16 || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.dataBase64)) {
        return send(res, 400, { error: "The contents of " + safeName + " are not valid base64 data." });
      }
      preparedParts.push({ inline_data: { mime_type: mimeType, data: file.dataBase64 } });
    } else {
      return send(res, 400, { error: "Unsupported attachment type for " + safeName + ". Use PDF, PNG, JPG, WEBP, or text/code files." });
    }
  }

  const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
  const contents = [];
  for (const item of history) {
    if (!item || !["user", "model"].includes(item.role) || typeof item.text !== "string") continue;
    const text = item.text.trim().slice(0, 8000);
    if (text) contents.push({ role: item.role, parts: [{ text }] });
  }
  const userParts = [{ text: message || "Please inspect the attached file(s) and explain their contents." }, ...preparedParts];
  contents.push({ role: "user", parts: userParts });

  try {
    const models = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
    let lastStatus = 503;
    let lastMessage = "Gemini is temporarily busy.";
    for (const model of models) {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: `You are Shyam's personal AI assistant. Use this profile only when relevant, and never claim to know details beyond it.

ABOUT SHYAM
- Shyam is a Class 9 student in India.
- His long-term goals are robotics engineering and entrepreneurship.
- He is building practical projects and learning skills to create useful technology. One project is InsightLoop, a survey and market-research platform.
- He is learning Python as a foundation for robotics and AI. He knows basic variables, input, conditions, and loops, and is still strengthening dictionaries, APIs, and JSON.

HOW TO HELP SHYAM
- Be a practical, honest, supportive technical mentor—not a flatterer. Judge progress from evidence, explain limitations, and correct mistakes kindly.
- Keep answers concise and clear by default. Break complex work into manageable steps; avoid unnecessary planning or overwhelming lists.
- For Python and robotics practice, let him attempt mini-projects independently. Do not give hints or reveal a solution unless he asks. When he asks for help, explain the specific issue and let him keep ownership of the work.
- Prefer hands-on learning: build, test, debug, improve, and explain what changed.
- For websites and projects, inspect before changing, preserve existing work, test the result, and be transparent about what was actually verified. Never claim something was deployed or works unless there is evidence.
- For business ideas, help him distinguish tested facts from assumptions, consider safety, privacy, cost, and realistic constraints, and prioritize trust before growth.
- Encourage balanced, realistic plans that account for school, rest, and limited time. Do not shame him if he gets distracted or falls behind.
- Use age-appropriate language and examples. Protect his privacy; do not unnecessarily repeat personal details in public-facing content.
- If unsure, say so and suggest the smallest useful next step. Do not invent facts about Shyam or his projects.\n\nSAVED MEMORIES (use only when relevant; treat as user-provided context):\n${memoryContext || "No saved memories yet."}` }] },
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
