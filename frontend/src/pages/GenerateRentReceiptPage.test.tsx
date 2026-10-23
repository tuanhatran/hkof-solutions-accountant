import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { SignatureDto } from "@/api/types";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { GenerateRentReceiptPage } from "./GenerateRentReceiptPage";

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

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      create: vi.fn(),
      preview: vi.fn(),
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
        companyName: "HKOF",
        legalForm: "SASU",
        rentExclCharges: "1300.00",
        chargesAdvance: "0.00",
      },
      isError: false,
      error: null,
      isPending: false,
      refetch: vi.fn(),
    }),
    useTemplates: () => ({ data: [], isPending: false }),
    useActiveRentReceipt: () => ({ data: null, isPending: false }),
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
  id: 7,
  type: "LANDLORD",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

function renderPage() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.rentReceiptActive(MONTH), null);
  queryClient.setQueryData(queryKeys.rentReceipts(MONTH), []);

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GenerateRentReceiptPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("GenerateRentReceiptPage", () => {
  beforeEach(() => {
    lastPreviewLoader = null;
    signatureList = [LANDLORD];
    signatureError = null;
    vi.mocked(api.rentReceipts.create).mockReset();
    vi.mocked(api.rentReceipts.preview).mockReset();
    vi.mocked(api.rentReceipts.preview).mockResolvedValue({
      blob: new Blob(),
      fileName: null,
    });
    useRentReceiptDraft.setState({
      month: MONTH,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      rentExclCharges: "1300.00",
      charges: "0.00",
      paymentDate: "2026-01-05",
      issueDate: "2026-01-05",
      templateId: null,
      initialized: true,
      dirty: false,
    });
  });

  it("invalidates the active rent receipt query after generating", async () => {
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    const queryClient = renderPage();

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: /Générer la quittance/ }),
      );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryState(queryKeys.rentReceiptActive(MONTH))
          ?.isInvalidated,
      ).toBe(true),
    );
    expect(
      queryClient.getQueryState(queryKeys.rentReceipts(MONTH))?.isInvalidated,
    ).toBe(true);
  });

  it("preselects the LANDLORD signature and sends signatureId to the preview and the generation", async () => {
    signatureList = [
      {
        id: 8,
        type: "ENTREPRISE_CEO",
        name: "Gérant",
        mimeType: "image/jpeg",
        createdAt: "2026-10-23T10:00:00Z",
      },
      LANDLORD,
    ];
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    renderPage();

    const select = await screen.findByLabelText("Signature");
    expect(select).toHaveValue("7");

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenCalledWith(
      expect.objectContaining({ signatureId: 7 }),
      expect.anything(),
    );

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: /Générer la quittance/ }),
      );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith(
        expect.objectContaining({ signatureId: 7 }),
      ),
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
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
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
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
    expect(api.rentReceipts.create).not.toHaveBeenCalled();
  });
});
