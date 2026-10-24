import "./GenerateExpenseStatementPage.css";
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
  const c = useExpenseStatementPage();

  return (
    <>
      <ExpenseStatementHeader controller={c} />

      {c.settings.isError ? (
        <div className="mb-4">
          <ErrorState
            message={errorMessage(c.settings.error)}
            onRetry={() => void c.settings.refetch()}
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
          ariaLabel="Volets de génération"
          active={c.mobilePanel}
          onChange={(value) =>
            c.setMobilePanel(value === "preview" ? "preview" : "input")
          }
          tabs={[
            { value: "input", label: "Saisie" },
            {
              value: "preview",
              label: "Aperçu",
              updated: Boolean(c.preview.updatedAt),
              className: "flex items-center justify-center gap-2",
            },
          ]}
        />
      </div>

      <div className="generate-expense-statement-page-grid">
        <ExpenseInputPane controller={c} />
        <ExpensePreviewPane controller={c} />
      </div>

      <ConfirmDialog
        open={c.lineToRemove !== null}
        title="Supprimer ce frais ?"
        message={
          c.lineToRemove ? (
            <>
              La ligne «{" "}
              {c.expenseItemByCode.get(c.lineToRemove.itemCode)?.label ??
                c.lineToRemove.itemCode}{" "}
              » sera retirée du brouillon. Cette action ne modifie pas les
              versions déjà générées.
            </>
          ) : null
        }
        confirmLabel="Supprimer"
        variant="danger"
        onConfirm={c.removeLine}
        onCancel={() => c.setLineToRemove(null)}
        dataCy="dialogue-suppression-frais"
      />

      <ConfirmDialog
        open={c.regenerationDialog}
        title="Générer une nouvelle version ?"
        message={
          <>
            Une note active existe déjà pour {formatMonth(c.month)} (version{" "}
            {c.activeVersion}). La version {(c.activeVersion ?? 0) + 1} sera
            créée et l’ancienne restera consultable dans l’historique.
          </>
        }
        confirmLabel="Créer la nouvelle version"
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
