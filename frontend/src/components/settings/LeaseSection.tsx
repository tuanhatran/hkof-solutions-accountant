import "./LeaseSection.css";
import { FileText, Home, PencilLine, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { useAllRentReceipts, useSignatures } from "@/api/queries";
import type { LeaseDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatEUR } from "@/lib/format";
import { LeaseForm } from "./LeaseForm";
import { LeaseReceiptHistory } from "./LeaseReceiptHistory";
import { LeaseReceiptModal } from "./LeaseReceiptModal";
import { EmptyState, SectionHeader } from "./SettingsSection";
import type { RentReceiptSettingsController } from "./useRentReceiptSettings";

/** Leases section: address filter, list, create/update modal and delete triggers. */
export function LeaseSection({ c }: { c: RentReceiptSettingsController }) {
  const { t } = useTranslation();
  const [receiptLease, setReceiptLease] = useState<LeaseDto | null>(null);
  // One shared query for every row's receipt history; the lease receipt modal
  // refreshes it through the existing `rentReceiptsAll` invalidation.
  const allRentReceipts = useAllRentReceipts();

  return (
    <section className="card lease-section">
      <SectionHeader
        icon={Home}
        title={t("settings.lease.section.title")}
        description={t("settings.lease.section.description")}
        action={
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => c.setLeaseForm("new")}
            disabled={c.leaseForm === "new"}
            data-cy="btn-ajouter-bail"
          >
            {t("settings.lease.section.add")}
          </Button>
        }
      />
      <div className="card-body lease-section-body">
        <div className="lease-section-address">
          <FieldGroup
            id="baux-adresse"
            label={t("settings.lease.section.addressLabel")}
            help={t("settings.lease.section.addressHelp")}
          >
            <select
              id="baux-adresse"
              className="field"
              value={c.activeAddressId ?? ""}
              onChange={(event) =>
                c.selectAddress(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              disabled={c.addressList.length === 0}
              data-cy="select-adresse-quittances"
            >
              {c.addressList.length === 0 ? (
                <option value="">
                  {c.addresses.isPending
                    ? t("settings.lease.section.loadingAddresses")
                    : t("settings.lease.section.noAddress")}
                </option>
              ) : null}
              {c.addressList.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>

        {c.leaseForm !== null ? (
          <LeaseForm
            key={c.leaseForm === "new" ? "new" : c.leaseForm.id}
            item={c.leaseForm === "new" ? null : c.leaseForm}
            persons={c.personList}
            companies={c.companyList}
            onSaved={c.handleLeaseSaved}
            onClose={() => c.setLeaseForm(null)}
          />
        ) : null}

        {c.leases.isError ? (
          <ErrorState
            message={errorMessage(c.leases.error)}
            onRetry={() => void c.leases.refetch()}
          />
        ) : c.leases.isPending ? (
          <LoadingState message={t("settings.lease.section.loading")} />
        ) : c.leaseList.length === 0 ? (
          <EmptyState
            text={t("settings.lease.section.empty")}
            dataCy="aucun-bail"
          />
        ) : (
          <ul className="lease-section-list">
            {c.leaseList.map((lease) => (
              <li
                key={lease.id}
                className="lease-section-item"
                data-cy={`bail-${lease.id}`}
              >
                <div className="lease-section-item-body">
                  <p className="lease-section-item-title">
                    {lease.landlordName} → {lease.tenantName}
                  </p>
                  <p className="lease-section-item-address">
                    {lease.propertyAddress}
                  </p>
                  <p
                    className="lease-section-item-company"
                    data-cy={`societe-bail-${lease.id}`}
                  >
                    {t("settings.lease.section.company", {
                      company:
                        lease.companyName ??
                        t("settings.lease.section.noCompany"),
                    })}
                  </p>
                  <p className="lease-section-item-amounts">
                    {t("settings.lease.section.amounts", {
                      rent: formatEUR(lease.rentExclCharges ?? "0.00"),
                      charges: formatEUR(lease.charges ?? "0.00"),
                    })}{" "}
                    <span
                      className="lease-section-item-total"
                      data-cy={`total-bail-${lease.id}`}
                    >
                      {formatEUR(
                        Number(lease.rentExclCharges ?? 0) +
                          Number(lease.charges ?? 0),
                      )}
                    </span>
                  </p>
                </div>
                <LeaseReceiptButton
                  lease={lease}
                  onOpen={() => setReceiptLease(lease)}
                />
                <Button
                  variant="ghost"
                  small
                  icon={<PencilLine size={13} />}
                  onClick={() => c.setLeaseForm(lease)}
                  aria-label={t("settings.lease.section.editAria", {
                    id: lease.id,
                  })}
                  data-cy={`btn-modifier-bail-${lease.id}`}
                >
                  {t("settings.lease.section.edit")}
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => c.setLeaseToDelete(lease)}
                  aria-label={t("settings.lease.section.removeAria", {
                    id: lease.id,
                  })}
                  data-cy={`btn-supprimer-bail-${lease.id}`}
                >
                  {t("settings.lease.section.remove")}
                </Button>
                <LeaseReceiptHistory
                  lease={lease}
                  receipts={allRentReceipts.data}
                  isPending={allRentReceipts.isPending}
                  isError={allRentReceipts.isError}
                  error={allRentReceipts.error}
                  onRetry={() => void allRentReceipts.refetch()}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={c.leaseToDelete !== null}
        title={t("settings.lease.section.deleteDialog.title")}
        message={
          c.leaseToDelete
            ? t("settings.lease.section.deleteDialog.message", {
                tenant:
                  c.leaseToDelete.tenantName ??
                  t("settings.lease.section.deleteDialog.fallbackTenant"),
              })
            : ""
        }
        confirmLabel={t("settings.lease.section.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (c.leaseToDelete) {
            c.removeLease.mutate(c.leaseToDelete);
          }
        }}
        onCancel={() => c.setLeaseToDelete(null)}
        dataCy="dialogue-supprimer-bail"
      />

      {receiptLease ? (
        <LeaseReceiptModal
          lease={receiptLease}
          onClose={() => setReceiptLease(null)}
        />
      ) : null}
    </section>
  );
}

/**
 * Rent receipt trigger of one lease row. A row owns its own signature query so
 * the hook never runs in a loop; without a landlord signature the button is
 * disabled and the wrapping span carries the explanation, because a disabled
 * button does not show a native tooltip.
 */
function LeaseReceiptButton({
  lease: leaseRow,
  onOpen,
}: {
  lease: LeaseDto;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const signatures = useSignatures(leaseRow.landlordId ?? null);
  const hasSignature = (signatures.data ?? []).length > 0;
  const button = (
    <Button
      variant="ghost"
      small
      icon={<FileText size={13} />}
      onClick={onOpen}
      disabled={!hasSignature}
      aria-label={t("settings.lease.section.receiptAria", { id: leaseRow.id })}
      data-cy={`btn-quittance-bail-${leaseRow.id}`}
    >
      {t("settings.lease.section.receipt")}
    </Button>
  );
  if (hasSignature) {
    return button;
  }
  return (
    <span
      className="lease-section-signature-warning"
      title={
        signatures.isPending
          ? t("settings.lease.section.signaturePending")
          : t("settings.lease.section.signatureMissing")
      }
    >
      {button}
    </span>
  );
}
