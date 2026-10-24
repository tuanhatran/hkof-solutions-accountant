import "./SettingsCompanySection.css";
import { Building2 } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { SettingsFormValues } from "@/lib/validation";
import { SettingsCardSection } from "./SettingsCardSection";

/** Company identity used in the expense statement header. */
export function SettingsCompanySection({
  register,
  errors,
}: {
  register: UseFormRegister<SettingsFormValues>;
  errors: FieldErrors<SettingsFormValues>;
}) {
  return (
    <SettingsCardSection
      icon={Building2}
      title="Société"
      description="Identité de l’EURL utilisée en en-tête de la note de frais."
      bodyClassName="card-body settings-company-section-body"
    >
      <FieldGroup
        id="param-raison-sociale"
        label="Raison sociale"
        error={errors.companyName?.message}
        className="sm:col-span-1"
      >
        <input
          id="param-raison-sociale"
          className={cn("field", errors.companyName && "field-error")}
          {...register("companyName")}
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
        error={errors.companyAddress?.message}
        className="sm:col-span-2"
      >
        <textarea
          id="param-societe-adresse"
          rows={2}
          className={cn(
            "field settings-company-section-textarea",
            errors.companyAddress && "field-error",
          )}
          {...register("companyAddress")}
          data-cy="input-societe-adresse"
        />
      </FieldGroup>
    </SettingsCardSection>
  );
}
