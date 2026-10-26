import { configure, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { LeaseDto, StatementDto } from "@/api/types";
import { formatDateTime, formatEUR, formatMonth } from "@/lib/format";
import { CompanyLeaseStatementHistory } from "./CompanyLeaseStatementHistory";

configure({ testIdAttribute: "data-cy" });

// jest-dom collapses the narrow no-break spaces of the formatted amounts.
function collapsed(value: string): string {
  return value.replace(/[\s\u00a0\u202f]/g, " ");
}

vi.mock("@/api/endpoints", () => ({
  api: {
    expenseStatements: {
      pdfUrl: (id: number, complete: boolean) =>
        `/api/expense-statements/${id}/pdf?complete=${complete}`,
      zipUrl: (id: number) => `/api/expense-statements/${id}/zip`,
    },
  },
}));

const LEASE: LeaseDto = {
  id: 5,
  companyId: 1,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
};

function statement(overrides: Partial<StatementDto>): StatementDto {
  return {
    id: 101,
    companyId: 1,
    leaseId: 5,
    month: "2026-09",
    total: "950.00",
    version: 1,
    status: "ACTIVE",
    createdAt: "2026-09-30T10:00:00Z",
    ...overrides,
  };
}

function renderHistory({
  lease = LEASE,
  statements = [] as StatementDto[],
  isPending = false,
  isError = false,
  error = null as Error | null,
  onRetry = vi.fn(),
}: {
  lease?: LeaseDto;
  statements?: StatementDto[];
  isPending?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
} = {}) {
  render(
    <CompanyLeaseStatementHistory
      lease={lease}
      statements={statements}
      isPending={isPending}
      isError={isError}
      error={error}
      onRetry={onRetry}
    />,
  );
  return { onRetry };
}

describe("CompanyLeaseStatementHistory", () => {
  it("groups the statements by month, newest month first, with a version count", () => {
    renderHistory({
      statements: [
        statement({ id: 101, month: "2026-09" }),
        statement({
          id: 102,
          month: "2026-10",
          createdAt: "2026-10-31T10:00:00Z",
        }),
        statement({
          id: 103,
          month: "2026-09",
          version: 2,
          status: "ARCHIVED",
          createdAt: "2026-09-30T12:00:00Z",
        }),
      ],
    });

    const history = screen.getByTestId("notes-frais-bail-5");
    const months = within(history).getAllByRole("group");
    expect(months).toHaveLength(2);
    expect(months[0]).toHaveTextContent(formatMonth("2026-10"));
    expect(months[0]).toHaveTextContent("1 note");
    expect(months[1]).toHaveTextContent(formatMonth("2026-09"));
    expect(months[1]).toHaveTextContent("2 notes");
    expect(
      screen.getByTestId("notes-frais-bail-mois-5-2026-10"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("notes-frais-bail-mois-5-2026-09"),
    ).toBeInTheDocument();
  });

  it("expands a month and lists every version newest first with date, total, PDF and ZIP", async () => {
    renderHistory({
      statements: [
        statement({
          id: 101,
          version: 1,
          status: "ARCHIVED",
          createdAt: "2026-09-30T10:00:00Z",
          total: "950.00",
        }),
        statement({
          id: 103,
          version: 2,
          status: "ACTIVE",
          createdAt: "2026-09-30T12:00:00Z",
          total: "980.00",
        }),
      ],
    });

    const month = screen.getByTestId("notes-frais-bail-mois-5-2026-09");
    const summary = month.querySelector("summary");
    expect(summary).not.toBeNull();
    await userEvent.click(summary as HTMLElement);
    expect(month).toHaveAttribute("open");

    const items = within(month).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("v2");
    expect(items[0]).toHaveTextContent(formatDateTime("2026-09-30T12:00:00Z"));
    expect(items[0]).toHaveTextContent(collapsed(formatEUR("980.00")));
    expect(items[1]).toHaveTextContent("v1");
    expect(items[1]).toHaveTextContent(collapsed(formatEUR("950.00")));

    expect(
      screen.getByTestId("telecharger-note-frais-bail-103"),
    ).toHaveAttribute("href", "/api/expense-statements/103/pdf?complete=false");
    expect(
      screen.getByTestId("telecharger-note-frais-complete-bail-103"),
    ).toHaveAttribute("href", "/api/expense-statements/103/zip");
    expect(
      screen.getByTestId("telecharger-note-frais-bail-101"),
    ).toHaveAttribute("href", "/api/expense-statements/101/pdf?complete=false");
    expect(
      screen.getByTestId("telecharger-note-frais-complete-bail-101"),
    ).toHaveAttribute("href", "/api/expense-statements/101/zip");
  });

  it("keeps only the statements strictly attached to this lease", () => {
    renderHistory({
      statements: [
        statement({ id: 201 }),
        statement({ id: 202, leaseId: 6 }),
        statement({ id: 203, leaseId: null }),
        statement({ id: 204, leaseId: undefined }),
      ],
    });

    expect(
      screen.getByTestId("telecharger-note-frais-bail-201"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("telecharger-note-frais-bail-202")).toBeNull();
    expect(screen.queryByTestId("telecharger-note-frais-bail-203")).toBeNull();
    expect(screen.queryByTestId("telecharger-note-frais-bail-204")).toBeNull();
  });

  it("shows a French empty state when the lease has no statement", () => {
    renderHistory({ statements: [] });

    expect(
      screen.getByText("Aucune note de frais générée pour ce bail."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("notes-frais-bail-vide-5")).toBeInTheDocument();
  });

  it("shows a French loading state", () => {
    renderHistory({ isPending: true });

    expect(
      screen.getByText("Chargement des notes de frais…"),
    ).toBeInTheDocument();
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

  it("falls back to the empty state when the statement list is still undefined", () => {
    renderHistory({ statements: undefined });

    expect(
      screen.getByText("Aucune note de frais générée pour ce bail."),
    ).toBeInTheDocument();
  });

  it("stays row-safe when a statement lacks its optional fields", () => {
    renderHistory({
      statements: [
        statement({
          id: undefined,
          month: undefined,
          version: undefined,
          status: undefined,
          createdAt: undefined,
          total: undefined,
        }),
      ],
    });

    const month = screen.getByTestId("notes-frais-bail-mois-5-");
    const items = within(month).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("v1");
    expect(items[0]).toHaveTextContent("—");
    expect(month.querySelector("a")).toBeNull();
  });
});
