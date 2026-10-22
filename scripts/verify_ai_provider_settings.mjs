import { getAiProviderMode, setAiProviderMode } from "../server/platform-settings.ts";
import { runIntakeAssistant } from "../server/intake-llm.ts";

const originalMode = await getAiProviderMode();
const originalFetch = globalThis.fetch;

try {
  await setAiProviderMode("guided-fallback", "settings-smoke-test");
  const guided = await runIntakeAssistant({
    mode: "chat",
    section: { id: "need", title: "Business Need", fields: ["category", "requestType", "priority", "requirementDescription"] },
    captured: {},
    userMessage: "We need 100 NVIDIA GPUs urgently for AI infrastructure.",
  });
  if (guided.provider !== "guided-fallback") throw new Error(`Expected guided-fallback, received ${guided.provider}`);

  await setAiProviderMode("built-in-llm", "settings-smoke-test");
  globalThis.fetch = async () => new Response(JSON.stringify({ code: 9, message: "usage exhausted" }), { status: 412, headers: { "content-type": "application/json" } });
  const quotaFallback = await runIntakeAssistant({
    mode: "chat",
    section: { id: "need", title: "Business Need", fields: ["category", "requestType", "priority", "requirementDescription"] },
    captured: {},
    userMessage: "We need 100 NVIDIA GPUs urgently for AI infrastructure.",
  });
  if (quotaFallback.provider !== "guided-fallback") throw new Error(`Expected quota fallback, received ${quotaFallback.provider}`);

  await setAiProviderMode("foundry", "settings-smoke-test");
  if (await getAiProviderMode() !== "foundry") throw new Error("Foundry selection was not persisted");
  console.log(JSON.stringify({ persistedModes: ["guided-fallback", "built-in-llm", "foundry"], guidedProvider: guided.provider, quotaProvider: quotaFallback.provider }));
} finally {
  globalThis.fetch = originalFetch;
  await setAiProviderMode(originalMode, "settings-smoke-test-restore");
}

// mysql2 keeps its pool handles open in a standalone process; production uses
// the pool as a resident service, whereas this one-shot verification must end.
process.exit(0);
