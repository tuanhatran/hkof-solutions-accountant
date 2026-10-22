import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { GenerateRentReceiptPage } from "./GenerateRentReceiptPage";

vi.mock("@/components/PdfViewer", () => ({
  PdfViewer: () => null,
}));

vi.mock("@/hooks/usePdfPreview", () => ({
  usePdfPreview: () => ({
    url: null,
    loading: false,
    error: null,
    updatedAt: null,
    refresh: () => undefined,
  }),
}));

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      create: vi.fn(),
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
  };
});

const MONTH = "2026-01";

describe("GenerateRentReceiptPage", () => {
  beforeEach(() => {
    vi.mocked(api.rentReceipts.create).mockReset();
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
});
