import "./ExpenseItemsManager.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useExpenseItems } from "@/api/queries";
import type { ExpenseItemDto } from "@/api/types";
import { ListToolbar } from "@/components/settings/ListToolbar";
import { EmptyState } from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { toast } from "@/state/toasts";
import { ExpenseItemForm } from "./ExpenseItemForm";
import { ExpenseItemsTable } from "./ExpenseItemsTable";
import { periodicityLabel } from "./settingsValues";

/**
 * Expense items of one company scope (`leaseId = null` for company-level
 * expenses). Standalone it keeps the section header and the historical form
 * above the list; embedded inside the expenses dialog it drops that chrome and
 * swaps the list and the inline form inside the same window.
 */
export function ExpenseItemsManager({
  companyId,
  leaseId,
  defaultProRata: defaultProRata,
  embedded = false,
}: {
  companyId: number;
  leaseId: number | null;
  defaultProRata: string;
  embedded?: boolean;
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
  const listQuery = useListQuery<ExpenseItemDto>({
    items: list,
    searchText: (expenseItem) =>
      [expenseItem.label, expenseItem.code, expenseItem.supplier]
        .filter(Boolean)
        .join(" "),
    sorts: [
      {
        value: "order",
        compare: (left, right) =>
          (left.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.sortOrder ?? Number.MAX_SAFE_INTEGER),
      },
      {
        value: "label",
        compare: (left, right) =>
          (left.label ?? "").localeCompare(right.label ?? "", "fr", {
            sensitivity: "base",
          }),
      },
      {
        value: "proRata",
        compare: (left, right) =>
          Number(left.proRataPct ?? 0) - Number(right.proRataPct ?? 0),
      },
      {
        value: "periodicity",
        compare: (left, right) =>
          periodicityLabel(left.periodicity, t).localeCompare(
            periodicityLabel(right.periodicity, t),
            "fr",
          ),
      },
    ],
    defaultSort: "order",
  });
  const defaultOrder =
    list.reduce(
      (maximum, expenseItem) => Math.max(maximum, expenseItem.sortOrder ?? 0),
      -1,
    ) + 1;

  function closeForm() {
    setFormOpen(false);
    setEditedItem(null);
  }

  function openCreate() {
    setEditedItem(null);
    setFormOpen(true);
  }

  function openEdit(expenseItem: ExpenseItemDto) {
    setEditedItem(expenseItem);
    setFormOpen(true);
  }

  const addButton = (
    <Button
      variant="primary"
      small
      icon={<Plus size={14} />}
      onClick={openCreate}
      disabled={formOpen && editedItem === null}
      data-cy="btn-add-item"
    >
      {t("settings.expenses.add")}
    </Button>
  );

  const form = formOpen ? (
    <ExpenseItemForm
      item={editedItem}
      companyId={companyId}
      leaseId={leaseId}
      defaultProRata={defaultProRata}
      defaultOrder={defaultOrder}
      embedded={embedded}
      onClose={closeForm}
    />
  ) : null;

  const listContent = expenseItems.isError ? (
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
    <>
      <ListToolbar
        list="items"
        placeholder={t("settings.expenses.filterPlaceholder")}
        query={listQuery.query}
        onQueryChange={listQuery.setQuery}
        sort={listQuery.sort}
        onSortChange={listQuery.setSort}
        direction={listQuery.direction}
        onToggleDirection={listQuery.toggleDirection}
        sortOptions={[
          {
            value: "order",
            label: t("settings.expenses.table.order"),
          },
          {
            value: "label",
            label: t("settings.expenses.table.label"),
          },
          {
            value: "proRata",
            label: t("settings.expenses.table.proRata"),
          },
          {
            value: "periodicity",
            label: t("settings.expenses.table.periodicity"),
          },
        ]}
        visible={listQuery.visible.length}
        total={listQuery.total}
      />
      {listQuery.visible.length === 0 ? (
        <EmptyState
          text={t("settings.list.noMatch", {
            query: listQuery.query.trim(),
          })}
          dataCy="no-results-items"
        />
      ) : (
        <ExpenseItemsTable
          items={listQuery.visible}
          onEdit={openEdit}
          onRemove={setToDelete}
        />
      )}
    </>
  );

  return (
    <section className="expense-items-manager">
      {embedded ? null : (
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
          {addButton}
        </div>
      )}

      <div
        className={
          embedded
            ? "expense-items-manager-body"
            : "card-body expense-items-manager-body"
        }
      >
        {embedded ? (
          formOpen ? (
            form
          ) : (
            <>
              <div className="expense-items-manager-toolbar">{addButton}</div>
              {listContent}
            </>
          )
        ) : (
          <>
            {form}
            {listContent}
          </>
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
        dataCy="dialog-delete-item"
      />
    </section>
  );
}
