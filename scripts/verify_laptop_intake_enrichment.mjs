const input = {
  mode: "chat",
  section: { id: "need", title: "Business Need", fields: ["category", "requestType", "requirementDescription"] },
  fieldHelp: { category: "IT Services or IT Hardware", requestType: "Services or Goods", requirementDescription: "what is needed" },
  captured: {},
  context: { requestType: "", category: "", procurementType: "Strategic Sourcing", priority: "MEDIUM" },
  userMessage: "1,000 laptops with delivery, warranty and acceptance criteria",
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
  intent: result.intent,
  extracted: result.extracted,
  reply: result.reply,
  replyHasHtml: /<html|<style|<body|<!doctype/i.test(result.reply || ""),
  suggestionCount: Array.isArray(result.suggestions) ? result.suggestions.length : 0,
  hasProductSuggestion: Array.isArray(result.suggestions) && result.suggestions.some((item) => /equipment|hardware|software|license|quantity|goods|product/i.test(item)),
  hasServiceSuggestion: Array.isArray(result.suggestions) && result.suggestions.some((item) => /service|support|sla|staffing|implementation|consult/i.test(item)),
}));
