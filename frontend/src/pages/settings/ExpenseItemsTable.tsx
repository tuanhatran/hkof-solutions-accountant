import "./ExpenseItemsTable.css";
import { PencilLine, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ExpenseItemDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatPercentage } from "@/lib/format";
import { periodicityLabel } from "./settingsValues";

/** Dense table of the expense items of a company and its selected lease. */
export function ExpenseItemsTable({
  items,
  onEdit,
  onRemove,
}: {
  items: ExpenseItemDto[];
  onEdit: (expenseItem: ExpenseItemDto) => void;
  onRemove: (expenseItem: ExpenseItemDto) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="expense-items-table-wrapper">
      <table className="expense-table expense-items-table">
        <thead>
          <tr>
            <th>{t("settings.expenses.table.label")}</th>
            <th>{t("settings.expenses.table.supplier")}</th>
            <th className="text-right">
              {t("settings.expenses.table.proRata")}
            </th>
            <th>{t("settings.expenses.table.periodicity")}</th>
            <th className="text-right">{t("settings.expenses.table.order")}</th>
            <th>{t("settings.expenses.table.options")}</th>
            <th className="text-right">
              {t("settings.expenses.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((expenseItem) => (
            <tr
              key={expenseItem.id}
              className={cn(!expenseItem.active && "opacity-60")}
              data-cy={`poste-${expenseItem.code}`}
            >
              <td>
                <div className="expense-items-table-item">
                  <span className="expense-items-table-item-label">
                    {expenseItem.label}
                  </span>
                  <code className="expense-items-table-item-code">
                    {expenseItem.code}
                  </code>
                  {!expenseItem.active ? (
                    <span className="badge badge-neutral">
                      {t("settings.expenses.inactive")}
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="text-ink-soft">{expenseItem.supplier || "—"}</td>
              <td className="number expense-items-table-number-cell text-right">
                {formatPercentage(expenseItem.proRataPct)}
              </td>
              <td className="expense-items-table-periodicity-cell">
                {periodicityLabel(expenseItem.periodicity, t)}
              </td>
              <td className="number expense-items-table-order-cell text-right">
                {expenseItem.sortOrder}
              </td>
              <td>
                {expenseItem.multipleLinesAllowed ? (
                  <span className="badge badge-accent">
                    {t("settings.expenses.multipleLines")}
                  </span>
                ) : (
                  <span className="expense-items-table-single-line">
                    {t("settings.expenses.singleLine")}
                  </span>
                )}
              </td>
              <td>
                <div className="expense-items-table-actions">
                  <Button
                    variant="ghost"
                    small
                    icon={<PencilLine size={13} />}
                    onClick={() => onEdit(expenseItem)}
                    data-cy={`btn-modifier-poste-${expenseItem.code}`}
                  >
                    {t("settings.expenses.edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    small
                    icon={<Trash2 size={13} />}
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => onRemove(expenseItem)}
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
  );
}
