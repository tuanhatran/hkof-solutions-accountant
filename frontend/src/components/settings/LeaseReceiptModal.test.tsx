import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  CompanyDto,
  LeaseDto,
  SignatureDto,
  TemplateDto,
} from "@/api/types";
import i18n from "@/i18n";
import { currentMonth, periodOfMonth } from "@/lib/dates";
import { formatEUR, formatMonth, formatPeriod } from "@/lib/format";
import { useCompanyStore } from "@/state/company";
import { useToasts } from "@/state/toasts";
import { LeaseReceiptModal } from "./LeaseReceiptModal";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

function readyQuery<T>(data: T): QueryLike<T> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

const TEMPLATE: TemplateDto = {
  id: 5,
  type: "RENT_RECEIPT",
  name: "Quittance intégrée",
  version: 1,
  format: "HTML",
  active: true,
  builtIn: true,
  createdAt: "2026-01-01T10:00:00Z",
};
const SIGNATURE: SignatureDto = {
  id: 7,
  personId: 1,
  personName: "M. Bailleur",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};
const LEASE: LeaseDto = {
  id: 10,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  companyId: null,
  companyName: null,
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

let templateRows: TemplateDto[] = [TEMPLATE];
let signatureRows: SignatureDto[] = [SIGNATURE];
let companyRows: CompanyDto[] = [];

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: ({
    url,
    loading,
    error,
  }: {
    url: string | null;
    loading: boolean;
    error: string | null;
  }) => (
    <div
      data-cy="apercu-quittance-bail"
      data-url={url ?? ""}
      data-loading={loading ? "true" : "false"}
    >
      {error}
    </div>
  ),
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, downloadBlob: vi.fn() };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      preview: vi.fn(),
      create: vi.fn(),
      pdf: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useTemplates: () => readyQuery(templateRows),
    useSignatures: () => readyQuery(signatureRows),
    useCompanies: () => readyQuery(companyRows),
  };
});

function renderModal(
  lease: LeaseDto = LEASE,
  onClose: () => void = () => undefined,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LeaseReceiptModal lease={lease} onClose={onClose} />
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  templateRows = [TEMPLATE];
  signatureRows = [SIGNATURE];
  companyRows = [{ id: 3, name: "HKOF" }];
  useCompanyStore.setState({ activeCompanyId: null });
  vi.mocked(api.rentReceipts.preview).mockReset();
  vi.mocked(api.rentReceipts.preview).mockResolvedValue({
    blob: new Blob(["pdf"]),
    fileName: "quittance.pdf",
  });
  vi.mocked(api.rentReceipts.create).mockReset();
  vi.mocked(api.rentReceipts.pdf).mockReset();
  vi.mocked(downloadBlob).mockClear();
  useToasts.setState({ toasts: [] });
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:apercu"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
  });
});

describe("LeaseReceiptModal", () => {
  it("prefills the current month, period, lease pair and amounts", () => {
    renderModal();

    const month = currentMonth();
    const period = periodOfMonth(month);
    expect(screen.getByLabelText("Mois")).toHaveValue(month);
    expect(
      screen.getByText(formatPeriod(period.start, period.end)),
    ).toBeVisible();
    expect(screen.getByText("M. Bailleur")).toBeVisible();
    expect(screen.getByText("Mme Locataire")).toBeVisible();
    expect(
      document.querySelector('[data-cy="societe-quittance-bail"]'),
    ).toHaveTextContent("HKOF");
    expect(screen.getByLabelText("Loyer hors charges")).toHaveValue("1300,00");
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue(
      "50,00",
    );
  });

  it("sends the active company for a natural-person lease without a company", async () => {
    renderModal();

    const month = currentMonth();
    const period = periodOfMonth(month);
    await waitFor(() =>
      expect(api.rentReceipts.preview).toHaveBeenCalledWith(
        {
          month,
          landlordId: 1,
          tenantId: 2,
          companyId: 3,
          periodStart: period.start,
          periodEnd: period.end,
          rentExclCharges: "1300.00",
          charges: "50.00",
          templateId: 5,
          signatureId: 7,
        },
        expect.any(AbortSignal),
      ),
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-cy="apercu-quittance-bail"]'),
      ).toHaveAttribute("data-url", "blob:apercu"),
    );
  });

  it("prefers the stored active company over the first company", async () => {
    companyRows = [
      { id: 3, name: "HKOF" },
      { id: 9, name: "MARTIN" },
    ];
    useCompanyStore.setState({ activeCompanyId: 9 });
    renderModal();

    expect(
      document.querySelector('[data-cy="societe-quittance-bail"]'),
    ).toHaveTextContent("MARTIN");
    await waitFor(() =>
      expect(api.rentReceipts.preview).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 9 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it("shows Aucune société and sends no company when none exists at all", async () => {
    companyRows = [];
    renderModal();

    expect(screen.getByText("Aucune société")).toBeVisible();
    await waitFor(() => expect(api.rentReceipts.preview).toHaveBeenCalled());
    const previewBody = vi.mocked(api.rentReceipts.preview).mock.calls[0][0];
    expect(previewBody.companyId).toBeUndefined();
  });

  it("updates the read-only period and the preview when the month changes", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Mois"), {
      target: { value: "2026-02" },
    });

    expect(
      screen.getByText(formatPeriod("2026-02-01", "2026-02-28")),
    ).toBeVisible();
    await waitFor(() =>
      expect(api.rentReceipts.preview).toHaveBeenCalledWith(
        expect.objectContaining({
          month: "2026-02",
          periodStart: "2026-02-01",
          periodEnd: "2026-02-28",
        }),
        expect.any(AbortSignal),
      ),
    );
  });

  it("uses the lease company for a company lease", async () => {
    const companyLease: LeaseDto = {
      ...LEASE,
      companyLease: true,
      companyId: 3,
      companyName: "HKOF",
      tenantId: null,
      tenantName: "HKOF",
    };
    renderModal(companyLease);

    expect(
      document.querySelector('[data-cy="societe-quittance-bail"]'),
    ).toHaveTextContent("HKOF");
    await waitFor(() =>
      expect(api.rentReceipts.preview).toHaveBeenCalledWith(
        expect.objectContaining({
          landlordId: 1,
          companyId: 3,
          tenantCompanyId: 3,
        }),
        expect.any(AbortSignal),
      ),
    );
    const previewBody = vi.mocked(api.rentReceipts.preview).mock.calls[0][0];
    expect(previewBody.tenantId).toBeUndefined();
  });

  it("rejects an invalid amount in French", async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Loyer hors charges"), {
      target: { value: "" },
    });

    expect(
      await screen.findByText("Loyer hors charges invalide."),
    ).toBeVisible();
  });

  it("generates from the edited amounts and keeps the modal open with the backend result", async () => {
    const month = currentMonth();
    const period = periodOfMonth(month);
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 42,
      month,
      version: 2,
      total: "1450.00",
    });
    const queryClient = renderModal();
    queryClient.setQueryData(queryKeys.rentReceiptsAll, []);

    fireEvent.change(screen.getByLabelText("Loyer hors charges"), {
      target: { value: "1400,00" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith({
        month,
        landlordId: 1,
        tenantId: 2,
        companyId: 3,
        periodStart: period.start,
        periodEnd: period.end,
        rentExclCharges: "1400.00",
        charges: "50.00",
        templateId: 5,
        signatureId: 7,
      }),
    );
    expect(
      screen.getByRole("dialog", { name: "Quittance de loyer" }),
    ).toBeVisible();
    expect(screen.getByText("Quittance générée")).toBeVisible();
    expect(screen.getByText(/version 2/).textContent).toContain(
      formatEUR("1450.00"),
    );
    await waitFor(() =>
      expect(useToasts.getState().toasts.map((item) => item.message)).toContain(
        `Quittance de ${formatMonth(month)} générée en version 2.`,
      ),
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryState(queryKeys.rentReceiptsAll)?.isInvalidated,
      ).toBe(true),
    );
  });

  it("downloads the generated PDF on demand", async () => {
    const month = currentMonth();
    const generated = { id: 42, month, version: 1, total: "1350.00" };
    vi.mocked(api.rentReceipts.create).mockResolvedValue(generated);
    const blob = new Blob(["pdf"]);
    vi.mocked(api.rentReceipts.pdf).mockResolvedValue({
      blob,
      fileName: "quittance.pdf",
    });
    renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Télécharger le PDF" }),
    );

    await waitFor(() => expect(api.rentReceipts.pdf).toHaveBeenCalledWith(42));
    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(blob, "quittance.pdf"),
    );
  });

  it("disables the generation while the form is invalid", () => {
    renderModal();

    fireEvent.change(screen.getByLabelText("Loyer hors charges"), {
      target: { value: "" },
    });

    expect(
      screen.getByRole("button", { name: "Générer la quittance" }),
    ).toBeDisabled();
  });

  it("surfaces a generation failure as a French toast and keeps the modal open", async () => {
    vi.mocked(api.rentReceipts.create).mockRejectedValue(
      new Error("Une quittance active existe déjà pour ce mois."),
    );
    renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );

    await waitFor(() =>
      expect(useToasts.getState().toasts.map((item) => item.message)).toContain(
        "Une quittance active existe déjà pour ce mois.",
      ),
    );
    expect(
      screen.getByRole("dialog", { name: "Quittance de loyer" }),
    ).toBeVisible();
    expect(screen.queryByText("Quittance générée")).toBeNull();
  });

  it("closes on Escape and on a backdrop click but not on a click inside", () => {
    const onClose = vi.fn();
    renderModal(LEASE, onClose);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(document.querySelector(".lease-receipt-modal-panel")!);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(
      document.querySelector(".lease-receipt-modal-overlay")!,
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("keeps the period when the month is cleared", () => {
    renderModal();

    const month = currentMonth();
    const period = periodOfMonth(month);
    fireEvent.change(screen.getByLabelText("Mois"), {
      target: { value: "" },
    });

    expect(screen.getByLabelText("Mois")).toHaveValue("");
    expect(
      screen.getByText(formatPeriod(period.start, period.end)),
    ).toBeVisible();
  });

  it("neither previews nor generates without an active template and a signature", () => {
    templateRows = [];
    signatureRows = [];
    renderModal();

    expect(
      screen.getByRole("button", { name: "Générer la quittance" }),
    ).toBeDisabled();
    expect(api.rentReceipts.preview).not.toHaveBeenCalled();
  });

  it("reports a PDF download failure as a French toast", async () => {
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 42,
      month: currentMonth(),
      version: 1,
      total: "1350.00",
    });
    vi.mocked(api.rentReceipts.pdf).mockRejectedValue(
      new Error("PDF indisponible."),
    );
    renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Télécharger le PDF" }),
    );

    await waitFor(() =>
      expect(useToasts.getState().toasts.map((item) => item.message)).toContain(
        "PDF indisponible.",
      ),
    );
  });

  it("shows the default version and ignores a download when the receipt has no id", async () => {
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      month: currentMonth(),
      total: "1350.00",
    });
    renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );

    expect(await screen.findByText(/version 1/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Télécharger le PDF" }));
    expect(api.rentReceipts.pdf).not.toHaveBeenCalled();
  });

  it("renders the receipt modal in English with an English period", async () => {
    await i18n.changeLanguage("en");
    renderModal();
    const month = currentMonth();
    const period = periodOfMonth(month);

    expect(screen.getByRole("dialog", { name: "Rent receipt" })).toBeVisible();
    expect(screen.getByLabelText("Month")).toHaveValue(month);
    expect(
      screen.getByText(formatPeriod(period.start, period.end)),
    ).toBeVisible();
    expect(screen.getByText("Landlord")).toBeVisible();
    expect(screen.getByText("Tenant")).toBeVisible();
    expect(screen.getByText("Company")).toBeVisible();
    expect(screen.getByText("Property")).toBeVisible();
    expect(screen.getByLabelText("Rent excluding charges")).toHaveValue(
      "1300,00",
    );
    expect(screen.getByLabelText("Charges provision")).toHaveValue("50,00");
    expect(
      screen.getByText("The period is derived from the chosen month."),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Generate the rent receipt" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeVisible();
  });

  it("rejects an invalid amount in English", async () => {
    await i18n.changeLanguage("en");
    renderModal();

    fireEvent.change(screen.getByLabelText("Rent excluding charges"), {
      target: { value: "" },
    });

    expect(
      await screen.findByText("Invalid rent excluding charges."),
    ).toBeVisible();
  });

  it("generates in English and toasts the result in English", async () => {
    await i18n.changeLanguage("en");
    const month = currentMonth();
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 42,
      month,
      version: 2,
      total: "1450.00",
    });
    renderModal();

    fireEvent.click(
      screen.getByRole("button", { name: "Generate the rent receipt" }),
    );

    expect(await screen.findByText("Rent receipt generated")).toBeVisible();
    await waitFor(() =>
      expect(useToasts.getState().toasts.map((item) => item.message)).toContain(
        `Quittance for ${formatMonth(month)} generated as version 2.`,
      ),
    );
  });
});
