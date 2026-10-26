import "./CompanyLeaseStatementModal.css";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
              Note de frais
            </h2>
            <p className="company-lease-statement-subtitle">
              {lease.propertyAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="company-lease-statement-close"
            aria-label="Fermer la fenêtre"
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
            ariaLabel="Volets de la note de frais"
            active={c.mobilePanel}
            onChange={(value) =>
              c.setMobilePanel(value === "preview" ? "preview" : "input")
            }
            tabs={[
              { value: "input", label: "Saisie" },
              {
                value: "preview",
                label: "Aperçu",
                updated: Boolean(c.preview.updatedAt),
                className: "flex items-center justify-center gap-2",
              },
            ]}
          />
        </div>

        <div className="company-lease-statement-grid">
          <ExpenseInputPane controller={c} />
          <ExpensePreviewPane controller={c} />
        </div>

        <div className="company-lease-statement-actions">
          <Button variant="secondary" small onClick={onClose}>
            Fermer
          </Button>
        </div>

        <ConfirmDialog
          open={c.lineToRemove !== null}
          title="Supprimer ce frais ?"
          message={
            c.lineToRemove ? (
              <>
                La ligne «{" "}
                {c.expenseItemByCode.get(c.lineToRemove.itemCode)?.label ??
                  c.lineToRemove.itemCode}{" "}
                » sera retirée du brouillon. Cette action ne modifie pas les
                versions déjà générées.
              </>
            ) : null
          }
          confirmLabel="Supprimer"
          variant="danger"
          onConfirm={c.removeLine}
          onCancel={() => c.setLineToRemove(null)}
          dataCy="dialogue-suppression-frais"
        />

        <ConfirmDialog
          open={c.regenerationDialog}
          title="Générer une nouvelle version ?"
          message={
            <>
              Une note active existe déjà pour {formatMonth(c.month)} (version{" "}
              {c.activeVersion}). La version {(c.activeVersion ?? 0) + 1} sera
              créée et l’ancienne restera consultable dans l’historique.
            </>
          }
          confirmLabel="Créer la nouvelle version"
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
