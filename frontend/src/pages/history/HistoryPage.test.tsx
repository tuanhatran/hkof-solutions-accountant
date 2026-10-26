import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CompanyDto,
  LeaseDto,
  RentReceiptDto,
  StatementDto,
} from "@/api/types";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
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
  return <div data-cy="location">{location.pathname}</div>;
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
  return document.querySelector('[data-cy="location"]')?.textContent ?? null;
}

function columnOf(month: string, kind: "quittance" | "note"): HTMLElement {
  const column = document.querySelector(
    `[data-cy="historique-colonne-${kind}-${month}"]`,
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
    linesByMonth: {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
  });
}

beforeEach(() => {
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

describe("HistoryPage", () => {
  it("asks to configure a company when none exists", () => {
    companiesState = readyQuery([] as CompanyDto[]);
    receiptsState = readyQuery([]);
    statementsState = readyQuery([]);

    renderPage();

    expect(screen.getByText("Aucune société configurée")).toBeInTheDocument();
    expect(
      screen.queryByText("Aucun document pour le moment"),
    ).not.toBeInTheDocument();
    expect(statementsCompanyIds.at(-1)).toEqual([]);
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
      document.querySelector(
        '[data-cy="historique-adresse-2026-01-address-51"]',
      ),
    ).not.toBeNull();
    expect(
      document.querySelector(
        '[data-cy="historique-adresse-note-2026-01-address-61"]',
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
    expect(screen.getByText("Quittance v2")).toBeInTheDocument();
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
      Array.from(jan.querySelectorAll('[data-cy^="historique-colonne-"]')).map(
        (column) => column.getAttribute("data-cy"),
      ),
    ).toEqual([
      "historique-colonne-quittance-2026-01",
      "historique-colonne-note-2026-01",
    ]);
    expect(
      within(jan).getByRole("heading", { name: "Quittance de loyer" }),
    ).toBeInTheDocument();
    expect(
      within(jan).getByRole("heading", { name: "Note de frais d’occupation" }),
    ).toBeInTheDocument();
    expect(within(jan).getAllByText("Adresse inconnue")).toHaveLength(2);
    expect(within(jan).getByText("Quittance (2)")).toBeInTheDocument();
    expect(within(jan).getByText("Note v2")).toBeInTheDocument();
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
    expect(within(feb).getByText("Quittance v1")).toBeInTheDocument();
    expect(within(feb).getByText("Note v1")).toBeInTheDocument();
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
      screen.getByText("M. Bailleur → Mme Locataire (2)"),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-cy="historique-quittance-11"]'),
    ).toBeInTheDocument();
    const janReceipt = document.querySelector(
      '[data-cy="historique-quittance-10"]',
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

    expect(screen.getByText("Toutes les versions (2)")).toBeInTheDocument();
    const loadButtons = screen.getAllByRole("button", { name: "Charger" });
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

    await user.click(
      document.querySelector(
        '[data-cy="btn-rouvrir-note-2026-01"]',
      ) as HTMLElement,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      document.querySelector(
        '[data-cy="btn-rouvrir-note-2026-01"]',
      ) as HTMLElement,
    );

    await waitFor(() => expect(currentPath()).toBe("/historique"));
    const draft = useStatementDraft.getState();
    expect(draft.month).toBe("2025-12");
  });

  it("shows a French empty state in a column without a generated document and no generate buttons", async () => {
    receiptsState = readyQuery([RENT_FEB]);
    statementsState = readyQuery([STATEMENT_JAN_ACTIVE]);
    renderPage();
    await screen.findByText("2 mois suivis");

    const februaryNote = columnOf("2026-02", "note");
    expect(
      within(februaryNote).getByText(
        "Aucune note de frais générée pour ce mois.",
      ),
    ).toBeInTheDocument();
    expect(
      februaryNote.querySelector(
        '[data-cy^="historique-adresse-note-2026-02"]',
      ),
    ).toBeNull();

    const januaryReceipt = columnOf("2026-01", "quittance");
    expect(
      within(januaryReceipt).getByText(
        "Aucune quittance générée pour ce mois.",
      ),
    ).toBeInTheDocument();
    expect(
      januaryReceipt.querySelector('[data-cy^="historique-adresse-2026-01"]'),
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
      document.querySelectorAll('[data-cy^="historique-adresse-2026-01-"]'),
    ) as HTMLElement[];
    expect(receiptRows.map((row) => row.getAttribute("data-cy"))).toEqual([
      "historique-adresse-2026-01-address-51",
      "historique-adresse-2026-01-address-61",
      "historique-adresse-2026-01-inconnue",
    ]);

    const statementRows = Array.from(
      document.querySelectorAll(
        '[data-cy^="historique-adresse-note-2026-01-"]',
      ),
    ) as HTMLElement[];
    expect(statementRows.map((row) => row.getAttribute("data-cy"))).toEqual([
      "historique-adresse-note-2026-01-address-61",
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

    await user.click(
      document.querySelector(
        '[data-cy="btn-rouvrir-note-2026-01-address-61"]',
      ) as HTMLElement,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
      '[data-cy="historique-adresse-2026-03-inconnue"] .rent-receipt-month-panel',
    );
    if (!(panel instanceof HTMLElement)) {
      throw new Error("March receipt panel not found");
    }

    const sections = Array.from(panel.children).map(
      (section) =>
        section.querySelector("summary")?.textContent ??
        section.querySelector("li .text-ink")?.textContent ??
        "",
    );
    expect(sections).toEqual([
      "M. Abadie → Mme Blanc",
      "M. Dupont → Mme Martin (2)",
      "M. Zorro → Mme Solo (2)",
    ]);

    const collapses = Array.from(panel.querySelectorAll("details"));
    expect(collapses).toHaveLength(2);
    const collapseKeys = collapses.map((element) =>
      element.getAttribute("data-cy"),
    );
    expect(new Set(collapseKeys).size).toBe(2);
    for (const key of collapseKeys) {
      expect(key).toMatch(/^quittances-mois-2026-03-/);
    }

    const dupont = collapses[0];
    expect(dupont).not.toHaveAttribute("open");
    expect(
      Array.from(
        dupont.querySelectorAll('[data-cy^="historique-quittance-"]'),
      ).map((item) => item.getAttribute("data-cy")),
    ).toEqual(["historique-quittance-51", "historique-quittance-50"]);

    const abadie = document.querySelector(
      '[data-cy="historique-quittance-60"]',
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
        '[data-cy="historique-adresse-2026-01-address-51"]',
      ),
    ).toHaveLength(1);
    expect(
      document.querySelector(
        '[data-cy="btn-telecharger-quittance-2026-01-address-51"]',
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
});
