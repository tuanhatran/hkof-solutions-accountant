import "./RentReceiptPartyFields.css";
import { Link } from "react-router-dom";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Month, template, landlord/tenant pair and selected lease details. */
export function RentReceiptPartyFields({ c }: { c: RentReceiptController }) {
  return (
    <>
      <div className="rent-receipt-party-fields-grid">
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

      <div className="rent-receipt-party-fields-grid">
        <FieldGroup
          id="quittance-bailleur"
          label="Bailleur"
          error={c.errors.landlordId?.message}
          help="Personne physique bailleur du bail actif."
        >
          <select
            id="quittance-bailleur"
            className={cn("field", c.errors.landlordId && "field-error")}
            data-cy="select-bailleur"
            aria-invalid={Boolean(c.errors.landlordId)}
            disabled={c.persons.isPending}
            {...c.register("landlordId", {
              onChange: (event) =>
                c.selectPair(event.target.value, c.values.tenantKey),
            })}
          >
            <option value="">Sélectionnez un bailleur</option>
            {c.personRows.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup
          id="quittance-locataire"
          label="Locataire"
          error={c.errors.tenantKey?.message}
          help="Personne physique, ou société pour un bail société."
        >
          <select
            id="quittance-locataire"
            className={cn("field", c.errors.tenantKey && "field-error")}
            data-cy="select-locataire"
            aria-invalid={Boolean(c.errors.tenantKey)}
            disabled={c.persons.isPending || c.companies.isPending}
            {...c.register("tenantKey", {
              onChange: (event) =>
                c.selectPair(c.values.landlordId, event.target.value),
            })}
          >
            <option value="">Sélectionnez un locataire</option>
            {c.personTenantOptions.length > 0 ? (
              <optgroup label="Personnes">
                {c.personTenantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {c.companyTenantOptions.length > 0 ? (
              <optgroup label="Sociétés">
                {c.companyTenantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </FieldGroup>
      </div>

      {c.values.landlordId &&
      c.values.tenantKey &&
      !c.selectedLease &&
      !c.leases.isPending ? (
        <p
          className="rent-receipt-party-fields-alert"
          role="alert"
          data-cy="alerte-bail-manquant"
        >
          Aucun bail actif pour ce bailleur et ce locataire. Créez le bail dans
          la page{" "}
          <Link to="/configuration/lmnp" className="link">
            LMNP
          </Link>
          .
        </p>
      ) : null}

      {c.selectedLease ? (
        <div className="rent-receipt-party-fields-lease" data-cy="detail-bail">
          <p className="eyebrow text-accent">
            {c.selectedLease.companyLease ? "Bail société" : "Bail"} sélectionné
          </p>
          <p className="rent-receipt-party-fields-lease-pair">
            {c.selectedLease.landlordName} → {c.selectedLease.tenantName}
          </p>
          <p className="rent-receipt-party-fields-lease-address">
            {c.selectedLease.propertyAddress}
          </p>
        </div>
      ) : null}
    </>
  );
}
