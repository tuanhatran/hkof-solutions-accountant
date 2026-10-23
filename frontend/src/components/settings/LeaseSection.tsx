import { Home, PencilLine, Plus, Trash2 } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatEUR } from "@/lib/format";
import { LeaseForm } from "./LeaseForm";
import { EmptyState, SectionHeader } from "./SettingsSection";
import type { RentReceiptSettingsController } from "./useRentReceiptSettings";

/** Leases section: list, create/update form and delete triggers. */
export function LeaseSection({ c }: { c: RentReceiptSettingsController }) {
  return (
    <section className="card overflow-hidden">
      <SectionHeader
        icon={Home}
        title="Baux"
        description="Un bail actif par couple bailleur + locataire. Il fixe l’adresse du bien, le loyer et les charges."
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
      <div className="card-body space-y-4">
        {c.leaseForm !== null ? (
          <LeaseForm
            key={c.leaseForm === "new" ? "new" : c.leaseForm.id}
            item={c.leaseForm === "new" ? null : c.leaseForm}
            landlords={c.landlordList}
            tenants={c.tenantList}
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
            text="Aucun bail configuré. Ajoutez un bail pour générer des quittances."
            dataCy="aucun-bail"
          />
        ) : (
          <ul className="space-y-3">
            {c.leaseList.map((lease) => (
              <li
                key={lease.id}
                className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-paper/40 p-3"
                data-cy={`bail-${lease.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">
                    {lease.landlordName} → {lease.tenantName}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {lease.propertyAddress}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    Loyer {formatEUR(lease.rentExclCharges ?? "0.00")} · charges{" "}
                    {formatEUR(lease.charges ?? "0.00")} · total{" "}
                    <span
                      className="font-semibold text-ink"
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
