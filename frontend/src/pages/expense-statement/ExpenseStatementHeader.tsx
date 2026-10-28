import "./ExpenseStatementHeader.css";
import { useTranslation } from "react-i18next";
import {
  Building2,
  ExternalLink,
  FileCheck2,
  KeyRound,
  ReceiptText,
} from "lucide-react";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
import { MonthField } from "@/components/ui/MonthField";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatEUR, formatMonth } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Page title plus the banner of the version already active for the month. */
export function ExpenseStatementHeader({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  const active = c.activeStatement.data;
  const companyList = c.companies.data ?? [];
  return (
    <>
      <PageHeader
        eyebrow={t("expenseStatement.page.eyebrow")}
        title={t("expenseStatement.page.title")}
        description={t("expenseStatement.page.description")}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ReceiptText size={15} />}
              onClick={c.goToRentReceipt}
            >
              {t("expenseStatement.page.rentReceiptButton")}
            </Button>
            {c.companies.isSuccess && companyList.length === 1 ? (
              <span
                className="expense-statement-header-company-chip"
                data-cy="societe-note-frais"
              >
                <Building2 size={14} aria-hidden="true" />
                {companyList[0]?.name}
              </span>
            ) : null}
            {c.companies.isSuccess && companyList.length > 1 ? (
              <div className="expense-statement-header-company">
                <select
                  id="select-societe-note-frais"
                  data-cy="select-societe-note-frais"
                  aria-label={t("expenseStatement.header.companyLabel")}
                  className="field expense-statement-header-company-select"
                  value={c.activeCompanyId ?? ""}
                  onChange={(event) =>
                    c.selectCompany(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                >
                  <option value="">
                    {t("expenseStatement.header.companyPlaceholder")}
                  </option>
                  {companyList.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {c.activeCompanyId !== null && c.companyLeases.length === 1 ? (
              <span
                className="expense-statement-header-company-chip"
                data-cy="bail-note-frais"
                aria-label={t("expenseStatement.header.leaseLabel")}
              >
                <KeyRound size={14} aria-hidden="true" />
                {t("expenseStatement.header.leaseChip", {
                  name: c.companyLeases[0]?.landlordName ?? "",
                })}
              </span>
            ) : null}
            {c.activeCompanyId !== null && c.companyLeases.length > 1 ? (
              <div className="expense-statement-header-company">
                <select
                  id="select-bail-note-frais"
                  data-cy="select-bail-note-frais"
                  aria-label={t("expenseStatement.header.leaseLabel")}
                  className="field expense-statement-header-company-select"
                  value={c.selectedLeaseId ?? ""}
                  disabled={c.leaseLocked}
                  onChange={(event) =>
                    c.selectLease(
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                >
                  <option value="">
                    {t("expenseStatement.header.leasePlaceholder")}
                  </option>
                  {c.companyLeases.map((lease) => (
                    <option key={lease.id} value={lease.id}>
                      {lease.landlordName ??
                        lease.propertyAddress ??
                        `#${lease.id}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <MonthField
              id="note-mois"
              label={t("expenseStatement.entry.monthLabel")}
              value={c.month}
              onChange={c.changeMonth}
              dataCy="select-mois"
            />
          </>
        }
      />

      {active && !c.result ? (
        <div className="card expense-statement-header-banner border-accent/20 bg-accent-soft/45">
          <div className="expense-statement-header-banner-main">
            <span className="expense-statement-header-banner-icon">
              <FileCheck2 size={17} aria-hidden="true" />
            </span>
            <div>
              <p className="expense-statement-header-banner-title">
                {t("expenseStatement.header.bannerTitle", {
                  month: formatMonth(c.month),
                  version: c.activeVersion,
                })}
              </p>
              <p className="expense-statement-header-banner-text">
                {t("expenseStatement.header.bannerText", {
                  total: formatEUR(active.total),
                  next: (c.activeVersion ?? 0) + 1,
                })}
              </p>
            </div>
          </div>
          <div className="expense-statement-header-banner-actions">
            {active.id ? (
              <>
                <a
                  href={api.expenseStatements.pdfUrl(active.id, false)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  {t("expenseStatement.header.open")}
                </a>
                <a
                  href={api.expenseStatements.pdfUrl(active.id, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  {t("expenseStatement.header.completeVersion")}
                </a>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
