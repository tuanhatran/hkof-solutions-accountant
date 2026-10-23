import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import type { SignatureDto } from "@/api/types";
import { useStatementDraft } from "@/state/statementDraft";
import { GenerateExpenseStatementPage } from "./GenerateExpenseStatementPage";

let signatureList: SignatureDto[] = [];
let signatureError: Error | null = null;
let lastPreviewLoader:
  | ((signal: AbortSignal) => Promise<unknown>)
  | null = null;

vi.mock("@/components/PdfViewer", () => ({
  PdfViewer: () => null,
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
      delete: vi.fn(),
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
      isError: false,
      error: null,
      isPending: false,
      refetch: vi.fn(),
    }),
    useExpenseItems: () => ({
      data: [
        {
          code: "gaz",
          label: "Gaz",
          sortOrder: 0,
          active: true,
          multipleLinesAllowed: true,
          proRataPct: "100",
        },
      ],
      isPending: false,
    }),
    useTemplates: () => ({ data: [], isPending: false }),
    useActiveRentReceipt: () => ({ data: null, isPending: false }),
    useActiveStatement: () => ({ data: null, isPending: false }),
    useSignatures: () => ({
      data: signatureList,
      isPending: false,
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
});
