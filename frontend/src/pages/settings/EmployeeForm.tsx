import "./EmployeeSection.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { EmployeeDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { FieldGroup } from "@/components/ui/FieldGroup";
import { cn } from "@/lib/cn";
import { employeeSchema, type EmployeeFormValues } from "@/lib/validation";
import { toast } from "@/state/toasts";
import { EMPLOYEE_TITLES } from "./settingsValues";

/** Create or update form of an employee of the active company. */
export function EmployeeForm({
  companyId,
  employee,
  onClose,
}: {
  companyId: number;
  employee: EmployeeDto | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
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
      email: employee?.email ?? "",
      title: employee?.title ?? "EMPLOYEE",
    },
  });

  const save = useMutation({
    mutationFn: (values: EmployeeFormValues) => {
      const requestBody = {
        companyId,
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim() === "" ? null : values.email.trim(),
        title: values.title,
      };
      return employee?.id
        ? api.employees.update(employee.id, requestBody)
        : api.employees.create(companyId, requestBody);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.employees(companyId),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employeesAll });
      toast.success(employee ? "Salarié mis à jour." : "Salarié ajouté.");
      onClose();
    },
  });

  return (
    <form
      className="employee-form"
      onSubmit={handleSubmit((values) => save.mutate(values))}
      noValidate
      data-cy="formulaire-salarie"
    >
      <h3 className="employee-form-title">
        {employee ? "Modifier le salarié" : "Ajouter un salarié"}
      </h3>

      <div className="employee-form-grid">
        <FieldGroup
          id="salarie-prenom"
          label="Prénom"
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
          label="Nom"
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
          label="Adresse électronique"
          error={errors.email?.message}
          help="Facultative ; unique dans la société."
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
          label="Intitulé"
          error={errors.title?.message}
          help="Descriptif : il ne donne encore aucun droit."
        >
          <select
            id="salarie-titre"
            className={cn("field", errors.title && "field-error")}
            {...register("title")}
            data-cy="select-salarie-titre"
          >
            {EMPLOYEE_TITLES.map((title) => (
              <option key={title.value} value={title.value}>
                {title.label}
              </option>
            ))}
          </select>
        </FieldGroup>
      </div>

      {save.isError ? (
        <p className="employee-form-error" role="alert">
          {errorMessage(save.error)}
        </p>
      ) : null}

      <div className="employee-form-actions">
        <Button
          variant="ghost"
          small
          icon={<X size={14} />}
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
          data-cy="btn-enregistrer-salarie"
        >
          {employee ? "Enregistrer le salarié" : "Ajouter le salarié"}
        </Button>
      </div>
    </form>
  );
}
