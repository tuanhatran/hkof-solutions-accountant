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
  return (
    <div className="overflow-x-auto">
      <table className="expense-table min-w-[760px]">
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Fournisseur</th>
            <th scope="col" className="text-right">
              Montant TTC
            </th>
            <th scope="col" className="text-right">
              Prorata
            </th>
            <th scope="col" className="w-px whitespace-nowrap text-right">
              Montant retenu
            </th>
            <th scope="col" className="text-right">
              Actions
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
              <tr key={line.key} data-cy={`ligne-frais-${line.itemCode}`}>
                <td>
                  <p className="font-semibold text-ink">
                    {expenseItem?.label ?? dto?.itemLabel ?? line.itemCode}
                  </p>
                  {line.receiptName ? (
                    <p
                      className="mt-0.5 max-w-[160px] truncate text-[11px] text-ink-soft"
                      title={line.receiptName}
                    >
                      {line.receiptName}
                    </p>
                  ) : null}
                </td>
                <td className="text-ink-soft">
                  {line.detectedSupplier ?? expenseItem?.supplier ?? "—"}
                </td>
                <td className="whitespace-nowrap text-right">
                  {line.amountSource === "AI" ? (
                    <span className="inline-flex align-middle">
                      <AiBadge label="AI" />
                    </span>
                  ) : null}
                  <span className="ml-2 number font-semibold text-ink">
                    {formatEUR(line.amountInclVat)}
                  </span>
                </td>
                <td className="number w-px whitespace-nowrap text-right text-ink-soft">
                  {formatPercentage(line.proRataPct)}
                </td>
                <td className="w-px whitespace-nowrap text-right">
                  {dto?.claimedAmount ? (
                    <span className="number font-semibold text-accent-strong">
                      {formatEUR(dto.claimedAmount)}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-soft">
                      {c.calculationInProgress ? "Calcul…" : "—"}
                    </span>
                  )}
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    {line.receiptId ? (
                      <a
                        href={api.receipts.fileUrl(line.receiptId)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                        aria-label={`Voir le justificatif de ${expenseItem?.label ?? line.itemCode}`}
                        data-cy={`btn-voir-justificatif-${line.itemCode}`}
                      >
                        <FileText size={15} />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-ink-soft transition hover:bg-paper-deep hover:text-ink"
                      onClick={() => c.editLine(line)}
                      aria-label={`Modifier ${expenseItem?.label ?? line.itemCode}`}
                      data-cy={`btn-modifier-${line.itemCode}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-ink-soft transition hover:bg-danger-soft hover:text-danger"
                      onClick={() => c.setLineToRemove(line)}
                      aria-label={`Supprimer ${expenseItem?.label ?? line.itemCode}`}
                      data-cy={`btn-supprimer-${line.itemCode}`}
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
