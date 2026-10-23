import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import { useToasts } from "@/state/toasts";
import { TemplatesPage } from "./TemplatesPage";

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TemplatesPage />
    </QueryClientProvider>,
  );
}

function cardFor(title: string): HTMLElement {
  const card = screen.getByRole("heading", { name: title }).closest("section");
  if (!card) {
    throw new Error(`Card ${title} not found`);
  }
  return card;
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
  createObjectURL.mockReturnValue("blob:apercu-template");
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

describe("TemplatesPage", () => {
  it("renders the active model, previous versions and the variable reference", async () => {
    renderPage();

    const rent = cardFor("Quittance de loyer");
    expect(within(rent).getAllByText("Quittance 2026").length).toBeGreaterThan(0);
    expect(within(rent).getAllByText("v3").length).toBeGreaterThan(0);
    expect(within(rent).getAllByText("intégré").length).toBeGreaterThan(0);
    expect(within(rent).getByText("3 versions")).toBeInTheDocument();
    expect(
      within(rent).getByText("Référence des variables"),
    ).toBeInTheDocument();
    expect(within(rent).getByText("{{montant}}")).toBeInTheDocument();
    expect(within(rent).getByText("requis")).toBeInTheDocument();

    const expense = cardFor("Note de frais d’occupation");
    expect(within(expense).getByText("Aucune version précédente archivée.")).toBeInTheDocument();
    expect(within(expense).getByText("1 version")).toBeInTheDocument();
  });

  it("shows the loading and error states of the template list", async () => {
    templatesPending = true;
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <TemplatesPage />
      </QueryClientProvider>,
    );
    expect(screen.getAllByText("Chargement des modèles…").length).toBe(2);
    unmount();

    templatesPending = false;
    templatesError = new Error("Service indisponible");
    renderPage();
    expect(
      screen.getAllByText("Impossible de charger les données").length,
    ).toBe(2);
    expect(screen.getAllByText("Service indisponible").length).toBe(2);

    await userEvent.setup().click(
      screen.getAllByRole("button", { name: "Réessayer" })[0],
    );
    expect(refetch).toHaveBeenCalled();
  });

  it("downloads the built-in model of both document types", async () => {
    const user = userEvent.setup();
    renderPage();

    const rent = cardFor("Quittance de loyer");
    await user.click(
      within(rent).getByRole("button", {
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

    const expense = cardFor("Note de frais d’occupation");
    await user.click(
      within(expense).getByRole("button", {
        name: "Télécharger le modèle par défaut intégré",
      }),
    );
    await waitFor(() =>
      expect(api.templates.getDefault).toHaveBeenLastCalledWith(
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
    renderPage();

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
    await waitFor(() =>
      expect(api.templates.activate).toHaveBeenCalledWith(2),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toastMessages()).toContain(
      "Le modèle « Quittance archivée » v2 est désormais actif.",
    );
  });

  it("closes the preview with Escape and the close button", async () => {
    const user = userEvent.setup();
    renderPage();

    const activePreview = within(cardFor("Quittance de loyer")).getAllByRole(
      "button",
      { name: "Aperçu" },
    )[0];
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
    renderPage();

    const rent = cardFor("Quittance de loyer");
    const file = new File(["<html></html>"], "modele.html", {
      type: "text/html",
    });
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier template HTML"),
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
    expect(await within(rent).findByText("Rapport de validation")).toBeInTheDocument();
    expect(within(rent).getByText("Structure valide")).toBeInTheDocument();
    expect(within(rent).getByText("inconnu")).toBeInTheDocument();
    expect(within(rent).getByText("locataire")).toBeInTheDocument();
    expect(within(rent).getByText("Balise script interdite.")).toBeInTheDocument();
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
    renderPage();

    const rent = cardFor("Quittance de loyer");
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier template HTML"),
      new File(["<html></html>"], "modele.html", { type: "text/html" }),
    );
    await user.click(
      within(rent).getByRole("button", { name: "Valider et importer" }),
    );
    await within(rent).findByText("Rapport de validation");

    await user.click(
      within(rent).getByRole("button", { name: "Aperçu de la version v5" }),
    );
    await waitFor(() =>
      expect(api.templates.preview).toHaveBeenCalledWith(21),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("surfaces an import refusal without a report", async () => {
    vi.mocked(api.templates.upload).mockRejectedValue(
      new Error("Le fichier contient un script interdit."),
    );

    const user = userEvent.setup();
    renderPage();

    const rent = cardFor("Quittance de loyer");
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier template HTML"),
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
    renderPage();

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

  it("keeps the active and built-in versions undeletable", async () => {
    renderPage();

    const rent = cardFor("Quittance de loyer");
    const rows = within(rent).getAllByRole("listitem");
    const activeRow = rows.find((row) => row.textContent?.includes("Quittance 2026"));
    const builtInRow = rows.find((row) => row.textContent?.includes("Quittance intégrée"));
    if (!activeRow || !builtInRow) {
      throw new Error("Version rows not found");
    }
    expect(within(activeRow).getByRole("button", { name: "Supprimer" })).toBeDisabled();
    expect(within(builtInRow).getByRole("button", { name: "Supprimer" })).toBeDisabled();
  });

  it("reports a deletion failure through a toast and closes the dialog", async () => {
    vi.mocked(api.templates.delete).mockRejectedValue(new Error("Suppression refusée"));
    const user = userEvent.setup();
    renderPage();

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

    await waitFor(() => expect(toastMessages()).toContain("Suppression refusée"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("restores the built-in model after confirmation", async () => {
    vi.mocked(api.templates.resetDefault).mockResolvedValue({
      ...RENT_BUILT_IN,
      version: 6,
      active: true,
    });
    const user = userEvent.setup();
    renderPage();

    const rent = cardFor("Quittance de loyer");
    await user.click(
      within(rent).getByRole("button", { name: "Revenir au modèle par défaut" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Revenir au modèle par défaut ?",
    });
    expect(dialog).toHaveTextContent(/Le modèle intégré « Quittance intégrée »/);
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
    templatesByType.RENT_RECEIPT = [RENT_OLD];
    vi.mocked(api.templates.resetDefault).mockRejectedValue(
      new Error("Restauration impossible"),
    );
    const user = userEvent.setup();
    renderPage();

    const rent = cardFor("Quittance de loyer");
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
    renderPage();

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
    vi.mocked(api.templates.file).mockRejectedValue(new Error("PDF indisponible"));
    const user = userEvent.setup();
    renderPage();

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
    renderPage();

    const rent = cardFor("Quittance de loyer");
    await user.click(
      within(rent).getByRole("button", {
        name: "Copier la variable montant",
      }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("{{montant}}"),
    );
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
    renderPage();

    const rent = cardFor("Quittance de loyer");
    await user.upload(
      within(rent).getByLabelText("Choisir un fichier template HTML"),
      new File(["<html></html>"], "modele.html", { type: "text/html" }),
    );
    await user.click(
      within(rent).getByRole("button", { name: "Valider et importer" }),
    );

    expect(await within(rent).findByText("Structure invalide")).toBeInTheDocument();
    expect(
      within(rent).getByText(/le modèle sera accepté, mais les champs/),
    ).toBeInTheDocument();
  });
});
