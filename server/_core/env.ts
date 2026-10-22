export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  foundryAuthHost: process.env.FOUNDRY_AUTH_HOST ?? "100000306.auth.hclvoltmx.net",
  foundryServiceHost: process.env.FOUNDRY_SERVICE_HOST ?? "hclsw-solutions.hclvoltmx.net",
  foundryAppKey: process.env.FOUNDRY_APP_KEY ?? "",
  foundryAppSecret: process.env.FOUNDRY_APP_SECRET ?? "",
  // The supplied Volt MX archive invokes its AI-agent endpoints without a claims
  // token. Enable only for Foundry tenants that explicitly require it.
  foundryUseClaimsToken: process.env.FOUNDRY_USE_CLAIMS_TOKEN === "true",
  foundryAgentId: process.env.FOUNDRY_AGENT_ID ?? "9b5c3263-8a22-4df3-8db4-e75f804e2853",
  foundryInvokeUrl: process.env.FOUNDRY_INVOKE_URL ?? "https://hclsw-solutions.hclvoltmx.net/services/UnO_Solutions/Invoke_AIAgent",
  foundryConversationUrl: process.env.FOUNDRY_CONVERSATION_URL ?? "https://hclsw-solutions.hclvoltmx.net/services/UnO_Solutions/getConversation_ReturnLastAction",
  foundryPollAttempts: Number(process.env.FOUNDRY_POLL_ATTEMPTS ?? 20),
  foundryPollIntervalMs: Number(process.env.FOUNDRY_POLL_INTERVAL_MS ?? 5000),
};
