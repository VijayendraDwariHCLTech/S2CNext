import { ENV } from "./_core/env";

export type FoundryChatRole = "user" | "assistant";

export type FoundryAgentChatPayload = {
  userContext?: string;
  userMessage?: string;
  history?: Array<{ role: FoundryChatRole; content: string }>;
  conversationId?: string;
  newConversation?: boolean;
};

type FoundryMessage = {
  text?: string;
  type?: string;
  status?: string;
  timestamp?: string;
};

type FoundryResponse = {
  agentId?: string;
  conversationId?: string;
  created?: string;
  agentName?: string;
  topic?: string;
  opstatus?: number;
  messages?: FoundryMessage[];
  httpStatusCode?: number;
  [key: string]: unknown;
};

const MAX_HISTORY = 8;
const MAX_MESSAGE_LENGTH = 1200;

function foundryError(message: string, status = 502) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

export function isFoundryConfigured() {
  return Boolean(ENV.foundryAppKey && ENV.foundryAppSecret && ENV.foundryInvokeUrl && ENV.foundryConversationUrl);
}

function requireFoundryConfig() {
  if (!isFoundryConfigured()) {
    throw foundryError("Foundry agent integration is not configured. Add FOUNDRY_APP_KEY and FOUNDRY_APP_SECRET to the server environment.", 503);
  }
}

function sessionId() {
  const now = new Date();
  const stamp = `${now.toISOString().slice(0, 10).replace(/-/g, "")}${now.toTimeString().slice(0, 8).replace(/:/g, "")}`;
  return `INtakeSess${stamp}-${crypto.randomUUID().slice(0, 8)}`;
}

let cachedToken: { value: string; exp: number } | null = null;
let tokenPromise: Promise<string> | null = null;

async function login(): Promise<string> {
  requireFoundryConfig();
  const response = await fetch(`https://${ENV.foundryAuthHost}/login`, {
    method: "POST",
    headers: {
      "X-VoltMX-App-Key": ENV.foundryAppKey,
      "X-VoltMX-App-Secret": ENV.foundryAppSecret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw foundryError(`Foundry anonymous login failed (${response.status})${detail ? `: ${detail}` : ""}`, 502);
  }
  const body = (await response.json()) as { claims_token?: { value?: string; exp?: number } };
  const value = body.claims_token?.value;
  if (!value) throw foundryError("Foundry login did not return a claims token.", 502);
  cachedToken = { value, exp: Number(body.claims_token?.exp || Math.floor(Date.now() / 1000) + 300) };
  return value;
}

async function getToken(forceRefresh = false) {
  const now = Math.floor(Date.now() / 1000);
  if (!forceRefresh && cachedToken && cachedToken.exp > now + 300) return cachedToken.value;
  if (!tokenPromise) {
    tokenPromise = login().finally(() => { tokenPromise = null; });
  }
  return tokenPromise;
}

async function foundryFetch(url: string, init: RequestInit, retry = true): Promise<FoundryResponse> {
  const headers = new Headers(init.headers);
  // The supplied Foundry agent-hook invokes its published agent services with
  // form data only. Some tenant configurations require a claims token; make
  // that an explicit server-side opt-in rather than sending an unsupported
  // header by default.
  if (ENV.foundryUseClaimsToken) {
    const token = await getToken(retry === false);
    headers.set("X-Voltmx-Authorization", token);
  }
  const response = await fetch(url, { ...init, headers });
  if (response.status === 401 && retry && ENV.foundryUseClaimsToken) {
    cachedToken = null;
    return foundryFetch(url, init, false);
  }
  const text = await response.text();
  let body: FoundryResponse;
  try { body = text ? JSON.parse(text) as FoundryResponse : {}; } catch { throw foundryError(`Foundry returned invalid JSON (${response.status}).`, 502); }
  if (!response.ok) {
    const detail = text.slice(0, 300);
    throw foundryError(`Foundry request failed (${response.status})${detail ? `: ${detail}` : ""}`, 502);
  }
  if (body.opstatus !== undefined && body.opstatus !== 0) {
    throw foundryError(`Foundry agent returned opstatus ${body.opstatus}.`, 502);
  }
  return body;
}

function latestAgentMessage(body: FoundryResponse) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  return [...messages].reverse().find((message) => message.type === "AGENT_RESPONSE" && (!message.status || message.status === ""));
}

async function pollConversation(conversationId: string) {
  for (let attempt = 0; attempt < Math.max(1, ENV.foundryPollAttempts); attempt += 1) {
    const body = await foundryFetch(ENV.foundryConversationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ conversation_id: conversationId }).toString(),
    });
    const message = latestAgentMessage(body);
    if (message?.text) return { body, message };
    if (attempt + 1 < ENV.foundryPollAttempts) {
      await new Promise((resolve) => setTimeout(resolve, Math.max(250, ENV.foundryPollIntervalMs)));
    }
  }
  throw foundryError(`Foundry agent response timed out after ${ENV.foundryPollAttempts} polling attempts.`, 504);
}

function buildPrompt(payload: FoundryAgentChatPayload) {
  // The supplied Foundry hook sends a plain `userPrompt`; the published agent
  // rejects multi-line context envelopes with opstatus 8009. Conversation state
  // is retained by Foundry via `conversationId`, while the S2C server continues
  // to validate the response against the active intake section.
  return String(payload.userMessage || "").trim().slice(0, MAX_MESSAGE_LENGTH);
}

export async function runFoundryAgent(payload: FoundryAgentChatPayload) {
  requireFoundryConfig();
  const conversationId = payload.conversationId || sessionId();
  const invokeBody = new URLSearchParams({
    AIAgent_id: ENV.foundryAgentId,
    mode: "CHAT",
    conversationId,
    userPrompt: buildPrompt(payload),
    newConversation: String(payload.newConversation ?? !payload.conversationId),
  });
  const invoked = await foundryFetch(ENV.foundryInvokeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: invokeBody.toString(),
  });
  const finalConversationId = invoked.conversationId || conversationId;
  const immediate = latestAgentMessage(invoked);
  const result = immediate?.text ? { body: invoked, message: immediate } : await pollConversation(finalConversationId);
  return {
    reply: result.message.text || "",
    conversationId: finalConversationId,
    sessionId: conversationId,
    agentId: invoked.agentId || ENV.foundryAgentId,
    agentName: invoked.agentName || "Foundry Procurement Agent",
    timestamp: result.message.timestamp || new Date().toISOString(),
    provider: "foundry" as const,
  };
}

export function sendFoundryError(res: any, error: any) {
  const status = Number(error?.status) || 500;
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ error: error?.message || "Foundry agent unavailable" }));
}
