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
      className="card overflow-hidden"
      data-cy={`historique-mois-${group.month}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper/45 px-5 py-3.5 sm:px-6">
        <div>
          <p className="eyebrow">Mois</p>
          <h2 className="mt-1 text-[22px] text-ink">
            {formatMonth(group.month)}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className={
              statement ? "badge badge-accent" : "badge badge-neutral"
            }
          >
            Note {statement ? `v${statement.version ?? 1}` : "non générée"}
          </span>
        </div>
      </div>

      <div className="grid divide-y divide-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
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
