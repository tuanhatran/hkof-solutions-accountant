import "./PersonnesSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, usePersons } from "@/api/queries";
import type { PersonDto } from "@/api/types";
import { ListSearch } from "@/components/settings/ListToolbar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { toast } from "@/state/toasts";
import { PersonForm } from "./PersonForm";
import { EmptyState, SectionHeader } from "./SettingsSection";
import {
  SettingsListMobileSort,
  SettingsListSortHeader,
  type SettingsListColumn,
} from "./SettingsListSortHeader";

/** Natural persons directory: list, add/edit modal and logical deletion. */
export function PersonnesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const persons = usePersons();
  const [form, setForm] = useState<PersonDto | null | "new">(null);
  const [toDelete, setToDelete] = useState<PersonDto | null>(null);
  const list = persons.data ?? [];
  const listQuery = useListQuery<PersonDto>({
    items: list,
    searchText: (person) => `${person.name ?? ""} ${person.address ?? ""}`,
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
      label: t("settings.people.columns.person"),
      dataCy: "sort-persons-name",
    },
    {
      key: "address",
      label: t("settings.people.columns.address"),
      dataCy: "sort-persons-address",
    },
    {
      key: "signatures",
      label: t("settings.people.columns.signatures"),
      dataCy: "sort-persons-signatures",
      numeric: true,
    },
  ];

  const remove = useMutation({
    mutationFn: (person: PersonDto) => api.persons.remove(person.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.persons });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      setToDelete(null);
      toast.success(t("settings.people.deleted"));
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return (
    <section className="card personnes-section">
      <SectionHeader
        icon={UserRound}
        title={t("settings.people.title")}
        description={t("settings.people.description")}
        action={
          <div className="personnes-section-header-actions">
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => setForm("new")}
              disabled={form === "new"}
              data-cy="btn-add-person"
            >
              {t("settings.people.add")}
            </Button>
            {list.length > 0 ? (
              <>
                <div className="personnes-section-header-search">
                  <ListSearch
                    list="persons"
                    placeholder={t("settings.people.filterPlaceholder")}
                    query={listQuery.query}
                    onQueryChange={listQuery.setQuery}
                  />
                </div>
                <span
                  className="personnes-section-count"
                  aria-live="polite"
                  data-cy="filter-count-persons"
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
                  selectDataCy="sort-persons-compact"
                  directionDataCy="sort-persons-compact-direction"
                />
              </>
            ) : null}
          </div>
        }
      />
      <div className="card-body personnes-section-body">
        {form !== null ? (
          <PersonForm
            key={form === "new" ? "new" : form.id}
            item={form === "new" ? null : form}
            onClose={() => setForm(null)}
          />
        ) : null}

        {persons.isError ? (
          <ErrorState
            message={errorMessage(persons.error)}
            onRetry={() => void persons.refetch()}
          />
        ) : persons.isPending ? (
          <LoadingState message={t("settings.people.loading")} />
        ) : list.length === 0 ? (
          <EmptyState text={t("settings.people.empty")} dataCy="no-person" />
        ) : (
          <>
            {listQuery.visible.length === 0 ? (
              <EmptyState
                text={t("settings.list.noMatch", {
                  query: listQuery.query.trim(),
                })}
                dataCy="no-results-persons"
              />
            ) : (
              <div className="personnes-section-table" role="table">
                <SettingsListSortHeader
                  columns={columns}
                  sort={listQuery.sort}
                  direction={listQuery.direction}
                  onSort={sortBy}
                  actionsLabel={t("settings.people.columns.actions")}
                  dataCy="persons-headers"
                  className="personnes-section-headers"
                />
                <ul className="personnes-section-list">
                  {listQuery.visible.map((person) => (
                    <li
                      key={person.id}
                      className="personnes-section-item"
                      data-cy={`person-${person.id}`}
                    >
                      <p className="personnes-section-cell personnes-section-cell-name personnes-section-item-name">
                        {person.name ?? t("settings.people.nameFallback")}
                      </p>
                      <p className="personnes-section-cell personnes-section-cell-address personnes-section-item-address">
                        {person.address || t("settings.people.addressFallback")}
                      </p>
                      <p
                        className="personnes-section-cell personnes-section-cell-signatures personnes-section-item-meta number text-right"
                        data-cy={`person-signatures-${person.id}`}
                      >
                        {t("settings.people.signatureCount", {
                          count: person.signatureCount ?? 0,
                        })}
                      </p>
                      <div className="personnes-section-cell personnes-section-cell-actions">
                        <Button
                          variant="ghost"
                          small
                          icon={<PencilLine size={13} />}
                          onClick={() => setForm(person)}
                          aria-label={t("settings.people.editAria", {
                            name:
                              person.name ?? t("settings.people.editFallback"),
                          })}
                          data-cy={`btn-edit-person-${person.id}`}
                        >
                          {t("settings.people.edit")}
                        </Button>
                        <Button
                          variant="ghost"
                          small
                          icon={<Trash2 size={13} />}
                          className="text-danger hover:bg-danger-soft"
                          onClick={() => setToDelete(person)}
                          aria-label={t("settings.people.removeAria", {
                            name:
                              person.name ?? t("settings.people.editFallback"),
                          })}
                          data-cy={`btn-delete-person-${person.id}`}
                        >
                          {t("settings.people.remove")}
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
        title={t("settings.people.deleteDialog.title")}
        message={
          toDelete
            ? t("settings.people.deleteDialog.message", {
                name:
                  toDelete.name ??
                  t("settings.people.deleteDialog.fallbackName"),
              })
            : ""
        }
        confirmLabel={t("settings.people.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialog-delete-person"
      />
    </section>
  );
}
