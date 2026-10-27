import "./ExpenseStatementHeader.css";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ExternalLink,
  FileCheck2,
  ReceiptText,
} from "lucide-react";
import { api } from "@/api/endpoints";
import { Button } from "@/components/ui/Button";
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
            <span className="hidden expense-statement-header-month sm:inline-flex">
              <CalendarDays size={14} aria-hidden="true" />
              {formatMonth(c.month)}
            </span>
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
