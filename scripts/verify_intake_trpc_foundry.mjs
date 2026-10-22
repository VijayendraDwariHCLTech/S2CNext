const input = {
  mode: "chat",
  section: { id: "need", title: "Business Need", fields: ["category", "requestType", "requirementDescription"] },
  fieldHelp: { category: "IT Services or IT Hardware", requestType: "Services or Goods", requirementDescription: "what is needed" },
  captured: {},
  context: { requestType: "", category: "", procurementType: "Strategic Sourcing", priority: "MEDIUM" },
  userMessage: "We need managed IT support for 500 employees across India and Europe.",
  history: [],
};

const response = await fetch("http://127.0.0.1:3000/api/trpc/intake.chat?batch=1", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ 0: { json: input } }),
});
const body = await response.json();
const result = body?.[0]?.result?.data?.json || {};
console.log(JSON.stringify({
  httpStatus: response.status,
  provider: result.provider,
  hasReply: Boolean(result.reply?.trim()),
  hasConversationId: Boolean(result.conversationId),
  extractedFields: Object.keys(result.extracted || {}).sort(),
  intent: result.intent,
  suggestionCount: Array.isArray(result.suggestions) ? result.suggestions.length : 0,
  hasProductSuggestion: Array.isArray(result.suggestions) && result.suggestions.some((item) => /equipment|hardware|software|license|quantity|goods|product/i.test(item)),
  hasServiceSuggestion: Array.isArray(result.suggestions) && result.suggestions.some((item) => /service|support|sla|staffing|implementation|consult/i.test(item)),
}));
