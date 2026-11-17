export const LOCAL_MODEL_ID = "Qwen2.5-Coder-0.5B-Instruct-q4f32_1-MLC";
export const LOCAL_MODEL_NAME = "Qwen2.5 Coder 0.5B (browser-local)";
export const LOCAL_MODEL_DOWNLOAD = "about 1 GB";

export function supportsLocalLLM(environment = globalThis) {
  return Boolean(environment?.navigator?.gpu);
}

export async function createLocalEngine({
  onProgress = () => {},
  importer = () => import("https://esm.run/@mlc-ai/web-llm@0.2.88"),
  environment = globalThis,
} = {}) {
  if (!supportsLocalLLM(environment)) {
    throw new Error("WebGPU is unavailable. Use an up-to-date Chrome or Edge browser on a supported device.");
  }
  const webllm = await importer();
  if (typeof webllm?.CreateMLCEngine !== "function") {
    throw new Error("The browser-local AI runtime could not be loaded.");
  }
  return webllm.CreateMLCEngine(LOCAL_MODEL_ID, {
    initProgressCallback: (report = {}) => {
      onProgress({
        text: String(report.text || "Downloading and preparing the local model…"),
        progress: Number.isFinite(report.progress) ? report.progress : null,
      });
    },
  });
}

export async function generateLocalReply(engine, history, systemPrompt) {
  if (!engine?.chat?.completions?.create) {
    throw new Error("The local model is not ready. Load it before sending a message.");
  }
  const messages = [
    { role: "system", content: String(systemPrompt || "You are a helpful educational assistant.") },
    ...(Array.isArray(history) ? history : [])
      .filter((item) => ["user", "assistant"].includes(item?.role) && typeof item.content === "string")
      .slice(-12),
  ];
  const result = await engine.chat.completions.create({
    messages,
    temperature: 0.65,
    max_tokens: 700,
    stream: false,
  });
  return String(result?.choices?.[0]?.message?.content || "").trim();
}
