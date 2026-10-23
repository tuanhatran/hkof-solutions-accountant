import { Link } from "react-router-dom";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Month, template, landlord/tenant pair and selected lease details. */
export function RentReceiptPartyFields({ c }: { c: RentReceiptController }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup
          id="quittance-mois"
          label="Mois concerné"
          error={c.errors.month?.message}
          help="La période est recalculée automatiquement."
        >
          <input
            id="quittance-mois"
            type="month"
            className={cn("field", c.errors.month && "field-error")}
            data-cy="select-mois"
            aria-invalid={Boolean(c.errors.month)}
            {...c.register("month", {
              onChange: (event) => c.changeMonth(event.target.value),
            })}
          />
        </FieldGroup>

        <FieldGroup
          id="quittance-template"
          label="Template"
          help="Le modèle actif est utilisé par défaut."
          badge={<span className="badge badge-neutral">Versionné</span>}
        >
          <select
            id="quittance-template"
            className="field"
            data-cy="select-template"
            value={c.selectedModel ?? ""}
            onChange={(event) =>
              c.draft.setTemplate(
                event.target.value ? Number(event.target.value) : null,
              )
            }
            disabled={c.templates.isPending || c.models.length === 0}
          >
            {c.models.length === 0 ? (
              <option value="">Modèle intégré</option>
            ) : null}
            {c.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} — v{model.version}
                {model.active ? " (actif)" : ""}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup
          id="quittance-bailleur"
          label="Bailleur"
          error={c.errors.landlordId?.message}
          help="Bailleur du bail actif."
        >
          <select
            id="quittance-bailleur"
            className={cn("field", c.errors.landlordId && "field-error")}
            data-cy="select-bailleur"
            aria-invalid={Boolean(c.errors.landlordId)}
            disabled={c.landlords.isPending}
            {...c.register("landlordId", {
              onChange: (event) =>
                c.selectPair(event.target.value, c.values.tenantId),
            })}
          >
            <option value="">Sélectionnez un bailleur</option>
            {c.landlordRows.map((landlord) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.name}
              </option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup
          id="quittance-locataire"
          label="Locataire"
          error={c.errors.tenantId?.message}
          help="Locataire du bail actif."
        >
          <select
            id="quittance-locataire"
            className={cn("field", c.errors.tenantId && "field-error")}
            data-cy="select-locataire"
            aria-invalid={Boolean(c.errors.tenantId)}
            disabled={c.tenants.isPending}
            {...c.register("tenantId", {
              onChange: (event) =>
                c.selectPair(c.values.landlordId, event.target.value),
            })}
          >
            <option value="">Sélectionnez un locataire</option>
            {c.tenantRows.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>

      {c.values.landlordId &&
      c.values.tenantId &&
      !c.selectedLease &&
      !c.leases.isPending ? (
        <p
          className="rounded-xl border border-danger/20 bg-danger-soft/60 p-3 text-xs text-danger"
          role="alert"
          data-cy="alerte-bail-manquant"
        >
          Aucun bail actif pour ce bailleur et ce locataire. Créez le bail dans
          la page{" "}
          <Link to="/configuration" className="link">
            Configuration
          </Link>
          .
        </p>
      ) : null}

      {c.selectedLease ? (
        <div
          className="rounded-xl border border-accent/15 bg-accent-soft/45 px-4 py-3"
          data-cy="detail-bail"
        >
          <p className="eyebrow text-accent">Bail sélectionné</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {c.selectedLease.landlordName} → {c.selectedLease.tenantName}
          </p>
          <p className="text-xs text-ink-soft">
            {c.selectedLease.propertyAddress}
          </p>
        </div>
      ) : null}
    </>
  );
}
