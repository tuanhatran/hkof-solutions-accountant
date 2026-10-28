import "./GenerateExpenseStatementPage.css";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { formatMonth } from "@/lib/format";
import { ExpenseInputPane } from "./ExpenseInputPane";
import { ExpensePreviewPane } from "./ExpensePreviewPane";
import { ExpenseStatementHeader } from "./ExpenseStatementHeader";
import { useExpenseStatementPage } from "./useExpenseStatementPage";

/** Company carried by History when a generated statement is reopened. */
function companyIdFromLocation(state: unknown): number | undefined {
  if (typeof state !== "object" || state === null || !("companyId" in state)) {
    return undefined;
  }
  const value = (state as { companyId?: unknown }).companyId;
  return typeof value === "number" ? value : undefined;
}

/**
 * Expense statement generation page. State lives in
 * `useExpenseStatementPage`; this component only composes the panes. The
 * editor is rendered only once a company is selected.
 */
export function GenerateExpenseStatementPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const initialCompanyId = companyIdFromLocation(location.state);
  const c = useExpenseStatementPage(
    initialCompanyId === undefined ? {} : { initialCompanyId },
  );
  const companyList = c.companies.data ?? [];
  const noCompany = c.companies.isSuccess && companyList.length === 0;

  return (
    <>
      <ExpenseStatementHeader controller={c} />

      {c.companies.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(c.companies.error)}
            onRetry={() => void c.companies.refetch()}
          />
        </div>
      ) : null}
      {c.expenseItemsQuery.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(c.expenseItemsQuery.error)}
            onRetry={() => void c.expenseItemsQuery.refetch()}
          />
        </div>
      ) : null}

      {noCompany ? (
        <EmptyState
          title={t("expenseStatement.page.noCompanyTitle")}
          description={t("expenseStatement.page.noCompanyDescription")}
          action={
            <Link
              to="/configuration/entreprise"
              className="btn btn-primary"
              data-cy="lien-configurer-societe"
            >
              {t("expenseStatement.page.configureCompany")}
            </Link>
          }
        />
      ) : c.companies.isPending ? (
        <LoadingState message={t("expenseStatement.page.loadingCompanies")} />
      ) : c.activeCompanyId === null ? (
        <EmptyState
          title={t("expenseStatement.page.selectCompanyTitle")}
          description={t("expenseStatement.page.selectCompanyDescription")}
        />
      ) : (
        <>
          <div className="generate-expense-statement-page-tabs">
            <ViewTabs
              ariaLabel={t("expenseStatement.page.tabsAriaLabel")}
              idPrefix="expense-view"
              active={c.mobilePanel}
              onChange={(value) =>
                c.setMobilePanel(value === "preview" ? "preview" : "input")
              }
              tabs={[
                {
                  value: "input",
                  label: t("expenseStatement.page.inputTab"),
                  panelId: "expense-input-panel",
                },
                {
                  value: "preview",
                  label: t("expenseStatement.page.previewTab"),
                  updated: Boolean(c.preview.updatedAt),
                  className: "flex items-center justify-center gap-2",
                  panelId: "expense-preview-panel",
                },
              ]}
            />
          </div>

          <div className="generate-expense-statement-page-grid">
            <ExpenseInputPane
              controller={c}
              panel={{
                id: "expense-input-panel",
                labelledBy: "expense-view-tab-input",
              }}
            />
            <ExpensePreviewPane
              controller={c}
              panel={{
                id: "expense-preview-panel",
                labelledBy: "expense-view-tab-preview",
              }}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={c.lineToRemove !== null}
        title={t("expenseStatement.page.removeDialog.title")}
        message={
          c.lineToRemove
            ? t("expenseStatement.page.removeDialog.message", {
                item:
                  c.expenseItemByCode.get(c.lineToRemove.itemCode)?.label ??
                  c.lineToRemove.itemCode,
              })
            : null
        }
        confirmLabel={t("expenseStatement.page.removeDialog.confirm")}
        variant="danger"
        onConfirm={c.removeLine}
        onCancel={() => c.setLineToRemove(null)}
        dataCy="dialogue-suppression-frais"
      />

      <ConfirmDialog
        open={c.regenerationDialog}
        title={t("expenseStatement.page.regenerateDialog.title")}
        message={t("expenseStatement.page.regenerateDialog.message", {
          month: formatMonth(c.month),
          version: c.activeVersion,
          next: (c.activeVersion ?? 0) + 1,
        })}
        confirmLabel={t("expenseStatement.page.regenerateDialog.confirm")}
        onConfirm={() => {
          c.setRegenerationDialog(false);
          void c.generateStatement();
        }}
        onCancel={() => c.setRegenerationDialog(false)}
        dataCy="dialogue-regeneration-note"
      />
    </>
  );
}
