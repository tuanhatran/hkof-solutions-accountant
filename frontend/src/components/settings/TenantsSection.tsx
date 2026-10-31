import "./TenantsSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, UsersRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api, type TenantDto } from "@/api/endpoints";
import { queryKeys, useTenants } from "@/api/queries";
import { ListSearch } from "@/components/settings/ListToolbar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { toast } from "@/state/toasts";
import { EmptyState, SectionHeader } from "./SettingsSection";
import {
  SettingsListMobileSort,
  SettingsListSortHeader,
  type SettingsListColumn,
} from "./SettingsListSortHeader";
import { TenantForm } from "./TenantForm";

/** Tenant directory: list, add/edit modal, contact email and logical deletion. */
export function TenantsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tenants = useTenants();
  const [form, setForm] = useState<TenantDto | null | "new">(null);
  const [toDelete, setToDelete] = useState<TenantDto | null>(null);
  const list = tenants.data ?? [];
  const listQuery = useListQuery<TenantDto>({
    items: list,
    searchText: (tenant) =>
      `${tenant.name ?? ""} ${tenant.address ?? ""} ${tenant.email ?? ""}`,
    sorts: [
      {
        value: "name",
        compare: (left, right) =>
          (left.name ?? "").localeCompare(right.name ?? "", "fr", {
            sensitivity: "base",
          }),
      },
      {
        value: "address",
        compare: (left, right) =>
          (left.address ?? "").localeCompare(right.address ?? "", "fr", {
            sensitivity: "base",
          }),
      },
      {
        value: "email",
        compare: (left, right) =>
          (left.email ?? "").localeCompare(right.email ?? "", "fr", {
            sensitivity: "base",
          }),
      },
    ],
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

  const columns: SettingsListColumn[] = [
    {
      key: "name",
      label: t("settings.tenants.columns.tenant"),
      dataCy: "sort-tenants-name",
    },
    {
      key: "address",
      label: t("settings.tenants.columns.address"),
      dataCy: "sort-tenants-address",
    },
    {
      key: "email",
      label: t("settings.tenants.columns.email"),
      dataCy: "sort-tenants-email",
    },
  ];

  const remove = useMutation({
    mutationFn: (tenant: TenantDto) => api.tenants.remove(tenant.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      setToDelete(null);
      toast.success(t("settings.tenants.deleted"));
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return (
    <section className="card tenants-section">
      <SectionHeader
        icon={UsersRound}
        title={t("settings.tenants.title")}
        description={t("settings.tenants.description")}
        action={
          <div className="tenants-section-header-actions">
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setForm("new")}
              disabled={form === "new"}
              data-cy="btn-add-tenant"
            >
              {t("settings.tenants.add")}
            </Button>
            {list.length > 0 ? (
              <>
                <div className="tenants-section-header-search">
                  <ListSearch
                    list="tenants"
                    placeholder={t("settings.tenants.filterPlaceholder")}
                    query={listQuery.query}
                    onQueryChange={listQuery.setQuery}
                  />
                </div>
                <span
                  className="tenants-section-count"
                  aria-live="polite"
                  data-cy="filter-count-tenants"
                >
                  {t("settings.list.count", {
                    visible: listQuery.visible.length,
                    total: listQuery.total,
                  })}
                </span>
                <SettingsListMobileSort
                  columns={columns}
                  sort={listQuery.sort}
                  direction={listQuery.direction}
                  onSort={sortBy}
                  onToggleDirection={listQuery.toggleDirection}
                  selectDataCy="sort-tenants-compact"
                  directionDataCy="sort-tenants-compact-direction"
                />
              </>
            ) : null}
          </div>
        }
      />
      <div className="card-body tenants-section-body">
        {form !== null ? (
          <TenantForm
            key={form === "new" ? "new" : form.id}
            item={form === "new" ? null : form}
            onClose={() => setForm(null)}
          />
        ) : null}

        {tenants.isError ? (
          <ErrorState
            message={errorMessage(tenants.error)}
            onRetry={() => void tenants.refetch()}
          />
        ) : tenants.isPending ? (
          <LoadingState message={t("settings.tenants.loading")} />
        ) : list.length === 0 ? (
          <EmptyState text={t("settings.tenants.empty")} dataCy="no-tenant" />
        ) : (
          <>
            {listQuery.visible.length === 0 ? (
              <EmptyState
                text={t("settings.list.noMatch", {
                  query: listQuery.query.trim(),
                })}
                dataCy="no-results-tenants"
              />
            ) : (
              <div className="tenants-section-table" role="table">
                <SettingsListSortHeader
                  columns={columns}
                  sort={listQuery.sort}
                  direction={listQuery.direction}
                  onSort={sortBy}
                  actionsLabel={t("settings.tenants.columns.actions")}
                  dataCy="tenants-headers"
                  className="tenants-section-headers"
                />
                <ul className="tenants-section-list">
                  {listQuery.visible.map((tenant) => (
                    <li
                      key={tenant.id}
                      className="tenants-section-item"
                      data-cy={`tenant-${tenant.id}`}
                    >
                      <p className="tenants-section-cell tenants-section-cell-name tenants-section-item-name">
                        {tenant.name ?? t("settings.tenants.nameFallback")}
                      </p>
                      <p className="tenants-section-cell tenants-section-cell-address tenants-section-item-address">
                        {tenant.address ||
                          t("settings.tenants.addressFallback")}
                      </p>
                      <p
                        className="tenants-section-cell tenants-section-cell-email tenants-section-item-email"
                        data-cy={`tenant-email-${tenant.id}`}
                      >
                        {tenant.email || t("settings.tenants.emailFallback")}
                      </p>
                      <div className="tenants-section-cell tenants-section-cell-actions">
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => setForm(tenant)}
                          aria-label={t("settings.tenants.editAria", {
                            name:
                              tenant.name ?? t("settings.tenants.editFallback"),
                          })}
                          data-cy={`btn-edit-tenant-${tenant.id}`}
                        >
                          {t("settings.tenants.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(tenant)}
                          aria-label={t("settings.tenants.removeAria", {
                            name:
                              tenant.name ?? t("settings.tenants.editFallback"),
                          })}
                          data-cy={`btn-delete-tenant-${tenant.id}`}
                        >
                          {t("settings.tenants.remove")}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title={t("settings.tenants.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.tenants.deleteDialog.message", {
                name:
                  toDelete.name ??
                  t("settings.tenants.deleteDialog.fallbackName"),
              })
            : ""
        }
        confirmLabel={t("settings.tenants.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialog-delete-tenant"
      />
    </section>
  );
}
