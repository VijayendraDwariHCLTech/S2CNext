const invokeUrl = "https://hclsw-solutions.hclvoltmx.net/services/UnO_Solutions/Invoke_AIAgent";
const agentId = "9b5c3263-8a22-4df3-8db4-e75f804e2853";
const conversationId = `INtakeDiag${Date.now()}`;

const response = await fetch(invokeUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    AIAgent_id: agentId,
    mode: "CHAT",
    conversationId,
    userPrompt: "Provide a brief greeting.",
    newConversation: "true",
  }).toString(),
});

const raw = await response.text();
let body = {};
try { body = raw ? JSON.parse(raw) : {}; } catch { body = { nonJsonResponse: true }; }
console.log(JSON.stringify({
  httpStatus: response.status,
  opstatus: body.opstatus ?? null,
  responseKeys: Object.keys(body).sort(),
  messageCount: Array.isArray(body.messages) ? body.messages.length : 0,
  hasConversationId: Boolean(body.conversationId),
}));
