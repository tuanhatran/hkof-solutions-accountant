import "./EmployeeSection.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { EmployeeDto, EmployeeRequest } from "@/api/types";
import { PersonSignatureSection } from "@/components/settings/PersonSignatureSection";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { FormModal } from "@/components/ui/FormModal";
import { cn } from "@/lib/cn";
import { employeeSchema, type EmployeeFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { EMPLOYEE_TITLES } from "./settingsValues";

/**
 * Create or update modal for an employee of the active company. After creation
 * the modal stays open so the employee can receive signatures immediately.
 */
export function EmployeeForm({
  companyId,
  employee,
  onClose,
}: {
  companyId: number;
  employee: EmployeeDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [savedId, setSavedId] = useState<number | null>(employee?.id ?? null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    mode: "onChange",
    defaultValues: {
      firstName: employee?.firstName ?? "",
      lastName: employee?.lastName ?? "",
      address: employee?.address ?? "",
      email: employee?.email ?? "",
      title: employee?.title ?? "EMPLOYEE",
    },
  });

  const save = useMutation({
    mutationFn: (values: EmployeeFormValues) => {
      const requestBody: EmployeeRequest = {
        companyId,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        address: values.address.trim() === "" ? null : values.address.trim(),
        email: values.email.trim() === "" ? null : values.email.trim(),
        title: values.title,
      };
      return savedId === null
        ? api.employees.create(companyId, requestBody)
        : api.employees.update(savedId, requestBody);
    },
    onSuccess: (saved) => {
      const creating = savedId === null;
      void queryClient.invalidateQueries({
        queryKey: queryKeys.employees(companyId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employeesAll });
      if (saved.id !== undefined) {
        setSavedId(saved.id);
      }
      toast.success(
        creating
          ? t("settings.employees.form.created")
          : t("settings.employees.form.updated"),
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <FormModal
      open
      wide
      title={
        savedId === null
          ? t("settings.employees.form.createTitle")
          : t("settings.employees.form.editTitle")
      }
      onClose={onClose}
      onSubmit={handleSubmit((values) => save.mutate(values))}
      formDataCy="formulaire-salarie"
      submitDataCy="btn-enregistrer-salarie"
      pending={save.isPending}
      error={save.isError ? errorMessage(save.error) : null}
      formClassName="employee-form"
    >
      <div className="employee-form-grid">
        <FieldGroup
          id="salarie-prenom"
          label={t("settings.employees.form.firstName")}
          error={errors.firstName?.message}
        >
          <input
            id="salarie-prenom"
            className={cn("field", errors.firstName && "field-error")}
            {...register("firstName")}
            data-cy="input-salarie-prenom"
          />
        </FieldGroup>
        <FieldGroup
          id="salarie-nom"
          label={t("settings.employees.form.lastName")}
          error={errors.lastName?.message}
        >
          <input
            id="salarie-nom"
            className={cn("field", errors.lastName && "field-error")}
            {...register("lastName")}
            data-cy="input-salarie-nom"
          />
        </FieldGroup>
        <FieldGroup
          id="salarie-email"
          label={t("settings.employees.form.email")}
          error={errors.email?.message}
          help={t("settings.employees.form.emailHelp")}
        >
          <input
            id="salarie-email"
            type="email"
            className={cn("field", errors.email && "field-error")}
            placeholder="prenom.nom@exemple.fr"
            {...register("email")}
            data-cy="input-salarie-email"
          />
        </FieldGroup>
        <FieldGroup
          id="salarie-titre"
          label={t("settings.employees.form.title")}
          error={errors.title?.message}
          help={t("settings.employees.form.titleHelp")}
        >
          <select
            id="salarie-titre"
            className={cn("field", errors.title && "field-error")}
            {...register("title")}
            data-cy="select-salarie-titre"
          >
            {EMPLOYEE_TITLES.map((title) => (
              <option key={title.value} value={title.value}>
                {t(title.labelKey)}
              </option>
            ))}
          </select>
        </FieldGroup>
        <FieldGroup
          id="salarie-adresse"
          label={t("settings.employees.form.address")}
          error={errors.address?.message}
          help={t("settings.employees.form.addressHelp")}
          className="sm:col-span-2"
        >
          <input
            id="salarie-adresse"
            className="field"
            placeholder="1 avenue du Parc, 75011 Paris"
            {...register("address")}
            data-cy="input-salarie-adresse"
          />
        </FieldGroup>
      </div>

      {savedId === null ? (
        <p className="employee-form-hint">
          {t("settings.employees.form.hint")}
        </p>
      ) : (
        <PersonSignatureSection personId={savedId} />
      )}
    </FormModal>
  );
}
