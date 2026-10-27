import "./EmployeeSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useEmployees } from "@/api/queries";
import type { EmployeeDto } from "@/api/types";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { toast } from "@/state/toasts";
import { EmployeeForm } from "./EmployeeForm";
import { employeeTitleLabel } from "./settingsValues";

/** Employees of the active company, with their descriptive title. */
export function EmployeeSection({ companyId }: { companyId: number | null }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const employees = useEmployees(companyId);
  const [employeeForm, setEmployeeForm] = useState<EmployeeDto | null | "new">(
    null,
  );
  const [toDelete, setToDelete] = useState<EmployeeDto | null>(null);
  const list = employees.data ?? [];

  const remove = useMutation({
    mutationFn: (employee: EmployeeDto) =>
      api.employees.delete(employee.id as number),
    onSuccess: () => {
      if (companyId !== null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.employees(companyId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.employeesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.signaturesAll });
      setToDelete(null);
      toast.success(t("settings.employees.deleted"));
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return (
    <section className="employee-section">
      <SectionHeader
        icon={Users}
        title={t("settings.employees.title")}
        description={t("settings.employees.description")}
        action={
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => setEmployeeForm("new")}
            disabled={companyId === null || employeeForm === "new"}
            data-cy="btn-ajouter-salarie"
          >
            {t("settings.employees.add")}
          </Button>
        }
      />
      <div className="card-body employee-section-body">
        {companyId === null ? (
          <EmptyState
            text={t("settings.employees.selectCompany")}
            dataCy="aucun-salarie-societe"
          />
        ) : employeeForm !== null ? (
          <EmployeeForm
            key={employeeForm === "new" ? "new" : employeeForm.id}
            companyId={companyId}
            employee={employeeForm === "new" ? null : employeeForm}
            onClose={() => setEmployeeForm(null)}
          />
        ) : null}

        {companyId === null ? null : employees.isError ? (
          <ErrorState
            message={errorMessage(employees.error)}
            onRetry={() => void employees.refetch()}
          />
        ) : employees.isPending ? (
          <LoadingState message={t("settings.employees.loading")} />
        ) : list.length === 0 ? (
          <EmptyState
            text={t("settings.employees.empty")}
            dataCy="aucun-salarie"
          />
        ) : (
          <ul className="employee-section-list">
            {list.map((employee) => (
              <li
                key={employee.id}
                className="employee-section-item"
                data-cy={`salarie-${employee.id}`}
              >
                <div className="employee-section-item-body">
                  <p className="employee-section-item-title">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="employee-section-item-meta">
                    <span className="badge badge-neutral">
                      {employeeTitleLabel(employee.title, t)}
                    </span>
                    {employee.email ? (
                      <span className="employee-section-item-email">
                        {employee.email}
                      </span>
                    ) : null}
                  </p>
                  <p className="employee-section-item-address">
                    {employee.address ||
                      t("settings.employees.addressFallback")}
                  </p>
                  <p
                    className="employee-section-item-signatures"
                    data-cy={`signatures-salarie-${employee.id}`}
                  >
                    {t("settings.employees.signatureCount", {
                      count: employee.signatureCount ?? 0,
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  small
                  icon={<PencilLine size={13} />}
                  onClick={() => setEmployeeForm(employee)}
                  aria-label={t("settings.employees.editAria", {
                    name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`,
                  })}
                  data-cy={`btn-modifier-salarie-${employee.id}`}
                >
                  {t("settings.employees.edit")}
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setToDelete(employee)}
                  aria-label={t("settings.employees.removeAria", {
                    name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`,
                  })}
                  data-cy={`btn-supprimer-salarie-${employee.id}`}
                >
                  {t("settings.employees.remove")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={t("settings.employees.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.employees.deleteDialog.message", {
                name: `${toDelete.firstName ?? ""} ${toDelete.lastName ?? ""}`,
              })
            : ""
        }
        confirmLabel={t("settings.employees.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-salarie"
      />
    </section>
  );
}
