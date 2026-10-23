import { Landmark, PencilLine, Plus, Trash2 } from "lucide-react";
import { errorMessage } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { LandlordForm } from "./LandlordForm";
import { EmptyState, SectionHeader } from "./SettingsSection";
import type { RentReceiptSettingsController } from "./useRentReceiptSettings";

/** Landlords section: list, create/update form and delete triggers. */
export function LandlordSection({ c }: { c: RentReceiptSettingsController }) {
  return (
    <section className="card overflow-hidden">
      <SectionHeader
        icon={Landmark}
        title="Bailleurs"
        description="Propriétaires des logements, crédités dans les quittances."
        action={
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => c.setLandlordForm("new")}
            disabled={c.landlordForm === "new"}
            data-cy="btn-ajouter-bailleur"
          >
            Ajouter un bailleur
          </Button>
        }
      />
      <div className="card-body space-y-4">
        {c.landlordForm !== null ? (
          <LandlordForm
            key={c.landlordForm === "new" ? "new" : c.landlordForm.id}
            item={c.landlordForm === "new" ? null : c.landlordForm}
            onClose={() => c.setLandlordForm(null)}
          />
        ) : null}

        {c.landlords.isError ? (
          <ErrorState
            message={errorMessage(c.landlords.error)}
            onRetry={() => void c.landlords.refetch()}
          />
        ) : c.landlords.isPending ? (
          <LoadingState message="Chargement des bailleurs…" />
        ) : c.landlordList.length === 0 ? (
          <EmptyState
            text="Aucun bailleur configuré. Ajoutez le propriétaire du logement."
            dataCy="aucun-bailleur"
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {c.landlordList.map((landlord) => (
              <li
                key={landlord.id}
                className="flex items-start gap-3 rounded-xl border border-line bg-paper/40 p-3"
                data-cy={`bailleur-${landlord.id}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {landlord.name ?? "Bailleur"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {landlord.address || "Adresse non renseignée"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  small
                  icon={<PencilLine size={13} />}
                  onClick={() => c.setLandlordForm(landlord)}
                  aria-label={`Modifier ${landlord.name ?? "le bailleur"}`}
                  data-cy={`btn-modifier-bailleur-${landlord.id}`}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => c.setLandlordToDelete(landlord)}
                  aria-label={`Supprimer ${landlord.name ?? "le bailleur"}`}
                  data-cy={`btn-supprimer-bailleur-${landlord.id}`}
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
