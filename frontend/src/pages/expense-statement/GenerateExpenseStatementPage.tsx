import "./GenerateExpenseStatementPage.css";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/States";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { formatMonth } from "@/lib/format";
import { ExpenseInputPane } from "./ExpenseInputPane";
import { ExpensePreviewPane } from "./ExpensePreviewPane";
import { ExpenseStatementHeader } from "./ExpenseStatementHeader";
import { useExpenseStatementPage } from "./useExpenseStatementPage";

/**
 * Expense statement generation page. State lives in
 * `useExpenseStatementPage`; this component only composes the panes.
 */
export function GenerateExpenseStatementPage() {
  const { t } = useTranslation();
  const c = useExpenseStatementPage();

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
