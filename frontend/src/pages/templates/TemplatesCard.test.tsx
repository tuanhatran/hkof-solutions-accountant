import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import type {
  TemplateDto,
  TemplateType,
  TemplateVariableDto,
  ValidationReportDto,
} from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { TemplatesCard } from "./TemplatesCard";
import {
  EXPENSE_STATEMENT_CONFIGURATION,
  RENT_RECEIPT_CONFIGURATION,
  type ConfigurationType,
} from "./templateTypes";

let templatesByType: Record<TemplateType, TemplateDto[]>;
let templatesPending = false;
let templatesError: Error | null = null;
let variablesData: TemplateVariableDto[] = [];
const refetch = vi.fn();

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: () => null,
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, downloadBlob: vi.fn() };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    templates: {
      upload: vi.fn(),
      activate: vi.fn(),
      delete: vi.fn(),
      resetDefault: vi.fn(),
      file: vi.fn(),
      getDefault: vi.fn(),
      preview: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useTemplates: (type: TemplateType) => ({
      data: templatesByType[type],
      isPending: templatesPending,
      isError: templatesError !== null,
      error: templatesError,
      refetch,
    }),
    useTemplateVariables: () => ({
      data: variablesData,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const createObjectURL = vi.fn();
const revokeObjectURL = vi.fn();

const REPORT: ValidationReportDto = {
  structureValid: true,
  recognizedVariables: ["montant", "bailleur"],
  unknownVariables: ["inconnu"],
  missingVariables: ["locataire"],
  errors: ["Balise script interdite."],
};

const RENT_ACTIVE: TemplateDto = {
  id: 1,
  type: "RENT_RECEIPT",
  name: "Quittance 2026",
  version: 3,
  format: "HTML",
  active: true,
  builtIn: false,
  createdAt: "2026-10-20T10:00:00Z",
};

const RENT_OLD: TemplateDto = {
  id: 2,
  type: "RENT_RECEIPT",
  name: "Quittance archivée",
  version: 2,
  format: "HTML",
  active: false,
  builtIn: false,
  createdAt: "2026-09-01T10:00:00Z",
};

const RENT_BUILT_IN: TemplateDto = {
  id: 4,
  type: "RENT_RECEIPT",
  name: "Quittance intégrée",
  version: 1,
  format: "HTML",
  active: false,
  builtIn: true,
  createdAt: "2026-01-01T10:00:00Z",
};

const EXPENSE_ACTIVE: TemplateDto = {
  id: 3,
  type: "EXPENSE_STATEMENT",
  name: "Note de frais",
  version: 1,
  format: "HTML",
  active: true,
  builtIn: true,
  createdAt: "2026-02-01T10:00:00Z",
};

function renderCard(
  configuration: ConfigurationType = RENT_RECEIPT_CONFIGURATION,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TemplatesCard configuration={configuration} />
    </QueryClientProvider>,
  );
}

function card(): HTMLElement {
  const section = document.querySelector("section.templates-card");
  if (!section) {
    throw new Error("Templates card not found");
  }
  return section as HTMLElement;
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  templatesByType = {
    RENT_RECEIPT: [RENT_ACTIVE, RENT_OLD, RENT_BUILT_IN],
    EXPENSE_STATEMENT: [EXPENSE_ACTIVE],
  };
  templatesPending = false;
  templatesError = null;
  variablesData = [
    {
      name: "montant",
      description: "Montant total",
      required: true,
      example: "1 234,56 €",
    },
    { name: "bailleur", description: "Nom du bailleur" },
  ];
  refetch.mockReset();
  vi.mocked(api.templates.upload).mockReset();
  vi.mocked(api.templates.activate).mockReset();
  vi.mocked(api.templates.delete).mockReset();
  vi.mocked(api.templates.resetDefault).mockReset();
  vi.mocked(api.templates.file).mockReset();
  vi.mocked(api.templates.getDefault).mockReset();
  vi.mocked(api.templates.preview).mockReset();
  vi.mocked(api.templates.getDefault).mockResolvedValue({
    blob: new Blob(["default"]),
    fileName: null,
  });
  vi.mocked(api.templates.file).mockResolvedValue({
    blob: new Blob(["file"]),
    fileName: "quittance.html",
  });
  vi.mocked(api.templates.preview).mockResolvedValue({
    blob: new Blob(["preview"]),
    fileName: "apercu.pdf",
  });
  vi.mocked(downloadBlob).mockReset();
  createObjectURL.mockReset();
  revokeObjectURL.mockReset();
  createObjectURL.mockReturnValue("blob:template-preview");
  Object.defineProperty(URL, "createObjectURL", {
    value: createObjectURL,
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revokeObjectURL,
    configurable: true,
  });
  useToasts.setState({ toasts: [] });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TemplatesCard", () => {
  it("renders the rent receipt card only", () => {
    renderCard();

    expect(
      screen.getByRole("heading", { name: "Quittance de loyer" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Note de frais d’occupation" }),
    ).toBeNull();
    expect(
      document.querySelector('[data-cy="dropzone-rent-receipt-template"]'),
    ).not.toBeNull();
  });

  it("renders the active model, previous versions and the variable reference", () => {
    renderCard();

    const rent = card();
    expect(within(rent).getAllByText("Quittance 2026").length).toBeGreaterThan(
      0,
    );
    expect(within(rent).getAllByText("v3").length).toBeGreaterThan(0);
    expect(within(rent).getAllByText("intégré").length).toBeGreaterThan(0);
    expect(within(rent).getByText("3 versions")).toBeInTheDocument();
    expect(
      within(rent).getByText("Référence des variables"),
    ).toBeInTheDocument();
    expect(within(rent).getByText("{{montant}}")).toBeInTheDocument();
    expect(within(rent).getByText("requis")).toBeInTheDocument();
  });

  it("aligns the version header and rows on one shared grid", () => {
    renderCard();

    const header = document.querySelector(
      '[data-cy="template-versions-headers"]',
    );
    if (!(header instanceof HTMLElement)) {
      throw new Error("Version header not found");
    }
    expect(header).toHaveClass(
      "template-versions-grid",
      "template-versions-header",
      "hidden",
      "xl:grid",
    );
    expect(Array.from(header.children).map((cell) => cell.textContent)).toEqual(
      ["", "Modèle", "Version", "Importé le", "Actions"],
    );
    expect(header.children[0]).toHaveAttribute("aria-hidden", "true");

    const rows = within(card()).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row).toHaveClass(
        "template-versions-grid",
        "template-versions-row",
      );
    }

    const archivedRow = screen.getByText("Quittance archivée").closest("li");
    if (!archivedRow) {
      throw new Error("Archived version row not found");
    }
    expect(
      archivedRow.querySelector(".template-versions-list-meta"),
    ).toHaveTextContent("HTML");
    const dateCell = archivedRow.querySelector(".template-versions-list-date");
    if (!(dateCell instanceof HTMLElement)) {
      throw new Error("Imported date cell not found");
    }
    expect(dateCell).toHaveClass("number", "template-versions-number");
    expect(dateCell.textContent).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("renders a comparison checkbox per version without changing the row actions", () => {
    renderCard();

    const archived = screen.getByRole("checkbox", {
      name: "Comparer Quittance archivée v2",
    });
    expect(archived).not.toBeChecked();
    expect(archived).toHaveAttribute("data-cy", "compare-template-2");

    const rows = within(card()).getAllByRole("listitem");
    for (const row of rows) {
      expect(row.children[0]).toHaveClass("template-versions-check");
      expect(within(row as HTMLElement).getByRole("checkbox")).toBeVisible();
    }

    const archivedRow = archived.closest("li");
    if (!archivedRow) {
      throw new Error("Archived version row not found");
    }
    for (const action of ["Aperçu", "Télécharger", "Activer", "Supprimer"]) {
      expect(
        within(archivedRow).getByRole("button", { name: action }),
      ).toBeVisible();
    }
  });

  it("renders the expense statement card when configured for it", () => {
    renderCard(EXPENSE_STATEMENT_CONFIGURATION);

    const expense = card();
    expect(
      within(expense).getByRole("heading", {
        name: "Note de frais d’occupation",
      }),
    ).toBeVisible();
    expect(
      within(expense).getByText("Aucune version précédente archivée."),
    ).toBeInTheDocument();
    expect(within(expense).getByText("1 version")).toBeInTheDocument();
    expect(
      document.querySelector('[data-cy="dropzone-statement-template"]'),
    ).not.toBeNull();
  });

  it("shows the loading and error states of the template list", async () => {
    templatesPending = true;
    const loading = renderCard();
    expect(screen.getByText("Chargement des modèles…")).toBeInTheDocument();
    loading.unmount();

    templatesPending = false;
    templatesError = new Error("Service indisponible");
    renderCard();
    expect(
      screen.getByText("Impossible de charger les données"),
    ).toBeInTheDocument();
    expect(screen.getByText("Service indisponible")).toBeInTheDocument();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("downloads the built-in model of the rent receipt type", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(
      within(card()).getByRole("button", {
        name: "Télécharger le modèle par défaut intégré",
      }),
    );
    await waitFor(() =>
      expect(api.templates.getDefault).toHaveBeenCalledWith("RENT_RECEIPT"),
    );
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "modele-quittance-defaut.html",
    );
  });

  it("downloads the built-in model of the expense statement type", async () => {
    const user = userEvent.setup();
    renderCard(EXPENSE_STATEMENT_CONFIGURATION);

    await user.click(
      within(card()).getByRole("button", {
        name: "Télécharger le modèle par défaut intégré",
      }),
    );
    await waitFor(() =>
      expect(api.templates.getDefault).toHaveBeenCalledWith(
        "EXPENSE_STATEMENT",
      ),
    );
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "modele-note-frais-defaut.html",
    );
  });

  it("previews a version and activates it from the modal", async () => {
    vi.mocked(api.templates.activate).mockResolvedValue({
      ...RENT_OLD,
      active: true,
    });
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Aperçu" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Aperçu — Quittance archivée · v2/,
    });
    expect(api.templates.preview).toHaveBeenCalledWith(2);
    expect(createObjectURL).toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Activer ce modèle" }),
    );
    await waitFor(() => expect(api.templates.activate).toHaveBeenCalledWith(2));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toastMessages()).toContain(
      "Le modèle « Quittance archivée » v2 est désormais actif.",
    );
  });

  it("closes the preview with Escape and the close button", async () => {
    const user = userEvent.setup();
    renderCard();

    const activePreview = within(card()).getAllByRole("button", {
      name: "Aperçu",
    })[0];
    await user.click(activePreview);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    await user.click(activePreview);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Fermer l’aperçu" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("imports a template, displays the report and activates the import", async () => {
    const imported: TemplateDto = {
      id: 20,
      type: "RENT_RECEIPT",
      name: "modele",
      version: 4,
      active: false,
      builtIn: false,
      report: REPORT,
    };
    vi.mocked(api.templates.upload).mockResolvedValue(imported);
    vi.mocked(api.templates.activate).mockResolvedValue({
      ...imported,
      active: true,
    });

    const user = userEvent.setup();
    renderCard();

    const rent = card();
    const file = new File(["<html></html>"], "modele.html", {
      type: "text/html",
    });
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier de modèle HTML"),
      file,
    );
    expect(within(rent).getByText("modele.html")).toBeInTheDocument();

    await user.click(
      within(rent).getByRole("button", { name: "Valider et importer" }),
    );

    await waitFor(() =>
      expect(api.templates.upload).toHaveBeenCalledWith(
        "RENT_RECEIPT",
        "modele",
        file,
      ),
    );
    expect(
      await within(rent).findByText("Rapport de validation"),
    ).toBeInTheDocument();
    expect(within(rent).getByText("Structure valide")).toBeInTheDocument();
    expect(within(rent).getByText("inconnu")).toBeInTheDocument();
    expect(within(rent).getByText("locataire")).toBeInTheDocument();
    expect(
      within(rent).getByText("Balise script interdite."),
    ).toBeInTheDocument();
    expect(toastMessages()).toContain(
      "Version v4 importée. Vérifiez l’aperçu puis activez-la.",
    );

    await user.click(
      within(rent).getByRole("button", { name: "Activer la version v4" }),
    );
    await waitFor(() =>
      expect(api.templates.activate).toHaveBeenCalledWith(20),
    );
  });

  it("previews the freshly imported version", async () => {
    const imported: TemplateDto = {
      id: 21,
      type: "RENT_RECEIPT",
      name: "modele",
      version: 5,
      active: false,
      builtIn: false,
      report: { structureValid: true },
    };
    vi.mocked(api.templates.upload).mockResolvedValue(imported);

    const user = userEvent.setup();
    renderCard();

    const rent = card();
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier de modèle HTML"),
      new File(["<html></html>"], "modele.html", { type: "text/html" }),
    );
    await user.click(
      within(rent).getByRole("button", { name: "Valider et importer" }),
    );
    await within(rent).findByText("Rapport de validation");

    await user.click(
      within(rent).getByRole("button", { name: "Aperçu de la version v5" }),
    );
    await waitFor(() => expect(api.templates.preview).toHaveBeenCalledWith(21));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("surfaces an import refusal without a report", async () => {
    vi.mocked(api.templates.upload).mockRejectedValue(
      new Error("Le fichier contient un script interdit."),
    );

    const user = userEvent.setup();
    renderCard();

    const rent = card();
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier de modèle HTML"),
      new File(["<html></html>"], "modele.html", { type: "text/html" }),
    );
    await user.click(
      within(rent).getByRole("button", { name: "Valider et importer" }),
    );

    expect(
      await within(rent).findByText("Le fichier contient un script interdit."),
    ).toBeInTheDocument();
    expect(within(rent).queryByText("Rapport de validation")).toBeNull();
  });

  it("deletes a previous version after confirmation and supports cancel", async () => {
    vi.mocked(api.templates.delete).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Supprimer" }));

    let dialog = screen.getByRole("dialog", {
      name: "Supprimer cette version ?",
    });
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(within(row).getByRole("button", { name: "Supprimer" }));
    dialog = screen.getByRole("dialog", { name: "Supprimer cette version ?" });
    expect(dialog).toHaveTextContent(/La version v2 de « Quittance archivée »/);
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    await waitFor(() => expect(api.templates.delete).toHaveBeenCalledWith(2));
    expect(toastMessages()).toContain(
      "Version supprimée. Le fichier reste archivé côté stockage.",
    );
  });

  it("keeps the active and built-in versions undeletable", () => {
    renderCard();

    const rows = within(card()).getAllByRole("listitem");
    const activeRow = rows.find((row) =>
      row.textContent?.includes("Quittance 2026"),
    );
    const builtInRow = rows.find((row) =>
      row.textContent?.includes("Quittance intégrée"),
    );
    if (!activeRow || !builtInRow) {
      throw new Error("Version rows not found");
    }
    expect(
      within(activeRow).getByRole("button", { name: "Supprimer" }),
    ).toBeDisabled();
    expect(
      within(builtInRow).getByRole("button", { name: "Supprimer" }),
    ).toBeDisabled();
  });

  it("reports a deletion failure through a toast and closes the dialog", async () => {
    vi.mocked(api.templates.delete).mockRejectedValue(
      new Error("Suppression refusée"),
    );
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Supprimer" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Supprimer",
      }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain("Suppression refusée"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores the built-in model after confirmation", async () => {
    vi.mocked(api.templates.resetDefault).mockResolvedValue({
      ...RENT_BUILT_IN,
      version: 6,
      active: true,
    });
    const user = userEvent.setup();
    renderCard();

    await user.click(
      within(card()).getByRole("button", {
        name: "Revenir au modèle par défaut",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Revenir au modèle par défaut ?",
    });
    expect(dialog).toHaveTextContent(
      /Le modèle intégré « Quittance intégrée »/,
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Restaurer le modèle" }),
    );

    await waitFor(() =>
      expect(api.templates.resetDefault).toHaveBeenCalledWith("RENT_RECEIPT"),
    );
    expect(toastMessages()).toContain(
      "Modèle intégré restauré et activé (v6).",
    );
  });

  it("reports a reset failure and offers restore when no model is active", async () => {
    templatesByType = { ...templatesByType, RENT_RECEIPT: [RENT_OLD] };
    vi.mocked(api.templates.resetDefault).mockRejectedValue(
      new Error("Restauration impossible"),
    );
    const user = userEvent.setup();
    renderCard();

    const rent = card();
    expect(within(rent).getByText("Aucun modèle actif.")).toBeInTheDocument();
    await user.click(
      within(rent).getByRole("button", { name: "Restaurer le modèle intégré" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Revenir au modèle par défaut ?",
    });
    expect(dialog).toHaveTextContent(
      "Le modèle intégré redeviendra actif. Vos versions importées restent disponibles.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Restaurer le modèle" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain("Restauration impossible"),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("downloads a version with a sanitised file name", async () => {
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Télécharger" }));

    await waitFor(() => expect(api.templates.file).toHaveBeenCalledWith(2));
    expect(downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      "Quittance_archivee_v2.html",
    );
  });

  it("reports a version download failure", async () => {
    vi.mocked(api.templates.file).mockRejectedValue(
      new Error("PDF indisponible"),
    );
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Télécharger" }));
    await waitFor(() => expect(toastMessages()).toContain("PDF indisponible"));
  });

  it("copies a variable and reports clipboard failures", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderCard();

    const rent = card();
    await user.click(
      within(rent).getByRole("button", {
        name: "Copier la variable montant",
      }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("{{montant}}"));
    expect(toastMessages()).toContain(
      "{{montant}} copié dans le presse-papiers.",
    );

    writeText.mockRejectedValueOnce(new Error("refusé"));
    await user.click(
      within(rent).getByRole("button", {
        name: "Copier la variable bailleur",
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Impossible de copier dans le presse-papiers. Sélectionnez la variable manuellement.",
      ),
    );
  });

  it("shows a validation warning when only required variables are missing", async () => {
    const imported: TemplateDto = {
      id: 22,
      type: "RENT_RECEIPT",
      name: "modele",
      version: 7,
      active: false,
      builtIn: false,
      report: {
        structureValid: false,
        missingVariables: ["locataire"],
      },
    };
    vi.mocked(api.templates.upload).mockResolvedValue(imported);

    const user = userEvent.setup();
    renderCard();

    const rent = card();
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier de modèle HTML"),
      new File(["<html></html>"], "modele.html", { type: "text/html" }),
    );
    await user.click(
      within(rent).getByRole("button", { name: "Valider et importer" }),
    );

    expect(
      await within(rent).findByText("Structure invalide"),
    ).toBeInTheDocument();
    expect(
      within(rent).getByText(/le modèle sera accepté, mais les champs/),
    ).toBeInTheDocument();
  });

  it("renders the card header in English and relabels the configuration on switch", async () => {
    await i18n.changeLanguage("en");
    renderCard();

    expect(screen.getByRole("heading", { name: "Rent receipt" })).toBeVisible();
    expect(
      screen.getByText("Template used for monthly rent receipts."),
    ).toBeVisible();

    await act(async () => {
      await i18n.changeLanguage("fr");
    });

    expect(
      screen.getByRole("heading", { name: "Quittance de loyer" }),
    ).toBeVisible();
    expect(
      screen.getByText("Modèle utilisé pour les quittances mensuelles."),
    ).toBeVisible();
  });

  it("renders the expense statement configuration in English", async () => {
    await i18n.changeLanguage("en");
    renderCard(EXPENSE_STATEMENT_CONFIGURATION);

    const expense = card();
    expect(
      within(expense).getByRole("heading", {
        name: "Home-office expense statement",
      }),
    ).toBeVisible();
    expect(
      within(expense).getByText(
        "Template used for expense statements and their full version.",
      ),
    ).toBeVisible();
    expect(within(expense).getByText("1 version")).toBeInTheDocument();
    expect(
      within(expense).getByText("No previous archived version."),
    ).toBeInTheDocument();
  });

  it("renders the active model and version list in English", async () => {
    await i18n.changeLanguage("en");
    renderCard();

    const rent = card();
    expect(within(rent).getByText("Active template")).toBeVisible();
    const header = rent.querySelector('[data-cy="template-versions-headers"]');
    if (!(header instanceof HTMLElement)) {
      throw new Error("English version header not found");
    }
    expect(Array.from(header.children).map((cell) => cell.textContent)).toEqual(
      ["", "Template", "Version", "Imported on", "Actions"],
    );
    expect(within(rent).getByText(/imported on/)).toBeVisible();
    expect(within(rent).getAllByText("Built-in").length).toBeGreaterThan(0);
    expect(within(rent).getByText("Active")).toBeVisible();
    expect(within(rent).getByText("3 versions")).toBeVisible();
    expect(
      within(rent).getAllByRole("button", { name: "Preview" }).length,
    ).toBeGreaterThan(0);
    expect(
      within(rent).getAllByRole("button", { name: "Download" }).length,
    ).toBeGreaterThan(0);
    expect(
      within(rent).getAllByRole("button", { name: "Delete" }).length,
    ).toBeGreaterThan(0);
    expect(within(rent).getAllByText("Quittance 2026")).not.toHaveLength(0);
  });

  it("shows the template loading state in English", async () => {
    templatesPending = true;
    await i18n.changeLanguage("en");
    renderCard();

    expect(screen.getByText("Loading templates…")).toBeInTheDocument();
  });

  it("imports a template and displays the validation report in English", async () => {
    const imported: TemplateDto = {
      id: 20,
      type: "RENT_RECEIPT",
      name: "modele",
      version: 4,
      active: false,
      builtIn: false,
      report: REPORT,
    };
    vi.mocked(api.templates.upload).mockResolvedValue(imported);
    vi.mocked(api.templates.activate).mockResolvedValue({
      ...imported,
      active: true,
    });

    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderCard();
    const rent = card();

    expect(within(rent).getByText("Import a new version")).toBeVisible();
    expect(
      within(rent).getByText(/The new template is validated then imported/),
    ).toBeVisible();
    expect(
      within(rent).getByPlaceholderText("e.g. Rent receipt — 2027 version"),
    ).toBeInTheDocument();

    await user.upload(
      within(rent).getByLabelText("Choose an HTML template file"),
      new File(["<html></html>"], "modele.html", { type: "text/html" }),
    );
    await user.click(
      within(rent).getByRole("button", { name: "Validate and import" }),
    );

    expect(
      await within(rent).findByText("Validation report"),
    ).toBeInTheDocument();
    expect(within(rent).getByText("Valid structure")).toBeInTheDocument();
    expect(within(rent).getByText("Recognized variables (2)")).toBeVisible();
    expect(within(rent).getByText("Unknown variables (1)")).toBeVisible();
    expect(
      within(rent).getByText("Missing required variables (1)"),
    ).toBeVisible();
    expect(within(rent).getByText("Errors")).toBeVisible();
    // Server-supplied strings stay verbatim in both languages.
    expect(within(rent).getByText("Balise script interdite.")).toBeVisible();
    expect(within(rent).getByText("inconnu")).toBeVisible();
    expect(toastMessages()).toContain(
      "Version v4 imported. Check the preview then activate it.",
    );
    expect(
      within(rent).getByRole("button", { name: "Preview version v4" }),
    ).toBeVisible();

    await user.click(
      within(rent).getByRole("button", { name: "Activate version v4" }),
    );
    await waitFor(() =>
      expect(api.templates.activate).toHaveBeenCalledWith(20),
    );
    expect(toastMessages()).toContain(
      "The template “modele” v4 is now active.",
    );
  });

  it("deletes a version in English with a translated dialog and toast", async () => {
    vi.mocked(api.templates.delete).mockResolvedValue(undefined);
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog", {
      name: "Delete this version?",
    });
    expect(dialog).toHaveTextContent(
      "Version v2 of “Quittance archivée” will no longer be offered.",
    );
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(api.templates.delete).toHaveBeenCalledWith(2));
    expect(toastMessages()).toContain(
      "Version deleted. The file stays archived in storage.",
    );
  });

  it("previews a version in English and activates it from the modal", async () => {
    vi.mocked(api.templates.activate).mockResolvedValue({
      ...RENT_OLD,
      active: true,
    });
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderCard();

    const row = screen.getByText("Quittance archivée").closest("li");
    if (!row) {
      throw new Error("Version row not found");
    }
    await user.click(within(row).getByRole("button", { name: "Preview" }));

    const dialog = await screen.findByRole("dialog", {
      name: /Preview — Quittance archivée · v2/,
    });
    expect(
      within(dialog).getByText(
        "Sample data · “PREVIEW” watermark · nothing is persisted.",
      ),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Close the preview" }),
    ).toBeVisible();

    await user.click(
      within(dialog).getByRole("button", { name: "Activate this template" }),
    );
    await waitFor(() => expect(api.templates.activate).toHaveBeenCalledWith(2));
    expect(toastMessages()).toContain(
      "The template “Quittance archivée” v2 is now active.",
    );
  });

  it("renders the variable reference in English and toasts in English", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await i18n.changeLanguage("en");
    renderCard(EXPENSE_STATEMENT_CONFIGURATION);
    const expense = card();

    expect(within(expense).getByText("Variable reference")).toBeVisible();
    expect(within(expense).getByText("Show")).toBeInTheDocument();
    expect(within(expense).getByText("Hide")).toBeInTheDocument();
    expect(
      within(expense).getByRole("columnheader", { name: "Variable" }),
    ).toBeInTheDocument();
    expect(
      within(expense).getByRole("columnheader", { name: "Description" }),
    ).toBeInTheDocument();
    expect(
      within(expense).getByRole("columnheader", { name: "Example" }),
    ).toBeInTheDocument();
    expect(
      within(expense).getByRole("columnheader", { name: "Copy" }),
    ).toBeInTheDocument();
    expect(within(expense).getByText("required")).toBeInTheDocument();
    // Server-supplied descriptions and examples stay verbatim.
    expect(within(expense).getByText("Montant total")).toBeInTheDocument();
    expect(within(expense).getByText("1 234,56 €")).toBeInTheDocument();

    const loopNote = expense.querySelector(".reference-variables-loop-note");
    expect(loopNote?.textContent).toContain(
      "Inside the {{#lignes}} loop, the inner variables are written",
    );

    await user.click(
      within(expense).getByRole("button", {
        name: "Copy the montant variable",
      }),
    );
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("{{montant}}"));
    expect(toastMessages()).toContain("{{montant}} copied to the clipboard.");

    writeText.mockRejectedValueOnce(new Error("refusé"));
    await user.click(
      within(expense).getByRole("button", {
        name: "Copy the bailleur variable",
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Unable to copy to the clipboard. Select the variable manually.",
      ),
    );
  });

  it("restores the built-in template in English", async () => {
    vi.mocked(api.templates.resetDefault).mockResolvedValue({
      ...RENT_BUILT_IN,
      version: 6,
      active: true,
    });
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderCard();

    await user.click(
      within(card()).getByRole("button", {
        name: "Revert to the default template",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Revert to the default template?",
    });
    expect(dialog).toHaveTextContent(
      "The built-in template “Quittance intégrée” (v1) will become active again.",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Restore the template" }),
    );

    await waitFor(() =>
      expect(api.templates.resetDefault).toHaveBeenCalledWith("RENT_RECEIPT"),
    );
    expect(toastMessages()).toContain(
      "Built-in template restored and activated (v6).",
    );
  });

  it("offers the built-in restore when no model is active in English", async () => {
    templatesByType = { ...templatesByType, RENT_RECEIPT: [RENT_OLD] };
    await i18n.changeLanguage("en");
    renderCard();

    const rent = card();
    expect(within(rent).getByText("No active template.")).toBeVisible();
    expect(
      within(rent).getByRole("button", {
        name: "Restore the built-in template",
      }),
    ).toBeVisible();
  });
});
