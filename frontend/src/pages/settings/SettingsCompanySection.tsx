import "./SettingsCompanySection.css";
import { Building2 } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { CompanyFormValues } from "@/lib/validation";
import { SettingsCardSection } from "./SettingsCardSection";

/** Company identity used in the document headers. */
export function SettingsCompanySection({
  register,
  errors,
}: {
  register: UseFormRegister<CompanyFormValues>;
  errors: FieldErrors<CompanyFormValues>;
}) {
  return (
    <SettingsCardSection
      icon={Building2}
      title="Identité de la société"
      description="Nom, forme juridique et siège utilisés en en-tête des documents."
      bodyClassName="card-body settings-company-section-body"
    >
      <FieldGroup
        id="param-raison-sociale"
        label="Raison sociale"
        error={errors.name?.message}
        className="sm:col-span-1"
      >
        <input
          id="param-raison-sociale"
          className={cn("field", errors.name && "field-error")}
          {...register("name")}
          data-cy="input-raison-sociale"
        />
      </FieldGroup>
      <FieldGroup
        id="param-forme-juridique"
        label="Forme juridique"
        error={errors.legalForm?.message}
      >
        <input
          id="param-forme-juridique"
          className={cn("field", errors.legalForm && "field-error")}
          {...register("legalForm")}
        />
      </FieldGroup>
      <FieldGroup
        id="param-siren"
        label="SIREN"
        error={errors.siren?.message}
        help="9 chiffres, espaces autorisés."
      >
        <input
          id="param-siren"
          className={cn(
            "field settings-company-section-code",
            errors.siren && "field-error",
          )}
          inputMode="numeric"
          placeholder="000 000 000"
          {...register("siren")}
          data-cy="input-siren"
        />
      </FieldGroup>
      <FieldGroup
        id="param-managerName"
        label="Gérant"
        error={errors.managerName?.message}
      >
        <input
          id="param-managerName"
          className={cn("field", errors.managerName && "field-error")}
          {...register("managerName")}
          data-cy="input-managerName"
        />
      </FieldGroup>
      <FieldGroup
        id="param-societe-adresse"
        label="Adresse de la société"
        error={errors.address?.message}
        className="sm:col-span-2"
      >
        <textarea
          id="param-societe-adresse"
          rows={2}
          className={cn(
            "field settings-company-section-textarea",
            errors.address && "field-error",
          )}
          {...register("address")}
          data-cy="input-societe-adresse"
        />
      </FieldGroup>
    </SettingsCardSection>
  );
}
