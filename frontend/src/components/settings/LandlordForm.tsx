import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { LandlordDto, LandlordRequest } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { landlordSchema, type LandlordFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";

/** Create/update form for a landlord. */
export function LandlordForm({
  item,
  onClose,
}: {
  item: LandlordDto | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LandlordFormValues>({
    resolver: zodResolver(landlordSchema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: LandlordFormValues) => {
      const requestBody: LandlordRequest = {
        name: values.name.trim(),
        address: values.address.trim(),
      };
      return item?.id
        ? api.landlords.update(item.id, requestBody)
        : api.landlords.create(requestBody);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.landlords });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(
        item
          ? `Bailleur « ${result.name ?? ""} » mis à jour.`
          : `Bailleur « ${result.name ?? ""} » ajouté.`,
      );
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
      data-cy="formulaire-bailleur"
    >
      <h3 className="text-[15px] font-semibold text-ink">
        {item
          ? `Modifier le bailleur « ${item.name ?? ""} »`
          : "Ajouter un bailleur"}
      </h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FieldGroup
          id="bailleur-nom"
          label="Nom du bailleur"
          error={errors.name?.message}
        >
          <input
            id="bailleur-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="M. Dupont"
            {...register("name")}
            data-cy="input-bailleur-nom"
          />
        </FieldGroup>
        <FieldGroup
          id="bailleur-adresse"
          label="Adresse du bailleur"
          error={errors.address?.message}
        >
          <input
            id="bailleur-adresse"
            className="field"
            placeholder="1 avenue du Parc, 75011 Paris"
            {...register("address")}
            data-cy="input-bailleur-adresse"
          />
        </FieldGroup>
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
          data-cy="btn-enregistrer-bailleur"
        >
          {item ? "Enregistrer le bailleur" : "Ajouter le bailleur"}
        </Button>
      </div>
    </form>
  );
}
