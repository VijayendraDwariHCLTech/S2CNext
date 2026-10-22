import { describe, expect, it } from "vitest";
import { isFoundryConfigured, runFoundryAgent } from "./foundry-agent";

/**
 * Live contract test. It checks the published Foundry agent endpoint through the
 * server adapter but does not log credentials, claims tokens, or agent content.
 */
describe("Foundry agent conversation", () => {
  it("invokes and receives a completed agent response using the archive-compatible service contract", async () => {
    expect(isFoundryConfigured(), "Foundry server configuration must be present").toBe(true);

    const result = await runFoundryAgent({
      userContext: "You are assisting with an enterprise procurement intake. Respond concisely.",
      userMessage: "Provide a concise greeting to a procurement requester.",
      newConversation: true,
    });

    expect(result.provider).toBe("foundry");
    expect(result.conversationId.length).toBeGreaterThan(8);
    expect(result.reply.trim().length, "Foundry agent must return a non-empty reply").toBeGreaterThan(0);
  }, 150_000);
});
