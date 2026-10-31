import "./PersonForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { errorMessage } from "@/api/client";
import { api, type LandlordDto, type LandlordRequest } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { toast } from "@/state/toasts";
import { PersonSignatureSection } from "./PersonSignatureSection";

const landlordSchema = (nameMessage: string) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: () => nameMessage }),
    address: z.string(),
    phone: z.string().optional(),
    addressNote: z.string().optional(),
    issuePlace: z.string(),
  });

type LandlordFormValues = z.infer<ReturnType<typeof landlordSchema>>;

/**
 * Create/update modal of a landlord. After creation the modal stays open in
 * saved mode so signatures can be added without reopening the form.
 */
export function LandlordForm({
  item,
  onClose,
}: {
  item: LandlordDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const schema = useMemo(
    () => landlordSchema(t("settings.landlords.validation.name")),
    [t],
  );
  const [savedId, setSavedId] = useState<number | null>(item?.id ?? null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LandlordFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
      phone: item?.phone ?? "",
      addressNote: item?.addressNote ?? "",
      issuePlace: item?.issuePlace ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: LandlordFormValues) => {
      const requestBody: LandlordRequest = {
        name: values.name.trim(),
        address: values.address.trim() === "" ? null : values.address.trim(),
        phone: values.phone?.trim() ?? "",
        addressNote: values.addressNote?.trim() ?? "",
        issuePlace:
          values.issuePlace.trim() === "" ? null : values.issuePlace.trim(),
      };
      return savedId === null
        ? api.landlords.create(requestBody)
        : api.landlords.update(savedId, requestBody);
    },
    onSuccess: (saved) => {
      const creating = savedId === null;
      void queryClient.invalidateQueries({ queryKey: queryKeys.landlords });
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      if (saved.id !== undefined) {
        setSavedId(saved.id);
      }
      toast.success(
        creating
          ? t("settings.landlords.form.created", { name: saved.name ?? "" })
          : t("settings.landlords.form.updated", { name: saved.name ?? "" }),
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
          ? t("settings.landlords.form.createTitle")
          : t("settings.landlords.form.editTitle")
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      formDataCy="landlord-form"
      submitDataCy="btn-save-landlord"
      formClassName="person-form"
      pending={save.isPending}
      error={requestError}
    >
      <div className="person-form-grid">
        <FieldGroup
          id="bailleur-nom"
          label={t("settings.landlords.form.name")}
          error={errors.name?.message}
        >
          <input
            id="bailleur-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="M. Dupont"
            {...register("name")}
            data-cy="input-landlord-name"
          />
        </FieldGroup>
        <FieldGroup
          id="bailleur-adresse"
          label={t("settings.landlords.form.address")}
          error={errors.address?.message}
          help={t("settings.landlords.form.addressHelp")}
        >
          <Controller
            control={control}
            name="address"
            render={({ field }) => (
              <AddressAutocomplete
                id="bailleur-adresse"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="1 avenue du Parc, 75011 Paris"
                data-cy="input-landlord-address"
              />
            )}
          />
        </FieldGroup>
        <FieldGroup
          id="bailleur-telephone"
          label={t("settings.landlords.form.phone")}
          error={errors.phone?.message}
          help={t("settings.landlords.form.phoneHelp")}
        >
          <input
            id="bailleur-telephone"
            className="field"
            placeholder="06 12 34 56 78"
            {...register("phone")}
            data-cy="input-landlord-phone"
          />
        </FieldGroup>
        <FieldGroup
          id="bailleur-complement-adresse"
          label={t("settings.landlords.form.addressNote")}
          error={errors.addressNote?.message}
          help={t("settings.landlords.form.addressNoteHelp")}
        >
          <input
            id="bailleur-complement-adresse"
            className="field"
            placeholder="Bâtiment B, étage 2"
            {...register("addressNote")}
            data-cy="input-landlord-address-note"
          />
        </FieldGroup>
        <FieldGroup
          id="bailleur-emission"
          label={t("settings.landlords.form.issuePlace")}
          error={errors.issuePlace?.message}
          help={t("settings.landlords.form.issuePlaceHelp")}
        >
          <input
            id="bailleur-emission"
            className="field"
            placeholder="Paris"
            {...register("issuePlace")}
            data-cy="input-landlord-issue-place"
          />
        </FieldGroup>
      </div>

      {savedId === null ? (
        <p className="person-form-hint">{t("settings.landlords.form.hint")}</p>
      ) : (
        <>
          <p className="person-form-hint" data-cy="landlord-saved">
            {t("settings.landlords.form.saved")}
          </p>
          <PersonSignatureSection personId={savedId} />
        </>
      )}
    </FormModal>
  );
}
