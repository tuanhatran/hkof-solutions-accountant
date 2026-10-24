import "./TenantForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { TenantDto, TenantRequest } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { tenantSchema, type TenantFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";

/** Create/update form for a tenant. */
export function TenantForm({
  item,
  onClose,
}: {
  item: TenantDto | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantSchema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: TenantFormValues) => {
      const requestBody: TenantRequest = {
        name: values.name.trim(),
        address: values.address.trim(),
      };
      return item?.id
        ? api.tenants.update(item.id, requestBody)
        : api.tenants.create(requestBody);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(
        item
          ? `Locataire « ${result.name ?? ""} » mis à jour.`
          : `Locataire « ${result.name ?? ""} » ajouté.`,
      );
      onClose();
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <form
      className="tenant-form"
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      data-cy="formulaire-locataire"
    >
      <h3 className="tenant-form-title">
        {item
          ? `Modifier le locataire « ${item.name ?? ""} »`
          : "Ajouter un locataire"}
      </h3>

      <div className="tenant-form-grid">
        <FieldGroup
          id="locataire-nom"
          label="Nom du locataire"
          error={errors.name?.message}
        >
          <input
            id="locataire-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="Mme Martin"
            {...register("name")}
            data-cy="input-locataire-nom"
          />
        </FieldGroup>
        <FieldGroup
          id="locataire-adresse"
          label="Adresse du locataire"
          error={errors.address?.message}
        >
          <input
            id="locataire-adresse"
            className="field"
            placeholder="12 rue de la République, 75000 Paris"
            {...register("address")}
            data-cy="input-locataire-adresse"
          />
        </FieldGroup>
      </div>

      {requestError ? (
        <p className="tenant-form-error" role="alert">
          {requestError}
        </p>
      ) : null}

      <div className="tenant-form-actions">
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
          data-cy="btn-enregistrer-locataire"
        >
          {item ? "Enregistrer le locataire" : "Ajouter le locataire"}
        </Button>
      </div>
    </form>
  );
}
