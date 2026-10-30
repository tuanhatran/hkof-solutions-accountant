import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setAuthUser } from "@/api/queries";
import type {
  CompanyDto,
  LeaseDto,
  RentReceiptDto,
  StatementDto,
} from "@/api/types";
import i18n from "@/i18n";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { draftScopeKey, useStatementDraft } from "@/state/statementDraft";
import { useToasts } from "@/state/toasts";
import { HistoryPage } from "./HistoryPage";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let receiptsState: QueryLike<RentReceiptDto[]>;
let statementsState: QueryLike<StatementDto[]>;
let companiesState: QueryLike<CompanyDto[]>;
let leasesState: QueryLike<LeaseDto[]>;
let statementsCompanyIds: number[][];

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
    },
    expenseStatements: {
      pdfUrl: (id: number, complete: boolean) =>
        `/api/expense-statements/${id}/pdf?complete=${complete}`,
      zipUrl: (id: number) => `/api/expense-statements/${id}/zip`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useCompanies: () => companiesState,
    useAllRentReceipts: () => receiptsState,
    useAllStatements: (companyIds: number[]) => {
      statementsCompanyIds.push(companyIds);
      return statementsState;
    },
    useLeases: () => leasesState,
  };
});

const RENT_JAN_ACTIVE: RentReceiptDto = {
  id: 11,
  month: "2026-01",
  version: 2,
  status: "ACTIVE",
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  total: "1300.00",
  createdAt: "2026-01-05T10:00:00Z",
};

const RENT_JAN_OLD: RentReceiptDto = {
  id: 10,
  month: "2026-01",
  version: 1,
  status: "ARCHIVED",
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  total: "1300.00",
  createdAt: "2026-01-01T10:00:00Z",
};

const RENT_FEB: RentReceiptDto = {
  id: 12,
  month: "2026-02",
  version: 1,
  status: "ACTIVE",
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  total: "50.00",
  createdAt: "2026-02-02T10:00:00Z",
};

const RENT_MAR_ABADIE: RentReceiptDto = {
  ...RENT_JAN_ACTIVE,
  id: 60,
  month: "2026-03",
  version: 1,
  landlordId: 11,
  tenantId: 12,
  tenantCompanyId: null,
  landlordName: "M. Abadie",
  tenantName: "Mme Blanc",
  total: "400.00",
  createdAt: "2026-03-05T10:00:00Z",
};

const RENT_MAR_DUPONT_OLD: RentReceiptDto = {
  ...RENT_JAN_OLD,
  id: 50,
  month: "2026-03",
  landlordId: 7,
  tenantId: 8,
  tenantCompanyId: null,
  landlordName: "M. Dupont",
  tenantName: "Mme Martin",
  total: "500.00",
  createdAt: "2026-03-01T10:00:00Z",
};

const RENT_MAR_DUPONT_ACTIVE: RentReceiptDto = {
  ...RENT_JAN_ACTIVE,
  id: 51,
  month: "2026-03",
  landlordId: 7,
  tenantId: 8,
  tenantCompanyId: null,
  landlordName: "M. Dupont",
  tenantName: "Mme Martin",
  total: "550.00",
  createdAt: "2026-03-08T10:00:00Z",
};

const RENT_MAR_ZORRO_OLD: RentReceiptDto = {
  ...RENT_JAN_OLD,
  id: 52,
  month: "2026-03",
  landlordId: 9,
  tenantId: 10,
  tenantCompanyId: null,
  landlordName: "M. Zorro",
  tenantName: "Mme Solo",
  total: "600.00",
  createdAt: "2026-03-02T10:00:00Z",
};

const RENT_MAR_ZORRO_ACTIVE: RentReceiptDto = {
  ...RENT_JAN_ACTIVE,
  id: 53,
  month: "2026-03",
  landlordId: 9,
  tenantId: 10,
  tenantCompanyId: null,
  landlordName: "M. Zorro",
  tenantName: "Mme Solo",
  total: "650.00",
  createdAt: "2026-03-09T10:00:00Z",
};

const STATEMENT_JAN_ACTIVE: StatementDto = {
  id: 21,
  month: "2026-01",
  version: 2,
  status: "ACTIVE",
  total: "80.00",
  createdAt: "2026-01-06T10:00:00Z",
  templateName: "Modele",
  templateVersion: 1,
  lines: [
    {
      id: 1,
      itemCode: "gaz",
      amountInclVat: "80.00",
      proRataPct: "100",
    },
  ],
};

const STATEMENT_JAN_OLD: StatementDto = {
  id: 20,
  month: "2026-01",
  version: 1,
  status: "ARCHIVED",
  total: "70.00",
  createdAt: "2026-01-02T10:00:00Z",
};

const STATEMENT_FEB: StatementDto = {
  id: 22,
  month: "2026-02",
  version: 1,
  status: "ACTIVE",
  total: "60.00",
  createdAt: "2026-02-03T10:00:00Z",
};

const LEASE_ALPHA: LeaseDto = {
  id: 5,
  addressId: 51,
  propertyAddress: "1 avenue Alpha",
  landlordId: 1,
  tenantId: 2,
  companyLease: false,
};

const LEASE_ZULU: LeaseDto = {
  id: 6,
  addressId: 61,
  propertyAddress: "9 rue Zulu",
  landlordId: 3,
  tenantId: 4,
  companyLease: false,
};

const RECEIPT_ALPHA_JAN: RentReceiptDto = {
  ...RENT_JAN_ACTIVE,
  id: 31,
  landlordId: 1,
  tenantId: 2,
  tenantCompanyId: null,
  landlordName: "Bailleur Alpha",
  tenantName: "Locataire Alpha",
  total: "100.00",
};

const RECEIPT_ZULU_JAN: RentReceiptDto = {
  ...RENT_JAN_ACTIVE,
  id: 32,
  landlordId: 3,
  tenantId: 4,
  tenantCompanyId: null,
  landlordName: "Bailleur Zulu",
  tenantName: "Locataire Zulu",
  total: "200.00",
};

const RECEIPT_UNMATCHED_JAN: RentReceiptDto = {
  ...RENT_JAN_ACTIVE,
  id: 33,
  landlordId: 99,
  tenantId: 99,
  tenantCompanyId: null,
  landlordName: "Bailleur Inconnu",
  tenantName: "Locataire Inconnu",
  total: "300.00",
};

const STATEMENT_ZULU_JAN: StatementDto = {
  ...STATEMENT_JAN_ACTIVE,
  id: 41,
  leaseId: 6,
  version: 1,
  total: "50.00",
};

const STATEMENT_ANNEXE_JAN_ACTIVE: StatementDto = {
  ...STATEMENT_JAN_ACTIVE,
  id: 71,
  companyId: 2,
  leaseId: 6,
};

const STATEMENT_ANNEXE_JAN_OLD: StatementDto = {
  ...STATEMENT_JAN_OLD,
  id: 70,
  companyId: 2,
  leaseId: 6,
};

const STATEMENT_ANNEXE_JAN_UNLABELLED_ACTIVE: StatementDto = {
  ...STATEMENT_JAN_ACTIVE,
  id: 73,
  leaseId: 6,
};

const STATEMENT_ANNEXE_JAN_UNLABELLED_OLD: StatementDto = {
  ...STATEMENT_JAN_OLD,
  id: 72,
  leaseId: 6,
};

const LEASE_ZULU_ANNEXE: LeaseDto = {
  ...LEASE_ZULU,
  companyId: 2,
};

function readyQuery<T>(data: T[]): QueryLike<T[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function LocationProbe() {
  const location = useLocation();
  const companyId = (location.state as { companyId?: number } | null)
    ?.companyId;
  return (
    <div
      data-cy="rental"
      data-company-id={companyId === undefined ? "" : String(companyId)}
    >
      {location.pathname}
    </div>
  );
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/historique"]}>
      <HistoryPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function currentPath(): string | null {
  return document.querySelector('[data-cy="rental"]')?.textContent ?? null;
}

function reloadedCompanyId(): string | null {
  return (
    document
      .querySelector('[data-cy="rental"]')
      ?.getAttribute("data-company-id") ?? null
  );
}

function columnOf(
  month: string,
  kind: "rent-receipt" | "statement",
): HTMLElement {
  const column = document.querySelector(
    `[data-cy="history-column-${kind}-${month}"]`,
  );
  if (!(column instanceof HTMLElement)) {
    throw new Error(`Column ${kind} of ${month} not found`);
  }
  return column;
}

function resetDrafts() {
  useRentReceiptDraft.setState({
    month: "2025-12",
    periodStart: "2025-12-01",
    periodEnd: "2025-12-31",
    rentExclCharges: "",
    charges: "",
    paymentDate: "",
    issueDate: "",
    templateId: null,
    landlordId: null,
    tenantKey: null,
    initialized: false,
    dirty: false,
  });
  useStatementDraft.setState({
    month: "2025-12",
    companyId: 1,
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
  });
}

beforeEach(() => {
  setAuthUser(null);
  receiptsState = readyQuery([RENT_JAN_ACTIVE, RENT_JAN_OLD, RENT_FEB]);
  statementsState = readyQuery([
    STATEMENT_JAN_ACTIVE,
    STATEMENT_JAN_OLD,
    STATEMENT_FEB,
  ]);
  companiesState = readyQuery([{ id: 1, name: "HKOF" }] as CompanyDto[]);
  leasesState = readyQuery([]);
  statementsCompanyIds = [];
  resetDrafts();
  useToasts.setState({ toasts: [] });
});

/** Renders History, loads the first archived statement version and confirms it. */
async function confirmStatementReload() {
  const user = userEvent.setup();
  receiptsState = readyQuery([]);
  renderPage();
  await screen.findByText("1 mois suivi");
  await user.click(screen.getAllByRole("button", { name: "Charger" })[0]);
  const dialog = screen.getByRole("dialog", { name: "Rouvrir cette note ?" });
  await user.click(
    within(dialog).getByRole("button", { name: "Charger les lignes" }),
  );
  await waitFor(() => expect(currentPath()).toBe("/generer/note-frais"));
}

describe("HistoryPage", () => {
  it("shows the empty state without requiring a company when none exists", () => {
    companiesState = readyQuery([] as CompanyDto[]);
    receiptsState = readyQuery([]);
    statementsState = readyQuery([]);

    renderPage();

    expect(
      screen.queryByText("Aucune société configurée"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Aucun document pour le moment"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Générer une quittance" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Générer une note de frais" }),
    ).not.toBeInTheDocument();
    expect(statementsCompanyIds.at(-1)).toEqual([]);
  });

  it("displays rent receipt history in 1 column when no company is configured", async () => {
    companiesState = readyQuery([] as CompanyDto[]);
    receiptsState = readyQuery([RENT_FEB]);
    statementsState = readyQuery([]);

    renderPage();

    expect(await screen.findByText("1 mois suivi")).toBeInTheDocument();
    expect(
      screen.queryByText("Aucune société configurée"),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector('[data-cy="history-column-rent-receipt-2026-02"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="history-column-statement-2026-02"]'),
    ).toBeNull();
    expect(
      document.querySelector(".history-month-section-columns-single"),
    ).not.toBeNull();
    expect(screen.getByText("Quittance (1)")).toBeInTheDocument();
    expect(screen.queryByText("Note manquante")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Générer une note de frais" }),
    ).not.toBeInTheDocument();
  });

  it("lists the documents of every company without an active company", async () => {
    companiesState = readyQuery([
      { id: 1, name: "HKOF" },
      { id: 2, name: "HKOF Annexe" },
    ] as CompanyDto[]);
    receiptsState = readyQuery([RECEIPT_ALPHA_JAN]);
    statementsState = readyQuery([STATEMENT_ZULU_JAN]);
    leasesState = readyQuery([LEASE_ALPHA, LEASE_ZULU]);

    renderPage();

    expect(await screen.findByText("1 mois suivi")).toBeInTheDocument();
    expect(statementsCompanyIds.at(-1)).toEqual([1, 2]);
    expect(
      document.querySelector('[data-cy="history-address-2026-01-address-51"]'),
    ).not.toBeNull();
    expect(
      document.querySelector(
        '[data-cy="history-address-statement-2026-01-address-61"]',
      ),
    ).not.toBeNull();
    expect(screen.getByText("1 avenue Alpha")).toBeInTheDocument();
    expect(screen.getByText("9 rue Zulu")).toBeInTheDocument();
  });

  it("shows the loading and empty states with the two shortcuts", async () => {
    receiptsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    statementsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const { unmount } = render(
      <MemoryRouter>
        <HistoryPage />
        <LocationProbe />
      </MemoryRouter>,
    );
    expect(screen.getByText("Chargement de l’historique…")).toBeInTheDocument();
    unmount();

    receiptsState = readyQuery([]);
    statementsState = readyQuery([]);
    renderPage();

    expect(
      await screen.findByText("Aucun document pour le moment"),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Générer une quittance" }),
    );
    expect(currentPath()).toBe("/generer/quittance");

    await user.click(
      screen.getByRole("button", { name: "Générer une note de frais" }),
    );
    expect(currentPath()).toBe("/generer/note-frais");
  });

  it("surfaces the rent receipt or statement loading errors and retries", async () => {
    const receiptsRefetch = vi.fn();
    receiptsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Quittances indisponibles"),
      refetch: receiptsRefetch,
    };
    const statementsRefetch = vi.fn();
    statementsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Notes indisponibles"),
      refetch: statementsRefetch,
    };

    renderPage();

    expect(
      await screen.findByText("Quittances indisponibles"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Notes indisponibles")).toBeNull();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(receiptsRefetch).toHaveBeenCalled();
    expect(statementsRefetch).toHaveBeenCalled();
  });

  it("shows the statement error when only the statements fail", async () => {
    receiptsState = readyQuery([RENT_JAN_ACTIVE]);
    statementsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Notes indisponibles"),
      refetch: vi.fn(),
    };

    renderPage();

    expect(await screen.findByText("Notes indisponibles")).toBeInTheDocument();
    expect(screen.getByText("Quittance (1)")).toBeInTheDocument();
  });

  it("groups both document types by month, newest first", async () => {
    renderPage();

    expect(await screen.findByText("2 mois suivis")).toBeInTheDocument();
    const monthHeadings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(monthHeadings[0]).toBe("Février 2026");
    expect(monthHeadings[1]).toBe("Janvier 2026");

    const jan = screen
      .getByRole("heading", { name: "Janvier 2026" })
      .closest("section");
    if (!jan) {
      throw new Error("January section not found");
    }
    expect(
      Array.from(jan.querySelectorAll('[data-cy^="history-column-"]')).map(
        (column) => column.getAttribute("data-cy"),
      ),
    ).toEqual([
      "history-column-rent-receipt-2026-01",
      "history-column-statement-2026-01",
    ]);
    expect(
      within(jan).getByRole("heading", { name: "Quittance de loyer" }),
    ).toBeInTheDocument();
    expect(
      within(jan).getByRole("heading", { name: "Note de frais d’occupation" }),
    ).toBeInTheDocument();
    expect(within(jan).getAllByText("Adresse inconnue")).toHaveLength(2);
    expect(within(jan).getByText("Quittance (2)")).toBeInTheDocument();
    expect(within(jan).getByText("Note (2)")).toBeInTheDocument();
    expect(
      within(jan).getAllByText("M. Bailleur → Mme Locataire").length,
    ).toBeGreaterThan(0);
    expect(within(jan).getAllByText(/1\s300,00/).length).toBeGreaterThan(0);

    const feb = screen
      .getByRole("heading", { name: "Février 2026" })
      .closest("section");
    if (!feb) {
      throw new Error("February section not found");
    }
    expect(within(feb).getByText("Quittance (1)")).toBeInTheDocument();
    expect(within(feb).getByText("Note (1)")).toBeInTheDocument();
  });

  it("counts every statement version of the month in the note badge", async () => {
    receiptsState = readyQuery([RENT_JAN_ACTIVE]);
    statementsState = readyQuery(
      Array.from({ length: 5 }, (_, index) => ({
        ...STATEMENT_JAN_ACTIVE,
        id: 80 + index,
        version: index + 1,
        status: index === 4 ? "ACTIVE" : "ARCHIVED",
        createdAt: `2026-01-0${index + 1}T10:00:00Z`,
      })),
    );

    renderPage();

    const jan = (
      await screen.findByRole("heading", { name: "Janvier 2026" })
    ).closest("section");
    if (!jan) {
      throw new Error("January section not found");
    }
    expect(within(jan).getByText("Note (5)")).toBeInTheDocument();
    expect(
      within(columnOf("2026-01", "statement")).getAllByText("Charger"),
    ).toHaveLength(5);
  });

  it("offers the two generation actions in the populated header", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2 mois suivis");

    const receiptButton = screen.getByRole("button", {
      name: "Générer une quittance",
    });
    expect(receiptButton).toHaveAttribute("data-cy", "btn-new-rent-receipt");
    await user.click(receiptButton);
    expect(currentPath()).toBe("/generer/quittance");

    const statementButton = screen.getByRole("button", {
      name: "Générer une note de frais",
    });
    expect(statementButton).toHaveAttribute(
      "data-cy",
      "btn-new-expense-statement",
    );
    await user.click(statementButton);
    expect(currentPath()).toBe("/generer/note-frais");

    expect(screen.getByText("2 mois suivis")).toBeInTheDocument();
  });

  it("exposes the PDF and open links of the latest documents", async () => {
    renderPage();
    await screen.findByText("2 mois suivis");
  });

  it("lists every archived version and lets users load one", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2 mois suivis");

    expect(
      document.querySelector('[data-cy="history-rent-receipt-11"]'),
    ).toBeInTheDocument();
    const janReceipt = document.querySelector(
      '[data-cy="history-rent-receipt-10"]',
    );
    if (!janReceipt) {
      throw new Error("Archived rent receipt row not found");
    }
    expect(
      within(janReceipt as HTMLElement).getByText("v1"),
    ).toBeInTheDocument();
    expect(
      within(janReceipt as HTMLElement).getByRole("link", { name: "PDF" }),
    ).toHaveAttribute("href", "/api/rent-receipts/10/pdf");

    const februaryNote = columnOf("2026-02", "statement");
    expect(
      februaryNote.querySelectorAll("li.statement-month-panel-history-item"),
    ).toHaveLength(1);
    const januaryNote = columnOf("2026-01", "statement");
    const loadButtons = within(januaryNote).getAllByRole("button", {
      name: "Charger",
    });
    expect(loadButtons).toHaveLength(2);
    await user.click(loadButtons[1]);

    const dialog = screen.getByRole("dialog", { name: "Rouvrir cette note ?" });
    expect(dialog).toHaveTextContent(
      /Les lignes de la version 1 de Janvier 2026 remplaceront/,
    );
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(useStatementDraft.getState().month).toBe("2025-12");
  });

  it("reloads a statement version into the draft after confirmation", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2 mois suivis");

    const januaryNote = columnOf("2026-01", "statement");
    const loadButtons = within(januaryNote).getAllByRole("button", {
      name: "Charger",
    });
    expect(loadButtons).toHaveLength(2);
    await user.click(loadButtons[0]);

    const dialog = screen.getByRole("dialog", { name: "Rouvrir cette note ?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Charger les lignes" }),
    );

    await waitFor(() => expect(currentPath()).toBe("/generer/note-frais"));
    const draft = useStatementDraft.getState();
    const scope = draftScopeKey(1, "2026-01");
    expect(draft.month).toBe("2026-01");
    expect(draft.primedReceiptByMonth[scope]).toBe(11);
    expect(draft.linesByMonth[scope]).toHaveLength(1);
    expect(draft.linesByMonth[scope][0].itemCode).toBe("gaz");
  });

  it("carries the statement company to the generation page", async () => {
    companiesState = readyQuery([
      { id: 1, name: "HKOF" },
      { id: 2, name: "HKOF Annexe" },
    ] as CompanyDto[]);
    statementsState = readyQuery([
      STATEMENT_ANNEXE_JAN_ACTIVE,
      STATEMENT_ANNEXE_JAN_OLD,
    ]);
    leasesState = readyQuery([LEASE_ZULU]);

    await confirmStatementReload();

    expect(reloadedCompanyId()).toBe("2");
    expect(useStatementDraft.getState().companyId).toBe(2);
  });

  it("falls back to the statement lease company when the statement has none", async () => {
    companiesState = readyQuery([
      { id: 1, name: "HKOF" },
      { id: 2, name: "HKOF Annexe" },
    ] as CompanyDto[]);
    statementsState = readyQuery([
      STATEMENT_ANNEXE_JAN_UNLABELLED_ACTIVE,
      STATEMENT_ANNEXE_JAN_UNLABELLED_OLD,
    ]);
    leasesState = readyQuery([LEASE_ZULU_ANNEXE]);

    await confirmStatementReload();

    expect(reloadedCompanyId()).toBe("2");
    expect(useStatementDraft.getState().companyId).toBe(2);
  });

  it("navigates without a company when neither the statement nor its lease names one", async () => {
    companiesState = readyQuery([
      { id: 1, name: "HKOF" },
      { id: 2, name: "HKOF Annexe" },
    ] as CompanyDto[]);
    statementsState = readyQuery([
      STATEMENT_ANNEXE_JAN_UNLABELLED_ACTIVE,
      STATEMENT_ANNEXE_JAN_UNLABELLED_OLD,
    ]);
    leasesState = readyQuery([LEASE_ZULU]);

    await confirmStatementReload();

    expect(reloadedCompanyId()).toBe("");
    expect(useStatementDraft.getState().companyId).toBe(1);
  });

  it("shows a French empty state in a column without a generated document and no generate buttons", async () => {
    receiptsState = readyQuery([RENT_FEB]);
    statementsState = readyQuery([STATEMENT_JAN_ACTIVE]);
    renderPage();
    await screen.findByText("2 mois suivis");

    const februaryNote = columnOf("2026-02", "statement");
    expect(
      within(februaryNote).getByText(
        "Aucune note de frais générée pour ce mois.",
      ),
    ).toBeInTheDocument();
    expect(
      februaryNote.querySelector(
        '[data-cy^="history-address-statement-2026-02"]',
      ),
    ).toBeNull();

    const januaryReceipt = columnOf("2026-01", "rent-receipt");
    expect(
      within(januaryReceipt).getByText(
        "Aucune quittance générée pour ce mois.",
      ),
    ).toBeInTheDocument();
    expect(
      januaryReceipt.querySelector('[data-cy^="history-address-2026-01"]'),
    ).toBeNull();

    expect(
      screen.queryByRole("button", { name: "Générer la quittance" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Générer la note" }),
    ).toBeNull();
  });

  it("lists each document type in its own column, addresses A→Z then unknown", async () => {
    receiptsState = readyQuery([
      RECEIPT_ALPHA_JAN,
      RECEIPT_ZULU_JAN,
      RECEIPT_UNMATCHED_JAN,
    ]);
    statementsState = readyQuery([STATEMENT_ZULU_JAN]);
    leasesState = readyQuery([LEASE_ZULU, LEASE_ALPHA]);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Quittance (3)");
    const receiptRows = Array.from(
      document.querySelectorAll('[data-cy^="history-address-2026-01-"]'),
    ) as HTMLElement[];
    expect(receiptRows.map((row) => row.getAttribute("data-cy"))).toEqual([
      "history-address-2026-01-address-51",
      "history-address-2026-01-address-61",
      "history-address-2026-01-unknown",
    ]);

    const statementRows = Array.from(
      document.querySelectorAll(
        '[data-cy^="history-address-statement-2026-01-"]',
      ),
    ) as HTMLElement[];
    expect(statementRows.map((row) => row.getAttribute("data-cy"))).toEqual([
      "history-address-statement-2026-01-address-61",
    ]);

    const [alpha, zulu, unknown] = receiptRows;
    expect(within(alpha).getByText("1 avenue Alpha")).toBeInTheDocument();
    expect(within(alpha).queryByText(/200,00/)).toBeNull();
    expect(within(alpha).queryByText("Note de frais d’occupation")).toBeNull();

    expect(within(zulu).getByText("9 rue Zulu")).toBeInTheDocument();
    expect(within(zulu).queryByText(/100,00/)).toBeNull();

    const [zuluNote] = statementRows;
    expect(within(zuluNote).getByText("9 rue Zulu")).toBeInTheDocument();
    expect(within(zuluNote).queryByText(/200,00/)).toBeNull();

    expect(within(unknown).getByText("Adresse inconnue")).toBeInTheDocument();

    const [loadZuluNote] = within(zuluNote).getAllByRole("button", {
      name: "Charger",
    });
    await user.click(loadZuluNote);
    const dialog = screen.getByRole("dialog", { name: "Rouvrir cette note ?" });
    expect(dialog).toHaveTextContent(/version 1 de Janvier 2026/);
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prefixes the note row with its company and lists versions without collapsing", async () => {
    receiptsState = readyQuery([RECEIPT_ZULU_JAN]);
    statementsState = readyQuery([
      { ...STATEMENT_JAN_ACTIVE, id: 81, leaseId: 6, companyName: "HKOF" },
      { ...STATEMENT_JAN_OLD, id: 80, leaseId: 6, companyName: "HKOF" },
    ]);
    leasesState = readyQuery([LEASE_ZULU]);
    renderPage();

    await screen.findByText("1 mois suivi");
    const receiptRow = document.querySelector(
      '[data-cy="history-address-2026-01-address-61"]',
    );
    const noteRow = document.querySelector(
      '[data-cy="history-address-statement-2026-01-address-61"]',
    );
    if (
      !(receiptRow instanceof HTMLElement) ||
      !(noteRow instanceof HTMLElement)
    ) {
      throw new Error("Zulu history rows not found");
    }

    expect(within(receiptRow).getByText("9 rue Zulu")).toBeInTheDocument();
    expect(within(noteRow).getByText("HKOF - 9 rue Zulu")).toBeInTheDocument();
    expect(within(noteRow).queryByText("9 rue Zulu")).toBeNull();
    expect(within(noteRow).queryByText("undefined")).toBeNull();

    expect(noteRow.querySelector("details, summary")).toBeNull();
    expect(
      noteRow.querySelectorAll("li.statement-month-panel-history-item"),
    ).toHaveLength(2);
    expect(within(noteRow).getByText("v1")).toBeInTheDocument();
    expect(within(noteRow).getByText("v2")).toBeInTheDocument();
  });

  it("groups receipts by couple: several versions collapse, single versions stay visible", async () => {
    receiptsState = readyQuery([
      RENT_MAR_ZORRO_ACTIVE,
      RENT_MAR_ABADIE,
      RENT_MAR_DUPONT_OLD,
      RENT_MAR_DUPONT_ACTIVE,
      RENT_MAR_ZORRO_OLD,
    ]);
    statementsState = readyQuery([]);
    renderPage();

    await screen.findByText("1 mois suivi");
    const panel = document.querySelector(
      '[data-cy="history-address-2026-03-unknown"] .rent-receipt-month-panel',
    );
    if (!(panel instanceof HTMLElement)) {
      throw new Error("March receipt panel not found");
    }

    const abadie = document.querySelector(
      '[data-cy="history-rent-receipt-60"]',
    );
    expect(abadie?.closest("details")).toBeNull();
    expect(abadie?.parentElement).toHaveClass(
      "rent-receipt-month-panel-history-list",
    );
  });

  it("always shows the address label of a single-address month", async () => {
    receiptsState = readyQuery([RECEIPT_ALPHA_JAN]);
    statementsState = readyQuery([]);
    leasesState = readyQuery([LEASE_ALPHA]);
    renderPage();

    expect(await screen.findByText("1 avenue Alpha")).toBeInTheDocument();
    expect(
      document.querySelectorAll(
        '[data-cy="history-address-2026-01-address-51"]',
      ),
    ).toHaveLength(1);
    expect(
      document.querySelector(
        '[data-cy="btn-download-rent-receipt-2026-01-address-51"]',
      ),
    ).toBeNull();
    expect(
      screen.getByText("Aucune note de frais générée pour ce mois."),
    ).toBeInTheDocument();
  });

  it("ignores documents without a month and older versions of a month", async () => {
    receiptsState = readyQuery([
      { ...RENT_FEB, id: 99, month: undefined },
      RENT_FEB,
    ]);
    statementsState = readyQuery([
      { ...STATEMENT_FEB, id: 98, month: undefined },
      STATEMENT_JAN_OLD,
    ]);
    renderPage();

    expect(await screen.findByText("2 mois suivis")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual(["Février 2026", "Janvier 2026"]);
  });

  it("renders the page header, month cards and panels in English", async () => {
    await i18n.changeLanguage("en");
    renderPage();

    expect(await screen.findByText("2 months tracked")).toBeInTheDocument();
    expect(screen.getByText("Tracking")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "History" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/All versions of your rent receipts/),
    ).toBeInTheDocument();

    const jan = screen
      .getByRole("heading", { name: "January 2026" })
      .closest("section");
    if (!jan) {
      throw new Error("January section not found");
    }
    expect(within(jan).getByText("Month")).toBeInTheDocument();
    expect(within(jan).getByText("Rent receipt (2)")).toBeInTheDocument();
    expect(within(jan).getByText("Statement (2)")).toBeInTheDocument();
    expect(
      within(jan).getByRole("heading", { name: "Rent receipt" }),
    ).toBeInTheDocument();
    expect(
      within(jan).getByRole("heading", {
        name: "Home-office expense statement",
      }),
    ).toBeInTheDocument();
    expect(within(jan).getAllByText("Unknown address")).toHaveLength(2);
    expect(within(jan).getAllByRole("button", { name: "Load" })).toHaveLength(
      2,
    );
    expect(within(jan).getAllByRole("link", { name: "PDF" })).toHaveLength(4);
    expect(within(jan).getAllByRole("link", { name: "Complete" })).toHaveLength(
      2,
    );

    const feb = screen
      .getByRole("heading", { name: "February 2026" })
      .closest("section");
    if (!feb) {
      throw new Error("February section not found");
    }
    expect(within(feb).getByText("Rent receipt (1)")).toBeInTheDocument();
    expect(within(feb).getByText("Statement (1)")).toBeInTheDocument();
  });

  it("renders the loading and empty states in English", async () => {
    receiptsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    statementsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    await i18n.changeLanguage("en");
    const { unmount } = render(
      <MemoryRouter>
        <HistoryPage />
        <LocationProbe />
      </MemoryRouter>,
    );
    expect(screen.getByText("Loading the history…")).toBeInTheDocument();
    unmount();

    receiptsState = readyQuery([]);
    statementsState = readyQuery([]);
    renderPage();

    expect(await screen.findByText("No document yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Generate a rent receipt or an expense statement/),
    ).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Generate a rent receipt" }),
    );
    expect(currentPath()).toBe("/generer/quittance");

    await user.click(
      screen.getByRole("button", { name: "Generate an expense statement" }),
    );
    expect(currentPath()).toBe("/generer/note-frais");
  });

  it("reloads a statement with the English dialog and toast", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2 months tracked");

    const januaryNote = columnOf("2026-01", "statement");
    await user.click(
      within(januaryNote).getAllByRole("button", { name: "Load" })[1],
    );

    const dialog = screen.getByRole("dialog", {
      name: "Reopen this statement?",
    });
    expect(dialog).toHaveTextContent(
      /The lines of version 1 for January 2026 will replace this month's draft/,
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Load the lines" }),
    );
    await waitFor(() => expect(currentPath()).toBe("/generer/note-frais"));
    expect(
      useToasts.getState().toasts.map((element) => element.message),
    ).toContain("January 2026 lines reloaded into the draft.");
  });

  it("aligns the version headers and rows on one shared grid", async () => {
    renderPage();
    await screen.findByText("2 mois suivis");

    const receiptRow = document.querySelector(
      '[data-cy="history-rent-receipt-10"]',
    );
    if (!(receiptRow instanceof HTMLElement)) {
      throw new Error("Archived rent receipt row not found");
    }
    expect(receiptRow).toHaveClass(
      "history-versions-grid",
      "history-versions-grid-quittance",
    );
    expect(
      receiptRow.querySelector(".rent-receipt-month-panel-history-date"),
    ).toHaveClass("number", "history-versions-number");
    expect(
      receiptRow.querySelector(".rent-receipt-month-panel-history-amount"),
    ).toHaveClass("number", "history-versions-number");

    const noteColumn = columnOf("2026-01", "statement");
    const noteRow = noteColumn.querySelector(
      "li.statement-month-panel-history-item",
    );
    if (!(noteRow instanceof HTMLElement)) {
      throw new Error("Statement version row not found");
    }
    expect(noteRow).toHaveClass(
      "history-versions-grid",
      "history-versions-grid-note",
    );
    expect(
      noteRow.querySelector(".statement-month-panel-history-date"),
    ).toHaveClass("number", "history-versions-number");
    expect(
      noteRow.querySelector(".statement-month-panel-history-amount"),
    ).toHaveClass("number", "history-versions-number");
  });

  it("relabels the month cards and address rows without a reload", async () => {
    renderPage();
    await screen.findByText("Quittance (2)");
    expect(screen.getAllByText("Adresse inconnue").length).toBeGreaterThan(0);

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    const jan = screen
      .getByRole("heading", { name: "January 2026" })
      .closest("section");
    if (!jan) {
      throw new Error("January section not found");
    }
    expect(within(jan).getByText("Rent receipt (2)")).toBeInTheDocument();
    expect(within(jan).getByText("Statement (2)")).toBeInTheDocument();
    expect(within(jan).getAllByText("Unknown address")).toHaveLength(2);
    expect(within(jan).queryAllByText("Adresse inconnue")).toHaveLength(0);

    await act(async () => {
      await i18n.changeLanguage("fr");
    });

    expect(screen.getByText("Quittance (2)")).toBeInTheDocument();
    expect(screen.getAllByText("Adresse inconnue").length).toBeGreaterThan(0);
  });
});

describe("HistoryPage module filtering", () => {
  it("hides rent receipts and their actions for a company-only account", async () => {
    setAuthUser({
      email: "societe@exemple.fr",
      companyEnabled: true,
      lmnpEnabled: false,
    });

    renderPage();

    expect((await screen.findAllByText(/^Note \(/)).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^Quittance \(/)).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Générer une note de frais" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Générer une quittance" }),
    ).toBeNull();
  });

  it("hides expense statements and their actions for an LMNP-only account", async () => {
    setAuthUser({
      email: "lmnp@exemple.fr",
      companyEnabled: false,
      lmnpEnabled: true,
    });

    renderPage();

    expect(
      (await screen.findAllByText(/^Quittance \(/)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^Note \(/)).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Générer une quittance" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Générer une note de frais" }),
    ).toBeNull();
  });
});
