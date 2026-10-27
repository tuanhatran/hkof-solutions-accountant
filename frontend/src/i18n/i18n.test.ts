import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n, LANGUAGE_STORAGE_KEY } from "./index";
import { en } from "./resources/en";
import { fr } from "./resources/fr";

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, child]) =>
      flattenKeys(child, prefix === "" ? key : `${prefix}.${key}`),
  );
}

function stubBrowserLanguages(languages: string[]) {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(languages);
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(
    languages[0] ?? "",
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "";
});

describe("i18n", () => {
  it("detects French from the navigator and syncs the document language", () => {
    stubBrowserLanguages(["fr-FR", "fr"]);

    const instance = createI18n();

    expect(instance.resolvedLanguage).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("detects English from the navigator", () => {
    stubBrowserLanguages(["en-US", "en"]);

    const instance = createI18n();

    expect(instance.resolvedLanguage).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("falls back to French for an unsupported navigator language", () => {
    stubBrowserLanguages(["de-DE", "de"]);

    const instance = createI18n();

    expect(instance.resolvedLanguage).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("restores the persisted choice over the navigator language", () => {
    stubBrowserLanguages(["fr-FR", "fr"]);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");

    const instance = createI18n();

    expect(instance.resolvedLanguage).toBe("en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("persists a language switch and updates the document language", async () => {
    stubBrowserLanguages(["fr-FR", "fr"]);
    const instance = createI18n();

    await instance.changeLanguage("en");

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    expect(document.documentElement.lang).toBe("en");

    await instance.changeLanguage("fr");

    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("keeps the FR and EN api.errors keys in parity", () => {
    expect(flattenKeys(en.api.errors).sort()).toEqual(
      flattenKeys(fr.api.errors).sort(),
    );
  });

  it("exposes the French and English translations under the default namespace", async () => {
    stubBrowserLanguages(["fr"]);
    const instance = createI18n();

    expect(instance.t("navigation.links.history")).toBe("Historique");
    expect(instance.t("navigation.links.company")).toBe("Société");

    await instance.changeLanguage("en");

    expect(instance.t("navigation.links.history")).toBe("History");
    expect(instance.t("navigation.links.company")).toBe("Company");
  });
});
