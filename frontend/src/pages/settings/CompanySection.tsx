import "./CompanySection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useCompanies } from "@/api/queries";
import type { CompanyDto } from "@/api/types";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useCompanyStore } from "@/state/company";
import { toast } from "@/state/toasts";
import { CompanyForm } from "./CompanyForm";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

/** Company directory: select, create, edit, activate and logically delete. */
export function CompanySection() {
  const queryClient = useQueryClient();
  const companies = useCompanies();
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);
  const [selectedId, setSelectedId] = useState<number | null>(activeCompanyId);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CompanyDto | null>(null);

  const list = useMemo(() => companies.data ?? [], [companies.data]);
  useEffect(() => {
    if (creating) {
      return;
    }
    if (
      selectedId === null ||
      !list.some((company) => company.id === selectedId)
    ) {
      setSelectedId(list[0]?.id ?? null);
    }
  }, [companies.data, creating, list, selectedId]);

  const selected = list.find((company) => company.id === selectedId) ?? null;

  const remove = useMutation({
    mutationFn: (company: CompanyDto) =>
      api.companies.delete(company.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      setToDelete(null);
      toast.success("Société supprimée.");
    },
    onError: (error) => {
      setToDelete(null);
      toast.error(errorMessage(error));
    },
  });

  return (
    <div className="settings-page-sections">
      <section className="card company-section">
        <SectionHeader
          icon={Building2}
          title="Sociétés"
          description="Chaque société possède son identité, son logement, ses postes de frais et ses notes de frais."
          action={
            <div className="company-section-actions">
              {selected && selected.id !== activeCompanyId ? (
                <Button
                  variant="secondary"
                  small
                  icon={<Star size={14} />}
                  onClick={() => {
                    if (selected.id !== undefined) {
                      setActiveCompany(selected.id);
                    }
                  }}
                  data-cy="btn-rendre-active"
                >
                  Rendre active
                </Button>
              ) : null}
              {selected ? (
                <Button
                  variant="ghost"
                  small
                  icon={<Trash2 size={13} />}
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setToDelete(selected)}
                  data-cy="btn-supprimer-societe"
                >
                  Supprimer
                </Button>
              ) : null}
              <Button
                variant="primary"
                small
                icon={<Plus size={14} />}
                onClick={() => setCreating(true)}
                disabled={creating}
                data-cy="btn-nouvelle-societe"
              >
                Nouvelle société
              </Button>
            </div>
          }
        />
        <div className="card-body company-section-body">
          {companies.isError ? (
            <ErrorState
              message={errorMessage(companies.error)}
              onRetry={() => void companies.refetch()}
            />
          ) : companies.isPending ? (
            <LoadingState message="Chargement des sociétés…" />
          ) : (
            <>
              {list.length > 0 ? (
                <div className="company-section-selector">
                  <label
                    htmlFor="societe-a-configurer"
                    className="company-section-selector-label"
                  >
                    Société à configurer
                  </label>
                  <select
                    id="societe-a-configurer"
                    className="field company-section-select"
                    value={selectedId ?? ""}
                    onChange={(event) => {
                      setCreating(false);
                      setSelectedId(
                        event.target.value === ""
                          ? null
                          : Number(event.target.value),
                      );
                    }}
                    data-cy="select-societe"
                  >
                    {list.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <EmptyState
                  text="Aucune société configurée. Créez la première société."
                  dataCy="aucune-societe"
                />
              )}

              {creating || selected === null ? (
                <CompanyForm
                  key="new"
                  company={null}
                  onClose={() => setCreating(false)}
                  onSaved={(created) => {
                    setCreating(false);
                    if (created.id !== undefined) {
                      setSelectedId(created.id);
                      setActiveCompany(created.id);
                    }
                  }}
                />
              ) : (
                <CompanyForm key={String(selected.id)} company={selected} />
              )}
            </>
          )}
        </div>
      </section>

      {selected && !creating ? (
        <ExpenseItemsManager
          companyId={selected.id as number}
          defaultProRata={selected.proRataBase ?? "100.00"}
        />
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette société ?"
        message={
          toDelete
            ? `« ${toDelete.name ?? "Cette société"} » et sa configuration ne seront plus proposées. Une société utilisée par des données ne peut pas être supprimée.`
            : ""
        }
        confirmLabel="Supprimer la société"
        variant="danger"
        onConfirm={() => {
          if (toDelete) {
            remove.mutate(toDelete);
          }
        }}
        onCancel={() => setToDelete(null)}
        dataCy="dialogue-supprimer-societe"
      />
    </div>
  );
}
