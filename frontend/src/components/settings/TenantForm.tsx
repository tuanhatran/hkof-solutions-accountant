import "./PersonForm.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { errorMessage } from "@/api/client";
import { api, type TenantDto, type TenantRequest } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { toast } from "@/state/toasts";

const tenantSchema = (messages: { name: string; email: string }) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: () => messages.name }),
    address: z.string(),
    phone: z.string().optional(),
    email: z.union([
      z.literal(""),
      z
        .string()
        .trim()
        .email({ error: () => messages.email }),
    ]),
    addressNote: z.string().optional(),
  });

type TenantFormValues = z.infer<ReturnType<typeof tenantSchema>>;

/** Create/update modal of a tenant, with its contact email. */
export function TenantForm({
  item,
  onClose,
}: {
  item: TenantDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const schema = useMemo(
    () =>
      tenantSchema({
        name: t("settings.tenants.validation.name"),
        email: t("settings.tenants.validation.email"),
      }),
    [t],
  );
  const [requestError, setRequestError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TenantFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: item?.name ?? "",
      address: item?.address ?? "",
      phone: item?.phone ?? "",
      email: item?.email ?? "",
      addressNote: item?.addressNote ?? "",
    },
  });

  const save = useMutation({
    mutationFn: (values: TenantFormValues) => {
      const requestBody: TenantRequest = {
        name: values.name.trim(),
        address: values.address.trim() === "" ? null : values.address.trim(),
        phone: values.phone?.trim() ?? "",
        email:
          values.email?.trim() === "" ? null : (values.email?.trim() ?? null),
        addressNote: values.addressNote?.trim() ?? "",
      };
      return item?.id === undefined
        ? api.tenants.create(requestBody)
        : api.tenants.update(item.id, requestBody);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      toast.success(
        item
          ? t("settings.tenants.form.updated", { name: saved.name ?? "" })
          : t("settings.tenants.form.created", { name: saved.name ?? "" }),
      );
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
          ? t("settings.tenants.form.editTitle")
          : t("settings.tenants.form.createTitle")
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => {
        setRequestError(null);
        save.mutate(values);
      })}
      formDataCy="tenant-form"
      submitDataCy="btn-save-tenant"
      formClassName="person-form"
      pending={save.isPending}
      error={requestError}
    >
      <div className="person-form-grid">
        <FieldGroup
          id="locataire-nom"
          label={t("settings.tenants.form.name")}
          error={errors.name?.message}
        >
          <input
            id="locataire-nom"
            className={cn("field", errors.name && "field-error")}
            placeholder="Mme Durand"
            {...register("name")}
            data-cy="input-tenant-name"
          />
        </FieldGroup>
        <FieldGroup
          id="locataire-email"
          label={t("settings.tenants.form.email")}
          error={errors.email?.message}
          help={t("settings.tenants.form.emailHelp")}
        >
          <input
            id="locataire-email"
            type="email"
            className={cn("field", errors.email && "field-error")}
            placeholder="locataire@exemple.fr"
            {...register("email")}
            data-cy="input-tenant-email"
          />
        </FieldGroup>
        <FieldGroup
          id="locataire-adresse"
          label={t("settings.tenants.form.address")}
          error={errors.address?.message}
          help={t("settings.tenants.form.addressHelp")}
        >
          <input
            id="locataire-adresse"
            className="field"
            placeholder="1 avenue du Parc, 75011 Paris"
            {...register("address")}
            data-cy="input-tenant-address"
          />
        </FieldGroup>
        <FieldGroup
          id="locataire-telephone"
          label={t("settings.tenants.form.phone")}
          error={errors.phone?.message}
          help={t("settings.tenants.form.phoneHelp")}
        >
          <input
            id="locataire-telephone"
            className="field"
            placeholder="06 12 34 56 78"
            {...register("phone")}
            data-cy="input-tenant-phone"
          />
        </FieldGroup>
        <FieldGroup
          id="locataire-complement-adresse"
          label={t("settings.tenants.form.addressNote")}
          error={errors.addressNote?.message}
          help={t("settings.tenants.form.addressNoteHelp")}
        >
          <input
            id="locataire-complement-adresse"
            className="field"
            placeholder="Bâtiment B, étage 2"
            {...register("addressNote")}
            data-cy="input-tenant-address-note"
          />
        </FieldGroup>
      </div>

      <p className="person-form-hint">{t("settings.tenants.form.hint")}</p>
    </FormModal>
  );
}
