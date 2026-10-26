import "./HistoryMonthSection.css";
import { FileCheck2, FileText } from "lucide-react";
import type { StatementDto } from "@/api/types";
import { formatMonth } from "@/lib/format";
import { HistoryAddressRow } from "./HistoryAddressRow";
import {
  current,
  latestReceipt,
  type AddressGroup,
  type MonthGroup,
} from "./historyHelpers";

/** Month card: one Quittance column and one Note de frais column. */
export function HistoryMonthSection({
  group,
  onReloadStatement,
}: {
  group: MonthGroup;
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
  const receiptAddresses = group.addresses.filter(
    (address) => address.rentReceipts.length > 0,
  );
  const statementAddresses = group.addresses.filter(
    (address) => address.statements.length > 0,
  );

  function suffixOf(address: AddressGroup): string {
    return severalAddresses ? `-${address.addressKey}` : "";
  }

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

      <div className="history-month-section-columns">
        <section
          className="history-month-section-column"
          data-cy={`historique-colonne-quittance-${group.month}`}
        >
          <h3 className="history-month-section-column-title">
            <span className="history-month-section-column-icon history-month-section-column-icon-quittance">
              <FileText size={15} aria-hidden="true" />
            </span>
            Quittance de loyer
          </h3>
          {receiptAddresses.length === 0 ? (
            <p className="history-month-section-empty">
              Aucune quittance générée pour ce mois.
            </p>
          ) : (
            receiptAddresses.map((address) => (
              <HistoryAddressRow
                key={`receipt-${address.addressKey}`}
                month={group.month}
                address={address}
                suffix={suffixOf(address)}
                documentType="receipt"
                onReloadStatement={onReloadStatement}
              />
            ))
          )}
        </section>

        <section
          className="history-month-section-column"
          data-cy={`historique-colonne-note-${group.month}`}
        >
          <h3 className="history-month-section-column-title">
            <span className="history-month-section-column-icon history-month-section-column-icon-note">
              <FileCheck2 size={15} aria-hidden="true" />
            </span>
            Note de frais d’occupation
          </h3>
          {statementAddresses.length === 0 ? (
            <p className="history-month-section-empty">
              Aucune note de frais générée pour ce mois.
            </p>
          ) : (
            statementAddresses.map((address) => (
              <HistoryAddressRow
                key={`statement-${address.addressKey}`}
                month={group.month}
                address={address}
                suffix={suffixOf(address)}
                documentType="statement"
                onReloadStatement={onReloadStatement}
              />
            ))
          )}
        </section>
      </div>
    </section>
  );
}
