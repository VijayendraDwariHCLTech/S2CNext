const invokeUrl = "https://hclsw-solutions.hclvoltmx.net/services/UnO_Solutions/Invoke_AIAgent";
const agentId = "9b5c3263-8a22-4df3-8db4-e75f804e2853";

function archiveSessionId() {
  const now = new Date();
  return `INtakeSess${now.toISOString().slice(0, 10).replace(/-/g, "")}${now.toTimeString().slice(0, 8).replace(/:/g, "")}`;
}

async function invoke(label, conversationId, userPrompt) {
  const response = await fetch(invokeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      AIAgent_id: agentId,
      mode: "CHAT",
      conversationId,
      userPrompt,
      newConversation: "true",
    }).toString(),
  });
  const raw = await response.text();
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = {}; }
  return {
    label,
    httpStatus: response.status,
    opstatus: body.opstatus ?? null,
    messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
    hasConversationId: Boolean(body.conversationId),
  };
}

const basePrompt = "Provide a brief greeting to a procurement requester.";
const contextPrompt = [
  "Requester context:",
  "You are assisting with an enterprise procurement intake. Respond concisely.",
  "",
  "Requester message:",
  basePrompt,
].join("\n");

const results = [];
results.push(await invoke("archive-session / plain prompt", archiveSessionId(), basePrompt));
await new Promise((resolve) => setTimeout(resolve, 1_100));
results.push(await invoke("archive-session / contextual prompt", archiveSessionId(), contextPrompt));
await new Promise((resolve) => setTimeout(resolve, 1_100));
results.push(await invoke("uuid-suffix session / plain prompt", `${archiveSessionId()}-${crypto.randomUUID().slice(0, 8)}`, basePrompt));
console.log(JSON.stringify(results));
