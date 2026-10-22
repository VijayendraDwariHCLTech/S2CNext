type Message = { role: string; content: string };
type LlmArgs = { model: string; messages: Message[]; maxTokens?: number; responseFormat?: unknown };
export async function invokeLLM(args: LlmArgs): Promise<{ choices: Array<{ message: { content: string } }> }> {
  const base = process.env.BUILT_IN_FORGE_API_URL?.replace(/\/+$/, "");
  const key = process.env.BUILT_IN_FORGE_API_KEY;
  if (!base || !key) throw new Error("Built-in LLM is not configured");
  const response = await fetch(`${base}/v1/chat/completions`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: args.model, messages: args.messages, max_tokens: args.maxTokens ?? 1200,
      ...(args.responseFormat ? { response_format: args.responseFormat } : {}) }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`LLM error HTTP ${response.status}`);
  return (await response.json()) as { choices: Array<{ message: { content: string } }> };
}
