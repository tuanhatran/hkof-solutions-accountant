import type {
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { LandlordDto, TenantDto } from "@/api/endpoints";
import type { CompanyDto, CompanyLookupDto } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import type { LeaseFormValues } from "@/lib/validation";
import { CompanySirenLookup } from "./CompanySirenLookup";

/**
 * Landlord and tenant selects of the lease form. The landlord list only holds
 * landlords and the tenant list only holds tenants; for a company lease the
 * tenant is a company or company SIREN instead.
 */
export function LeasePartyFields({
  landlords,
  tenants,
  companies,
  isCompanyLease,
  linkedCompany,
  onLinkedCompany,
  register,
  setValue,
  errors,
}: {
  landlords: LandlordDto[];
  tenants: TenantDto[];
  companies: CompanyDto[];
  isCompanyLease: boolean;
  linkedCompany: CompanyLookupDto | null;
  onLinkedCompany: (company: CompanyLookupDto | null) => void;
  register: UseFormRegister<LeaseFormValues>;
  setValue: UseFormSetValue<LeaseFormValues>;
  errors: FieldErrors<LeaseFormValues>;
}) {
  const { t } = useTranslation();

  return (
    <>
      <FieldGroup
        id="bail-bailleur"
        label={t("settings.lease.form.landlord")}
        error={errors.landlordId?.message}
      >
        <select
          id="bail-bailleur"
          className={cn("field", errors.landlordId && "field-error")}
          {...register("landlordId")}
          data-cy="select-lease-landlord"
        >
          <option value="">
            {t("settings.lease.form.landlordPlaceholder")}
          </option>
          {landlords.map((landlord) => (
            <option key={landlord.id} value={landlord.id}>
              {landlord.name}
            </option>
          ))}
        </select>
      </FieldGroup>

      {isCompanyLease ? (
        <>
          <FieldGroup
            id="bail-locataire-societe"
            label={t("settings.lease.form.companyTenant")}
            error={errors.companyId?.message}
          >
            <select
              id="bail-locataire-societe"
              className={cn("field", errors.companyId && "field-error")}
              {...register("companyId", {
                onChange: (event) => {
                  if (!String(event.target.value).startsWith("siren:")) {
                    onLinkedCompany(null);
                  }
                },
              })}
              data-cy="select-lease-company-tenant"
            >
              <option value="">
                {t("settings.lease.form.companyPlaceholder")}
              </option>
              {linkedCompany?.siren ? (
                <option value={`siren:${linkedCompany.siren}`}>
                  {linkedCompany.name}
                </option>
              ) : null}
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </FieldGroup>
          <CompanySirenLookup
            linked={linkedCompany}
            onLinked={(company) => {
              onLinkedCompany(company);
              setValue("companyId", `siren:${company.siren ?? ""}`, {
                shouldValidate: true,
              });
            }}
          />
        </>
      ) : (
        <FieldGroup
          id="bail-locataire"
          label={t("settings.lease.form.tenant")}
          error={errors.tenantId?.message}
        >
          <select
            id="bail-locataire"
            className={cn("field", errors.tenantId && "field-error")}
            {...register("tenantId")}
            data-cy="select-lease-tenant"
          >
            <option value="">
              {t("settings.lease.form.tenantPlaceholder")}
            </option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </FieldGroup>
      )}
    </>
  );
}
