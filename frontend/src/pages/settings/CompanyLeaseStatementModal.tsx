import "./CompanyLeaseStatementModal.css";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import type { LeaseDto } from "@/api/types";
import { LeaseReceiptModal } from "@/components/settings/LeaseReceiptModal";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/States";
import { ViewTabs } from "@/components/ui/ViewTabs";
import { formatMonth } from "@/lib/format";
import { ExpenseInputPane } from "@/pages/expense-statement/ExpenseInputPane";
import { ExpensePreviewPane } from "@/pages/expense-statement/ExpensePreviewPane";
import { useCompanyLeaseStatementModal } from "./useCompanyLeaseStatementModal";

/**
 * Modal editing the home-office expense statement of one company lease. It
 * reuses the full expense editor panes with a controller scoped to this
 * company+lease; generation keeps the modal open and shows the backend
 * version and total with the PDF and complete ZIP downloads.
 */
export function CompanyLeaseStatementModal({
  lease,
  companyId,
  onClose,
}: {
  lease: LeaseDto;
  companyId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const {
    controller: c,
    receiptModalOpen,
    closeReceiptModal,
  } = useCompanyLeaseStatementModal(lease, companyId);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="company-lease-statement-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-lease-statement-title"
        className="animation-fade company-lease-statement-panel"
        data-cy="dialogue-note-frais-bail"
      >
        <div className="company-lease-statement-header">
          <div>
            <h2
              id="company-lease-statement-title"
              className="company-lease-statement-title"
            >
              {t("settings.company.statementModal.title")}
            </h2>
            <p className="company-lease-statement-subtitle">
              {lease.propertyAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="company-lease-statement-close"
            aria-label={t("settings.company.statementModal.closeAria")}
          >
            <X size={18} />
          </button>
        </div>

        {c.companies.isError ? (
          <ErrorState
            message={errorMessage(c.companies.error)}
            onRetry={() => void c.companies.refetch()}
          />
        ) : null}
        {c.expenseItemsQuery.isError ? (
          <ErrorState
            message={errorMessage(c.expenseItemsQuery.error)}
            onRetry={() => void c.expenseItemsQuery.refetch()}
          />
        ) : null}

        <div className="company-lease-statement-tabs">
          <ViewTabs
            ariaLabel={t("settings.company.statementModal.tabsAria")}
            idPrefix="lease-view"
            active={c.mobilePanel}
            onChange={(value) =>
              c.setMobilePanel(value === "preview" ? "preview" : "input")
            }
            tabs={[
              {
                value: "input",
                label: t("settings.company.statementModal.input"),
                panelId: "lease-input-panel",
              },
              {
                value: "preview",
                label: t("settings.company.statementModal.preview"),
                updated: Boolean(c.preview.updatedAt),
                className: "flex items-center justify-center gap-2",
                panelId: "lease-preview-panel",
              },
            ]}
          />
        </div>

        <div className="company-lease-statement-grid">
          <ExpenseInputPane
            controller={c}
            panel={{
              id: "lease-input-panel",
              labelledBy: "lease-view-tab-input",
            }}
          />
          <ExpensePreviewPane
            controller={c}
            panel={{
              id: "lease-preview-panel",
              labelledBy: "lease-view-tab-preview",
            }}
          />
        </div>

        <div className="company-lease-statement-actions">
          <Button variant="secondary" small onClick={onClose}>
            {t("settings.company.statementModal.close")}
          </Button>
        </div>

        <ConfirmDialog
          open={c.lineToRemove !== null}
          title={t("expenseStatement.page.removeDialog.title")}
          message={
            c.lineToRemove
              ? t("expenseStatement.page.removeDialog.message", {
                  item:
                    c.expenseItemByCode.get(c.lineToRemove.itemCode)?.label ??
                    c.lineToRemove.itemCode,
                })
              : null
          }
          confirmLabel={t("expenseStatement.page.removeDialog.confirm")}
          variant="danger"
          onConfirm={c.removeLine}
          onCancel={() => c.setLineToRemove(null)}
          dataCy="dialogue-suppression-frais"
        />

        <ConfirmDialog
          open={c.regenerationDialog}
          title={t("expenseStatement.page.regenerateDialog.title")}
          message={t("expenseStatement.page.regenerateDialog.message", {
            month: formatMonth(c.month),
            version: c.activeVersion,
            next: (c.activeVersion ?? 0) + 1,
          })}
          confirmLabel={t("expenseStatement.page.regenerateDialog.confirm")}
          onConfirm={() => {
            c.setRegenerationDialog(false);
            void c.generateStatement();
          }}
          onCancel={() => c.setRegenerationDialog(false)}
          dataCy="dialogue-regeneration-note"
        />
      </div>

      {receiptModalOpen ? (
        <LeaseReceiptModal lease={lease} onClose={closeReceiptModal} />
      ) : null}
    </div>,
    document.body,
  );
}
