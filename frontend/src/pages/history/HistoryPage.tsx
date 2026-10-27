import "./HistoryPage.css";
import { FileText, History, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import {
  useAllRentReceipts,
  useAllStatements,
  useCompanies,
  useLeases,
} from "@/api/queries";
import type { StatementDto } from "@/api/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatMonth } from "@/lib/format";
import { useCompanyStore } from "@/state/company";
import { useStatementDraft } from "@/state/statementDraft";
import { toast } from "@/state/toasts";
import { HistoryEmptyState } from "./HistoryEmptyState";
import { HistoryMonthSection } from "./HistoryMonthSection";
import { HistoryReloadDialog } from "./HistoryReloadDialog";
import {
  current,
  groupHistoryByMonthAndAddress,
  resolveLeaseForDocument,
} from "./historyHelpers";

export function HistoryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const companies = useCompanies();
  const companyIds = useMemo(
    () =>
      (companies.data ?? [])
        .map((company) => company.id)
        .filter((id): id is number => typeof id === "number"),
    [companies.data],
  );
  // History spans every company: rent receipts are global, statements are
  // fetched once per company.
  const rentReceiptsQuery = useAllRentReceipts();
  const statementsQuery = useAllStatements(companyIds);
  const leasesQuery = useLeases();
  const [statementToReload, setStatementToReload] =
    useState<StatementDto | null>(null);

  const groups = useMemo(
    () =>
      groupHistoryByMonthAndAddress(
        rentReceiptsQuery.data ?? [],
        statementsQuery.data ?? [],
        leasesQuery.data ?? [],
        i18n.resolvedLanguage,
      ),
    [
      rentReceiptsQuery.data,
      statementsQuery.data,
      leasesQuery.data,
      i18n.resolvedLanguage,
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
    // The statement draft is global: pin the internal company store to the
    // statement's company so the generation page cannot resolve another one.
    const lease = resolveLeaseForDocument(
      statementToReload,
      leasesQuery.data ?? [],
    );
    const companyId =
      typeof statementToReload.companyId === "number"
        ? statementToReload.companyId
        : lease?.companyId;
    if (typeof companyId === "number") {
      useCompanyStore.getState().setActiveCompany(companyId);
    }
    useStatementDraft
      .getState()
      .loadFromStatement(statementToReload, rentReceipt?.id ?? null);
    setStatementToReload(null);
    toast.info(
      t("history.page.reloaded", {
        month: formatMonth(statementToReload.month),
      }),
    );
    navigate("/generer/note-frais");
  }

  return (
    <>
      <PageHeader
        eyebrow={t("history.page.eyebrow")}
        title={t("history.page.title")}
        description={t("history.page.description")}
        actions={
          groups.length > 0 ? (
            <>
              <Button
                variant="primary"
                icon={<FileText size={14} aria-hidden="true" />}
                onClick={() => navigate("/generer/quittance")}
                data-cy="btn-nouvelle-quittance"
              >
                {t("history.empty.createRentReceipt")}
              </Button>
              <Button
                variant="secondary"
                icon={<ReceiptText size={14} aria-hidden="true" />}
                onClick={() => navigate("/generer/note-frais")}
                data-cy="btn-nouvelle-note-frais"
              >
                {t("history.empty.createStatement")}
              </Button>
              <span className="badge badge-neutral">
                <History size={12} aria-hidden="true" />
                {t("history.page.monthCount", { count: groups.length })}
              </span>
            </>
          ) : undefined
        }
      />

      {errorText ? (
        <div className="history-page-error">
          <ErrorState message={errorText} onRetry={reload} />
        </div>
      ) : null}

      {loading && groups.length === 0 ? (
        <LoadingState message={t("history.page.loading")} />
      ) : companyIds.length === 0 ? (
        <EmptyState
          title={t("history.page.noCompanyTitle")}
          description={t("history.page.noCompanyDescription")}
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
