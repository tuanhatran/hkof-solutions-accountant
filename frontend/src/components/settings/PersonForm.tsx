import "./PersonForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          ? t("settings.people.form.created", { name: saved.name ?? "" })
          : t("settings.people.form.updated", { name: saved.name ?? "" }),
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
          ? t("settings.people.form.createTitle")
          : t("settings.people.form.editTitle")
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
          label={t("settings.people.form.name")}
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
          label={t("settings.people.form.address")}
          error={errors.address?.message}
          help={t("settings.people.form.addressHelp")}
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
        <p className="person-form-hint">{t("settings.people.form.hint")}</p>
      ) : (
        <>
          <p className="person-form-hint" data-cy="personne-enregistree">
            {t("settings.people.form.saved")}
          </p>
          <PersonSignatureSection personId={savedId} />
        </>
      )}
    </FormModal>
  );
}
