import "./PersonForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { PersonDto, PersonRequest } from "@/api/types";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { personSchema, type PersonFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { PersonSignatureSection } from "./PersonSignatureSection";

/**
 * Create/update modal of a natural person. After creation the modal stays open
 * in saved mode so signatures can be added without reopening the form.
 */
export function PersonForm({
  item,
  onClose,
}: {
  item: PersonDto | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [savedId, setSavedId] = useState<number | null>(item?.id ?? null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: PersonFormValues) => {
      const requestBody: PersonRequest = {
        name: values.name.trim(),
        address: values.address.trim() === "" ? null : values.address.trim(),
      };
      return savedId === null
        ? api.persons.create(requestBody)
        : api.persons.update(savedId, requestBody);
    },
    onSuccess: (saved) => {
      const creating = savedId === null;
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      if (saved.id !== undefined) {
        setSavedId(saved.id);
      }
      toast.success(
        creating
          ? `Personne « ${saved.name ?? ""} » ajoutée.`
          : `Personne « ${saved.name ?? ""} » mise à jour.`,
      );
    },
    onError: (error) => setRequestError(errorMessage(error)),
  });

  return (
    <FormModal
      open
      wide
      title={
        savedId === null
          ? "Ajouter une personne"
          : "Modifier une personne physique"
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      formDataCy="formulaire-personne"
      submitDataCy="btn-enregistrer-personne"
      formClassName="person-form"
      pending={save.isPending}
      error={requestError}
    >
      <div className="person-form-grid">
        <FieldGroup
          id="personne-nom"
          label="Nom de la personne"
          error={errors.name?.message}
        >
          <input
            id="personne-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="M. Dupont"
            {...register("name")}
            data-cy="input-personne-nom"
          />
        </FieldGroup>
        <FieldGroup
          id="personne-adresse"
          label="Adresse"
          error={errors.address?.message}
          help="Facultative ; reprise dans les documents."
        >
          <input
            id="personne-adresse"
            className="field"
            placeholder="1 avenue du Parc, 75011 Paris"
            {...register("address")}
            data-cy="input-personne-adresse"
          />
        </FieldGroup>
      </div>

      {savedId === null ? (
        <p className="person-form-hint">
          Enregistrez la personne pour ajouter ses signatures sans fermer cette
          fenêtre.
        </p>
      ) : (
        <>
          <p className="person-form-hint" data-cy="personne-enregistree">
            Personne enregistrée. Ajoutez ou retirez ses signatures ci-dessous.
          </p>
          <PersonSignatureSection personId={savedId} />
        </>
      )}
    </FormModal>
  );
}
