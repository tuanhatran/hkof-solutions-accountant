import "./ExpenseLinesTable.css";
import { useTranslation } from "react-i18next";
import { FileText, Pencil, Trash2 } from "lucide-react";
import { api } from "@/api/endpoints";
import { AiBadge } from "@/components/ui/AiBadge";
import { formatEUR, formatPercentage } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Table of the expense lines currently in the draft. */
export function ExpenseLinesTable({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  return (
    <div className="expense-lines-table-scroll">
      <table className="expense-table expense-lines-table">
        <thead>
          <tr>
            <th scope="col">{t("expenseStatement.lines.table.type")}</th>
            <th scope="col">{t("expenseStatement.lines.table.supplier")}</th>
            <th scope="col" className="expense-lines-table-col-right">
              {t("expenseStatement.lines.table.amountInclVat")}
            </th>
            <th scope="col" className="expense-lines-table-col-right">
              {t("expenseStatement.lines.table.proRata")}
            </th>
            <th scope="col" className="expense-lines-table-col-narrow">
              {t("expenseStatement.lines.table.retained")}
            </th>
            <th scope="col" className="expense-lines-table-col-right">
              {t("expenseStatement.lines.table.actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {c.orderedLines.map((line, index) => {
            const expenseItem = c.expenseItemByCode.get(line.itemCode);
            const dto = c.calculationUpToDate
              ? c.calculation?.lines?.[index]
              : undefined;
            return (
              <tr key={line.key} data-cy={`expense-line-${line.itemCode}`}>
                <td>
                  <p className="expense-lines-table-item">
                    {expenseItem?.label ?? dto?.itemLabel ?? line.itemCode}
                  </p>
                  {line.receiptName ? (
                    <p
                      className="expense-lines-table-receipt"
                      title={line.receiptName}
                    >
                      {line.receiptName}
                    </p>
                  ) : null}
                </td>
                <td className="expense-lines-table-supplier">
                  {line.detectedSupplier ?? expenseItem?.supplier ?? "—"}
                </td>
                <td className="expense-lines-table-amount">
                  {line.amountSource === "AI" ? (
                    <span className="expense-lines-table-ai">
                      <AiBadge label="AI" />
                    </span>
                  ) : null}
                  <span className="expense-lines-table-amount-value number">
                    {formatEUR(line.amountInclVat)}
                  </span>
                </td>
                <td className="expense-lines-table-prorata number">
                  {formatPercentage(line.proRataPct)}
                </td>
                <td className="expense-lines-table-claimed">
                  {dto?.claimedAmount ? (
                    <span className="expense-lines-table-claimed-value number">
                      {formatEUR(dto.claimedAmount)}
                    </span>
                  ) : (
                    <span className="expense-lines-table-pending">
                      {c.calculationInProgress
                        ? t("expenseStatement.lines.table.calculating")
                        : "—"}
                    </span>
                  )}
                </td>
                <td>
                  <div className="expense-lines-table-actions">
                    {line.receiptId ? (
                      <a
                        href={api.receipts.fileUrl(line.receiptId)}
                        target="_blank"
                        rel="noreferrer"
                        className="expense-lines-table-action"
                        aria-label={t(
                          "expenseStatement.lines.table.viewReceipt",
                          {
                            item: expenseItem?.label ?? line.itemCode,
                          },
                        )}
                        data-cy={`btn-view-supporting-document-${line.itemCode}`}
                      >
                        <FileText size={15} />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="expense-lines-table-action"
                      onClick={() => c.editLine(line)}
                      aria-label={t("expenseStatement.lines.table.edit", {
                        item: expenseItem?.label ?? line.itemCode,
                      })}
                      data-cy={`btn-edit-${line.itemCode}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="expense-lines-table-action expense-lines-table-action-danger"
                      onClick={() => c.setLineToRemove(line)}
                      aria-label={t("expenseStatement.lines.table.remove", {
                        item: expenseItem?.label ?? line.itemCode,
                      })}
                      data-cy={`btn-delete-${line.itemCode}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
