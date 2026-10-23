import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import type { SignatureDto } from "@/api/types";
import { useStatementDraft } from "@/state/statementDraft";
import { GenerateExpenseStatementPage } from "@/pages/expense-statement/GenerateExpenseStatementPage";

let signatureList: SignatureDto[] = [];
let signatureError: Error | null = null;
let signaturePending = false;
let settingsError: Error | null = null;
let expenseItemsError: Error | null = null;
let templatesData: Array<{ id: number; name: string; version: number }> = [];
let rentReceiptData: {
  id?: number;
  total?: string;
  version?: number;
} | null = null;
let activeStatementData: {
  id?: number;
  month?: string;
  version?: number;
  total?: string;
} | null = null;
let lastPreviewLoader:
  | ((signal: AbortSignal) => Promise<unknown>)
  | null = null;

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: ({ actions }: { actions?: ReactNode }) => (
    <div data-testid="pdf-viewer">{actions}</div>
  ),
}));

vi.mock("@/hooks/usePdfPreview", () => ({
  usePdfPreview: (load: (signal: AbortSignal) => Promise<unknown>) => {
    lastPreviewLoader = load;
    return {
      url: null,
      loading: false,
      error: null,
      updatedAt: null,
      refresh: () => undefined,
      download: () => undefined,
    };
  },
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return {
    ...actual,
    downloadBlob: vi.fn(),
  };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    expenseStatements: {
      calculate: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      pdf: vi.fn(),
      pdfUrl: (id: number, complete: boolean) =>
        `/api/expense-statements/${id}/pdf?complete=${complete}`,
      zip: vi.fn(),
      zipUrl: (id: number) => `/api/expense-statements/${id}/zip`,
    },
    receipts: {
      fileUrl: (id: number) => `/api/receipts/${id}/file`,
      upload: vi.fn(),
      delete: vi.fn(),
    },
    rentReceipts: {
      pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useSettings: () => ({
      data: {
        proRataBase: "100.00",
        proRataBaseDetail: "Surface professionnelle / surface totale",
      },
      isError: settingsError !== null,
      error: settingsError,
      isPending: false,
      refetch: vi.fn(),
    }),
    useExpenseItems: () => ({
      data: [
        {
          code: "loyer",
          label: "Loyer",
          sortOrder: 0,
          active: true,
          multipleLinesAllowed: false,
          proRataPct: "100",
        },
        {
          code: "gaz",
          label: "Gaz",
          sortOrder: 1,
          active: true,
          multipleLinesAllowed: true,
          proRataPct: "100",
        },
      ],
      isError: expenseItemsError !== null,
      error: expenseItemsError,
      isPending: false,
      refetch: vi.fn(),
    }),
    useTemplates: () => ({ data: templatesData, isPending: false }),
    useActiveRentReceipt: () => ({
      data: rentReceiptData,
      isPending: false,
    }),
    useActiveStatement: () => ({
      data: activeStatementData,
      isPending: false,
    }),
    useSignatures: () => ({
      data: signatureList,
      isPending: signaturePending,
      isError: signatureError !== null,
      error: signatureError,
      refetch: vi.fn(),
    }),
  };
});

const MONTH = "2026-01";

const LANDLORD: SignatureDto = {
  id: 3,
  type: "LANDLORD",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const CEO: SignatureDto = {
  id: 4,
  type: "ENTREPRISE_CEO",
  name: "Gérant",
  mimeType: "image/jpeg",
  createdAt: "2026-10-23T10:00:00Z",
};

function renderPage() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GenerateExpenseStatementPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("GenerateExpenseStatementPage signatures", () => {
  beforeEach(() => {
    lastPreviewLoader = null;
    signatureList = [LANDLORD, CEO];
    signatureError = null;
    signaturePending = false;
    settingsError = null;
    expenseItemsError = null;
    templatesData = [];
    rentReceiptData = null;
    activeStatementData = null;
    vi.mocked(api.expenseStatements.calculate).mockReset();
    vi.mocked(api.expenseStatements.calculate).mockResolvedValue({
      total: "80.00",
      lines: [],
    });
    vi.mocked(api.expenseStatements.preview).mockReset();
    vi.mocked(api.expenseStatements.preview).mockResolvedValue({
      blob: new Blob(),
      fileName: null,
    });
    vi.mocked(api.expenseStatements.create).mockReset();
    vi.mocked(api.expenseStatements.create).mockResolvedValue({
      id: 12,
      month: MONTH,
      version: 1,
      total: "80.00",
    });
    vi.mocked(api.expenseStatements.pdf).mockReset();
    vi.mocked(api.expenseStatements.pdf).mockResolvedValue({
      blob: new Blob(),
      fileName: null,
    });
    vi.mocked(api.expenseStatements.zip).mockReset();
    vi.mocked(api.expenseStatements.zip).mockResolvedValue({
      blob: new Blob(),
      fileName: null,
    });
    vi.mocked(downloadBlob).mockReset();

    useStatementDraft.setState({
      month: MONTH,
      linesByMonth: {
        [MONTH]: [
          {
            key: "line-gaz",
            itemCode: "gaz",
            amountInclVat: "80.00",
            proRataPct: "100",
            receiptId: null,
            receiptName: null,
            amountSource: "MANUAL",
            aiDetectedAmount: null,
            aiConfidence: null,
            detectedSupplier: null,
          },
        ],
      },
      templatesByMonth: {},
      completeByMonth: {},
      primedReceiptByMonth: {},
      dirtyByMonth: { [MONTH]: true },
    });
  });

  it("defaults to the ENTREPRISE_CEO signature and sends signatureId to the preview and the generation", async () => {
    renderPage();

    const select = await screen.findByLabelText("Signature");
    expect(select).toHaveValue("4");

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.expenseStatements.preview).toHaveBeenCalledWith(
      expect.objectContaining({ signatureId: 4 }),
      expect.anything(),
    );

    await waitFor(() =>
      expect(api.expenseStatements.calculate).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Générer la note de frais/ }),
      ).toBeEnabled(),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Générer la note de frais/ }));

    await waitFor(() =>
      expect(api.expenseStatements.create).toHaveBeenCalledWith(
        expect.objectContaining({ signatureId: 4 }),
      ),
    );
  });

  it("refreshes the preview with the newly selected signature", async () => {
    renderPage();

    const select = await screen.findByLabelText("Signature");
    expect(select).toHaveValue("4");

    await userEvent.setup().selectOptions(select, "3");
    expect(select).toHaveValue("3");

    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.expenseStatements.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ signatureId: 3 }),
      expect.anything(),
    );
  });

  it("warns and blocks generation when no signature is configured", async () => {
    signatureList = [];

    renderPage();

    expect(
      await screen.findByText(/Aucune signature trouvée/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Paramètres" })).toHaveAttribute(
      "href",
      "/configuration",
    );

    await waitFor(() =>
      expect(api.expenseStatements.calculate).toHaveBeenCalled(),
    );
    expect(
      screen.getByRole("button", { name: /Générer la note de frais/ }),
    ).toBeDisabled();
    expect(api.expenseStatements.create).not.toHaveBeenCalled();
  });

  it("shows a French error and blocks generation when the signatures fail to load", async () => {
    signatureError = new Error("Service indisponible");
    signatureList = [];

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-cy", "alerte-signatures-erreur");
    expect(alert).toHaveTextContent(
      "Les signatures n’ont pas pu être chargées : Service indisponible",
    );
    expect(screen.queryByText(/Aucune signature trouvée/)).toBeNull();

    await waitFor(() =>
      expect(api.expenseStatements.calculate).toHaveBeenCalled(),
    );
    expect(
      screen.getByRole("button", { name: /Générer la note de frais/ }),
    ).toBeDisabled();
    expect(api.expenseStatements.create).not.toHaveBeenCalled();
  });

  it("downloads the note-only PDF or the complete ZIP depending on the button", async () => {
    const user = userEvent.setup();
    renderPage();

    const generate = await screen.findByRole("button", {
      name: /Générer la note de frais/,
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await user.click(generate);
    await screen.findByText("Note de frais générée");

    await user.click(
      screen.getByRole("button", { name: "Télécharger la note seule" }),
    );
    await waitFor(() =>
      expect(api.expenseStatements.pdf).toHaveBeenCalledWith(12, false),
    );
    expect(api.expenseStatements.zip).not.toHaveBeenCalled();
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "note_frais_2026-01.pdf",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Télécharger la note complète (ZIP)",
      }),
    );
    await waitFor(() =>
      expect(api.expenseStatements.zip).toHaveBeenCalledWith(12),
    );
    expect(api.expenseStatements.pdf).toHaveBeenCalledTimes(1);
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "note_frais_2026-01_complet.zip",
    );
  });

  it("adds a rent line from the active receipt, then edits and cancels it", async () => {
    rentReceiptData = { id: 5, total: "950.00", version: 3 };
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Type de frais"), "loyer");
    expect(screen.getByText(/Quittance de Janvier 2026 \(v3\)/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Voir le PDF" })).toHaveAttribute(
      "href",
      "/api/rent-receipts/5/pdf",
    );
    expect(screen.getByLabelText("Montant TTC")).toHaveAttribute("readonly");

    await user.click(screen.getByRole("button", { name: "Ajouter ce frais" }));
    expect(
      await screen.findByRole("button", { name: "Modifier Loyer" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Modifier Loyer" }));
    expect(
      screen.getByRole("heading", { name: "Modifier le frais" }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Annuler la modification" }),
    );
    expect(
      screen.getByRole("heading", { name: "Nouveau frais" }),
    ).toBeVisible();
  });

  it("warns when the rent type is chosen without a receipt of the month", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Type de frais"), "loyer");

    expect(screen.getByText("Aucune quittance pour ce mois")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter ce frais" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );
  });

  it("blocks a non-rent expense without a receipt", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Type de frais"), "gaz");
    await user.type(screen.getByLabelText("Montant TTC"), "80");
    expect(
      screen.getByRole("button", { name: "Ajouter ce frais" }),
    ).toBeDisabled();
  });

  it("removes a draft line after confirmation", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Supprimer Gaz" }));
    const dialog = screen.getByRole("dialog", {
      name: "Supprimer ce frais ?",
    });
    expect(
      within(dialog).getByText(/La ligne « Gaz » sera retirée/),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Supprimer" }));

    expect(screen.getByText("Aucun frais pour Janvier 2026")).toBeVisible();
  });

  it("shows the active statement banner and creates the next version", async () => {
    activeStatementData = {
      id: 8,
      month: MONTH,
      version: 2,
      total: "80.00",
    };
    renderPage();
    const user = userEvent.setup();

    expect(
      screen.getByText(/Janvier 2026 — note version 2 déjà active/),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Ouvrir" })).toHaveAttribute(
      "href",
      "/api/expense-statements/8/pdf?complete=false",
    );
    expect(
      screen.getByRole("link", { name: "Version complète" }),
    ).toHaveAttribute("href", "/api/expense-statements/8/pdf?complete=true");
    expect(
      await screen.findByText(/Une version 2 existe : la version 3 sera créée/),
    ).toBeVisible();

    const generate = screen.getByRole("button", {
      name: /Générer la note de frais/,
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await user.click(generate);

    const dialog = screen.getByRole("dialog", {
      name: "Générer une nouvelle version ?",
    });
    await user.click(
      within(dialog).getByRole("button", {
        name: "Créer la nouvelle version",
      }),
    );

    await waitFor(() =>
      expect(api.expenseStatements.create).toHaveBeenCalled(),
    );
  });

  it("shows the empty draft messages", () => {
    useStatementDraft.setState({
      month: MONTH,
      linesByMonth: { [MONTH]: [] },
      templatesByMonth: {},
      completeByMonth: {},
      primedReceiptByMonth: {},
      dirtyByMonth: {},
    });

    renderPage();

    expect(screen.getByText("Aucun frais pour Janvier 2026")).toBeVisible();
    expect(
      screen.getByText("Ajoutez au moins un frais pour générer la note."),
    ).toBeVisible();
  });

  it("shows the settings and expense item loading errors with retries", async () => {
    settingsError = new Error("Configuration indisponible");
    expenseItemsError = new Error("Postes indisponibles");
    renderPage();

    expect(screen.getByText("Configuration indisponible")).toBeVisible();
    expect(screen.getByText("Postes indisponibles")).toBeVisible();

    const retries = screen.getAllByRole("button", { name: "Réessayer" });
    expect(retries).toHaveLength(2);
    for (const retry of retries) {
      await userEvent.setup().click(retry);
    }
  });

  it("disables the signature select while signatures are loading", () => {
    signatureList = [];
    signaturePending = true;
    renderPage();

    expect(screen.getByLabelText("Signature")).toBeDisabled();
    expect(screen.queryByText(/Aucune signature trouvée/)).toBeNull();
  });

  it("selects a template and toggles the complete preview", async () => {
    templatesData = [{ id: 7, name: "Modèle", version: 2 }];
    renderPage();
    const user = userEvent.setup();

    const template = screen.getByLabelText("Template de la note de frais");
    expect(template).toBeEnabled();
    expect(
      within(template).getByRole("option", { name: "Modèle — v2" }),
    ).toBeInTheDocument();

    await user.selectOptions(template, "7");
    expect(template).toHaveValue("7");

    const complete = screen.getByRole("checkbox");
    await user.click(complete);
    expect(complete).not.toBeChecked();
    await user.click(complete);
    expect(complete).toBeChecked();
  });

  it("reports a backend calculation failure", async () => {
    vi.mocked(api.expenseStatements.calculate).mockRejectedValue(
      new Error("Backend indisponible"),
    );

    renderPage();

    expect(
      await screen.findByText("Calcul indisponible : Backend indisponible"),
    ).toBeVisible();
  });

  it("switches between the mobile input and preview panels", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Aperçu" }));
    expect(screen.getByRole("tab", { name: "Aperçu" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(screen.getByRole("tab", { name: "Saisie" }));
    expect(screen.getByRole("tab", { name: "Saisie" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
