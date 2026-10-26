import "./HistoryAddressRow.css";
import type { StatementDto } from "@/api/types";
import type { AddressGroup } from "./historyHelpers";
import { RentReceiptMonthPanel } from "./RentReceiptMonthPanel";
import { StatementMonthPanel } from "./StatementMonthPanel";

/**
 * One address of a month: its own Quittance | Note de frais columns. Two rows
 * of the same month never share a document, and the label only appears when
 * the month holds several addresses.
 */
export function HistoryAddressRow({
  month,
  address,
  showLabel,
  suffix,
  onCreateRentReceipt,
  onCreateStatement,
  onReloadStatement,
}: {
  month: string;
  address: AddressGroup;
  showLabel: boolean;
  suffix: string;
  onCreateRentReceipt: (month: string) => void;
  onCreateStatement: (month: string) => void;
  onReloadStatement: (statement: StatementDto) => void;
}) {
  return (
    <div
      className="history-address-row"
      data-cy={`historique-adresse-${month}-${address.addressKey}`}
    >
      {showLabel ? (
        <p className="history-address-row-label">{address.addressLabel}</p>
      ) : null}
      <div className="history-address-row-panels">
        <RentReceiptMonthPanel
          month={month}
          address={address}
          suffix={suffix}
          onCreate={onCreateRentReceipt}
        />
        <StatementMonthPanel
          month={month}
          address={address}
          suffix={suffix}
          onCreate={onCreateStatement}
          onReload={onReloadStatement}
        />
      </div>
    </div>
  );
}
