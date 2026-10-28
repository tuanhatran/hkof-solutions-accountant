import "./CompanyLeaseExpensesModal.css";
import { useTranslation } from "react-i18next";
import type { CompanyDto, LeaseDto } from "@/api/types";
import { Dialog } from "@/components/ui/Dialog";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

/**
 * Single expenses window of the "Baux & Frais" tab. It is scoped either to a
 * company lease or, with `lease = null`, to the company-level "Frais généraux".
 * The list and the item form swap inside this same dialog; the header title and
 * the selector suffix stay stable while the view changes.
 */
export function CompanyLeaseExpensesModal({
  company,
  lease,
  onClose,
}: {
  company: CompanyDto;
  lease: LeaseDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const leaseId = lease?.id ?? null;
  const defaultProRata = lease
    ? (lease.proRataBase ?? company.proRataBase ?? "100.00")
    : (company.proRataBase ?? "100.00");

  return (
    <Dialog
      open
      wide
      title={
        lease
          ? t("settings.company.leaseTab.expensesTitle")
          : t("settings.company.leaseTab.generalExpensesTitle")
      }
      onClose={onClose}
      dataCy={
        lease
          ? "dialogue-frais-bail-societe"
          : "dialogue-frais-generaux-societe"
      }
    >
      {lease?.propertyAddress ? (
        <p className="company-lease-expenses-address">
          {lease.propertyAddress}
        </p>
      ) : null}
      <ExpenseItemsManager
        embedded
        companyId={company.id as number}
        leaseId={leaseId}
        defaultProRata={defaultProRata}
      />
    </Dialog>
  );
}
