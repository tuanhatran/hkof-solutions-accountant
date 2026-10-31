import "./SettingsCompanySection.css";
import { Building2 } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <SettingsCardSection
      icon={Building2}
      title={t("settings.company.identity.sectionTitle")}
      description={t("settings.company.identity.sectionDescription")}
      bodyClassName="card-body settings-company-section-body"
    >
      <FieldGroup
        id="param-raison-sociale"
        label={t("settings.company.identity.fields.name")}
        error={errors.name?.message}
        className="sm:col-span-1"
      >
        <input
          id="param-raison-sociale"
          className={cn("field", errors.name && "field-error")}
          {...register("name")}
          data-cy="input-legal-name"
        />
      </FieldGroup>
      <FieldGroup
        id="param-forme-juridique"
        label={t("settings.company.identity.fields.legalForm")}
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
        label={t("settings.company.identity.fields.siren")}
        error={errors.siren?.message}
        help={t("settings.company.identity.sirenHelp")}
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
        id="param-siret"
        label={t("settings.company.identity.fields.siret")}
        error={errors.siret?.message}
        help={t("settings.company.identity.siretHelp")}
      >
        <input
          id="param-siret"
          className={cn(
            "field settings-company-section-code",
            errors.siret && "field-error",
          )}
          inputMode="numeric"
          placeholder="000 000 000 00000"
          {...register("siret")}
          data-cy="input-company-siret"
        />
      </FieldGroup>
      <FieldGroup
        id="param-managerName"
        label={t("settings.company.identity.fields.managerName")}
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
        label={t("settings.company.identity.fields.companyAddress")}
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
          data-cy="input-company-address"
        />
      </FieldGroup>
      <FieldGroup
        id="param-lieu"
        label={t("settings.company.identity.fields.issuePlace")}
        error={errors.issuePlace?.message}
      >
        <input
          id="param-lieu"
          className={cn("field", errors.issuePlace && "field-error")}
          placeholder="Paris"
          {...register("issuePlace")}
          data-cy="input-issue-place"
        />
      </FieldGroup>
    </SettingsCardSection>
  );
}
