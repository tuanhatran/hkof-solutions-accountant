import "./PersonnesSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, usePersons } from "@/api/queries";
import type { PersonDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { toast } from "@/state/toasts";
import { PersonForm } from "./PersonForm";
import { EmptyState, SectionHeader } from "./SettingsSection";

/** Natural persons directory: list, add/edit modal and logical deletion. */
export function PersonnesSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const persons = usePersons();
  const [form, setForm] = useState<PersonDto | null | "new">(null);
  const [toDelete, setToDelete] = useState<PersonDto | null>(null);
  const list = persons.data ?? [];

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
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => setForm("new")}
            disabled={form === "new"}
            data-cy="btn-ajouter-personne"
          >
            {t("settings.people.add")}
          </Button>
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
          <EmptyState
            text={t("settings.people.empty")}
            dataCy="aucune-personne"
          />
        ) : (
          <>
            <div
              className="personnes-section-headers hidden md:grid"
              data-cy="entetes-personnes"
            >
              <span>{t("settings.people.columns.person")}</span>
              <span>{t("settings.people.columns.address")}</span>
              <span className="personnes-section-headers-signatures">
                {t("settings.people.columns.signatures")}
              </span>
              <span aria-hidden="true" />
            </div>
            <ul className="personnes-section-list">
              {list.map((person) => (
                <li
                  key={person.id}
                  className="personnes-section-item"
                  data-cy={`personne-${person.id}`}
                >
                  <p className="personnes-section-cell personnes-section-cell-name personnes-section-item-name">
                    {person.name ?? t("settings.people.nameFallback")}
                  </p>
                  <p className="personnes-section-cell personnes-section-cell-address personnes-section-item-address">
                    {person.address || t("settings.people.addressFallback")}
                  </p>
                  <p
                    className="personnes-section-cell personnes-section-cell-signatures personnes-section-item-meta number text-right"
                    data-cy={`signatures-personne-${person.id}`}
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
                        name: person.name ?? t("settings.people.editFallback"),
                      })}
                      data-cy={`btn-modifier-personne-${person.id}`}
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
                        name: person.name ?? t("settings.people.editFallback"),
                      })}
                      data-cy={`btn-supprimer-personne-${person.id}`}
                    >
                      {t("settings.people.remove")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
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
        dataCy="dialogue-supprimer-personne"
      />
    </section>
  );
}
