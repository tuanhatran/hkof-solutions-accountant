import "./CompanyLeaseRow.css";
import { Eye, FileText, PencilLine } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LeaseDto, StatementDto } from "@/api/types";
import { CompanyLeaseStatementHistory } from "@/components/settings/CompanyLeaseStatementHistory";
import { Button } from "@/components/ui/Button";
import { formatEUR } from "@/lib/format";
import { CompanyLeaseView } from "./CompanyLeaseView";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

interface CompanyLeaseRowProps {
  lease: LeaseDto;
  companyId: number;
  companyProRataBase?: string | null;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onStatement: () => void;
  statements: StatementDto[] | undefined;
  statementsPending: boolean;
  statementsError: boolean;
  statementsErrorValue: Error | null;
  onRetryStatements: () => void;
}

/**
 * One compact lease row of the "Baux & Frais" tab: the amounts, the
 * "Afficher les frais", "Générer la note de frais" and "Modifier le bail"
 * actions, the always-visible statement history, and the inline details and
 * postes when the row is expanded. The row carries no active-lease state and no
 * click behaviour: only the "Afficher les frais" button drives the expansion.
 */
export function CompanyLeaseRow({
  lease,
  companyId,
  companyProRataBase,
  expanded,
  onToggle,
  onEdit,
  onStatement,
  statements,
  statementsPending,
  statementsError,
  statementsErrorValue,
  onRetryStatements,
}: CompanyLeaseRowProps) {
  const { t } = useTranslation();

  return (
    <li className="company-lease-tab-list-item">
      <div className="company-lease-tab-item">
        <div
          className="company-lease-tab-item-summary"
          data-cy={`bail-societe-${lease.id}`}
        >
          <span className="company-lease-tab-item-main">
            <span className="company-lease-tab-item-address">
              {lease.propertyAddress ??
                t("settings.company.leaseTab.addressFallback")}
            </span>
            <span className="company-lease-tab-item-meta">
              {t("settings.company.leaseTab.meta", {
                landlord: lease.landlordName ?? "—",
                rent: formatEUR(lease.rentExclCharges ?? "0.00"),
                charges: formatEUR(lease.charges ?? "0.00"),
              })}
            </span>
          </span>
          <span
            className="company-lease-tab-item-amount number text-right"
            data-cy={`loyer-bail-societe-${lease.id}`}
          >
            {formatEUR(lease.rentExclCharges ?? "0.00")}
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
            icon={<Eye size={13} />}
            onClick={onToggle}
            aria-expanded={expanded}
            data-cy={`btn-afficher-frais-bail-societe-${lease.id}`}
          >
            {t("settings.company.leaseTab.showExpenses")}
          </Button>
          <Button
            variant="ghost"
            small
            icon={<FileText size={13} />}
            onClick={onStatement}
            data-cy={`btn-note-frais-bail-societe-${lease.id}`}
          >
            {t("settings.company.leaseTab.statement")}
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
      <CompanyLeaseStatementHistory
        lease={lease}
        statements={statements}
        isPending={statementsPending}
        isError={statementsError}
        error={statementsErrorValue}
        onRetry={onRetryStatements}
      />
      {expanded ? (
        <div className="company-lease-tab-item-expanded">
          <CompanyLeaseView
            lease={lease}
            proRataBase={lease.proRataBase ?? null}
          />
          <ExpenseItemsManager
            companyId={companyId}
            leaseId={lease.id as number}
            defaultProRata={lease.proRataBase ?? companyProRataBase ?? "100.00"}
          />
        </div>
      ) : null}
    </li>
  );
}
