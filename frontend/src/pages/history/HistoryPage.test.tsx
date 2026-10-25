import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompanyDto, RentReceiptDto, StatementDto } from "@/api/types";
import { useCompanyStore } from "@/state/company";
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
    useRentReceipts: () => receiptsState,
    useStatements: () => statementsState,
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

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
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
  useCompanyStore.setState({ activeCompanyId: 1 });
  resetDrafts();
  useToasts.setState({ toasts: [] });
});

describe("HistoryPage", () => {
  it("asks to configure a company when none is active", () => {
    companiesState = readyQuery([] as CompanyDto[]);
    useCompanyStore.setState({ activeCompanyId: null });
    receiptsState = readyQuery([]);
    statementsState = readyQuery([]);

    renderPage();

    expect(screen.getByText("Aucune société active")).toBeInTheDocument();
    expect(
      screen.queryByText("Aucun document pour le moment"),
    ).not.toBeInTheDocument();
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
    expect(within(jan).getByText("Quittance (2)")).toBeInTheDocument();
    expect(within(jan).getByText("Note v2")).toBeInTheDocument();
    expect(
      within(jan).getAllByText("M. Bailleur → Mme Locataire").length,
    ).toBeGreaterThan(0);
    expect(within(jan).getAllByText(/1\s300,00/).length).toBeGreaterThan(0);
    expect(within(jan).getByText(/Version 2 .* Modele v1/)).toBeInTheDocument();

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

    expect(
      document.querySelector('[data-cy="btn-telecharger-quittance-2026-01"]'),
    ).toHaveAttribute("href", "/api/rent-receipts/11/pdf");
    expect(
      document.querySelector('[data-cy="btn-telecharger-note-2026-01"]'),
    ).toHaveAttribute("href", "/api/expense-statements/21/pdf?complete=false");
    expect(
      document.querySelector(
        '[data-cy="btn-telecharger-note-complete-2026-01"]',
      ),
    ).toHaveAttribute("href", "/api/expense-statements/21/zip");

    const openHrefs = screen
      .getAllByRole("link", { name: "Ouvrir" })
      .map((link) => link.getAttribute("href"));
    expect(openHrefs).toContain("/api/rent-receipts/11/pdf");
    expect(openHrefs).toContain("/api/expense-statements/21/pdf?complete=true");
  });

  it("lists every archived version and lets users load one", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2 mois suivis");

    expect(
      screen.getByText("Toutes les quittances du mois (2)"),
    ).toBeInTheDocument();
    const janReceipt = document.querySelector(
      '[data-cy="historique-quittance-10"]',
    );
    if (!janReceipt) {
      throw new Error("Archived rent receipt row not found");
    }
    expect(
      within(janReceipt as HTMLElement).getByText("v1 · archivée"),
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

    let dialog = screen.getByRole("dialog", { name: "Rouvrir cette note ?" });
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(
      document.querySelector(
        '[data-cy="btn-rouvrir-note-2026-01"]',
      ) as HTMLElement,
    );
    dialog = screen.getByRole("dialog", { name: "Rouvrir cette note ?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Charger les lignes" }),
    );

    await waitFor(() => expect(currentPath()).toBe("/generer/note-frais"));
    const draft = useStatementDraft.getState();
    expect(draft.month).toBe("2026-01");
    expect(draft.primedReceiptByMonth["2026-01"]).toBe(11);
    expect(draft.linesByMonth["2026-01"]).toHaveLength(1);
    expect(draft.linesByMonth["2026-01"][0].itemCode).toBe("gaz");
    expect(toastMessages()).toContain(
      "Lignes de Janvier 2026 rechargées dans le brouillon.",
    );
  });

  it("starts a missing document of a month from its panel", async () => {
    receiptsState = readyQuery([RENT_FEB]);
    statementsState = readyQuery([STATEMENT_JAN_ACTIVE]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("2 mois suivis");

    expect(screen.getAllByText("Aucune version pour ce mois.")).toHaveLength(2);
    await user.click(
      screen.getByRole("button", { name: "Générer la quittance" }),
    );
    expect(useRentReceiptDraft.getState().month).toBe("2026-01");
    expect(currentPath()).toBe("/generer/quittance");

    await user.click(screen.getByRole("button", { name: "Générer la note" }));
    expect(useStatementDraft.getState().month).toBe("2026-02");
    expect(currentPath()).toBe("/generer/note-frais");
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
    expect(screen.getAllByText(/Version 1/).length).toBe(2);
  });
});
