import "./RentReceiptPartyFields.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { RentReceiptController } from "./useRentReceiptPage";

/** Month, template, landlord/tenant pair and selected lease details. */
export function RentReceiptPartyFields({ c }: { c: RentReceiptController }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="rent-receipt-party-fields-grid">
        <FieldGroup
          id="quittance-mois"
          label={t("rentReceipt.fields.month")}
          error={c.errors.month?.message}
          help={t("rentReceipt.fields.monthHelp")}
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
          label={t("rentReceipt.fields.template")}
          help={t("rentReceipt.fields.templateHelp")}
          badge={
            <span className="badge badge-neutral">
              {t("rentReceipt.fields.versionedBadge")}
            </span>
          }
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
              <option value="">
                {t("rentReceipt.fields.builtInTemplate")}
              </option>
            ) : null}
            {c.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} — v{model.version}
                {model.active ? t("rentReceipt.fields.activeSuffix") : ""}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>

      <div className="rent-receipt-party-fields-grid">
        <FieldGroup
          id="quittance-bailleur"
          label={t("rentReceipt.fields.landlord")}
          error={c.errors.landlordId?.message}
          help={t("rentReceipt.fields.landlordHelp")}
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
            <option value="">
              {t("rentReceipt.fields.landlordPlaceholder")}
            </option>
            {c.personRows.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </FieldGroup>

        <FieldGroup
          id="quittance-locataire"
          label={t("rentReceipt.fields.tenant")}
          error={c.errors.tenantKey?.message}
          help={t("rentReceipt.fields.tenantHelp")}
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
            <option value="">
              {t("rentReceipt.fields.tenantPlaceholder")}
            </option>
            {c.personTenantOptions.length > 0 ? (
              <optgroup label={t("rentReceipt.fields.personsGroup")}>
                {c.personTenantOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {c.companyTenantOptions.length > 0 ? (
              <optgroup label={t("rentReceipt.fields.companiesGroup")}>
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
          {t("rentReceipt.fields.missingLeaseBefore")}{" "}
          <Link to="/configuration/lmnp" className="link">
            {t("rentReceipt.fields.lmnpLink")}
          </Link>
          {t("rentReceipt.fields.missingLeaseAfter")}
        </p>
      ) : null}

      {c.selectedLease ? (
        <div className="rent-receipt-party-fields-lease" data-cy="detail-bail">
          <p className="eyebrow text-accent">
            {c.selectedLease.companyLease
              ? t("rentReceipt.fields.companyLeaseSelected")
              : t("rentReceipt.fields.leaseSelected")}
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
