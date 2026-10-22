import { describe, expect, it } from "vitest";
import { buildDeterministicIntakeFallback, buildLocalSuggestions, heuristicExtract, normalizeExtracted, sanitizeFoundryReply } from "./intake-enrichment";

describe("intake enrichment", () => {
  it("keeps only active fields and normalizes dates and numeric values", () => {
    expect(normalizeExtracted({ approvedBudget: "$1,200,000", awardDate: "award 2027-01-15", ignored: "no" }, ["approvedBudget", "awardDate"]))
      .toEqual({ approvedBudget: 1200000, awardDate: "2027-01-15" });
  });

  it("extracts a mixed product and service need without changing the Foundry reply", () => {
    const result = heuristicExtract({
      section: { id: "need", title: "Business Need", fields: ["category", "requestType", "requirementDescription", "priority"] },
      context: { requestType: "", category: "", procurementType: "Strategic Sourcing", priority: "MEDIUM" },
      captured: {},
      userMessage: "We need 250 laptops with delivery and managed endpoint support for 500 employees in India and Europe.",
    }, "We need 250 laptops with delivery and managed endpoint support for 500 employees in India and Europe.");
    expect(result).toMatchObject({ category: "IT Hardware", requestType: "Goods & Services" });
    expect(result.requirementDescription).toContain("250 laptops");
  });

  it("keeps product and services suggestions available for an ambiguous need", () => {
    const suggestions = buildLocalSuggestions({
      section: { id: "need", title: "Business Need", fields: ["category", "requestType"] },
      context: { requestType: "", category: "" },
    });
    expect(suggestions.some((item) => /equipment|software|license/i.test(item))).toBe(true);
    expect(suggestions.some((item) => /service|support|implementation/i.test(item))).toBe(true);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it("strips HTML documents from Foundry replies before chat rendering", () => {
    const safe = sanitizeFoundryReply("<html><style>body{color:red}</style><body><h1>Requirement Request</h1><p>1,000 laptops with delivery and warranty.</p></body></html>");
    expect(safe).toBe("Requirement Request 1,000 laptops with delivery and warranty.");
    expect(safe).not.toContain("<");
  });

  it("keeps intake usable when the LLM quota is exhausted", () => {
    const result = buildDeterministicIntakeFallback({
      mode: "chat",
      section: { id: "need", title: "Business Need", fields: ["category", "requestType", "requirementDescription", "priority"] },
      captured: {},
      userMessage: "We need 100 NVIDIA GPUs urgently for AI infrastructure.",
    });
    expect(result.provider).toBe("guided-fallback");
    expect(result.extracted).toMatchObject({ category: "IT Hardware", requestType: "Goods", priority: "HIGH" });
    expect(result.reply).toContain("100 NVIDIA GPUs");
    expect(result.suggestions.some((item) => /service|support|implementation/i.test(item))).toBe(true);
  });
});
