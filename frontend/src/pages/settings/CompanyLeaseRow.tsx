import "./CompanyLeaseRow.css";
import { PencilLine, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LeaseDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { formatEUR } from "@/lib/format";

/**
 * One lease row of the "Baux & Frais" grid: address, landlord, rent, charges
 * and the two actions. The row is inert (no click, no active-lease state): only
 * the expenses action opens the scoped dialog and "Modifier le bail" the
 * unchanged LeaseForm. The expenses label becomes "Ajouter des frais" when the
 * scoped query succeeded with no item.
 */
export function CompanyLeaseRow({
  lease,
  showAddExpenses,
  onEdit,
  onExpenses,
}: {
  lease: LeaseDto;
  showAddExpenses: boolean;
  onEdit: () => void;
  onExpenses: () => void;
}) {
  const { t } = useTranslation();
  const address =
    lease.propertyAddress ?? t("settings.company.leaseTab.addressFallback");

  return (
    <li className="company-lease-tab-list-item">
      <div
        className="company-lease-tab-item"
        data-cy={`bail-societe-${lease.id}`}
      >
        <span className="company-lease-tab-item-address" title={address}>
          {address}
        </span>
        <span className="company-lease-tab-item-landlord">
          {lease.landlordName ?? "—"}
        </span>
        <div className="company-lease-tab-item-cell">
          <span className="company-lease-tab-item-label">
            {t("settings.company.leaseTab.columns.rent")}
          </span>
          <span
            className="company-lease-tab-item-amount number text-right"
            data-cy={`loyer-bail-societe-${lease.id}`}
          >
            {formatEUR(lease.rentExclCharges ?? "0.00")}
          </span>
        </div>
        <div className="company-lease-tab-item-cell">
          <span className="company-lease-tab-item-label">
            {t("settings.company.leaseTab.columns.charges")}
          </span>
          <span
            className="company-lease-tab-item-amount number text-right"
            data-cy={`charges-bail-societe-${lease.id}`}
          >
            {formatEUR(lease.charges ?? "0.00")}
          </span>
        </div>
        <div
          className="company-lease-tab-item-actions"
          data-cy={`actions-bail-societe-${lease.id}`}
        >
          <Button
            variant="ghost"
            small
            icon={<ReceiptText size={13} />}
            onClick={onExpenses}
            data-cy={`btn-modifier-frais-bail-societe-${lease.id}`}
          >
            {showAddExpenses
              ? t("settings.company.leaseTab.addExpenses")
              : t("settings.company.leaseTab.expenses")}
          </Button>
          <Button
            variant="ghost"
            small
            icon={<PencilLine size={13} />}
            onClick={onEdit}
            data-cy={`btn-modifier-bail-societe-${lease.id}`}
          >
            {t("settings.company.leaseTab.edit")}
          </Button>
        </div>
      </div>
    </li>
  );
}
