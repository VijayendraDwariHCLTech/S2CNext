import { runIntakeAssistant } from "../server/intake-llm.ts";

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ code: 9, message: "your account has hit a usage exhausted" }), { status: 412, headers: { "content-type": "application/json" } });

try {
  const result = await runIntakeAssistant({
    mode: "chat",
    section: { id: "need", title: "Business Need", fields: ["category", "requestType", "priority", "requirementDescription"] },
    captured: {},
    userMessage: "We need 100 NVIDIA GPUs urgently for AI infrastructure.",
  });
  if (result.provider !== "guided-fallback") throw new Error(`Expected guided-fallback, received ${result.provider}`);
  if (result.extracted.category !== "IT Hardware") throw new Error("Expected GPU request to be classified as IT Hardware");
  console.log(JSON.stringify({ provider: result.provider, intent: result.intent, extractedFields: Object.keys(result.extracted), suggestionCount: result.suggestions.length }));
} finally {
  globalThis.fetch = originalFetch;
}
