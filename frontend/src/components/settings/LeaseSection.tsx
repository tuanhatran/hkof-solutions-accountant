import "./LeaseSection.css";
import { Home, PencilLine, Plus, Trash2 } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatEUR } from "@/lib/format";
import { LeaseForm } from "./LeaseForm";
import { EmptyState, SectionHeader } from "./SettingsSection";
import type { RentReceiptSettingsController } from "./useRentReceiptSettings";

/** Leases section: address filter, list, create/update modal and delete triggers. */
export function LeaseSection({ c }: { c: RentReceiptSettingsController }) {
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
            landlords={c.landlordList}
            tenants={c.tenantList}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
