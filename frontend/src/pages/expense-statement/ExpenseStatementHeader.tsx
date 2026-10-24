import "./ExpenseStatementHeader.css";
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
  const active = c.activeStatement.data;
  return (
    <>
      <PageHeader
        eyebrow="Générer · Note de frais"
        title="Note de frais d’occupation"
        description="Ajoutez les factures du mois, vérifiez les propositions de l’IA et laissez le backend calculer la quote-part. Le loyer est repris de la quittance active."
        actions={
          <>
            <Button
              variant="secondary"
              icon={<ReceiptText size={15} />}
              onClick={c.goToRentReceipt}
            >
              Quittance du mois
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
                {formatMonth(c.month)} — note version {c.activeVersion} déjà
                active
              </p>
              <p className="expense-statement-header-banner-text">
                Total {formatEUR(active.total)}. Générer à nouveau créera la
                version {(c.activeVersion ?? 0) + 1}.
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
                  Ouvrir
                </a>
                <a
                  href={api.expenseStatements.pdfUrl(active.id, true)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-small"
                >
                  <ExternalLink size={13} aria-hidden="true" />
                  Version complète
                </a>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
