import { runIntakeAssistant } from "../server/intake-llm.ts";

const payload = {
  mode: "chat",
  section: { id: "need", title: "Business Need", fields: ["category", "requestType", "requirementDescription"] },
  fieldHelp: {
    category: "IT Services or IT Hardware",
    requestType: "Services or Goods",
    requirementDescription: "what is needed",
  },
  captured: {},
  context: { requestType: "", category: "", procurementType: "Strategic Sourcing", priority: "MEDIUM" },
  userMessage: "We need managed IT support for 500 employees across India and Europe.",
  history: [],
};

const result = await runIntakeAssistant(payload);
console.log(JSON.stringify({
  provider: result.provider,
  hasReply: Boolean(result.reply?.trim()),
  hasConversationId: Boolean(result.conversationId),
  extractedFields: Object.keys(result.extracted || {}).sort(),
  suggestionCount: result.suggestions?.length || 0,
}));
