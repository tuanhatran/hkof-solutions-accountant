import "./ExpenseGenerationFooter.css";
import { useTranslation } from "react-i18next";
import { FileCheck2, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { Spinner } from "@/components/ui/States";
import { formatEUR } from "@/lib/format";
import type { ExpenseStatementController } from "./useExpenseStatementPage";

/** Totals, signature picker and generation action of the lines card. */
export function ExpenseGenerationFooter({
  controller: c,
}: {
  controller: ExpenseStatementController;
}) {
  const { t } = useTranslation();
  return (
    <div className="expense-generation-footer">
      <div className="expense-generation-footer-totals">
        <div>
          <p className="eyebrow">{t("expenseStatement.footer.total")}</p>
          <p className="expense-generation-footer-total">
            <span data-cy="retained-total">{formatEUR(c.displayedTotal)}</span>
            {c.calculationInProgress ? <Spinner size={15} /> : null}
          </p>
          {c.calculation?.totalInWords ? (
            <p className="expense-generation-footer-words">
              {t("expenseStatement.footer.inWords", {
                words: c.calculation.totalInWords,
              })}
            </p>
          ) : null}
        </div>
        <div className="expense-generation-footer-basis">
          <p>
            {t("expenseStatement.footer.proRataBase")}{" "}
            <span className="expense-generation-footer-basis-value">
              {c.calculation?.proRataBaseDetail ??
                c.activeCompany?.proRataBaseDetail ??
                "—"}
            </span>
          </p>
          {c.calculation?.proRataBase ? (
            <p>
              {t("expenseStatement.footer.referenceShare")}{" "}
              <span>{formatEUR(c.calculation.proRataBase)}</span>
            </p>
          ) : null}
          <p>{t("expenseStatement.footer.calculationNote")}</p>
        </div>
      </div>

      {c.calculationError ? (
        <p className="error-text" role="alert">
          {t("expenseStatement.footer.calculationError", {
            message: c.calculationError,
          })}
        </p>
      ) : null}
      {c.requests.error && !c.calculationError ? (
        <p className="error-text" role="alert">
          {c.requests.error}
        </p>
      ) : null}

      <div className="expense-generation-footer-signature">
        <FieldGroup
          id="note-signature"
          label={t("expenseStatement.footer.signature")}
          help={t("expenseStatement.footer.signatureHelp")}
          badge={
            <span className="badge badge-neutral">
              {t("expenseStatement.footer.signatureBadge")}
            </span>
          }
        >
          <select
            id="note-signature"
            className="field"
            data-cy="select-signature"
            value={c.selectedSignatureId ?? ""}
            onChange={(event) =>
              c.setChosenSignatureId(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={c.signatures.isPending || c.signatureList.length === 0}
          >
            {c.signatureList.length === 0 ? (
              <option value="">
                {t("expenseStatement.footer.noSignature")}
              </option>
            ) : null}
            {c.signatureList.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        {c.signatures.isError ? (
          <p
            className="expense-generation-footer-alert"
            role="alert"
            aria-live="polite"
            data-cy="alert-signatures-error"
          >
            {t("expenseStatement.footer.signaturesError", {
              message: errorMessage(c.signatures.error),
            })}
          </p>
        ) : !c.ceo && !c.employees.isPending ? (
          <p
            className="expense-generation-footer-alert"
            role="alert"
            data-cy="alert-missing-ceo"
          >
            {t("expenseStatement.footer.missingCeoBefore")}{" "}
            <Link to="/configuration/entreprise" className="link">
              {t("expenseStatement.footer.companyLink")}
            </Link>
            {t("expenseStatement.footer.missingCeoAfter")}
          </p>
        ) : !c.signatureAvailable && !c.signatures.isPending ? (
          <p
            className="expense-generation-footer-alert"
            role="alert"
            data-cy="alert-missing-signature"
          >
            {t("expenseStatement.footer.missingSignatureBefore")}{" "}
            <Link to="/configuration/entreprise" className="link">
              {t("expenseStatement.footer.companyLink")}
            </Link>
            {t("expenseStatement.footer.missingSignatureAfter")}
          </p>
        ) : null}
      </div>

      <div className="expense-generation-footer-actions">
        <div className="expense-generation-footer-buttons">
          <Button
            variant="primary"
            icon={<Save size={16} />}
            loading={c.draftSaving}
            onClick={() => void c.saveDraft()}
            disabled={
              c.activeCompanyId === null ||
              c.selectedLeaseId === null ||
              c.draftSaving
            }
            data-cy="btn-save-draft"
          >
            {t("draft.save")}
          </Button>
          <Button
            variant="primary"
            icon={<FileCheck2 size={16} />}
            loading={c.generationInProgress}
            disabled={
              c.selectedLeaseId === null ||
              c.orderedLines.length === 0 ||
              !c.calculationUpToDate ||
              !c.signatureAvailable
            }
            onClick={c.requestGeneration}
            data-cy="btn-generate-statement"
          >
            {t("expenseStatement.footer.generate")}
          </Button>
        </div>
        <p className="expense-generation-footer-hint">
          {c.selectedLeaseId === null
            ? t("expenseStatement.footer.hintNoLease")
            : c.orderedLines.length === 0
              ? t("expenseStatement.footer.hintNoLine")
              : !c.signatureAvailable
                ? t("expenseStatement.footer.hintNoSignature")
                : !c.calculationUpToDate
                  ? t("expenseStatement.footer.hintStaleCalculation")
                  : c.activeStatement.data
                    ? t("expenseStatement.footer.hintNextVersion", {
                        version: c.activeVersion,
                        next: (c.activeVersion ?? 0) + 1,
                      })
                    : t("expenseStatement.footer.hintSaved")}
        </p>
      </div>
    </div>
  );
}
