import { describe, expect, it } from "vitest";
import { confidenceLabel, confidenceValid } from "./analysisConfidence";

describe("confidenceValid", () => {
  it("accepts the three known levels", () => {
    expect(confidenceValid("haute")).toBe("haute");
    expect(confidenceValid("moyenne")).toBe("moyenne");
    expect(confidenceValid("basse")).toBe("basse");
  });

  it("rejects unknown and missing values", () => {
    expect(confidenceValid("HAUTE")).toBeNull();
    expect(confidenceValid("")).toBeNull();
    expect(confidenceValid(null)).toBeNull();
    expect(confidenceValid(undefined)).toBeNull();
  });
});

describe("confidenceLabel", () => {
  it("returns the French label for each level", () => {
    expect(confidenceLabel("haute")).toBe("Confiance élevée");
    expect(confidenceLabel("moyenne")).toBe("Confiance moyenne");
    expect(confidenceLabel("basse")).toBe(
      "Confiance faible — vérifiez les valeurs",
    );
  });

  it("returns null without a confidence", () => {
    expect(confidenceLabel(null)).toBeNull();
  });
});
