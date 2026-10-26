import "./LeaseSection.css";
import { FileText, Home, PencilLine, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const [receiptLease, setReceiptLease] = useState<LeaseDto | null>(null);
  // One shared query for every row's receipt history; the lease receipt modal
  // refreshes it through the existing `rentReceiptsAll` invalidation.
  const allRentReceipts = useAllRentReceipts();

  return (
    <section className="card lease-section">
      <SectionHeader
        icon={Home}
        title="Baux et adresses"
        description="Une adresse peut porter plusieurs baux. Sélectionnez une adresse pour afficher ses baux et fixer le loyer et les charges."
        action={
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => c.setLeaseForm("new")}
            disabled={c.leaseForm === "new"}
            data-cy="btn-ajouter-bail"
          >
            Ajouter un bail
          </Button>
        }
      />
      <div className="card-body lease-section-body">
        <div className="lease-section-address">
          <FieldGroup
            id="baux-adresse"
            label="Adresse des baux"
            help="Seuls les baux de l’adresse sélectionnée sont affichés."
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
                    ? "Chargement des adresses…"
                    : "Aucune adresse configurée"}
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
          <LoadingState message="Chargement des baux…" />
        ) : c.leaseList.length === 0 ? (
          <EmptyState
            text="Aucun bail pour cette adresse. Ajoutez un bail pour générer des quittances."
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
                    Société : {lease.companyName ?? "Aucune société"}
                  </p>
                  <p className="lease-section-item-amounts">
                    Loyer {formatEUR(lease.rentExclCharges ?? "0.00")} · charges{" "}
                    {formatEUR(lease.charges ?? "0.00")} · total{" "}
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
                  aria-label={`Modifier le bail ${lease.id}`}
                  data-cy={`btn-modifier-bail-${lease.id}`}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => c.setLeaseToDelete(lease)}
                  aria-label={`Supprimer le bail ${lease.id}`}
                  data-cy={`btn-supprimer-bail-${lease.id}`}
                >
                  Retirer
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
        title="Supprimer ce bail ?"
        message={
          c.leaseToDelete
            ? `Le bail de « ${c.leaseToDelete.tenantName ?? "ce locataire"} » ne sera plus proposé lors de la génération. Les quittances existantes restent inchangées.`
            : ""
        }
        confirmLabel="Supprimer le bail"
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
  const signatures = useSignatures(leaseRow.landlordId ?? null);
  const hasSignature = (signatures.data ?? []).length > 0;
  const button = (
    <Button
      variant="ghost"
      small
      icon={<FileText size={13} />}
      onClick={onOpen}
      disabled={!hasSignature}
      aria-label={`Quittance du bail ${leaseRow.id}`}
      data-cy={`btn-quittance-bail-${leaseRow.id}`}
    >
      Quittance
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
          ? "Vérification des signatures…"
          : "Aucune signature enregistrée pour ce bailleur. Ajoutez-en une dans l’onglet « Personnes » pour générer une quittance."
      }
    >
      {button}
    </span>
  );
}
