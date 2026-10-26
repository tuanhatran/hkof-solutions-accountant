import "./HistoryAddressRow.css";
import type { StatementDto } from "@/api/types";
import type { AddressGroup } from "./historyHelpers";
import { RentReceiptMonthPanel } from "./RentReceiptMonthPanel";
import { StatementMonthPanel } from "./StatementMonthPanel";

/**
 * One address inside a document-type column: its always-visible label and the
 * content of the generated document of that column.
 */
export function HistoryAddressRow({
  month,
  address,
  suffix,
  documentType,
  onReloadStatement,
}: {
  month: string;
  address: AddressGroup;
  suffix: string;
  documentType: "receipt" | "statement";
  onReloadStatement: (statement: StatementDto) => void;
}) {
  return (
    <div
      className="history-address-row"
      data-cy={
        documentType === "receipt"
          ? `historique-adresse-${month}-${address.addressKey}`
          : `historique-adresse-note-${month}-${address.addressKey}`
      }
    >
      <p className="history-address-row-label">{address.addressLabel}</p>
      {documentType === "receipt" ? (
        <RentReceiptMonthPanel
          month={month}
          address={address}
          suffix={suffix}
        />
      ) : (
        <StatementMonthPanel
          month={month}
          address={address}
          suffix={suffix}
          onReload={onReloadStatement}
        />
      )}
    </div>
  );
}
