import "./HistoryMonthSection.css";
import type { StatementDto } from "@/api/types";
import { formatMonth } from "@/lib/format";
import { current, latestReceipt, type MonthGroup } from "./historyHelpers";
import { RentReceiptMonthPanel } from "./RentReceiptMonthPanel";
import { StatementMonthPanel } from "./StatementMonthPanel";

/** Month card grouping the rent receipt and the expense statement history. */
export function HistoryMonthSection({
  group,
  onCreateRentReceipt,
  onCreateStatement,
  onReloadStatement,
}: {
  group: MonthGroup;
  onCreateRentReceipt: (month: string) => void;
  onCreateStatement: (month: string) => void;
  onReloadStatement: (statement: StatementDto) => void;
}) {
  const rentReceipt = latestReceipt(group.rentReceipts);
  const statement = current(group.statements);

  return (
    <section
      className="card history-month-section"
      data-cy={`historique-mois-${group.month}`}
    >
      <div className="history-month-section-header">
        <div>
          <p className="eyebrow">Mois</p>
          <h2 className="history-month-section-title">
            {formatMonth(group.month)}
          </h2>
        </div>
        <div className="history-month-section-badges">
          <span
            className={
              rentReceipt ? "badge badge-accent" : "badge badge-neutral"
            }
          >
            Quittance{" "}
            {group.rentReceipts.length > 1
              ? `(${group.rentReceipts.length})`
              : rentReceipt
                ? `v${rentReceipt.version ?? 1}`
                : "non générée"}
          </span>
          <span
            className={statement ? "badge badge-accent" : "badge badge-neutral"}
          >
            Note {statement ? `v${statement.version ?? 1}` : "non générée"}
          </span>
        </div>
      </div>

      <div className="history-month-section-body">
        <RentReceiptMonthPanel
          group={group}
          rentReceipt={rentReceipt}
          onCreate={onCreateRentReceipt}
        />
        <StatementMonthPanel
          group={group}
          statement={statement}
          onCreate={onCreateStatement}
          onReload={onReloadStatement}
        />
      </div>
    </section>
  );
}
