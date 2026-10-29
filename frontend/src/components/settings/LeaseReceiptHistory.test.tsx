import { configure, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LeaseDto, RentReceiptDto } from "@/api/types";
import i18n from "@/i18n";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import { LeaseReceiptHistory } from "./LeaseReceiptHistory";

configure({ testIdAttribute: "data-cy" });

// jest-dom collapses the narrow no-break spaces of the formatted amounts.
function collapsed(value: string): string {
  return value.replace(/[\s\u00a0\u202f]/g, " ");
}

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
    },
  },
}));

const NATURAL_LEASE: LeaseDto = {
  id: 10,
  addressId: 4,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

const COMPANY_LEASE: LeaseDto = {
  id: 11,
  addressId: 4,
  landlordId: 1,
  tenantId: null,
  companyId: 3,
  companyName: "HKOF",
  companyLease: true,
  landlordName: "M. Bailleur",
  tenantName: "HKOF",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

function receipt(overrides: Partial<RentReceiptDto>): RentReceiptDto {
  return {
    id: 101,
    month: "2026-09",
    landlordId: 1,
    tenantId: 2,
    tenantCompanyId: null,
    total: "1350.00",
    version: 1,
    status: "ACTIVE",
    createdAt: "2026-09-30T10:00:00Z",
    ...overrides,
  };
}

function renderHistory({
  lease = NATURAL_LEASE,
  receipts = [] as RentReceiptDto[],
  isPending = false,
  isError = false,
  error = null as Error | null,
  onRetry = vi.fn(),
}: {
  lease?: LeaseDto;
  receipts?: RentReceiptDto[];
  isPending?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
} = {}) {
  const result = render(
    <LeaseReceiptHistory
      lease={lease}
      receipts={receipts}
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={onRetry}
    />,
  );
  return { ...result, onRetry };
}

describe("LeaseReceiptHistory", () => {
  it("groups the receipts by month, newest month first, with a version count", () => {
    renderHistory({
      receipts: [
        receipt({ id: 101, month: "2026-09" }),
        receipt({
          id: 102,
          month: "2026-10",
          createdAt: "2026-10-31T10:00:00Z",
        }),
        receipt({
          id: 103,
          month: "2026-09",
          version: 2,
          createdAt: "2026-09-30T12:00:00Z",
        }),
      ],
    });

    const history = screen.getByTestId("lease-receipt-history-10");
    const months = within(history).getAllByRole("group");
    expect(months).toHaveLength(2);
    expect(months[0]).toHaveTextContent(formatMonth("2026-10"));
    expect(months[0]).toHaveTextContent("1 quittance");
    expect(months[1]).toHaveTextContent(formatMonth("2026-09"));
    expect(months[1]).toHaveTextContent("2 quittances");
    expect(
      screen.getByTestId("lease-receipt-history-mois-10-2026-10"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("lease-receipt-history-mois-10-2026-09"),
    ).toBeInTheDocument();
  });

  it("expands a month keyboard-accessibly and lists every version newest first", async () => {
    renderHistory({
      receipts: [
        receipt({
          id: 101,
          version: 1,
          status: "ARCHIVED",
          createdAt: "2026-09-30T10:00:00Z",
          total: "1350.00",
        }),
        receipt({
          id: 103,
          version: 2,
          status: "ACTIVE",
          createdAt: "2026-09-30T12:00:00Z",
          total: "1400.00",
        }),
      ],
    });

    const month = screen.getByTestId("lease-receipt-history-mois-10-2026-09");
    const summary = month.querySelector("summary");
    expect(summary).not.toBeNull();
    summary?.focus();
    expect(summary).toHaveFocus();
    // jsdom does not run the Enter activation of summary; browsers toggle the
    // native details element, so the click stands in for the key activation.
    await userEvent.click(summary as HTMLElement);
    expect(month).toHaveAttribute("open");

    const items = within(month).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("v2");
    expect(items[0]).toHaveTextContent(formatDateTime("2026-09-30T12:00:00Z"));
    expect(items[0]).toHaveTextContent(collapsed(formatEUR("1400.00")));
    expect(items[1]).toHaveTextContent("v1");
    expect(items[1]).toHaveTextContent(collapsed(formatEUR("1350.00")));

    const download = screen.getByTestId("telecharger-quittance-bail-103");
    expect(download).toHaveAttribute("href", "/api/rent-receipts/103/pdf");
    expect(
      screen.getByTestId("telecharger-quittance-bail-101"),
    ).toHaveAttribute("href", "/api/rent-receipts/101/pdf");
  });

  it("shows the month and its single version even when there is only one receipt", () => {
    renderHistory({ receipts: [receipt({ id: 101 })] });

    const month = screen.getByTestId("lease-receipt-history-mois-10-2026-09");
    expect(month).toBeInTheDocument();
    expect(within(month).getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByTestId("telecharger-quittance-bail-101"),
    ).toBeInTheDocument();
  });

  it("keeps only the receipts of a natural lease: same pair, no company tenant", () => {
    renderHistory({
      receipts: [
        receipt({ id: 101 }),
        receipt({ id: 201, tenantId: 999 }),
        receipt({ id: 202, tenantId: 2, tenantCompanyId: 3 }),
        receipt({ id: 203, landlordId: 8 }),
      ],
    });

    expect(
      screen.getByTestId("telecharger-quittance-bail-101"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("telecharger-quittance-bail-201")).toBeNull();
    expect(screen.queryByTestId("telecharger-quittance-bail-202")).toBeNull();
    expect(screen.queryByTestId("telecharger-quittance-bail-203")).toBeNull();
  });

  it("keeps only the company-tenant receipts of a company lease", () => {
    renderHistory({
      lease: COMPANY_LEASE,
      receipts: [
        receipt({
          id: 301,
          tenantId: null,
          tenantCompanyId: 3,
          month: "2026-10",
        }),
        receipt({ id: 302, tenantId: 2, tenantCompanyId: null }),
        receipt({ id: 303, tenantId: null, tenantCompanyId: 7 }),
        receipt({ id: 304, landlordId: 8, tenantId: null, tenantCompanyId: 3 }),
      ],
    });

    expect(
      screen.getByTestId("telecharger-quittance-bail-301"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("telecharger-quittance-bail-302")).toBeNull();
    expect(screen.queryByTestId("telecharger-quittance-bail-303")).toBeNull();
    expect(screen.queryByTestId("telecharger-quittance-bail-304")).toBeNull();
  });

  it("shows a French empty state when the lease has no receipt", () => {
    renderHistory({ receipts: [] });

    expect(
      screen.getByText("Aucune quittance générée pour ce bail."),
    ).toBeInTheDocument();
  });

  it("shows a French loading state", () => {
    renderHistory({ isPending: true });

    expect(screen.getByText("Chargement des quittances…")).toBeInTheDocument();
  });

  it("shows a French error state with a retry action", async () => {
    const onRetry = vi.fn();
    renderHistory({ isError: true, error: new Error("boom"), onRetry });

    expect(
      screen.getByText("Impossible de charger les données"),
    ).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("falls back to the empty state when the receipt list is still undefined", () => {
    renderHistory({ receipts: undefined });

    expect(
      screen.getByText("Aucune quittance générée pour ce bail."),
    ).toBeInTheDocument();
  });

  it("stays row-safe when a receipt lacks its optional fields", () => {
    renderHistory({
      receipts: [
        receipt({
          id: undefined,
          month: undefined,
          version: undefined,
          status: undefined,
          createdAt: undefined,
          total: undefined,
        }),
      ],
    });

    const month = screen.getByTestId("lease-receipt-history-mois-10-");
    const items = within(month).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("v1");
    expect(items[0]).toHaveTextContent("—");
    expect(month.querySelector("a")).toBeNull();
  });

  it("matches a lease and a receipt whose tenant identifiers are absent", () => {
    renderHistory({
      lease: { ...NATURAL_LEASE, tenantId: undefined },
      receipts: [receipt({ id: 401, tenantId: undefined })],
    });

    expect(
      screen.getByTestId("telecharger-quittance-bail-401"),
    ).toBeInTheDocument();
  });

  it("matches nothing for a company lease without a company id", () => {
    renderHistory({
      lease: { ...COMPANY_LEASE, companyId: null },
      receipts: [
        receipt({ id: 501, tenantId: null, tenantCompanyId: null }),
        receipt({ id: 502, tenantId: null, tenantCompanyId: 3 }),
      ],
    });

    expect(
      screen.getByText("Aucune quittance générée pour ce bail."),
    ).toBeInTheDocument();
  });

  it("renders the section, month count and download label in English", async () => {
    await i18n.changeLanguage("en");
    renderHistory({
      receipts: [
        receipt({ id: 101, month: "2026-09" }),
        receipt({ id: 103, month: "2026-09", version: 2 }),
      ],
    });

    expect(screen.getByText("Generated rent receipts")).toBeInTheDocument();
    const month = screen.getByTestId("lease-receipt-history-mois-10-2026-09");
    expect(month).toHaveTextContent("September 2026");
    expect(month).toHaveTextContent("2 rent receipts");
    expect(
      screen.getByTestId("telecharger-quittance-bail-101"),
    ).toHaveTextContent("Download the PDF");
  });

  it("renders the singular count, loading and empty states in English", async () => {
    await i18n.changeLanguage("en");
    const single = renderHistory({ receipts: [receipt({ id: 101 })] });
    expect(
      screen.getByTestId("lease-receipt-history-mois-10-2026-09"),
    ).toHaveTextContent("1 rent receipt");
    single.unmount();

    const loading = renderHistory({ isPending: true });
    expect(screen.getByText("Loading the rent receipts…")).toBeInTheDocument();
    loading.unmount();

    renderHistory({ receipts: [] });
    expect(
      screen.getByText("No rent receipt generated for this lease."),
    ).toBeInTheDocument();
  });
});
