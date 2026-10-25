import "./PersonnesSection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilLine, Plus, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
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
      toast.success("Personne supprimée.");
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
        title="Personnes"
        description="Personnes physiques utilisées comme bailleur ou locataire d’un bail. Chaque personne peut porter ses signatures."
        action={
          <Button
            variant="primary"
            small
            icon={<Plus size={14} />}
            onClick={() => setForm("new")}
            disabled={form === "new"}
            data-cy="btn-ajouter-personne"
          >
            Ajouter une personne
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
          <LoadingState message="Chargement des personnes…" />
        ) : list.length === 0 ? (
          <EmptyState
            text="Aucune personne configurée. Ajoutez le bailleur ou le locataire du logement."
            dataCy="aucune-personne"
          />
        ) : (
          <ul className="personnes-section-list">
            {list.map((person) => (
              <li
                key={person.id}
                className="personnes-section-item"
                data-cy={`personne-${person.id}`}
              >
                <div className="personnes-section-item-body">
                  <p className="personnes-section-item-name">
                    {person.name ?? "Personne"}
                  </p>
                  <p className="personnes-section-item-address">
                    {person.address || "Adresse non renseignée"}
                  </p>
                  <p
                    className="personnes-section-item-meta"
                    data-cy={`signatures-personne-${person.id}`}
                  >
                    {person.signatureCount ?? 0} signature
                    {(person.signatureCount ?? 0) > 1 ? "s" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  small
                  icon={<PencilLine size={13} />}
                  onClick={() => setForm(person)}
                  aria-label={`Modifier ${person.name ?? "la personne"}`}
                  data-cy={`btn-modifier-personne-${person.id}`}
                >
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setToDelete(person)}
                  aria-label={`Supprimer ${person.name ?? "la personne"}`}
                  data-cy={`btn-supprimer-personne-${person.id}`}
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette personne ?"
        message={
          toDelete
            ? `« ${toDelete.name ?? "Cette personne"} » ne sera plus proposée. Une personne utilisée par un bail actif ou porteuse de signatures ne peut pas être supprimée : retirez d’abord ses signatures.`
            : ""
        }
        confirmLabel="Supprimer la personne"
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
