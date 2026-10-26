import "./HistoryMonthSection.css";
import type { StatementDto } from "@/api/types";
import { formatMonth } from "@/lib/format";
import { HistoryAddressRow } from "./HistoryAddressRow";
import { current, latestReceipt, type MonthGroup } from "./historyHelpers";

/** Month card: one Quittance | Note de frais row per lease address. */
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
  const rentReceipt = latestReceipt(
    group.addresses.flatMap((address) => address.rentReceipts),
  );
  const statement = current(
    group.addresses.flatMap((address) => address.statements),
  );
  const rentReceiptCount = group.addresses.reduce(
    (count, address) => count + address.rentReceipts.length,
    0,
  );
  const severalAddresses = group.addresses.length > 1;

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
            {rentReceiptCount > 1
              ? `(${rentReceiptCount})`
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

      {group.addresses.map((address) => (
        <HistoryAddressRow
          key={address.addressKey}
          month={group.month}
          address={address}
          showLabel={severalAddresses}
          suffix={severalAddresses ? `-${address.addressKey}` : ""}
          onCreateRentReceipt={onCreateRentReceipt}
          onCreateStatement={onCreateStatement}
          onReloadStatement={onReloadStatement}
        />
      ))}
    </section>
  );
}
