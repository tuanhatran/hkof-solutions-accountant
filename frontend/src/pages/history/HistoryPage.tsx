import "./HistoryPage.css";
import { History } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import {
  useCompanies,
  useLeases,
  useRentReceipts,
  useStatements,
} from "@/api/queries";
import type { StatementDto } from "@/api/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatMonth } from "@/lib/format";
import { resolveActiveCompanyId, useCompanyStore } from "@/state/company";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import { HistoryEmptyState } from "./HistoryEmptyState";
import { HistoryMonthSection } from "./HistoryMonthSection";
import { HistoryReloadDialog } from "./HistoryReloadDialog";
import { current, groupHistoryByMonthAndAddress } from "./historyHelpers";

export function HistoryPage() {
  const navigate = useNavigate();
  const companies = useCompanies();
  const storedCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const activeCompanyId = resolveActiveCompanyId(
    storedCompanyId,
    companies.data,
  );
  // History is company-scoped: the active company owns every listed document.
  const rentReceiptsQuery = useRentReceipts(activeCompanyId);
  const statementsQuery = useStatements(activeCompanyId);
  const leasesQuery = useLeases();
  const [statementToReload, setStatementToReload] =
    useState<StatementDto | null>(null);

  const groups = useMemo(
    () =>
      groupHistoryByMonthAndAddress(
        rentReceiptsQuery.data ?? [],
        statementsQuery.data ?? [],
        leasesQuery.data ?? [],
        activeCompanyId,
      ),
    [
      rentReceiptsQuery.data,
      statementsQuery.data,
      leasesQuery.data,
      activeCompanyId,
    ],
  );

  const loading =
    companies.isPending ||
    rentReceiptsQuery.isPending ||
    statementsQuery.isPending ||
    leasesQuery.isPending;
  const errorText = rentReceiptsQuery.isError
    ? errorMessage(rentReceiptsQuery.error)
    : statementsQuery.isError
      ? errorMessage(statementsQuery.error)
      : null;

  function reload() {
    void rentReceiptsQuery.refetch();
    void statementsQuery.refetch();
  }

  function confirmReload() {
    if (!statementToReload?.month) {
      return;
    }
    const address = groups
      .find((group) => group.month === statementToReload.month)
      ?.addresses.find((row) =>
        row.statements.some(
          (statement) =>
            statement.id !== undefined && statement.id === statementToReload.id,
        ),
      );
    const rentReceipt = current(address?.rentReceipts ?? []);
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
        <div className="history-page-error">
          <ErrorState message={errorText} onRetry={reload} />
        </div>
      ) : null}

      {loading && groups.length === 0 ? (
        <LoadingState message="Chargement de l’historique…" />
      ) : activeCompanyId === null ? (
        <EmptyState
          title="Aucune société active"
          description="Créez ou sélectionnez une société dans la configuration pour consulter son historique."
        />
      ) : groups.length === 0 && !errorText ? (
        <HistoryEmptyState
          onCreateRentReceipt={() => navigate("/generer/quittance")}
          onCreateStatement={() => navigate("/generer/note-frais")}
        />
      ) : (
        <div className="history-page-months" data-cy="historique">
          {groups.map((group) => (
            <HistoryMonthSection
              key={group.month}
              group={group}
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
