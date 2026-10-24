import "./LandlordForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { LandlordDto, LandlordRequest } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { landlordSchema, type LandlordFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";

/** Create/update form for a landlord, displayed in a modal. */
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
    <FormModal
      open
      title={
        item
          ? `Modifier le bailleur « ${item.name ?? ""} »`
          : "Ajouter un bailleur"
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      formDataCy="formulaire-bailleur"
      submitDataCy="btn-enregistrer-bailleur"
      formClassName="landlord-form"
      pending={save.isPending}
      error={requestError}
    >
      <div className="landlord-form-grid">
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
    </FormModal>
  );
}
