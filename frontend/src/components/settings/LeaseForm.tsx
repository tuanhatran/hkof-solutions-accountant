import "./LeaseForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  CompanyDto,
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
import { cents, decimalFormatter } from "./settingsMoney";

/** Create/update form for a lease, with an indicative total. */
export function LeaseForm({
  item,
  persons,
  companies,
  onSaved,
  onClose,
}: {
  item: LeaseDto | null;
  persons: PersonDto[];
  companies: CompanyDto[];
  onSaved?: (lease: LeaseDto) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const companyLease = item?.companyLease ?? false;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseSchema),
    mode: "onChange",
    defaultValues: {
      companyLease,
      landlordId: item?.landlordId === undefined ? "" : String(item.landlordId),
      tenantId:
        companyLease || item?.tenantId === undefined || item.tenantId === null
          ? ""
          : String(item.tenantId),
      companyId:
        !companyLease ||
        item?.companyId === undefined ||
        item.companyId === null
          ? ""
          : String(item.companyId),
      propertyAddress: item?.propertyAddress ?? "",
      rentExclCharges: decimalFormatter(item?.rentExclCharges),
      charges: decimalFormatter(item?.charges),
      totalArea: decimalFormatter(item?.totalArea),
      businessArea: decimalFormatter(item?.businessArea),
    },
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
        requestBody.companyId = Number(values.companyId);
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
      toast.success(item ? "Bail mis à jour." : "Bail ajouté.");
      onSaved?.(saved);
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <FormModal
      open
      wide
      title={item ? "Modifier le bail" : "Ajouter un bail"}
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      formDataCy="formulaire-bail"
      submitDataCy="btn-enregistrer-bail"
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
                }
              },
            })}
            data-cy="input-bail-societe-type"
          />
          <span>
            <span className="lease-form-company-lease-title">Bail société</span>
            <span className="lease-form-company-lease-hint">
              Le locataire est une société : renseignez les surfaces du logement
              pour calculer la quote-part professionnelle.
            </span>
          </span>
        </label>
        <FieldGroup
          id="bail-bailleur"
          label="Bailleur"
          error={errors.landlordId?.message}
        >
          <select
            id="bail-bailleur"
            className={cn("field", errors.landlordId && "field-error")}
            {...register("landlordId")}
            data-cy="select-bail-bailleur"
          >
            <option value="">Sélectionnez un bailleur</option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </FieldGroup>

        {isCompanyLease ? (
          <FieldGroup
            id="bail-locataire-societe"
            label="Locataire (société)"
            error={errors.companyId?.message}
          >
            <select
              id="bail-locataire-societe"
              className={cn("field", errors.companyId && "field-error")}
              {...register("companyId")}
              data-cy="select-bail-locataire-societe"
            >
              <option value="">Sélectionnez une société</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </FieldGroup>
        ) : (
          <FieldGroup
            id="bail-locataire"
            label="Locataire"
            error={errors.tenantId?.message}
          >
            <select
              id="bail-locataire"
              className={cn("field", errors.tenantId && "field-error")}
              {...register("tenantId")}
              data-cy="select-bail-locataire"
            >
              <option value="">Sélectionnez un locataire</option>
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
          label="Adresse du bien"
          error={errors.propertyAddress?.message}
          className="sm:col-span-2"
        >
          <input
            id="bail-adresse"
            className={cn("field", errors.propertyAddress && "field-error")}
            placeholder="12 rue de la République, 75000 Paris"
            {...register("propertyAddress")}
            data-cy="input-bail-adresse"
          />
        </FieldGroup>
        <FieldGroup
          id="bail-loyer"
          label="Loyer hors charges (€)"
          error={errors.rentExclCharges?.message}
        >
          <input
            id="bail-loyer"
            inputMode="decimal"
            className={cn("field", errors.rentExclCharges && "field-error")}
            placeholder="900,00"
            {...register("rentExclCharges")}
            data-cy="input-bail-loyer"
          />
        </FieldGroup>
        <FieldGroup
          id="bail-charges"
          label="Provision pour charges (€)"
          error={errors.charges?.message}
        >
          <input
            id="bail-charges"
            inputMode="decimal"
            className={cn("field", errors.charges && "field-error")}
            placeholder="50,00"
            {...register("charges")}
            data-cy="input-bail-charges"
          />
        </FieldGroup>
        {isCompanyLease ? (
          <>
            <FieldGroup
              id="bail-surface-totale"
              label="Surface totale (m²)"
              error={errors.totalArea?.message}
            >
              <input
                id="bail-surface-totale"
                inputMode="decimal"
                className={cn("field", errors.totalArea && "field-error")}
                placeholder="70,00"
                {...register("totalArea")}
                data-cy="input-surface-totale"
              />
            </FieldGroup>
            <FieldGroup
              id="bail-surface-pro"
              label="Surface professionnelle (m²)"
              error={errors.businessArea?.message}
            >
              <input
                id="bail-surface-pro"
                inputMode="decimal"
                className={cn("field", errors.businessArea && "field-error")}
                placeholder="25,00"
                {...register("businessArea")}
                data-cy="input-surface-pro"
              />
            </FieldGroup>
          </>
        ) : null}
        <div className="lease-form-total">
          <p className="lease-form-total-label">Total quittance</p>
          <p
            className="lease-form-total-value"
            data-cy="total-quittance-config"
          >
            {total}
          </p>
          <p className="lease-form-total-hint">
            Indicatif : loyer + provision. Le total de la quittance est calculé
            par le backend.
          </p>
        </div>
      </div>
    </FormModal>
  );
}
