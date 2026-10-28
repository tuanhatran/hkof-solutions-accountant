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

function leafValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  return Object.values(value as Record<string, unknown>).flatMap(leafValues);
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

  it("keeps the whole FR and EN translation trees in parity", () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(fr).sort());
  });

  it("uses the canonical French terminology for the managed entity", () => {
    expect(fr.settings.company.tabsAria).toBe("Sections de la société");
    expect(fr.settings.company.tabs.templates).toBe("Modèles");
    expect(fr.settings.lmnp.tabs.templates).toBe("Modèles");
    expect(fr.expenseStatement.footer.companyLink).toBe("Société");
    expect(fr.settings.expenses.title).toBe("Postes");
    expect(fr.settings.expenses.add).toBe("Ajouter un poste");
    expect(fr.settings.expenses.form.createTitle).toBe("Ajouter un poste");
    expect(fr.settings.expenses.form.editTitle).toBe("Modifier le poste");
    expect(fr.settings.expenses.deleteDialog.title).toBe("Retirer ce poste ?");
    expect(fr.api.errors.EXPENSE_ITEM_UNKNOWN_CODE).toBe(
      "Poste inconnu : {{code}}",
    );
    expect(fr.expenseStatement.fields.type).toBe("Type de frais");
    expect(fr.api.errors.EXPENSE_ITEM_REQUIRED).toBe(
      "Le type de frais est obligatoire.",
    );
  });

  it("mirrors the entity terminology in English", () => {
    expect(en.settings.company.tabs.templates).toBe("Templates");
    expect(en.settings.lmnp.tabs.templates).toBe("Templates");
    expect(en.settings.expenses.title).toBe("Expense items");
    expect(en.settings.expenses.form.editTitle).toBe("Edit the expense item");
    expect(en.settings.expenses.deleteDialog.title).toBe(
      "Remove this expense item?",
    );
    expect(en.api.errors.EXPENSE_ITEM_UNKNOWN_CODE).toBe(
      "Unknown expense item: {{code}}",
    );
    expect(en.expenseStatement.fields.type).toBe("Expense type");
    expect(en.rentReceipt.fields.template).toBe("Template");
  });

  it("names the AI analysis page in French and English", () => {
    expect(fr.navigation.links.aiAdmin).toBe("Analyse IA");
    expect(fr.adminLlm.page.title).toBe("Analyse IA");
    expect(en.navigation.links.aiAdmin).toBe("AI analysis");
    expect(en.adminLlm.page.title).toBe("AI analysis");
  });

  it("keeps no Admin IA or AI Admin value in the translations", () => {
    const values = [...leafValues(fr), ...leafValues(en)];

    expect(values.filter((value) => /\bAdmin IA\b/i.test(value))).toEqual([]);
    expect(values.filter((value) => /\bAI Admin\b/i.test(value))).toEqual([]);
  });

  it("contains no user-facing Template or Entreprise copy in French", () => {
    const values = leafValues(fr).map((value) =>
      value.replace(/\{\{[^}]+\}\}/g, ""),
    );

    expect(values.filter((value) => /\btemplates?\b/i.test(value))).toEqual([]);
    expect(values.filter((value) => /\bentreprise\b/i.test(value))).toEqual([]);
    expect(values.filter((value) => /frais de frais/i.test(value))).toEqual([]);
  });

  it("uses specific SCREAMING_SNAKE codes in api.errors", () => {
    const codes = flattenKeys(fr.api.errors);

    expect(codes.length).toBeGreaterThan(0);
    codes.forEach((code) => expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/));
  });

  it("does not translate the generic fallback codes", () => {
    for (const errors of [fr.api.errors, en.api.errors]) {
      expect(errors).not.toHaveProperty("BUSINESS_ERROR");
      expect(errors).not.toHaveProperty("RESOURCE_NOT_FOUND");
    }
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
