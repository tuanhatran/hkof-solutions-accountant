import "./CompanyLeaseExpensesModal.css";
import { useTranslation } from "react-i18next";
import type { CompanyDto, LeaseDto } from "@/api/types";
import { Dialog } from "@/components/ui/Dialog";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

/**
 * Single expenses window of the "Baux & Frais" tab, always scoped to a
 * company lease. The list and the item form swap inside this same dialog; the
 * header title and the lease address stay stable while the view changes.
 * Company-level items with `leaseId = null` remain inherited in this scope.
 */
export function CompanyLeaseExpensesModal({
  company,
  lease,
  onClose,
}: {
  company: CompanyDto;
  lease: LeaseDto;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const defaultProRata = lease.proRataBase ?? company.proRataBase ?? "100.00";

  return (
    <Dialog
      open
      wide
      title={t("settings.company.leaseTab.expensesTitle")}
      onClose={onClose}
      dataCy="dialogue-frais-bail-societe"
    >
      {lease.propertyAddress ? (
        <p className="company-lease-expenses-address">
          {lease.propertyAddress}
        </p>
      ) : null}
      <ExpenseItemsManager
        embedded
        companyId={company.id as number}
        leaseId={lease.id ?? null}
        defaultProRata={defaultProRata}
      />
    </Dialog>
  );
}
