import "./LeaseForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  CompanyDto,
  CompanyLookupDto,
  LeaseDto,
  LeaseRequest,
  PersonDto,
} from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { formatEUR, parseAmount } from "@/lib/format";
import { leaseSchema, type LeaseFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { cents } from "./settingsMoney";
import { buildLeaseDefaults } from "./leaseFormDefaults";
import { CompanySirenLookup } from "./CompanySirenLookup";
import { LeaseAreaFields } from "./LeaseAreaFields";

/** Create/update form for a lease, with an indicative total. */
export function LeaseForm({
  item,
  persons,
  companies,
  presetCompanyId = null,
  onSaved,
  onClose,
}: {
  item: LeaseDto | null;
  persons: PersonDto[];
  companies: CompanyDto[];
  presetCompanyId?: number | null;
  onSaved?: (lease: LeaseDto) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const ownedCompanyIds = companies
    .map((company) => company.id)
    .filter((id): id is number => id !== undefined);
  const foreignCompany =
    item?.companySiren !== undefined &&
    item.companySiren !== null &&
    item.companyId !== undefined &&
    item.companyId !== null &&
    !ownedCompanyIds.includes(item.companyId);
  const [linkedCompany, setLinkedCompany] = useState<CompanyLookupDto | null>(
    foreignCompany && item
      ? {
          name: item.companyName ?? "",
          siren: item.companySiren ?? undefined,
          legalForm: item.companyLegalForm ?? undefined,
          address: item.companyAddress ?? undefined,
          managerName: item.companyManagerName ?? undefined,
        }
      : null,
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseSchema),
    mode: "onChange",
    defaultValues: buildLeaseDefaults(item, presetCompanyId, ownedCompanyIds),
  });

  const rent = watch("rentExclCharges");
  const charges = watch("charges");
  const isCompanyLease = watch("companyLease");
  const total = formatEUR((cents(rent) + cents(charges)) / 100);

  const save = useMutation({
    mutationFn: (values: LeaseFormValues) => {
      const requestBody: LeaseRequest = {
        companyLease: values.companyLease,
        landlordId: Number(values.landlordId),
        propertyAddress: values.propertyAddress.trim(),
        rentExclCharges: parseAmount(values.rentExclCharges) ?? "0.00",
        charges: parseAmount(values.charges) ?? "0.00",
      };
      if (values.companyLease) {
        if (values.companyId.startsWith("siren:")) {
          requestBody.companySiren = values.companyId.slice("siren:".length);
        } else {
          requestBody.companyId = Number(values.companyId);
        }
        requestBody.tenantId = null;
        requestBody.totalArea = parseAmount(values.totalArea) ?? undefined;
        requestBody.businessArea =
          parseAmount(values.businessArea) ?? undefined;
      } else {
        requestBody.tenantId = Number(values.tenantId);
      }
      return item?.id
        ? api.leases.update(item.id, requestBody)
        : api.leases.create(requestBody);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      toast.success(
        item
          ? t("settings.lease.form.toasts.updated")
          : t("settings.lease.form.toasts.created"),
      );
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <FormModal
      open
      wide
      title={
        item
          ? t("settings.lease.form.editTitle")
          : t("settings.lease.form.createTitle")
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      formDataCy="lease-form"
      submitDataCy="btn-save-lease"
      formClassName="lease-form"
      pending={save.isPending}
      error={requestError}
    >
      <div className="lease-form-grid">
        <label className="lease-form-company-lease">
          <input
            type="checkbox"
            className="lease-form-company-lease-input"
            {...register("companyLease", {
              onChange: (event) => {
                if (event.target.checked) {
                  setValue("tenantId", "", { shouldValidate: true });
                } else {
                  setValue("companyId", "", { shouldValidate: true });
                  setLinkedCompany(null);
                }
              },
            })}
            data-cy="input-company-lease-type"
          />
          <span>
            <span className="lease-form-company-lease-title">
              {t("settings.lease.form.companyLeaseLabel")}
            </span>
            <span className="lease-form-company-lease-hint">
              {t("settings.lease.form.companyLeaseHint")}
            </span>
          </span>
        </label>
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
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
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
                      setLinkedCompany(null);
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
                setLinkedCompany(company);
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
              {persons.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </FieldGroup>
        )}

        <FieldGroup
          id="bail-adresse"
          label={t("settings.lease.form.address")}
          error={errors.propertyAddress?.message}
          className="sm:col-span-2"
        >
          <input
            id="bail-adresse"
            className={cn("field", errors.propertyAddress && "field-error")}
            placeholder={t("settings.lease.form.addressPlaceholder")}
            {...register("propertyAddress")}
            data-cy="input-lease-address"
          />
        </FieldGroup>
        <FieldGroup
          id="bail-loyer"
          label={t("settings.lease.form.rentExclCharges")}
          error={errors.rentExclCharges?.message}
        >
          <input
            id="bail-loyer"
            inputMode="decimal"
            className={cn("field", errors.rentExclCharges && "field-error")}
            placeholder={t("settings.lease.form.rentExclChargesPlaceholder")}
            {...register("rentExclCharges")}
            data-cy="input-lease-rent"
          />
        </FieldGroup>
        <FieldGroup
          id="bail-charges"
          label={t("settings.lease.form.charges")}
          error={errors.charges?.message}
        >
          <input
            id="bail-charges"
            inputMode="decimal"
            className={cn("field", errors.charges && "field-error")}
            placeholder={t("settings.lease.form.chargesPlaceholder")}
            {...register("charges")}
            data-cy="input-lease-charges"
          />
        </FieldGroup>
        {isCompanyLease ? (
          <LeaseAreaFields register={register} errors={errors} />
        ) : null}
        <div className="lease-form-total">
          <p className="lease-form-total-label">
            {t("settings.lease.form.total")}
          </p>
          <p
            className="lease-form-total-value"
            data-cy="rent-receipt-config-total"
          >
            {total}
          </p>
          <p className="lease-form-total-hint">
            {t("settings.lease.form.totalHint")}
          </p>
        </div>
      </div>
    </FormModal>
  );
}
