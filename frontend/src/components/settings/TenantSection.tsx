import { PencilLine, Plus, Trash2, UsersRound } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { EmptyState, SectionHeader } from "./SettingsSection";
import { TenantForm } from "./TenantForm";
import type { RentReceiptSettingsController } from "./useRentReceiptSettings";

/** Tenants section: list, create/update form and delete triggers. */
export function TenantSection({ c }: { c: RentReceiptSettingsController }) {
  return (
    <section className="card overflow-hidden">
      <SectionHeader
        icon={UsersRound}
        title="Locataires"
        description="Occupants des logements, débiteurs des quittances."
        action={
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => c.setTenantForm("new")}
            disabled={c.tenantForm === "new"}
            data-cy="btn-ajouter-locataire"
          >
            Ajouter un locataire
          </Button>
        }
      />
      <div className="card-body space-y-4">
        {c.tenantForm !== null ? (
          <TenantForm
            key={c.tenantForm === "new" ? "new" : c.tenantForm.id}
            item={c.tenantForm === "new" ? null : c.tenantForm}
            onClose={() => c.setTenantForm(null)}
          />
        ) : null}

        {c.tenants.isError ? (
          <ErrorState
            message={errorMessage(c.tenants.error)}
            onRetry={() => void c.tenants.refetch()}
          />
        ) : c.tenants.isPending ? (
          <LoadingState message="Chargement des locataires…" />
        ) : c.tenantList.length === 0 ? (
          <EmptyState
            text="Aucun locataire configuré. Ajoutez l’occupant du logement."
            dataCy="aucun-locataire"
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.tenantList.map((tenant) => (
              <li
                key={tenant.id}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-3"
                data-cy={`locataire-${tenant.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {tenant.name ?? "Locataire"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {tenant.address || "Adresse non renseignée"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  small
                  icon={<PencilLine size={13} />}
                  onClick={() => c.setTenantForm(tenant)}
                  aria-label={`Modifier ${tenant.name ?? "le locataire"}`}
                  data-cy={`btn-modifier-locataire-${tenant.id}`}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => c.setTenantToDelete(tenant)}
                  aria-label={`Supprimer ${tenant.name ?? "le locataire"}`}
                  data-cy={`btn-supprimer-locataire-${tenant.id}`}
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
