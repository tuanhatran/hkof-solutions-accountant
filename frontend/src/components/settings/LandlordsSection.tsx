import "./LandlordsSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api, type LandlordDto } from "@/api/endpoints";
import { queryKeys, useLandlords } from "@/api/queries";
import { ListSearch } from "@/components/settings/ListToolbar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { toast } from "@/state/toasts";
import { LandlordForm } from "./LandlordForm";
import { EmptyState, SectionHeader } from "./SettingsSection";
import {
  SettingsListMobileSort,
  SettingsListSortHeader,
  type SettingsListColumn,
} from "./SettingsListSortHeader";

/** Landlord directory: list, add/edit modal, signatures and logical deletion. */
export function LandlordsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const landlords = useLandlords();
  const [form, setForm] = useState<LandlordDto | null | "new">(null);
  const [toDelete, setToDelete] = useState<LandlordDto | null>(null);
  const list = landlords.data ?? [];
  const listQuery = useListQuery<LandlordDto>({
    items: list,
    searchText: (landlord) =>
      `${landlord.name ?? ""} ${landlord.address ?? ""}`,
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
        value: "signatures",
        compare: (left, right) =>
          (left.signatureCount ?? 0) - (right.signatureCount ?? 0),
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
      label: t("settings.landlords.columns.landlord"),
      dataCy: "sort-landlords-name",
    },
    {
      key: "address",
      label: t("settings.landlords.columns.address"),
      dataCy: "sort-landlords-address",
    },
    {
      key: "signatures",
      label: t("settings.landlords.columns.signatures"),
      dataCy: "sort-landlords-signatures",
      numeric: true,
    },
  ];

  const remove = useMutation({
    mutationFn: (landlord: LandlordDto) =>
      api.landlords.remove(landlord.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.landlords });
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      setToDelete(null);
      toast.success(t("settings.landlords.deleted"));
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return (
    <section className="card landlords-section">
      <SectionHeader
        icon={UserRound}
        title={t("settings.landlords.title")}
        description={t("settings.landlords.description")}
        action={
          <div className="landlords-section-header-actions">
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setForm("new")}
              disabled={form === "new"}
              data-cy="btn-add-landlord"
            >
              {t("settings.landlords.add")}
            </Button>
            {list.length > 0 ? (
              <>
                <div className="landlords-section-header-search">
                  <ListSearch
                    list="landlords"
                    placeholder={t("settings.landlords.filterPlaceholder")}
                    query={listQuery.query}
                    onQueryChange={listQuery.setQuery}
                  />
                </div>
                <span
                  className="landlords-section-count"
                  aria-live="polite"
                  data-cy="filter-count-landlords"
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
                  selectDataCy="sort-landlords-compact"
                  directionDataCy="sort-landlords-compact-direction"
                />
              </>
            ) : null}
          </div>
        }
      />
      <div className="card-body landlords-section-body">
        {form !== null ? (
          <LandlordForm
            key={form === "new" ? "new" : form.id}
            item={form === "new" ? null : form}
            onClose={() => setForm(null)}
          />
        ) : null}

        {landlords.isError ? (
          <ErrorState
            message={errorMessage(landlords.error)}
            onRetry={() => void landlords.refetch()}
          />
        ) : landlords.isPending ? (
          <LoadingState message={t("settings.landlords.loading")} />
        ) : list.length === 0 ? (
          <EmptyState
            text={t("settings.landlords.empty")}
            dataCy="no-landlord"
          />
        ) : (
          <>
            {listQuery.visible.length === 0 ? (
              <EmptyState
                text={t("settings.list.noMatch", {
                  query: listQuery.query.trim(),
                })}
                dataCy="no-results-landlords"
              />
            ) : (
              <div className="landlords-section-table" role="table">
                <SettingsListSortHeader
                  columns={columns}
                  sort={listQuery.sort}
                  direction={listQuery.direction}
                  onSort={sortBy}
                  actionsLabel={t("settings.landlords.columns.actions")}
                  dataCy="landlords-headers"
                  className="landlords-section-headers"
                />
                <ul className="landlords-section-list">
                  {listQuery.visible.map((landlord) => (
                    <li
                      key={landlord.id}
                      className="landlords-section-item"
                      data-cy={`landlord-${landlord.id}`}
                    >
                      <p className="landlords-section-cell landlords-section-cell-name landlords-section-item-name">
                        {landlord.name ?? t("settings.landlords.nameFallback")}
                      </p>
                      <p className="landlords-section-cell landlords-section-cell-address landlords-section-item-address">
                        {landlord.address ||
                          t("settings.landlords.addressFallback")}
                      </p>
                      <p
                        className="landlords-section-cell landlords-section-cell-signatures landlords-section-item-meta text-right"
                        data-cy={`landlord-signatures-${landlord.id}`}
                      >
                        {t("settings.landlords.signatureCount", {
                          count: landlord.signatureCount ?? 0,
                        })}
                      </p>
                      <div className="landlords-section-cell landlords-section-cell-actions">
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => setForm(landlord)}
                          aria-label={t("settings.landlords.editAria", {
                            name:
                              landlord.name ??
                              t("settings.landlords.editFallback"),
                          })}
                          data-cy={`btn-edit-landlord-${landlord.id}`}
                        >
                          {t("settings.landlords.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(landlord)}
                          aria-label={t("settings.landlords.removeAria", {
                            name:
                              landlord.name ??
                              t("settings.landlords.editFallback"),
                          })}
                          data-cy={`btn-delete-landlord-${landlord.id}`}
                        >
                          {t("settings.landlords.remove")}
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
        title={t("settings.landlords.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.landlords.deleteDialog.message", {
                name:
                  toDelete.name ??
                  t("settings.landlords.deleteDialog.fallbackName"),
              })
            : ""
        }
        confirmLabel={t("settings.landlords.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialog-delete-landlord"
      />
    </section>
  );
}
