import "./CompanySection.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useCompanies, useLeases } from "@/api/queries";
import type { CompanyDto } from "@/api/types";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ViewTabs, type ViewTab } from "@/components/ui/ViewTabs";
import { useCompanyStore } from "@/state/company";
import { toast } from "@/state/toasts";
import { CompanyIdentityModal } from "./CompanyIdentityModal";
import { CompanyIdentityView } from "./CompanyIdentityView";
import { CompanyLeaseModal } from "./CompanyLeaseModal";
import { CompanyLeaseView } from "./CompanyLeaseView";
import { EmployeeSection } from "./EmployeeSection";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

const TABS: ViewTab[] = [
  {
    value: "identification",
    label: "Info générale",
    dataCy: "onglet-entreprise-identification",
  },
  {
    value: "bail-frais",
    label: "Bail & Frais",
    dataCy: "onglet-entreprise-bail-frais",
  },
  {
    value: "salaries",
    label: "Salariés",
    dataCy: "onglet-entreprise-salaries",
  },
];

/** Company directory: selector plus three tabs with modal-based editing. */
export function CompanySection() {
  const queryClient = useQueryClient();
  const companies = useCompanies();
  const leases = useLeases();
  const activeCompanyId = useCompanyStore((state) => state.activeCompanyId);
  const setActiveCompany = useCompanyStore((state) => state.setActiveCompany);
  const [selectedId, setSelectedId] = useState<number | null>(activeCompanyId);
  const [tab, setTab] = useState("identification");
  const [identityTarget, setIdentityTarget] = useState<
    CompanyDto | "new" | null
  >(null);
  const [leaseEditing, setLeaseEditing] = useState(false);
  const [toDelete, setToDelete] = useState<CompanyDto | null>(null);

  const list = useMemo(() => companies.data ?? [], [companies.data]);
  useEffect(() => {
    if (
      selectedId === null ||
      !list.some((company) => company.id === selectedId)
    ) {
      setSelectedId(list[0]?.id ?? null);
    }
  }, [companies.data, list, selectedId]);
  useEffect(() => {
    setTab("identification");
  }, [selectedId]);

  const selected = list.find((company) => company.id === selectedId) ?? null;
  const leaseList = useMemo(() => leases.data ?? [], [leases.data]);
  const selectedLease =
    selected?.leaseId === undefined || selected?.leaseId === null
      ? null
      : (leaseList.find((lease) => lease.id === selected.leaseId) ?? null);

  const closeModals = () => {
    setIdentityTarget(null);
    setLeaseEditing(false);
  };

  const remove = useMutation({
    mutationFn: (company: CompanyDto) =>
      api.companies.delete(company.id as number),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.expenseItemsAll,
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.employeesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.signaturesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
      closeModals();
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
          description="Chaque société possède son identité, son bail, ses salariés, ses postes de frais et ses notes de frais."
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
                onClick={() => setIdentityTarget("new")}
                disabled={identityTarget !== null}
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
                      closeModals();
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
              <ViewTabs
                ariaLabel="Sections de l’entreprise"
                tabs={TABS}
                active={tab}
                onChange={setTab}
              />
            </>
          )}
        </div>
      </section>

      <div role="tabpanel" className="company-section-tabpanel">
        {selected && tab === "identification" ? (
          <CompanyIdentityView
            company={selected}
            onEdit={() => setIdentityTarget(selected)}
          />
        ) : null}
        {selected && tab === "bail-frais" ? (
          <>
            <CompanyLeaseView
              lease={selectedLease}
              proRataBase={selected.proRataBase ?? null}
              onEdit={() => setLeaseEditing(true)}
            />
            <ExpenseItemsManager
              companyId={selected.id as number}
              defaultProRata={selected.proRataBase ?? "100.00"}
            />
          </>
        ) : null}
        {selected && tab === "salaries" ? (
          <EmployeeSection companyId={selected.id as number} />
        ) : null}
      </div>

      {identityTarget !== null ? (
        <CompanyIdentityModal
          key={
            identityTarget === "new"
              ? "new"
              : String(identityTarget.id ?? "unknown")
          }
          open
          company={identityTarget === "new" ? null : identityTarget}
          onClose={() => setIdentityTarget(null)}
          onSaved={(saved) => {
            const wasNew = identityTarget === "new";
            setIdentityTarget(null);
            if (wasNew && saved.id !== undefined) {
              setSelectedId(saved.id);
              setActiveCompany(saved.id);
            }
          }}
        />
      ) : null}

      {leaseEditing && selected ? (
        <CompanyLeaseModal
          key={String(selected.id)}
          open
          company={selected}
          leases={leaseList}
          onClose={() => setLeaseEditing(false)}
          onSaved={() => setLeaseEditing(false)}
        />
      ) : null}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette société ?"
        message={
          toDelete
            ? `« ${toDelete.name ?? "Cette société"} » et ses salariés seront supprimés. Ses baux seront détachés, sans être supprimés. Une société utilisée par des notes de frais ou des quittances ne peut pas être supprimée.`
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
