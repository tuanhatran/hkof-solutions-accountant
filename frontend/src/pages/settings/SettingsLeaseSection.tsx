import "./SettingsLeaseSection.css";
import { KeyRound } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { LeaseDto } from "@/api/types";
import { decimalFormatter } from "@/components/settings/settingsMoney";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatEUR, formatPercentage } from "@/lib/format";
import type { CompanyFormValues } from "@/lib/validation";
import { SettingsCardSection } from "./SettingsCardSection";

/** Lease linked to the company, its dwelling data and the indicative pro rata. */
export function SettingsLeaseSection({
  register,
  errors,
  leases,
  selectedLease,
  displayedProRata,
}: {
  register: UseFormRegister<CompanyFormValues>;
  errors: FieldErrors<CompanyFormValues>;
  leases: LeaseDto[];
  selectedLease: LeaseDto | null;
  displayedProRata: number | null;
}) {
  return (
    <SettingsCardSection
      icon={KeyRound}
      title="Location bail"
      description="Le bail sélectionné fixe l’adresse du logement et la quote-part professionnelle de la société."
      bodyClassName="card-body settings-lease-section-body"
    >
      <FieldGroup
        id="param-bail-societe"
        label="Bail de la société"
        error={errors.leaseId?.message}
        help="Facultatif : une société peut ne pas avoir de bail."
        className="sm:col-span-2 lg:col-span-3"
      >
        <select
          id="param-bail-societe"
          className={cn("field", errors.leaseId && "field-error")}
          {...register("leaseId")}
          data-cy="select-bail-societe"
        >
          <option value="">Aucun bail</option>
          {leases.map((lease) => (
            <option key={lease.id} value={lease.id}>
              {lease.propertyAddress ?? "Bail sans adresse"}
            </option>
          ))}
        </select>
      </FieldGroup>

      <div className="settings-lease-section-prorata">
        <p className="settings-lease-section-prorata-label">
          Prorata indicatif
        </p>
        <p
          className="settings-lease-section-prorata-value"
          data-cy="prorata-indicatif"
        >
          {displayedProRata === null ? "—" : formatPercentage(displayedProRata)}
        </p>
        <p className="settings-lease-section-prorata-note">
          Calculé et arrondi côté backend à l’enregistrement.
        </p>
      </div>

      {selectedLease ? (
        <div
          className="settings-lease-section-details"
          data-cy="bail-selectionne"
        >
          <p className="settings-lease-section-details-address">
            {selectedLease.propertyAddress}
          </p>
          <p className="settings-lease-section-details-meta">
            Loyer {formatEUR(selectedLease.rentExclCharges)} · Charges{" "}
            {formatEUR(selectedLease.charges)}
          </p>
          <p className="settings-lease-section-details-meta">
            Surface professionnelle{" "}
            {decimalFormatter(selectedLease.businessArea) || "—"} m² · Surface
            totale {decimalFormatter(selectedLease.totalArea) || "—"} m²
          </p>
        </div>
      ) : (
        <p
          className="settings-lease-section-empty"
          data-cy="aucun-bail-societe"
        >
          Aucun bail sélectionné : la société n’a pas de quote-part
          professionnelle.
        </p>
      )}
    </SettingsCardSection>
  );
}
