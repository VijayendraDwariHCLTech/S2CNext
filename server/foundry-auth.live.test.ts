import { describe, expect, it } from "vitest";

/**
 * Validates that the server-only Foundry credentials can obtain a claims token.
 * It intentionally never logs, returns, or persists the credential or token.
 */
describe("Foundry anonymous login", () => {
  it("returns a claims token using the configured server-only app credentials", async () => {
    const authHost = process.env.FOUNDRY_AUTH_HOST;
    const appKey = process.env.FOUNDRY_APP_KEY;
    const appSecret = process.env.FOUNDRY_APP_SECRET;

    expect(authHost, "FOUNDRY_AUTH_HOST must be configured").toBeTruthy();
    expect(appKey, "FOUNDRY_APP_KEY must be configured").toBeTruthy();
    expect(appSecret, "FOUNDRY_APP_SECRET must be configured").toBeTruthy();

    const response = await fetch(`https://${authHost}/login`, {
      method: "POST",
      headers: {
        "X-VoltMX-App-Key": appKey!,
        "X-VoltMX-App-Secret": appSecret!,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    expect(response.status, "Foundry anonymous login must succeed").toBe(200);
    const body = (await response.json()) as { claims_token?: { value?: string; exp?: number } };
    expect(typeof body.claims_token?.value, "Foundry login must return a claims token").toBe("string");
    expect(body.claims_token?.value?.length, "Foundry claims token must not be empty").toBeGreaterThan(20);
    expect(Number(body.claims_token?.exp), "Foundry claims token must include an expiry").toBeGreaterThan(0);
  }, 30_000);
});
