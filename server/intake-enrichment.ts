import { invokeLLM } from "./_core/llm";
import type { IntakeChatPayload } from "./intake-llm";

const ENRICHMENT_MODEL = "claude-haiku-4-5";
const MAX_TEXT = 1800;
const NUMERIC_FIELDS = new Set(["approvedBudget", "duration", "paymentTerms"]);
const DATE_FIELDS = new Set(["rfpIssueDate", "awardDate", "serviceStartDate"]);
const INTENTS = ["PRODUCT", "SERVICE", "MIXED"] as const;

type EnrichmentOutput = {
  extracted?: Record<string, unknown>;
  reply?: string;
  section_complete?: boolean;
  suggestions?: unknown;
  intent?: string;
};

function textContent(content: unknown) {
  if (Array.isArray(content)) return content.map((part: any) => part?.text || "").join("");
  return String(content || "");
}

function parseJson(content: unknown): EnrichmentOutput {
  const text = textContent(content).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(text) as EnrichmentOutput;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as EnrichmentOutput;
    throw new Error("Structured intake enrichment returned invalid JSON");
  }
}

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, 5);
}

/** Prevent an agent-generated HTML document from being rendered as chat content. */
export function sanitizeFoundryReply(value: string) {
  const text = String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, MAX_TEXT);
}

/** Keep secondary-model output inside the active section and normalize known types. */
export function normalizeExtracted(value: unknown, fields: string[]) {
  if (!value || typeof value !== "object") return {};
  const allowed = new Set(fields);
  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!allowed.has(key) || raw === null || raw === undefined || raw === "") continue;
    if (NUMERIC_FIELDS.has(key)) {
      const numeric = typeof raw === "number" ? raw : Number(String(raw).replace(/[$,]/g, ""));
      if (Number.isFinite(numeric)) result[key] = numeric;
      continue;
    }
    if (DATE_FIELDS.has(key)) {
      const date = String(raw).match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (date) result[key] = date;
      continue;
    }
    const text = String(raw).trim();
    if (text) result[key] = text.slice(0, MAX_TEXT);
  }
  return result;
}

function classifyIntent(payload: IntakeChatPayload, text: string): "PRODUCT" | "SERVICE" | "MIXED" {
  const context = `${payload.context?.requestType || ""} ${payload.context?.category || ""} ${text}`.toLowerCase();
  const product = /product|goods|hardware|laptop|device|equipment|gpu|nvidia|server|monitor|printer|license|licen[cs]e|quantity|units?/.test(context);
  const service = /service|support|consult|managed|implementation|staff|sla|outcome|migration|maintenance/.test(context);
  return product && service ? "MIXED" : product ? "PRODUCT" : service ? "SERVICE" : "MIXED";
}

function normalizeNeedClassification(payload: IntakeChatPayload, extracted: Record<string, unknown>) {
  if (payload.section?.id !== "need") return extracted;
  const source = `${payload.userMessage || ""} ${payload.context?.category || ""} ${payload.context?.requestType || ""}`.toLowerCase();
  const product = /laptop|hardware|device|equipment|gpu|nvidia|server|goods|product|quantity|unit|monitor|printer|endpoint/.test(source);
  const service = /managed|support|consult|implementation|staff|sla|outcome|migration|maintenance|service/.test(source);
  const result = { ...extracted };
  if (product && !service) {
    if (payload.section.fields?.includes("category")) result.category = "IT Hardware";
    if (payload.section.fields?.includes("requestType")) result.requestType = "Goods";
  } else if (service && !product && payload.section.fields?.includes("requestType")) {
    result.requestType = "Services";
  } else if (product && service && payload.section.fields?.includes("requestType")) {
    result.requestType = "Goods and Services";
  }
  return result;
}

function intentFromRequest(payload: IntakeChatPayload, extracted: Record<string, unknown>) {
  const normalizedType = String(extracted.requestType || "").toLowerCase();
  if (normalizedType.includes("goods") && normalizedType.includes("service")) return "MIXED" as const;
  if (normalizedType.includes("goods") || normalizedType.includes("product")) return "PRODUCT" as const;
  if (normalizedType.includes("service")) return "SERVICE" as const;
  return classifyIntent(payload, payload.userMessage || "");
}

/** Deterministic safety net when the secondary structured call is unavailable. */
export function heuristicExtract(payload: IntakeChatPayload, text: string) {
  const fields = payload.section?.fields || [];
  const lower = text.toLowerCase();
  const extracted: Record<string, unknown> = {};
  const setIfAllowed = (field: string, value: unknown) => {
    if (fields.includes(field) && value !== undefined && value !== null && value !== "") extracted[field] = value;
  };

  if (payload.section?.id === "need") {
    setIfAllowed("requirementDescription", text);
    if (/critical/.test(lower)) setIfAllowed("priority", "CRITICAL");
    else if (/high|urgent/.test(lower)) setIfAllowed("priority", "HIGH");
    else if (/low/.test(lower)) setIfAllowed("priority", "LOW");
    if (/cloud|aws|azure/.test(lower)) setIfAllowed("category", "Cloud Infrastructure");
    else if (/saas|software|licen/.test(lower)) setIfAllowed("category", "Software & SaaS");
    else if (/hardware|laptop|device|equipment|gpu|nvidia|server|monitor|printer/.test(lower)) setIfAllowed("category", "IT Hardware");
    else if (/facilit|cleaning|office/.test(lower)) setIfAllowed("category", "Facilities Management");
    else if (/freight|logistic|shipping/.test(lower)) setIfAllowed("category", "Logistics & Freight");
    else if (/advis|consult/.test(lower)) setIfAllowed("category", "Professional Services");
    else if (/it|infra|support|network|help desk/.test(lower)) setIfAllowed("category", "IT Services");
    const intent = classifyIntent(payload, text);
    setIfAllowed("requestType", intent === "PRODUCT" ? "Goods" : intent === "SERVICE" ? "Services" : "Goods & Services");
  }
  if (payload.section?.id === "scope") {
    const places = ["India", "United States", "United Kingdom", "Germany", "Sweden", "Netherlands", "France", "Singapore"]
      .filter((place) => lower.includes(place.toLowerCase()) || (place === "United States" && /\bus\b|usa/.test(lower)) || (place === "United Kingdom" && /\buk\b/.test(lower)));
    setIfAllowed("geographyCoverage", places.join(", "));
    if (/transition|cutover|week/.test(lower)) setIfAllowed("transitionRequirement", text);
    else setIfAllowed("scopeDescription", text);
  }
  if (payload.section?.id === "specs") {
    const standards = ["ISO 27001", "SOC 2", "GDPR", "HIPAA", "PCI DSS", "ISO 14001", "ISO 9001"]
      .filter((standard) => lower.replace(/\s/g, "").includes(standard.toLowerCase().replace(/\s/g, "")));
    setIfAllowed("complianceRequirements", standards.join(", "));
    if (/region|resid|pii|data/.test(lower)) setIfAllowed("dataSecurity", text);
    if (/ecovadis|esg|emission|sustain/.test(lower)) setIfAllowed("esgRequirement", text);
    if (!Object.keys(extracted).length) setIfAllowed("specificationType", text);
  }
  if (payload.section?.id === "budget") {
    const amount = text.match(/(?:usd|\$|eur|€)?\s*([\d.,]+)\s*(m|million|k|thousand)?/i);
    if (amount) {
      let numberValue = Number(amount[1].replace(/,/g, ""));
      if (/m|million/i.test(amount[2] || "")) numberValue *= 1_000_000;
      if (/k|thousand/i.test(amount[2] || "")) numberValue *= 1_000;
      setIfAllowed("approvedBudget", Math.round(numberValue));
    }
    if (/capex/i.test(lower)) setIfAllowed("capexOpex", "CAPEX");
    if (/opex/i.test(lower)) setIfAllowed("capexOpex", "OPEX");
    setIfAllowed("currency", /eur|€/.test(lower) ? "EUR" : /gbp|£/.test(lower) ? "GBP" : "USD");
  }
  if (payload.section?.id === "timeline") {
    const date = text.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (date) setIfAllowed(/start/i.test(lower) ? "serviceStartDate" : /award/i.test(lower) ? "awardDate" : "rfpIssueDate", date);
  }
  return normalizeExtracted(extracted, fields);
}

export function buildLocalSuggestions(payload: IntakeChatPayload, values: Record<string, unknown> = {}) {
  const sectionId = payload.section?.id;
  const product = [
    "We need compatible equipment with quantities, specifications, delivery locations, warranty, and acceptance criteria.",
    "We need software or licenses for defined users, integrations, hosting, security, and support requirements.",
  ];
  const service = [
    "We need managed support with outcomes, coverage hours, staffing, locations, SLAs, and escalation paths.",
    "We need implementation or consulting services with deliverables, milestones, governance, and transition support.",
  ];
  if (sectionId === "need") {
    // Keep both paths visible at the opening Business Need step so requesters
    // can correct a premature product/service classification.
    return dedupe([...product, ...service]);
  }
  if (sectionId === "scope") return dedupe(["Define supplier deliverables, service levels, staffing, locations, and transition milestones.", ...service, ...product]);
  if (sectionId === "specs") return dedupe(["Include security, compliance, data residency, integration, and ESG standards.", ...product, ...service]);
  if (sectionId === "budget") return dedupe(["The approved budget is [amount] [currency], funded as [Capex/Opex].", "Include one-time implementation costs and recurring service or license costs.", ...service]);
  if (sectionId === "timeline") return dedupe(["Service or delivery should start on [YYYY-MM-DD], with award by [YYYY-MM-DD].", "Include transition, deployment, testing, and acceptance milestones.", ...service]);
  if (sectionId === "supplier") return dedupe(["The incumbent is [supplier]; invite [supplier names] and compare capability, risk, and capacity.", "Use a [contract type] for [duration] years with Net [days] payment terms.", ...service]);
  return dedupe([...product, ...service]);
}

export function balanceSuggestions(payload: IntakeChatPayload, values: Record<string, unknown>, suggestions: string[]) {
  const local = buildLocalSuggestions(payload, values);
  const hasProduct = suggestions.some((item) => /equipment|hardware|software|license|quantity|goods|product/i.test(item));
  const hasService = suggestions.some((item) => /service|support|sla|staffing|implementation|consult/i.test(item));
  const productSuggestion = local.find((item) => /equipment|software|license/i.test(item)) || local[0];
  const serviceSuggestion = local.find((item) => /service|support|implementation/i.test(item)) || local[1];
  const balanced = [
    ...(hasProduct ? suggestions.filter((item) => /equipment|hardware|software|license|quantity|goods|product/i.test(item)).slice(0, 1) : [productSuggestion]),
    ...(hasService ? suggestions.filter((item) => /service|support|sla|staffing|implementation|consult/i.test(item)).slice(0, 1) : [serviceSuggestion]),
    ...suggestions,
    ...local,
  ];
  return dedupe(balanced);
}

/**
 * Quota-safe path for the chat endpoint. This keeps the intake usable without
 * pretending that an LLM response was produced: extraction is limited to
 * deterministic patterns, and suggestions come from the section contract.
 */
export function buildDeterministicIntakeFallback(payload: IntakeChatPayload) {
  const mode = payload.mode || "chat";
  const message = payload.userMessage?.trim() || "";
  const rawExtracted = mode === "suggestions" ? {} : heuristicExtract(payload, message);
  const extracted = normalizeNeedClassification(payload, rawExtracted);
  const merged = { ...(payload.captured || {}), ...extracted };
  const fields = payload.section?.fields || [];
  const stillMissing = fields.filter((field) => merged[field] === undefined || merged[field] === null || merged[field] === "");
  const explicitMoveOn = /move on|next|skip|that's all|done/i.test(message);
  const sectionComplete = mode === "chat" && (explicitMoveOn || (fields.length > 0 && stillMissing.length === 0));
  const reply = mode === "suggestions" ? "" : fallbackReply(payload, extracted);
  return {
    extracted,
    reply,
    section_complete: sectionComplete,
    suggestions: balanceSuggestions(payload, merged, []),
    intent: intentFromRequest(payload, extracted),
    provider: "guided-fallback" as const,
    model: undefined,
  };
}

function buildSchema(fields: string[]) {
  const properties = Object.fromEntries(fields.map((field) => [field, {
    type: NUMERIC_FIELDS.has(field) ? ["number", "string", "null"] : ["string", "null"],
  }]));
  return {
    type: "object",
    properties: {
      extracted: { type: "object", properties, required: fields, additionalProperties: false },
      reply: { type: "string" },
      section_complete: { type: "boolean" },
      suggestions: { type: "array", items: { type: "string" }, maxItems: 5 },
      intent: { type: "string", enum: [...INTENTS] },
    },
    required: ["extracted", "reply", "section_complete", "suggestions", "intent"],
    additionalProperties: false,
  };
}

async function structuredEnrichment(payload: IntakeChatPayload, foundryReply: string) {
  const fields = payload.section?.fields || [];
  const context = JSON.stringify({ section: payload.section, fieldHelp: payload.fieldHelp, captured: payload.captured, context: payload.context });
  const history = (payload.history || []).slice(-6).map((entry) => `${entry.role}: ${entry.content}`).join("\n");
  const response = await invokeLLM({
    model: ENRICHMENT_MODEL,
    maxTokens: 1200,
    messages: [
      {
        role: "system",
        content: "You are the S2C server-side extraction, validation, and response-normalization layer. The upstream Foundry agent may return plain text or a full HTML request document. Never emit HTML, CSS, markup, or page templates. Write a concise one- or two-sentence conversational reply for the requester. Extract only facts explicitly present in the requester message or sanitized Foundry reply. Never invent values. Return the strict schema exactly.",
      },
      {
        role: "user",
        content: JSON.stringify({
          activeIntake: context,
          recentConversation: history,
          requesterMessage: payload.userMessage || "",
          foundryReply: foundryReply.slice(0, MAX_TEXT),
          allowedFields: fields,
          rules: "Dates must be YYYY-MM-DD. Budgets, duration, and payment terms must be numbers. Leave unknown fields null. Suggestions must include both a product/goods and services angle when both are plausible.",
        }),
      },
    ],
    responseFormat: { type: "json_schema", json_schema: { name: "s2c_intake_enrichment", strict: true, schema: buildSchema(fields) } },
  });
  return parseJson(response.choices[0]?.message?.content);
}

export async function enrichFoundryResult(payload: IntakeChatPayload, foundryReply: string) {
  const fields = payload.section?.fields || [];
  const safeFoundryReply = sanitizeFoundryReply(foundryReply);
  const fallback = heuristicExtract(payload, payload.userMessage || "");
  try {
    const parsed = await structuredEnrichment(payload, safeFoundryReply);
    const extracted = normalizeNeedClassification(payload, normalizeExtracted(parsed.extracted, fields));
    return {
      extracted: Object.keys(extracted).length ? extracted : fallback,
      reply: sanitizeFoundryReply(typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply : fallbackReply(payload, { ...fallback, ...extracted })),
      section_complete: Boolean(parsed.section_complete),
      suggestions: balanceSuggestions(payload, { ...payload.captured, ...extracted }, Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((item): item is string => typeof item === "string") : []),
      intent: intentFromRequest(payload, extracted),
    };
  } catch (error) {
    console.warn("[Intake] Structured enrichment unavailable; using deterministic normalization:", error instanceof Error ? error.message : error);
    return {
      extracted: normalizeNeedClassification(payload, fallback),
      reply: fallbackReply(payload, fallback),
      section_complete: false,
      suggestions: balanceSuggestions(payload, { ...payload.captured, ...fallback }, []),
      intent: intentFromRequest(payload, normalizeNeedClassification(payload, fallback)),
    };
  }
}

function fallbackReply(payload: IntakeChatPayload, extracted: Record<string, unknown>) {
  const requirement = String(extracted.requirementDescription || payload.userMessage || "").trim();
  const category = extracted.category ? ` This appears to be ${extracted.category}.` : "";
  if (requirement) return `I captured: ${requirement.slice(0, 260)}.${category} What specifications, locations, outcomes, or service levels should we add next?`;
  return "I could not safely extract a specific requirement yet. What product or service do you need, and who will use it?";
}
