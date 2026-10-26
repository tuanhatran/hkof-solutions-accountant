import "./LeaseReceiptModal.css";
import { Download, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { LeaseDto } from "@/api/types";
import { PdfViewer } from "@/components/pdf/PdfViewer";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatEUR, formatMonth, formatPeriod } from "@/lib/format";
import { useLeaseReceiptModal } from "./useLeaseReceiptModal";

/** Modal generating one rent receipt for a given lease. */
export function LeaseReceiptModal({
  lease: leaseRow,
  onClose,
}: {
  lease: LeaseDto;
  onClose: () => void;
}) {
  const c = useLeaseReceiptModal(leaseRow);
  const panel = useRef<HTMLDivElement>(null);
  const result = c.result;

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
      className="lease-receipt-modal-overlay"
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
        aria-labelledby="lease-receipt-modal-title"
        className="animation-fade lease-receipt-modal-panel"
        data-cy="dialogue-quittance-bail"
      >
        <div className="lease-receipt-modal-header">
          <div>
            <h2
              id="lease-receipt-modal-title"
              className="lease-receipt-modal-title"
            >
              Quittance de loyer
            </h2>
            <p className="lease-receipt-modal-subtitle">
              {leaseRow.propertyAddress}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lease-receipt-modal-close"
            aria-label="Fermer la fenêtre"
          >
            <X size={18} />
          </button>
        </div>

        <dl className="lease-receipt-modal-identity">
          <div>
            <dt className="lease-receipt-modal-identity-label">Bailleur</dt>
            <dd className="lease-receipt-modal-identity-value">
              {leaseRow.landlordName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="lease-receipt-modal-identity-label">Locataire</dt>
            <dd className="lease-receipt-modal-identity-value">
              {leaseRow.tenantName ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="lease-receipt-modal-identity-label">Société</dt>
            <dd
              className="lease-receipt-modal-identity-value"
              data-cy="societe-quittance-bail"
            >
              {leaseRow.companyName ?? "Aucune société"}
            </dd>
          </div>
          <div>
            <dt className="lease-receipt-modal-identity-label">Bien</dt>
            <dd className="lease-receipt-modal-identity-value">
              {leaseRow.propertyAddress}
            </dd>
          </div>
        </dl>

        <form
          className="lease-receipt-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            void c.submit();
          }}
          noValidate
        >
          <div className="lease-receipt-modal-grid">
            <FieldGroup
              id="quittance-bail-mois"
              label="Mois"
              help="La période se déduit du mois choisi."
            >
              <input
                id="quittance-bail-mois"
                type="month"
                className="field"
                {...c.register("month", {
                  onChange: (event) => c.changeMonth(event.target.value),
                })}
              />
            </FieldGroup>
            <div className="lease-receipt-modal-period">
              <span className="lease-receipt-modal-identity-label">
                Période :{" "}
              </span>
              <span data-cy="periode-quittance-bail">
                {formatPeriod(c.values.periodStart, c.values.periodEnd)}
              </span>
            </div>
          </div>

          <div className="lease-receipt-modal-grid">
            <FieldGroup
              id="quittance-bail-loyer"
              label="Loyer hors charges"
              error={c.errors.rentExclCharges?.message}
              help="Modifiable pour une régularisation ponctuelle."
            >
              <div className="lease-receipt-modal-amount">
                <input
                  id="quittance-bail-loyer"
                  inputMode="decimal"
                  className={cn(
                    "field pr-9",
                    c.errors.rentExclCharges && "field-error",
                  )}
                  aria-invalid={Boolean(c.errors.rentExclCharges)}
                  {...c.register("rentExclCharges")}
                />
                <span className="lease-receipt-modal-unit">€</span>
              </div>
            </FieldGroup>
            <FieldGroup
              id="quittance-bail-charges"
              label="Provision pour charges"
              error={c.errors.charges?.message}
            >
              <div className="lease-receipt-modal-amount">
                <input
                  id="quittance-bail-charges"
                  inputMode="decimal"
                  className={cn(
                    "field pr-9",
                    c.errors.charges && "field-error",
                  )}
                  aria-invalid={Boolean(c.errors.charges)}
                  {...c.register("charges")}
                />
                <span className="lease-receipt-modal-unit">€</span>
              </div>
            </FieldGroup>
          </div>

          <PdfViewer
            url={c.preview.url}
            loading={c.preview.loading}
            error={c.preview.error}
            updatedAt={c.preview.updatedAt}
            dataCy="apercu-quittance-bail"
          />

          {result ? (
            <div className="lease-receipt-modal-result">
              <p className="lease-receipt-modal-result-title">
                Quittance générée
              </p>
              <p
                className="lease-receipt-modal-result-meta"
                data-cy="resultat-quittance-bail"
              >
                {formatMonth(result.month)} · version {result.version ?? 1} ·{" "}
                {formatEUR(result.total)}
              </p>
              <Button
                variant="primary"
                small
                icon={<Download size={14} />}
                onClick={() => void c.download(result)}
                data-cy="btn-telecharger-quittance-bail"
              >
                Télécharger le PDF
              </Button>
            </div>
          ) : null}

          <div className="lease-receipt-modal-actions">
            <Button variant="secondary" small onClick={onClose}>
              Fermer
            </Button>
            <Button
              variant="primary"
              small
              type="submit"
              loading={c.generate.isPending}
              disabled={c.generationDisabled}
              data-cy="btn-generer-quittance-bail"
            >
              Générer la quittance
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
