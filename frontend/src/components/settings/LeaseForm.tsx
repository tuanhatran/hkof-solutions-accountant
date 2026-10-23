import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  LandlordDto,
  LeaseDto,
  LeaseRequest,
  TenantDto,
} from "@/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { formatEUR, parseAmount } from "@/lib/format";
import { leaseSchema, type LeaseFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { cents, decimalFormatter } from "./settingsMoney";

/** Create/update form for a lease, with an indicative total. */
export function LeaseForm({
  item,
  landlords,
  tenants,
  onClose,
}: {
  item: LeaseDto | null;
  landlords: LandlordDto[];
  tenants: TenantDto[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LeaseFormValues>({
    resolver: zodResolver(leaseSchema),
    mode: "onChange",
    defaultValues: {
      landlordId:
        item?.landlordId === undefined ? "" : String(item.landlordId),
      tenantId: item?.tenantId === undefined ? "" : String(item.tenantId),
      propertyAddress: item?.propertyAddress ?? "",
      rentExclCharges: decimalFormatter(item?.rentExclCharges),
      charges: decimalFormatter(item?.charges),
    },
  });

  const rent = watch("rentExclCharges");
  const charges = watch("charges");
  const total = formatEUR((cents(rent) + cents(charges)) / 100);

  const save = useMutation({
    mutationFn: (values: LeaseFormValues) => {
      const requestBody: LeaseRequest = {
        landlordId: Number(values.landlordId),
        tenantId: Number(values.tenantId),
        propertyAddress: values.propertyAddress.trim(),
        rentExclCharges: parseAmount(values.rentExclCharges) ?? "0.00",
        charges: parseAmount(values.charges) ?? "0.00",
      };
      return item?.id
        ? api.leases.update(item.id, requestBody)
        : api.leases.create(requestBody);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(item ? "Bail mis à jour." : "Bail ajouté.");
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="rounded-xl border border-accent/20 bg-accent-soft/25 p-4"
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      data-cy="formulaire-bail"
    >
      <h3 className="text-[15px] font-semibold text-ink">
        {item ? "Modifier le bail" : "Ajouter un bail"}
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="bail-bailleur"
          label="Bailleur du bail"
          error={errors.landlordId?.message}
        >
          <select
            id="bail-bailleur"
            className={cn("field", errors.landlordId && "field-error")}
            {...register("landlordId")}
            data-cy="select-bail-bailleur"
          >
            <option value="">Sélectionnez un bailleur</option>
            {landlords.map((landlord) => (
              <option key={landlord.id} value={landlord.id}>
                {landlord.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="bail-locataire"
          label="Locataire du bail"
          error={errors.tenantId?.message}
        >
          <select
            id="bail-locataire"
            className={cn("field", errors.tenantId && "field-error")}
            {...register("tenantId")}
            data-cy="select-bail-locataire"
          >
            <option value="">Sélectionnez un locataire</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="bail-adresse"
          label="Adresse du bien"
          error={errors.propertyAddress?.message}
          className="sm:col-span-2"
        >
          <input
            id="bail-adresse"
            className={cn(
              "field",
              errors.propertyAddress && "field-error",
            )}
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
            className={cn(
              "field",
              errors.rentExclCharges && "field-error",
            )}
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
        <div className="flex flex-col justify-center rounded-xl border border-line bg-paper/45 px-4 py-3 sm:col-span-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-soft">
            Total quittance
          </p>
          <p
            className="mt-1 font-display text-2xl text-ink"
            data-cy="total-quittance-config"
          >
            {total}
          </p>
          <p className="text-[10.5px] text-ink-soft">
            Indicatif : loyer + provision. Le total de la quittance est calculé
            par le backend.
          </p>
        </div>
      </div>

      {requestError ? (
        <p
          className="mt-3 rounded-lg border border-danger/20 bg-danger-soft/60 p-2.5 text-xs text-danger"
          role="alert"
        >
          {requestError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button
          variant="ghost"
          small
          onClick={onClose}
          disabled={save.isPending}
        >
          Annuler
        </Button>
        <Button
          variant="primary"
          small
          type="submit"
          loading={save.isPending}
          icon={<Check size={14} />}
          data-cy="btn-enregistrer-bail"
        >
          {item ? "Enregistrer le bail" : "Ajouter le bail"}
        </Button>
      </div>
    </form>
  );
}
