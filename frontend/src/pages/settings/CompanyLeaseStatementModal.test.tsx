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
import { api } from "@/api/endpoints";
import type { LeaseDto, RentReceiptDto, SignatureDto } from "@/api/types";
import { useStatementDraft } from "@/state/statementDraft";
import { useToasts } from "@/state/toasts";
import { CompanyLeaseStatementModal } from "./CompanyLeaseStatementModal";

let receiptList: RentReceiptDto[] = [];
let signatureList: SignatureDto[] = [];
let companiesError = false;
let expenseItemsError = false;
let activeStatement: { id?: number; version?: number; month?: string } | null =
  null;

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: ({ actions }: { actions?: ReactNode }) => (
    <div data-testid="pdf-viewer">{actions}</div>
  ),
}));

vi.mock("@/hooks/usePdfPreview", () => ({
  usePdfPreview: () => ({
    url: null,
    loading: false,
    error: null,
    updatedAt: null,
    refresh: () => undefined,
    download: () => undefined,
  }),
}));

vi.mock("@/lib/dates", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/dates")>();
  return { ...actual, currentMonth: () => "2026-01" };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    expenseStatements: {
      calculate: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      pdf: vi.fn(),
      zip: vi.fn(),
      pdfUrl: (id: number, complete: boolean) =>
        `/api/expense-statements/${id}/pdf?complete=${complete}`,
      zipUrl: (id: number) => `/api/expense-statements/${id}/zip`,
    },
    receipts: {
      upload: vi.fn(),
      delete: vi.fn(),
      fileUrl: (id: number) => `/api/receipts/${id}/file`,
    },
    rentReceipts: {
      create: vi.fn(),
      preview: vi.fn(),
      pdf: vi.fn(),
      pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useCompanies: () => ({
      data: companiesError
        ? undefined
        : [{ id: 3, name: "HKOF", proRataBase: "100.00" }],
      isError: companiesError,
      error: companiesError ? new Error("Sociétés indisponibles") : null,
      isPending: false,
      refetch: vi.fn(),
    }),
    useEmployees: () => ({
      data: [
        {
          id: 9,
          companyId: 3,
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
      data: expenseItemsError
        ? undefined
        : [
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
      isError: expenseItemsError,
      error: expenseItemsError ? new Error("Postes indisponibles") : null,
      isPending: false,
      refetch: vi.fn(),
    }),
    useTemplates: () => ({ data: [], isPending: false }),
    useActiveRentReceipt: () => ({ data: null, isPending: false }),
    useActiveStatement: () => ({ data: activeStatement, isPending: false }),
    useAllRentReceipts: () => ({
      data: receiptList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useSignatures: (personId: number | null) => ({
      data:
        personId === null
          ? []
          : signatureList.filter(
              (signature) => signature.personId === personId,
            ),
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const MONTH = "2026-01";

const LEASE: LeaseDto = {
  id: 5,
  companyId: 3,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  tenantName: "HKOF",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
};

const LANDLORD: SignatureDto = {
  id: 3,
  personId: 1,
  personName: "M. Bailleur",
  name: "Bailleur",
};

const CEO: SignatureDto = {
  id: 4,
  personId: 9,
  personName: "Camille Martin",
  name: "Gérant",
};

function rentReceipt(overrides: Partial<RentReceiptDto>): RentReceiptDto {
  return {
    id: 50,
    month: MONTH,
    landlordId: 1,
    tenantId: null,
    tenantCompanyId: 3,
    total: "900.00",
    version: 1,
    status: "ACTIVE",
    createdAt: "2026-01-31T10:00:00Z",
    ...overrides,
  };
}

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <CompanyLeaseStatementModal
      lease={LEASE}
      companyId={3}
      onClose={onClose}
    />,
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      ),
    },
  );
}

function dialog(): HTMLElement {
  return document.querySelector(
    '[data-cy="dialogue-note-frais-bail"]',
  ) as HTMLElement;
}

beforeEach(() => {
  receiptList = [];
  signatureList = [LANDLORD, CEO];
  companiesError = false;
  expenseItemsError = false;
  activeStatement = null;
  vi.mocked(api.expenseStatements.calculate).mockReset();
  vi.mocked(api.expenseStatements.calculate).mockResolvedValue({
    total: "950.00",
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
    version: 2,
    total: "950.00",
  });
  useStatementDraft.setState({
    month: MONTH,
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
  });
  useToasts.setState({ toasts: [] });
});

describe("CompanyLeaseStatementModal", () => {
  it("opens the scoped editor and primes the rent line from the latest ACTIVE receipt of the lease and month", async () => {
    receiptList = [
      rentReceipt({ id: 50, version: 1, total: "900.00" }),
      rentReceipt({
        id: 51,
        version: 2,
        total: "950.00",
        createdAt: "2026-01-31T12:00:00Z",
      }),
      rentReceipt({ id: 52, version: 3, status: "ARCHIVED", total: "1.00" }),
      rentReceipt({ id: 53, tenantCompanyId: 7, total: "2.00" }),
      rentReceipt({ id: 54, month: "2025-12", total: "3.00" }),
      rentReceipt({
        id: 55,
        tenantId: 2,
        tenantCompanyId: null,
        total: "4.00",
      }),
    ];
    renderModal();

    expect(dialog()).not.toBeNull();
    expect(dialog()).toHaveAttribute("role", "dialog");
    expect(dialog()).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("12 rue des Lilas, 75011 Paris")).toBeVisible();

    await waitFor(() =>
      expect(api.expenseStatements.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: 3,
          leaseId: 5,
          month: MONTH,
          lines: [
            expect.objectContaining({
              itemCode: "loyer",
              amountInclVat: "950.00",
            }),
          ],
        }),
        expect.anything(),
      ),
    );
    expect(
      screen.getByRole("button", { name: "Supprimer Loyer" }),
    ).toBeVisible();

    // The global sessionStorage draft of /generer/note-frais stays untouched.
    const globalDraft = useStatementDraft.getState();
    expect(globalDraft.linesByMonth[MONTH]).toBeUndefined();
    expect(globalDraft.primedReceiptByMonth[MONTH]).toBeUndefined();
  });

  it("does not re-add a removed rent line but primes again for a newer receipt", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    const view = renderModal();
    const user = userEvent.setup();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Supprimer Loyer" }),
      ).toBeVisible(),
    );

    await user.click(screen.getByRole("button", { name: "Supprimer Loyer" }));
    const confirm = screen.getByRole("dialog", {
      name: "Supprimer ce frais ?",
    });
    await user.click(
      within(confirm).getByRole("button", { name: "Supprimer" }),
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Supprimer Loyer" }),
      ).toBeNull(),
    );
    view.rerender(
      <CompanyLeaseStatementModal
        lease={LEASE}
        companyId={3}
        onClose={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Supprimer Loyer" }),
      ).toBeNull(),
    );

    receiptList = [
      rentReceipt({ id: 51, version: 2, total: "950.00" }),
      rentReceipt({
        id: 60,
        version: 3,
        total: "970.00",
        createdAt: "2026-01-31T14:00:00Z",
      }),
    ];
    view.rerender(
      <CompanyLeaseStatementModal
        lease={LEASE}
        companyId={3}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Supprimer Loyer" }),
      ).toBeVisible(),
    );
    await waitFor(() =>
      expect(api.expenseStatements.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            expect.objectContaining({
              itemCode: "loyer",
              amountInclVat: "970.00",
            }),
          ],
        }),
        expect.anything(),
      ),
    );
  });

  it("shows the French missing-receipt notice, blocks the rent add and opens the receipt modal", async () => {
    receiptList = [];
    renderModal();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Type de frais"), "loyer");

    expect(screen.getByText("Aucune quittance pour ce mois")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter ce frais" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );
    expect(
      document.querySelector('[data-cy="dialogue-quittance-bail"]'),
    ).not.toBeNull();
  });

  it("generates a version, keeps the modal open and shows the backend result with downloads", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    renderModal();
    const user = userEvent.setup();

    const generate = await screen.findByRole("button", {
      name: /Générer la note de frais/,
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await user.click(generate);

    await screen.findByText("Note de frais générée");
    expect(api.expenseStatements.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 3, leaseId: 5, month: MONTH }),
    );
    expect(dialog()).not.toBeNull();
    expect(screen.getByText(/version 2/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Télécharger la note seule" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "Télécharger la note complète (ZIP)",
      }),
    ).toBeVisible();
    expect(useToasts.getState().toasts.map((t) => t.message)).toContain(
      "Note de Janvier 2026 générée en version 2.",
    );
  });

  it("blocks generation with a French hint when the CEO signature is missing", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    signatureList = [LANDLORD];
    renderModal();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-cy", "alerte-signature-manquante");
    expect(alert).toHaveTextContent(/Aucune signature pour le PDG/);
    expect(
      screen.getByRole("button", { name: /Générer la note de frais/ }),
    ).toBeDisabled();
    expect(api.expenseStatements.create).not.toHaveBeenCalled();
  });

  it("closes with the Fermer button without touching the global draft", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    const onClose = vi.fn();
    renderModal(onClose);
    const user = userEvent.setup();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Supprimer Loyer" }),
      ).toBeVisible(),
    );

    await user.click(within(dialog()).getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useStatementDraft.getState().linesByMonth[MONTH]).toBeUndefined();
  });

  it("closes on Escape and on overlay mousedown", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    const onClose = vi.fn();
    renderModal(onClose);
    await waitFor(() => expect(dialog()).not.toBeNull());

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    const overlay = document.querySelector(
      ".company-lease-statement-overlay",
    ) as HTMLElement;
    fireEvent.mouseDown(overlay);
    expect(onClose).toHaveBeenCalledTimes(2);

    // A mousedown inside the panel does not close.
    fireEvent.mouseDown(dialog());
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("shows a French error state when the companies query fails", async () => {
    companiesError = true;
    renderModal();
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(screen.getByText("Sociétés indisponibles")).toBeVisible();
  });

  it("shows a French error state when the expense items query fails", async () => {
    expenseItemsError = true;
    renderModal();
    await waitFor(() => expect(dialog()).not.toBeNull());
    expect(screen.getByText("Postes indisponibles")).toBeVisible();
  });

  it("switches the mobile view tabs between Saisie and Aperçu", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    renderModal();
    const user = userEvent.setup();
    await waitFor(() => expect(dialog()).not.toBeNull());

    await user.click(screen.getByRole("tab", { name: "Aperçu" }));
    await user.click(screen.getByRole("tab", { name: "Saisie" }));
    expect(dialog()).not.toBeNull();
  });

  it("updates the existing rent line amount when a newer receipt arrives", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    const view = renderModal();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Supprimer Loyer" }),
      ).toBeVisible(),
    );

    receiptList = [
      rentReceipt({ id: 51, version: 2, total: "950.00" }),
      rentReceipt({
        id: 61,
        version: 3,
        total: "980.00",
        createdAt: "2026-01-31T15:00:00Z",
      }),
    ];
    view.rerender(
      <CompanyLeaseStatementModal
        lease={LEASE}
        companyId={3}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(api.expenseStatements.calculate).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: [
            expect.objectContaining({
              itemCode: "loyer",
              amountInclVat: "980.00",
            }),
          ],
        }),
        expect.anything(),
      ),
    );
    // The line was updated in place, not duplicated.
    expect(
      screen.getAllByRole("button", { name: "Supprimer Loyer" }),
    ).toHaveLength(1);
  });

  it("asks for confirmation before generating a new version of an active note", async () => {
    receiptList = [rentReceipt({ id: 51, version: 2, total: "950.00" })];
    activeStatement = { id: 11, version: 1, month: MONTH };
    renderModal();
    const user = userEvent.setup();

    const generate = await screen.findByRole("button", {
      name: /Générer la note de frais/,
    });
    await waitFor(() => expect(generate).toBeEnabled());
    await user.click(generate);

    const confirm = await screen.findByRole("dialog", {
      name: "Générer une nouvelle version ?",
    });
    expect(confirm).toHaveTextContent(/version 1/);
    expect(api.expenseStatements.create).not.toHaveBeenCalled();

    await user.click(
      within(confirm).getByRole("button", {
        name: "Créer la nouvelle version",
      }),
    );

    await waitFor(() =>
      expect(api.expenseStatements.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 3, leaseId: 5, month: MONTH }),
      ),
    );
  });

  it("closes the nested rent receipt modal", async () => {
    receiptList = [];
    renderModal();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Type de frais"), "loyer");
    await user.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );
    const receiptDialog = document.querySelector(
      '[data-cy="dialogue-quittance-bail"]',
    ) as HTMLElement;
    await waitFor(() => expect(receiptDialog).not.toBeNull());

    await user.click(
      within(receiptDialog).getByRole("button", { name: "Fermer la fenêtre" }),
    );
    await waitFor(() =>
      expect(
        document.querySelector('[data-cy="dialogue-quittance-bail"]'),
      ).toBeNull(),
    );
    expect(dialog()).not.toBeNull();
  });
});
