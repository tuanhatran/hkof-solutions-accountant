import "./HistoryPage.css";
import { Archive, History } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "@/api/client";
import {
  useAllRentReceipts,
  useAllStatements,
  useCompanies,
  useLeases,
  useModuleAccess,
  useReceivedRentReceipts,
} from "@/api/queries";
import type { RentReceiptDto, StatementDto } from "@/api/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { formatMonth } from "@/lib/format";
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
  const access = useModuleAccess();
  const companies = useCompanies(access.companyEnabled);
  const companyIds = useMemo(
    () =>
      access.companyEnabled
        ? (companies.data ?? [])
            .map((company) => company.id)
            .filter((id): id is number => typeof id === "number")
        : [],
    [companies.data, access.companyEnabled],
  );
  const hasCompany = access.companyEnabled && companyIds.length > 0;
  // History spans every document: rent receipts and leases belong to the LMNP
  // module, statements to the company module. A disabled module is never
  // queried, since its API answers 403 MODULE_*_DISABLED.
  const rentReceiptsQuery = useAllRentReceipts(access.lmnpEnabled);
  // Receipts issued by landlords for the account's companies. The received route
  // is not LMNP-gated, so a company-only owner still sees them.
  const receivedReceiptsQuery = useReceivedRentReceipts(access.companyEnabled);
  const receivedReceipts = useMemo<RentReceiptDto[]>(
    () =>
      access.companyEnabled
        ? (receivedReceiptsQuery.data ?? []).map((receipt) => ({
            ...receipt,
            received: true,
          }))
        : [],
    [receivedReceiptsQuery.data, access.companyEnabled],
  );
  const statementsQuery = useAllStatements(companyIds);
  const leasesQuery = useLeases(access.lmnpEnabled);
  const [statementToReload, setStatementToReload] =
    useState<StatementDto | null>(null);

  const groups = useMemo(
    () =>
      groupHistoryByMonthAndAddress(
        access.lmnpEnabled ? (rentReceiptsQuery.data ?? []) : [],
        access.companyEnabled ? (statementsQuery.data ?? []) : [],
        access.lmnpEnabled ? (leasesQuery.data ?? []) : [],
        i18n.resolvedLanguage,
        receivedReceipts,
      ),
    [
      rentReceiptsQuery.data,
      receivedReceipts,
      statementsQuery.data,
      leasesQuery.data,
      i18n.resolvedLanguage,
      access.lmnpEnabled,
      access.companyEnabled,
    ],
  );

  const loading =
    (access.companyEnabled &&
      (companies.isPending ||
        statementsQuery.isPending ||
        receivedReceiptsQuery.isPending)) ||
    (access.lmnpEnabled &&
      (rentReceiptsQuery.isPending || leasesQuery.isPending));
  const errorText =
    access.lmnpEnabled && rentReceiptsQuery.isError
      ? errorMessage(rentReceiptsQuery.error)
      : access.companyEnabled && receivedReceiptsQuery.isError
        ? errorMessage(receivedReceiptsQuery.error)
        : access.companyEnabled && statementsQuery.isError
          ? errorMessage(statementsQuery.error)
          : null;

  function reload() {
    if (access.lmnpEnabled) {
      void rentReceiptsQuery.refetch();
    }
    if (access.companyEnabled) {
      void receivedReceiptsQuery.refetch();
      void statementsQuery.refetch();
    }
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
    // The draft and the navigation carry the statement's company explicitly:
    // the generation page has no global company store to fall back on.
    const lease = resolveLeaseForDocument(
      statementToReload,
      leasesQuery.data ?? [],
    );
    const companyId =
      typeof statementToReload.companyId === "number"
        ? statementToReload.companyId
        : lease?.companyId;
    useStatementDraft
      .getState()
      .loadFromStatement(
        statementToReload,
        rentReceipt?.id ?? null,
        typeof companyId === "number" ? companyId : undefined,
      );
    setStatementToReload(null);
    toast.info(
      t("history.page.reloaded", {
        month: formatMonth(statementToReload.month),
      }),
    );
    navigate(
      "/generate/expense-statement",
      typeof companyId === "number" ? { state: { companyId } } : undefined,
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t("history.page.eyebrow")}
        title={t("history.page.title")}
        description={t("history.page.description")}
        actions={
          groups.length > 0 ? (
            <span className="badge badge-neutral">
              <History size={12} aria-hidden="true" />
              {t("history.page.monthCount", { count: groups.length })}
            </span>
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
      ) : groups.length === 0 && !errorText ? (
        access.lmnpEnabled ? (
          <HistoryEmptyState
            onCreateRentReceipt={() => navigate("/generate/rent-receipt")}
            onCreateStatement={
              hasCompany
                ? () => navigate("/generate/expense-statement")
                : undefined
            }
          />
        ) : (
          <EmptyState
            title={t("history.empty.title")}
            description={t("history.empty.description")}
            icon={<Archive size={22} aria-hidden="true" />}
            action={
              hasCompany ? (
                <Button
                  variant="primary"
                  onClick={() => navigate("/generate/expense-statement")}
                >
                  {t("history.empty.createStatement")}
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <div className="history-page-months" data-cy="history">
          {groups.map((group) => (
            <HistoryMonthSection
              key={group.month}
              group={group}
              hasCompany={hasCompany}
              showRentReceipts={
                access.lmnpEnabled || receivedReceipts.length > 0
              }
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
