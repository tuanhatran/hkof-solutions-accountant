import "./EmployeeSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useEmployees } from "@/api/queries";
import type { EmployeeDto } from "@/api/types";
import { ListSearch } from "@/components/settings/ListToolbar";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { toast } from "@/state/toasts";
import { EmployeeForm } from "./EmployeeForm";
import {
  createEmployeeSorts,
  EmployeeMobileSort,
  EmployeeSortHeader,
} from "./EmployeeSortHeader";
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
  const listQuery = useListQuery<EmployeeDto>({
    items: list,
    searchText: (employee) =>
      [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.address,
        employeeTitleLabel(employee.title, t),
      ]
        .filter(Boolean)
        .join(" "),
    sorts: createEmployeeSorts(t),
    defaultSort: "name",
  });

  /** An inactive column starts ascending, the active column toggles. */
  function sortBy(column: string) {
    if (listQuery.sort === column) {
      listQuery.toggleDirection();
      return;
    }
    listQuery.setSort(column);
    if (listQuery.direction !== "asc") {
      listQuery.toggleDirection();
    }
  }

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
          <div className="employee-section-header-actions">
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setEmployeeForm("new")}
              disabled={companyId === null || employeeForm === "new"}
              data-cy="btn-add-employee"
            >
              {t("settings.employees.add")}
            </Button>
            {companyId !== null && list.length > 0 ? (
              <>
                <div className="employee-section-header-search">
                  <ListSearch
                    list="employees"
                    placeholder={t("settings.employees.filterPlaceholder")}
                    query={listQuery.query}
                    onQueryChange={listQuery.setQuery}
                  />
                </div>
                <span
                  className="employee-section-count"
                  aria-live="polite"
                  data-cy="filter-count-employees"
                >
                  {t("settings.list.count", {
                    visible: listQuery.visible.length,
                    total: listQuery.total,
                  })}
                </span>
                <EmployeeMobileSort
                  sort={listQuery.sort}
                  direction={listQuery.direction}
                  onSort={sortBy}
                  onToggleDirection={listQuery.toggleDirection}
                />
              </>
            ) : null}
          </div>
        }
      />
      <div className="card-body employee-section-body">
        {companyId === null ? (
          <EmptyState
            text={t("settings.employees.selectCompany")}
            dataCy="no-company-employee"
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
            dataCy="no-employee"
          />
        ) : listQuery.visible.length === 0 ? (
          <EmptyState
            text={t("settings.list.noMatch", {
              query: listQuery.query.trim(),
            })}
            dataCy="no-results-employees"
          />
        ) : (
          <div
            className="employee-section-table"
            role="table"
            data-cy="employee-section-list"
          >
            <EmployeeSortHeader
              sort={listQuery.sort}
              direction={listQuery.direction}
              onSort={sortBy}
            />
            <ul className="employee-section-list" role="none">
              {listQuery.visible.map((employee) => (
                <li
                  key={employee.id}
                  className="employee-section-item"
                  role="row"
                  data-cy={`employee-${employee.id}`}
                >
                  <p
                    className="employee-section-cell employee-section-cell-name employee-section-item-title"
                    role="cell"
                  >
                    {employee.firstName} {employee.lastName}
                  </p>
                  <div
                    className="employee-section-cell employee-section-cell-title"
                    role="cell"
                  >
                    <span className="badge badge-neutral">
                      {employeeTitleLabel(employee.title, t)}
                    </span>
                  </div>
                  <div
                    className="employee-section-cell employee-section-cell-contact"
                    role="cell"
                  >
                    {employee.email ? (
                      <span className="employee-section-item-email">
                        {employee.email}
                      </span>
                    ) : null}
                    <span className="employee-section-item-address">
                      {employee.address ||
                        t("settings.employees.addressFallback")}
                    </span>
                  </div>
                  <p
                    className="employee-section-cell employee-section-cell-signatures employee-section-item-signatures number text-right"
                    role="cell"
                    data-cy={`employee-signatures-${employee.id}`}
                  >
                    {t("settings.employees.signatureCount", {
                      count: employee.signatureCount ?? 0,
                    })}
                  </p>
                  <div
                    className="employee-section-cell employee-section-cell-actions"
                    role="cell"
                  >
                    <Button
                      variant="ghost"
                      small
                      icon={<PencilLine size={13} />}
                      onClick={() => setEmployeeForm(employee)}
                      aria-label={t("settings.employees.editAria", {
                        name: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`,
                      })}
                      data-cy={`btn-edit-employee-${employee.id}`}
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
                      data-cy={`btn-delete-employee-${employee.id}`}
                    >
                      {t("settings.employees.remove")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
        dataCy="dialog-delete-employee"
      />
    </section>
  );
}
