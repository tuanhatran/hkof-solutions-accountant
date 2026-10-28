import "./ExpenseItemsManager.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, ReceiptText, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useExpenseItems } from "@/api/queries";
import type { ExpenseItemDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatPercentage } from "@/lib/format";
import { toast } from "@/state/toasts";
import { ExpenseItemForm } from "./ExpenseItemForm";
import { periodicityLabel } from "./settingsValues";

/** List of expense items with create/edit/delete actions. */
export function ExpenseItemsManager({
  companyId,
  leaseId,
  defaultProRata: defaultProRata,
}: {
  companyId: number;
  leaseId: number | null;
  defaultProRata: string;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const expenseItems = useExpenseItems(companyId, true, leaseId);
  const [formOpen, setFormOpen] = useState(false);
  const [editedItem, setEditedItem] = useState<ExpenseItemDto | null>(null);
  const [toDelete, setToDelete] = useState<ExpenseItemDto | null>(null);

  const remove = useMutation({
    mutationFn: (expenseItem: ExpenseItemDto) =>
      api.expenseItems.delete(expenseItem.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      setToDelete(null);
      toast.success(t("settings.expenses.deleted"));
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  const list = expenseItems.data ?? [];
  const defaultOrder =
    list.reduce(
      (maximum, expenseItem) => Math.max(maximum, expenseItem.sortOrder ?? 0),
      -1,
    ) + 1;

  function openCreate() {
    setEditedItem(null);
    setFormOpen(true);
  }

  function openEdit(expenseItem: ExpenseItemDto) {
    setEditedItem(expenseItem);
    setFormOpen(true);
  }

  return (
    <section className="expense-items-manager">
      <div className="card-header">
        <div className="expense-items-manager-heading">
          <span className="expense-items-manager-icon">
            <ReceiptText size={17} aria-hidden="true" />
          </span>
          <div>
            <h2 className="expense-items-manager-title">
              {t("settings.expenses.title")}
            </h2>
            <p className="expense-items-manager-description">
              {t("settings.expenses.description")}
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          small
          icon={<Plus size={14} />}
          onClick={openCreate}
          disabled={formOpen && editedItem === null}
          data-cy="btn-ajouter-poste"
        >
          {t("settings.expenses.add")}
        </Button>
      </div>

      <div className="card-body expense-items-manager-body">
        {formOpen ? (
          <ExpenseItemForm
            item={editedItem}
            companyId={companyId}
            leaseId={leaseId}
            defaultProRata={defaultProRata}
            defaultOrder={defaultOrder}
            onClose={() => {
              setFormOpen(false);
              setEditedItem(null);
            }}
          />
        ) : null}

        {expenseItems.isError ? (
          <ErrorState
            message={errorMessage(expenseItems.error)}
            onRetry={() => void expenseItems.refetch()}
          />
        ) : expenseItems.isPending ? (
          <LoadingState message={t("settings.expenses.loading")} />
        ) : list.length === 0 ? (
          <p className="expense-items-manager-empty">
            {t("settings.expenses.empty")}
          </p>
        ) : (
          <div className="expense-items-manager-table-wrapper">
            <table className="expense-table expense-items-table">
              <thead>
                <tr>
                  <th>{t("settings.expenses.table.label")}</th>
                  <th>{t("settings.expenses.table.supplier")}</th>
                  <th className="text-right">
                    {t("settings.expenses.table.proRata")}
                  </th>
                  <th>{t("settings.expenses.table.periodicity")}</th>
                  <th className="text-right">
                    {t("settings.expenses.table.order")}
                  </th>
                  <th>{t("settings.expenses.table.options")}</th>
                  <th className="text-right">
                    {t("settings.expenses.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((expenseItem) => (
                  <tr
                    key={expenseItem.id}
                    className={cn(!expenseItem.active && "opacity-60")}
                  >
                    <td>
                      <div className="expense-items-manager-item">
                        <span className="expense-items-manager-item-label">
                          {expenseItem.label}
                        </span>
                        <code className="expense-items-manager-item-code">
                          {expenseItem.code}
                        </code>
                        {!expenseItem.active ? (
                          <span className="badge badge-neutral">
                            {t("settings.expenses.inactive")}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-ink-soft">
                      {expenseItem.supplier || "—"}
                    </td>
                    <td className="number expense-items-manager-number-cell text-right">
                      {formatPercentage(expenseItem.proRataPct)}
                    </td>
                    <td className="expense-items-manager-periodicity-cell">
                      {periodicityLabel(expenseItem.periodicity, t)}
                    </td>
                    <td className="number expense-items-manager-order-cell text-right">
                      {expenseItem.sortOrder}
                    </td>
                    <td>
                      {expenseItem.multipleLinesAllowed ? (
                        <span className="badge badge-accent">
                          {t("settings.expenses.multipleLines")}
                        </span>
                      ) : (
                        <span className="expense-items-manager-single-line">
                          {t("settings.expenses.singleLine")}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="expense-items-manager-actions">
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => openEdit(expenseItem)}
                          data-cy={`btn-modifier-poste-${expenseItem.code}`}
                        >
                          {t("settings.expenses.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(expenseItem)}
                          data-cy={`btn-supprimer-poste-${expenseItem.code}`}
                        >
                          {t("settings.expenses.remove")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={t("settings.expenses.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.expenses.deleteDialog.message", {
                label: toDelete.label,
              })
            : ""
        }
        confirmLabel={t("settings.expenses.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-poste"
      />
    </section>
  );
}
