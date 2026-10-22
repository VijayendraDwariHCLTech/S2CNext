import { describe, expect, it } from "vitest";
import { normalizeS2cDateValue } from "./s2cDatabase";

describe("S2C database date normalization", () => {
  it("turns conversational date text into NULL for optional DATE columns", () => {
    expect(normalizeS2cDateValue(
      "intake_commercials_timelines",
      "rfp_issue_date",
      "Award by end of November",
    )).toBeNull();
  });

  it("preserves valid ISO dates and rejects impossible calendar dates", () => {
    expect(normalizeS2cDateValue(
      "intake_commercials_timelines",
      "rfp_issue_date",
      "2026-11-30",
    )).toBe("2026-11-30");
    expect(normalizeS2cDateValue(
      "intake_commercials_timelines",
      "rfp_issue_date",
      "2026-02-30",
    )).toBeNull();
  });

  it("does not apply DATE-only normalization to ordinary text columns", () => {
    expect(normalizeS2cDateValue(
      "intake_requests",
      "requirement_description",
      "Award by end of November",
    )).toBe("Award by end of November");
  });
});
