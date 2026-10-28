import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api, type StatementDraftDto } from "@/api/endpoints";
import type { SignatureDto } from "@/api/types";
import i18n from "@/i18n";
import { draftScopeKey, useStatementDraft } from "@/state/statementDraft";
import { useToasts } from "@/state/toasts";
import { GenerateExpenseStatementPage } from "@/pages/expense-statement/GenerateExpenseStatementPage";

let signatureList: SignatureDto[] = [];
let signatureError: Error | null = null;
let signaturePending = false;
let companiesError: Error | null = null;
let companyRows: Array<{ id: number; name: string; proRataBase?: string }> = [];
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
let savedStatementDraft: StatementDraftDto | null = null;
let lastPreviewLoader: ((signal: AbortSignal) => Promise<unknown>) | null =
  null;

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
    drafts: {
      getStatement: vi.fn(),
      saveStatement: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useCompanies: () => ({
      data: companyRows,
      isError: companiesError !== null,
      isSuccess: companiesError === null,
      error: companiesError,
      isPending: false,
      refetch: vi.fn(),
    }),
    useEmployees: () => ({
      data: [
        {
          id: 9,
          companyId: 1,
          firstName: "Camille",
          lastName: "Martin",
          title: "CEO",
        },
      ],
      isError: false,
      error: null,
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
    useSavedStatementDraft: () => ({
      data: savedStatementDraft,
      isPending: false,
    }),
    useSignatures: (personId: number | null) => ({
      data:
        personId === null
          ? []
          : signatureList.filter(
              (signature) => signature.personId === personId,
            ),
      isPending: signaturePending,
      isError: signatureError !== null,
      error: signatureError,
      refetch: vi.fn(),
    }),
  };
});

const MONTH = "2026-01";
const SCOPE = draftScopeKey(1, MONTH);

const LANDLORD: SignatureDto = {
  id: 3,
  personId: 3,
  personName: "M. Bailleur",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const CEO: SignatureDto = {
  id: 4,
  personId: 9,
  personName: "Camille Martin",
  name: "Gérant",
  mimeType: "image/jpeg",
  createdAt: "2026-10-23T10:00:00Z",
};

const CEO_V2: SignatureDto = {
  id: 5,
  personId: 9,
  personName: "Camille Martin",
  name: "Gérant 2026",
  mimeType: "image/jpeg",
  createdAt: "2026-10-23T10:00:00Z",
};

function renderPage(
  initialEntry: { pathname: string; state?: unknown } = {
    pathname: "/generer/note-frais",
  },
) {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <GenerateExpenseStatementPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function setMobile(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

describe("GenerateExpenseStatementPage signatures", () => {
  beforeEach(() => {
    lastPreviewLoader = null;
    setMobile(false);
    signatureList = [LANDLORD, CEO, CEO_V2];
    signatureError = null;
    signaturePending = false;
    companiesError = null;
    expenseItemsError = null;
    companyRows = [{ id: 1, name: "HKOF", proRataBase: "100.00" }];
    templatesData = [];
    rentReceiptData = null;
    activeStatementData = null;
    savedStatementDraft = null;
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
    vi.mocked(api.drafts.saveStatement).mockReset();
    vi.mocked(api.drafts.saveStatement).mockResolvedValue({
      id: 90,
      companyId: 1,
      month: MONTH,
      complete: true,
      lines: [],
      savedAt: "2026-01-15T10:30:00Z",
    });
    vi.mocked(api.drafts.delete).mockReset();
    vi.mocked(api.drafts.delete).mockResolvedValue(undefined);
    vi.mocked(downloadBlob).mockReset();

    useStatementDraft.setState({
      month: MONTH,
      companyId: 1,
      linesByMonth: {
        [SCOPE]: [
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
      dirtyByMonth: { [SCOPE]: true },
    });
  });

  it("defaults to the CEO employee signature and sends signatureId to the preview and the generation", async () => {
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

  it("lists only the CEO signatures and refreshes the preview with the newly selected one", async () => {
    renderPage();

    const select = await screen.findByLabelText("Signature");
    expect(select).toHaveValue("4");
    const options = Array.from(
      select.querySelectorAll<HTMLOptionElement>("option"),
    ).map((option) => option.value);
    expect(options).toEqual(["4", "5"]);

    await userEvent.setup().selectOptions(select, "5");
    expect(select).toHaveValue("5");

    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.expenseStatements.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ signatureId: 5 }),
      expect.anything(),
    );
  });

  it("warns and blocks generation when the CEO has no signature", async () => {
    signatureList = [];

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-cy", "alerte-signature-manquante");
    expect(alert).toHaveTextContent(/Aucune signature pour le PDG/);
    expect(screen.getByRole("link", { name: "Société" })).toHaveAttribute(
      "href",
      "/configuration/entreprise",
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
    expect(screen.queryByText(/Aucune signature pour le PDG/)).toBeNull();

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

  it("shows the receipt, supplier, AI badge and claimed amount of a line", async () => {
    vi.mocked(api.expenseStatements.calculate).mockResolvedValue({
      total: "80.00",
      lines: [{ itemCode: "gaz", itemLabel: "Gaz", claimedAmount: "80.00" }],
    });
    useStatementDraft.setState({
      month: MONTH,
      companyId: 1,
      linesByMonth: {
        [SCOPE]: [
          {
            key: "line-gaz",
            itemCode: "gaz",
            amountInclVat: "80.00",
            proRataPct: "100",
            receiptId: 5,
            receiptName: "facture-edf.pdf",
            amountSource: "AI",
            aiDetectedAmount: "80.00",
            aiConfidence: "haute",
            detectedSupplier: "EDF",
          },
        ],
      },
      templatesByMonth: {},
      completeByMonth: {},
      primedReceiptByMonth: {},
      dirtyByMonth: { [SCOPE]: true },
    });
    renderPage();

    expect(await screen.findByText("facture-edf.pdf")).toBeVisible();
    expect(screen.getByText("EDF")).toBeVisible();
    expect(screen.getByText("AI")).toBeVisible();
    expect(
      screen.getByLabelText("Voir le justificatif de Gaz"),
    ).toHaveAttribute("href", "/api/receipts/5/file");
    await waitFor(() =>
      expect(screen.getAllByText(/80,00/).length).toBeGreaterThanOrEqual(2),
    );
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
      companyId: 1,
      linesByMonth: { [SCOPE]: [] },
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

  it("shows the company chip and the editor when only one company exists", () => {
    renderPage();

    expect(
      document.querySelector('[data-cy="societe-note-frais"]'),
    ).toHaveTextContent("HKOF");
    expect(
      screen.queryByRole("combobox", { name: "Société concernée" }),
    ).toBeNull();
    expect(screen.getByLabelText("Type de frais")).toBeVisible();
  });

  it("shows an empty state with a settings link when no company exists", () => {
    companyRows = [];
    renderPage();

    expect(screen.getByText("Aucune société configurée")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Configurer une société" }),
    ).toHaveAttribute("href", "/configuration/entreprise");
    expect(screen.queryByLabelText("Type de frais")).toBeNull();
  });

  it("requires an explicit company before rendering the panes", async () => {
    companyRows = [
      { id: 1, name: "HKOF" },
      { id: 2, name: "Autre SARL" },
    ];
    renderPage();

    const select = screen.getByRole("combobox", {
      name: "Société concernée",
    });
    expect(select).toHaveValue("");
    expect(
      within(select).getByRole("option", { name: "Choisir une société" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Type de frais")).toBeNull();

    await userEvent.setup().selectOptions(select, "2");

    expect(await screen.findByLabelText("Type de frais")).toBeVisible();
    expect(useStatementDraft.getState().companyId).toBe(2);
  });

  it("opens the company carried by the History reload", async () => {
    companyRows = [
      { id: 1, name: "HKOF" },
      { id: 2, name: "Autre SARL" },
    ];
    renderPage({
      pathname: "/generer/note-frais",
      state: { companyId: 2 },
    });

    await waitFor(() => expect(useStatementDraft.getState().companyId).toBe(2));
    expect(
      screen.getByRole("combobox", { name: "Société concernée" }),
    ).toHaveValue("2");
    expect(screen.getByLabelText("Type de frais")).toBeVisible();
  });

  it("shows the company and expense item loading errors with retries", async () => {
    companiesError = new Error("Configuration indisponible");
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
    expect(screen.queryByText(/Aucune signature pour le PDG/)).toBeNull();
  });

  it("selects a template and toggles the complete preview", async () => {
    templatesData = [{ id: 7, name: "Modèle", version: 2 }];
    renderPage();
    const user = userEvent.setup();

    const template = screen.getByLabelText("Modèle de la note de frais");
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

  it("keeps one header month control that updates the month", () => {
    renderPage();

    const monthInputs = document.querySelectorAll('[data-cy="select-mois"]');
    expect(monthInputs).toHaveLength(1);
    const month = screen.getByLabelText("Mois concerné");
    expect(month).toBeVisible();
    expect(month).toHaveValue(MONTH);
    expect(screen.queryByText("Janvier 2026")).toBeNull();

    fireEvent.change(month, { target: { value: "2026-02" } });

    expect(useStatementDraft.getState().month).toBe("2026-02");
    expect(month).toHaveValue("2026-02");
    expect(screen.queryByText("Février 2026")).toBeNull();
    expect(screen.getByText("Aucun frais pour Février 2026")).toBeVisible();
  });

  it("removes the technical generation copy", () => {
    renderPage();

    expect(screen.queryByText(/Calcul backend/)).toBeNull();
    expect(screen.queryByText(/recalcul automatique/)).toBeNull();
    expect(
      screen.getByText(
        "Montants recalculés automatiquement à chaque modification.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Estimation d’affichage : chaque ligne est recalculée avec arrondi au centime.",
      ),
    ).toBeVisible();
  });

  it("switches between the mobile input and preview panels", async () => {
    setMobile(true);
    renderPage();
    const user = userEvent.setup();

    const previewTab = screen.getByRole("tab", { name: "Aperçu" });
    expect(previewTab).toHaveAttribute("id", "expense-view-tab-preview");
    expect(previewTab).toHaveAttribute(
      "aria-controls",
      "expense-preview-panel",
    );
    expect(document.querySelector('[data-cy="volet-saisie"]')).toHaveAttribute(
      "id",
      "expense-input-panel",
    );
    expect(document.querySelector('[data-cy="volet-apercu"]')).toHaveAttribute(
      "id",
      "expense-preview-panel",
    );

    await user.click(previewTab);
    expect(previewTab).toHaveAttribute("aria-selected", "true");
    expect(document.querySelector('[data-cy="volet-apercu"]')).toHaveAttribute(
      "role",
      "tabpanel",
    );
    expect(document.querySelector('[data-cy="volet-apercu"]')).toHaveAttribute(
      "aria-labelledby",
      "expense-view-tab-preview",
    );

    await user.click(screen.getByRole("tab", { name: "Saisie" }));
    expect(screen.getByRole("tab", { name: "Saisie" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders the page, lines, dialogs, result and toasts in English", async () => {
    await i18n.changeLanguage("en");
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("Home-office expense statement")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "This month's rent receipt" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "Input" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Preview" })).toBeVisible();
    expect(screen.getByText("Added expenses")).toBeVisible();
    expect(screen.getByText("1 line")).toBeVisible();
    expect(screen.getByText("Retained total")).toBeVisible();

    const generate = screen.getByRole("button", {
      name: "Generate the expense statement",
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await user.click(generate);

    expect(
      await screen.findByText("Expense statement generated"),
    ).toBeVisible();
    expect(
      useToasts.getState().toasts.map((element) => element.message),
    ).toContain("Expense statement for January 2026 generated as version 1.");

    await user.click(screen.getByRole("button", { name: "Remove Gaz" }));
    const dialog = screen.getByRole("dialog", {
      name: "Remove this expense?",
    });
    expect(
      within(dialog).getByText(/The line “Gaz” will be removed/),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(
      useToasts.getState().toasts.map((element) => element.message),
    ).toContain("Expense removed.");
    expect(screen.getByText("No expense for January 2026")).toBeVisible();
  });

  it("shows the empty draft status and saves the current lines", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Aucun brouillon enregistré")).toBeVisible();
    const save = screen.getByRole("button", {
      name: "Enregistrer le brouillon",
    });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);

    await waitFor(() =>
      expect(api.drafts.saveStatement).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 1,
          month: MONTH,
          complete: true,
          lines: [
            expect.objectContaining({
              itemCode: "gaz",
              amountInclVat: "80.00",
            }),
          ],
        }),
      ),
    );
    await waitFor(() =>
      expect(useStatementDraft.getState().savedAtByMonth[SCOPE]).toBe(
        "2026-01-15T10:30:00Z",
      ),
    );
    expect(
      useToasts.getState().toasts.map((element) => element.message),
    ).toContain("Brouillon enregistré.");
  });

  it("shows the saved timestamp and reloads the saved draft lines", async () => {
    savedStatementDraft = {
      id: 91,
      companyId: 1,
      month: MONTH,
      templateId: 7,
      complete: false,
      savedAt: "2026-01-10T09:00:00Z",
      lines: [
        {
          itemCode: "loyer",
          amountInclVat: "950.00",
          proRataPct: "100",
          amountSource: "MANUAL",
        },
      ],
    };

    renderPage();

    expect(await screen.findByText(/Brouillon enregistré le/)).toBeVisible();
    expect(
      await screen.findByRole("button", { name: "Modifier Loyer" }),
    ).toBeVisible();
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(useStatementDraft.getState().dirtyByMonth[SCOPE]).toBe(false);
    expect(useStatementDraft.getState().draftIdByMonth[SCOPE]).toBe(91);
  });

  it("deletes the saved draft after generating the statement", async () => {
    useStatementDraft.setState({
      draftIdByMonth: { [SCOPE]: 80 },
      savedAtByMonth: { [SCOPE]: "2026-01-10T09:00:00Z" },
    });
    renderPage();
    const user = userEvent.setup();

    const generate = await screen.findByRole("button", {
      name: /Générer la note de frais/,
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await user.click(generate);

    await waitFor(() =>
      expect(api.expenseStatements.create).toHaveBeenCalled(),
    );
    expect(api.drafts.delete).not.toHaveBeenCalled();
    expect(useStatementDraft.getState().draftIdByMonth[SCOPE]).toBeNull();
    expect(useStatementDraft.getState().savedAtByMonth[SCOPE]).toBeNull();
  });

  it("disables the draft save button while a save is in flight", async () => {
    let resolveSave: (value: StatementDraftDto) => void = () => undefined;
    vi.mocked(api.drafts.saveStatement).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    renderPage();
    const save = await screen.findByRole("button", {
      name: "Enregistrer le brouillon",
    });
    await waitFor(() => expect(save).toBeEnabled());
    const user = userEvent.setup();
    await user.click(save);

    await waitFor(() => expect(save).toBeDisabled());

    resolveSave({
      id: 90,
      companyId: 1,
      month: MONTH,
      complete: true,
      lines: [],
      savedAt: "2026-01-15T10:30:00Z",
    });
    await waitFor(() => expect(save).toBeEnabled());
  });
});
