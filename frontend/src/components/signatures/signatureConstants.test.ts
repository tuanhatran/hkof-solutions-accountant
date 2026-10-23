import { describe, expect, it } from "vitest";
import {
  MAX_SIGNATURE_SIZE,
  signatureImageError,
  signatureTypeLabel,
} from "./signatureConstants";

function fileOf(type: string, size = 4, name = "signature"): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("signatureTypeLabel", () => {
  it("labels the known signature types and falls back on a generic label", () => {
    expect(signatureTypeLabel("LANDLORD")).toBe("Bailleur");
    expect(signatureTypeLabel("ENTREPRISE_CEO")).toBe("Gérant d'entreprise");
    expect(signatureTypeLabel(undefined)).toBe("Signature");
  });
});

describe("signatureImageError", () => {
  it("accepts PNG and JPEG images within the size limit", () => {
    expect(signatureImageError(fileOf("image/png", 4, "a.png"))).toBeNull();
    expect(signatureImageError(fileOf("image/jpeg", 4, "a.jpg"))).toBeNull();
  });

  it("rejects other formats with a French message", () => {
    expect(signatureImageError(fileOf("application/pdf", 4, "a.pdf"))).toBe(
      "Format non accepté. Formats : PNG, JPEG.",
    );
  });

  it("rejects images larger than two megabytes with a French message", () => {
    expect(
      signatureImageError(
        fileOf("image/png", MAX_SIGNATURE_SIZE + 1, "big.png"),
      ),
    ).toBe("Fichier trop volumineux (2 Mo maximum).");
  });
});
