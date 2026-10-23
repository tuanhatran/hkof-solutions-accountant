import { History } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { useRentReceipts, useStatements } from "@/api/queries";
import type { StatementDto } from "@/api/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatMonth } from "@/lib/format";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import { HistoryEmptyState } from "./HistoryEmptyState";
import { HistoryMonthSection } from "./HistoryMonthSection";
import { HistoryReloadDialog } from "./HistoryReloadDialog";
import { current, type MonthGroup } from "./historyHelpers";

export function HistoryPage() {
  const navigate = useNavigate();
  const rentReceiptsQuery = useRentReceipts();
  const statementsQuery = useStatements();
  const [statementToReload, setStatementToReload] =
    useState<StatementDto | null>(null);

  const groups = useMemo<MonthGroup[]>(() => {
    const byMonth = new Map<string, MonthGroup>();
    for (const rentReceipt of rentReceiptsQuery.data ?? []) {
      if (!rentReceipt.month) {
        continue;
      }
      const group = byMonth.get(rentReceipt.month) ?? {
        month: rentReceipt.month,
        rentReceipts: [],
        statements: [],
      };
      group.rentReceipts.push(rentReceipt);
      byMonth.set(rentReceipt.month, group);
    }
    for (const statement of statementsQuery.data ?? []) {
      if (!statement.month) {
        continue;
      }
      const group = byMonth.get(statement.month) ?? {
        month: statement.month,
        rentReceipts: [],
        statements: [],
      };
      group.statements.push(statement);
      byMonth.set(statement.month, group);
    }
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month));
  }, [rentReceiptsQuery.data, statementsQuery.data]);

  const loading = rentReceiptsQuery.isPending || statementsQuery.isPending;
  const errorText = rentReceiptsQuery.isError
    ? errorMessage(rentReceiptsQuery.error)
    : statementsQuery.isError
      ? errorMessage(statementsQuery.error)
      : null;

  function reload() {
    void rentReceiptsQuery.refetch();
    void statementsQuery.refetch();
  }

  function createRentReceipt(month: string) {
    useRentReceiptDraft.getState().changeMonth(month);
    navigate("/generer/quittance");
  }

  function createStatement(month: string) {
    useStatementDraft.getState().changeMonth(month);
    navigate("/generer/note-frais");
  }

  function confirmReload() {
    if (!statementToReload?.month) {
      return;
    }
    const rentReceipt = current(
      groups.find((group) => group.month === statementToReload.month)
        ?.rentReceipts ?? [],
    );
    useStatementDraft
      .getState()
      .loadFromStatement(statementToReload, rentReceipt?.id ?? null);
    setStatementToReload(null);
    toast.info(
      `Lignes de ${formatMonth(statementToReload.month)} rechargées dans le brouillon.`,
    );
    navigate("/generer/note-frais");
  }

  return (
    <>
      <PageHeader
        eyebrow="Suivi"
        title="Historique"
        description="Toutes les versions de vos quittances et notes de frais, classées par mois. Les versions archivées restent téléchargeables et consultables."
        actions={
          <span className="badge badge-neutral">
            <History size={12} aria-hidden="true" />
            {groups.length} mois suivi{groups.length > 1 ? "s" : ""}
          </span>
        }
      />

      {errorText ? (
        <div className="mb-4">
          <ErrorState message={errorText} onRetry={reload} />
        </div>
      ) : null}

      {loading && groups.length === 0 ? (
        <LoadingState message="Chargement de l’historique…" />
      ) : groups.length === 0 && !errorText ? (
        <HistoryEmptyState
          onCreateRentReceipt={() => navigate("/generer/quittance")}
          onCreateStatement={() => navigate("/generer/note-frais")}
        />
      ) : (
        <div className="space-y-4" data-cy="historique">
          {groups.map((group) => (
            <HistoryMonthSection
              key={group.month}
              group={group}
              onCreateRentReceipt={createRentReceipt}
              onCreateStatement={createStatement}
              onReloadStatement={setStatementToReload}
            />
          ))}
        </div>
      )}

      <HistoryReloadDialog
        statement={statementToReload}
        onConfirm={confirmReload}
        onCancel={() => setStatementToReload(null)}
      />
    </>
  );
}
