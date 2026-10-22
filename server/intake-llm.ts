import { isFoundryConfigured, runFoundryAgent } from "./foundry-agent";
import { invokeLLM } from "./_core/llm";
import { balanceSuggestions, buildDeterministicIntakeFallback, enrichFoundryResult } from "./intake-enrichment";
import { getAiProviderMode } from "./platform-settings";

type ChatRole = "user" | "assistant";

export type IntakeChatPayload = {
  section?: { id?: string; title?: string; fields?: string[] };
  fieldHelp?: Record<string, string>;
  captured?: Record<string, unknown>;
  userMessage?: string;
  history?: Array<{ role: ChatRole; content: string }>;
  mode?: "chat" | "suggestions";
  conversationId?: string;
  context?: { requestType?: string; category?: string; procurementType?: string; priority?: string };
};

const MODEL = "claude-haiku-4-5";
const ENRICHMENT_MODEL = "claude-haiku-4-5";
const MAX_HISTORY = 8;
const MAX_ENRICHMENT_TEXT = 1800;
const NUMERIC_FIELDS = new Set(["approvedBudget", "duration", "paymentTerms"]);
const DATE_FIELDS = new Set(["rfpIssueDate", "awardDate", "serviceStartDate"]);

type IntakeResult = {
  extracted: Record<string, unknown>;
  reply: string;
  section_complete: boolean;
  suggestions: string[];
  intent: "PRODUCT" | "SERVICE" | "MIXED";
  provider: "foundry" | "built-in-llm" | "guided-fallback";
  model?: string;
  conversationId?: string;
};

function jsonError(message: string, status = 400) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function getForgeConfig() {
  const baseUrl = (process.env.BUILT_IN_FORGE_API_URL || "").replace(/\/+$/, "");
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!baseUrl || !apiKey) throw jsonError("The built-in LLM service is not configured.", 503);
  return { baseUrl, apiKey };
}

function parseJson(content: unknown) {
  const text = Array.isArray(content)
    ? content.map((part: any) => part?.text || "").join("")
    : String(content || "");
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { /* handled below */ }
    }
    throw jsonError("The LLM returned an unreadable response.", 502);
  }
}

function normaliseSuggestions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parseFoundrySuggestions(reply: string) {
  return reply
    .split(/\r?\n|•|(?<=\?)\s+(?=[A-Z])/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length >= 8 && line.length <= 180)
    .slice(0, 5);
}

function buildSystemPrompt(payload: IntakeChatPayload) {
  const section = payload.section || {};
  const fields = Array.isArray(section.fields) ? section.fields : [];
  const help = payload.fieldHelp || {};
  const requestContext = payload.context || {};
  const fieldGuide = fields.map((field) => `${field}: ${help[field] || "free text"}`).join("; ");
  return `You are the live Procurement Intake Assistant in an enterprise Source-to-Contract platform.

Your job is to have a natural, useful intake conversation — not to repeat a script. You are currently capturing the section "${section.title || section.id || "Business Need"}". Extract only facts the requester actually supplied into these allowed fields: ${fieldGuide || "none"}.

Current request context: ${JSON.stringify(requestContext)}
Current captured values: ${JSON.stringify(payload.captured || {})}

Conversation rules:
- Acknowledge the user's latest message specifically; never repeat "Please provide the next required detail" or any generic question.
- Ask one high-value next question that depends on what is still missing. If the user gave an answer, move forward instead of asking for it again.
- Distinguish products/goods from services. For products, consider quantity, unit of measure, specifications, compatibility, delivery, warranty and acceptance criteria. For services, consider outcomes, scope, locations, staffing, milestones, SLAs, transition and governance. For software, also consider users, modules, integrations, licensing, hosting and data security.
- Suggestions must be concise, clickable example prompts, tailored to this request. Include a useful product/goods angle and a useful services angle whenever both could reasonably apply; do not produce generic filler.
- Set section_complete true only when the important fields for this section are captured or the user explicitly asks to move on.
- Dates must be YYYY-MM-DD; numeric budgets must be numbers without currency symbols; do not invent suppliers, budgets, dates or requirements.

Return ONLY one JSON object with exactly these keys:
{"extracted": {"allowedField": "value"}, "reply": "one or two natural sentences", "section_complete": true, "suggestions": ["four or five concise next prompts"], "intent": "PRODUCT|SERVICE|MIXED"}
The extracted object may be empty. Only use allowed field names. Never include markdown fences.`;
}

function buildFoundryContext(payload: IntakeChatPayload) {
  const section = payload.section || {};
  return [
    "You are operating inside the S2C Demand Intake chatbot.",
    `Current section: ${section.title || section.id || "Business Need"}.`,
    `Allowed fields: ${(section.fields || []).join(", ") || "none"}.`,
    `Field guidance: ${JSON.stringify(payload.fieldHelp || {})}.`,
    `Request context: ${JSON.stringify(payload.context || {})}.`,
    `Captured values: ${JSON.stringify(payload.captured || {})}.`,
    payload.mode === "suggestions"
      ? "Generate four or five concise clickable example prompts for this section. Include both a product/goods angle and a services angle when relevant. Return one prompt per line and no preamble."
      : "Respond naturally to the requester, acknowledge the latest message, capture facts, and ask one useful next question. Do not repeat a generic scripted prompt. Prefer returning ONLY this JSON shape so the platform can update the intake form: {\"extracted\":{},\"reply\":\"one or two natural sentences\",\"section_complete\":false,\"suggestions\":[],\"intent\":\"PRODUCT|SERVICE|MIXED\"}. Use only allowed field names in extracted.",
  ].join("\n");
}

async function runFoundryIntake(payload: IntakeChatPayload): Promise<IntakeResult> {
  const mode = payload.mode || "chat";
  const userMessage = payload.userMessage?.trim() || (mode === "suggestions"
    ? "Generate helpful example prompts for this section."
    : "");
  if (!userMessage) throw jsonError("A message is required.", 400);
  const result = await runFoundryAgent({
    userContext: buildFoundryContext(payload),
    userMessage,
    history: (payload.history || []).slice(-MAX_HISTORY),
    conversationId: payload.conversationId,
    newConversation: !payload.conversationId,
  });
  const enriched = await enrichFoundryResult(payload, result.reply);
  return {
    extracted: enriched.extracted,
    reply: mode === "suggestions" ? "" : enriched.reply,
    section_complete: enriched.section_complete,
    suggestions: enriched.suggestions,
    intent: enriched.intent,
    provider: "foundry",
    conversationId: result.conversationId,
  };
}

async function runBuiltInLlmIntake(payload: IntakeChatPayload): Promise<IntakeResult> {
  const { baseUrl, apiKey } = getForgeConfig();
  const allowedFields = new Set(payload.section?.fields || []);
  const mode = payload.mode || "chat";
  const userMessage = payload.userMessage?.trim() || (mode === "suggestions"
    ? "Start this section. Do not extract any values. Generate the most useful example prompts for the requester."
    : "");
  if (!userMessage) throw jsonError("A message is required.", 400);

  const history = (payload.history || [])
    .filter((entry) => entry && (entry.role === "user" || entry.role === "assistant") && entry.content)
    .slice(-MAX_HISTORY)
    .map((entry) => ({ role: entry.role, content: String(entry.content).slice(0, 1200) }));
  const messages = [
    { role: "system", content: buildSystemPrompt(payload) },
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 900, messages }),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw jsonError(`LLM request failed (${response.status})${detail ? `: ${detail}` : ""}`, 502);
  }
  const body: any = await response.json();
  const parsed = parseJson(body?.choices?.[0]?.message?.content);
  const extracted = Object.fromEntries(
    Object.entries(parsed?.extracted && typeof parsed.extracted === "object" ? parsed.extracted : {})
      .filter(([key, value]) => allowedFields.has(key) && value !== null && value !== "")
  );
  const suggestions = balanceSuggestions(payload, { ...payload.captured, ...extracted }, normaliseSuggestions(parsed?.suggestions));
  const reply = typeof parsed?.reply === "string" ? parsed.reply.trim() : "";
  const intent = ["PRODUCT", "SERVICE", "MIXED"].includes(parsed?.intent) ? parsed.intent : "MIXED";
  if (!reply && mode === "chat") throw jsonError("The LLM did not return a useful reply.", 502);
  return { extracted, reply, section_complete: Boolean(parsed?.section_complete), suggestions, intent, provider: "built-in-llm", model: MODEL };
}

export async function runIntakeAssistant(payload: IntakeChatPayload) {
  const selectedMode = await getAiProviderMode();

  if (selectedMode === "guided-fallback") {
    return buildDeterministicIntakeFallback(payload);
  }

  if (selectedMode === "foundry" && isFoundryConfigured()) {
    try {
      return await runFoundryIntake(payload);
    } catch (error) {
      console.warn("[Foundry] Intake agent unavailable; using guided fallback:", error instanceof Error ? error.message : error);
      return buildDeterministicIntakeFallback(payload);
    }
  }

  if (selectedMode === "foundry") {
    console.warn("[Foundry] Selected but not configured; using guided fallback.");
    return buildDeterministicIntakeFallback(payload);
  }

  try {
    return await runBuiltInLlmIntake(payload);
  } catch (error) {
    const status = Number((error as { status?: number })?.status || 0);
    if (status >= 400 && status < 500 && status !== 412) throw error;
    console.warn("[Intake] Built-in LLM unavailable; using deterministic guided fallback:", error instanceof Error ? error.message : error);
    return buildDeterministicIntakeFallback(payload);
  }
}

export function sendIntakeError(res: any, error: any) {
  const status = Number(error?.status) || 500;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: error?.message || "Intake assistant unavailable" }));
}
