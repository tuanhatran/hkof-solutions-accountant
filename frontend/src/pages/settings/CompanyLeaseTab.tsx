import "./CompanyLeaseTab.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useLeases, usePersons } from "@/api/queries";
import type { CompanyDto, CompanyRequest } from "@/api/types";
import { LeaseForm } from "@/components/settings/LeaseForm";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { cn } from "@/lib/cn";
import { formatEUR } from "@/lib/format";
import { toast } from "@/state/toasts";
import { CompanyLeaseView } from "./CompanyLeaseView";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

/**
 * "Bail & Frais" tab: the leases owned by the company, a dropdown selecting the
 * active lease (which leases' postes are listed and which lease new postes and
 * notes are keyed to), and the shared LMNP LeaseForm for adding a lease.
 * Switching the active lease is persisted through `PUT /api/companies/{id}`:
 * the backend stores it and answers the authoritative pro-rata.
 */
export function CompanyLeaseTab({
  company,
  companies,
}: {
  company: CompanyDto;
  companies: CompanyDto[];
}) {
  const queryClient = useQueryClient();
  const leases = useLeases();
  const persons = usePersons();
  const [selectedLeaseId, setSelectedLeaseId] = useState<number | null>(
    company.leaseId ?? null,
  );
  const [addingLease, setAddingLease] = useState(false);

  const linkLease = useMutation({
    mutationFn: (leaseId: number | null) => {
      const requestBody: CompanyRequest = {
        name: company.name ?? "",
        legalForm: company.legalForm ?? "",
        siren: company.siren ?? "",
        address: company.address ?? "",
        managerName: company.managerName ?? "",
        issuePlace: company.issuePlace ?? "",
        leaseId,
      };
      return api.companies.update(company.id as number, requestBody);
    },
    onSuccess: (payload) => {
      setSelectedLeaseId(payload.leaseId ?? null);
      if (payload.id !== undefined) {
        queryClient.setQueryData(queryKeys.company(payload.id), payload);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.companiesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.leases });
    },
    onError: (error) => {
      setSelectedLeaseId(company.leaseId ?? null);
      toast.error(errorMessage(error));
    },
  });

  const companyLeases = useMemo(
    () =>
      (leases.data ?? []).filter(
        (lease) => lease.companyId === (company.id as number),
      ),
    [leases.data, company.id],
  );
  const selectedLease =
    companyLeases.find((lease) => lease.id === selectedLeaseId) ?? null;

  return (
    <div className="company-lease-tab">
      <section className="card company-lease-tab-leases">
        <SectionHeader
          icon={KeyRound}
          title="Baux de la société"
          description="Une société peut être locataire de plusieurs baux. Sélectionnez le bail actif : postes et notes de frais suivent ce bail."
          action={
            <Button
              variant="primary"
              small
              icon={<Plus size={14} />}
              onClick={() => setAddingLease(true)}
              disabled={addingLease}
              data-cy="btn-ajouter-bail-societe"
            >
              Ajouter un bail
            </Button>
          }
        />
        <div className="card-body company-lease-tab-body">
          <div className="company-lease-tab-selector">
            <label
              htmlFor="bail-actif-societe"
              className="company-lease-tab-selector-label"
            >
              Bail sélectionné
            </label>
            <select
              id="bail-actif-societe"
              className="field company-lease-tab-select"
              value={selectedLeaseId === null ? "" : String(selectedLeaseId)}
              onChange={(event) => {
                const value =
                  event.target.value === "" ? null : Number(event.target.value);
                setSelectedLeaseId(value);
                linkLease.mutate(value);
              }}
              disabled={linkLease.isPending}
              data-cy="select-bail-actif"
            >
              <option value="">Aucun bail</option>
              {companyLeases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.propertyAddress ?? "Bail sans adresse"}
                </option>
              ))}
            </select>
          </div>

          {leases.isError ? (
            <ErrorState
              message={errorMessage(leases.error)}
              onRetry={() => void leases.refetch()}
            />
          ) : leases.isPending ? (
            <LoadingState message="Chargement des baux…" />
          ) : companyLeases.length === 0 ? (
            <EmptyState
              text="Aucun bail pour cette société. Ajoutez le premier bail avec « Ajouter un bail »."
              dataCy="liste-baux-societe-vide"
            />
          ) : (
            <ul className="company-lease-tab-list">
              {companyLeases.map((lease) => (
                <li
                  key={lease.id}
                  className={cn(
                    "company-lease-tab-item",
                    lease.id === selectedLeaseId &&
                      "company-lease-tab-item-selected",
                  )}
                  data-cy={`bail-societe-${lease.id}`}
                >
                  <div className="company-lease-tab-item-main">
                    <p className="company-lease-tab-item-address">
                      {lease.propertyAddress ?? "Bail sans adresse"}
                    </p>
                    <p className="company-lease-tab-item-meta">
                      Bailleur {lease.landlordName ?? "—"} · Loyer{" "}
                      {formatEUR(lease.rentExclCharges ?? "0.00")} · Charges{" "}
                      {formatEUR(lease.charges ?? "0.00")}
                    </p>
                  </div>
                  {lease.id === selectedLeaseId ? (
                    <span className="badge badge-accent">Bail actif</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <CompanyLeaseView
        lease={selectedLease}
        proRataBase={selectedLease?.proRataBase ?? null}
      />

      <ExpenseItemsManager
        companyId={company.id as number}
        leaseId={selectedLeaseId}
        defaultProRata={
          selectedLease?.proRataBase ?? company.proRataBase ?? "100.00"
        }
      />

      {addingLease ? (
        <LeaseForm
          key="new-company-lease"
          item={null}
          persons={persons.data ?? []}
          companies={companies}
          presetCompanyId={company.id as number}
          onClose={() => setAddingLease(false)}
        />
      ) : null}
    </div>
  );
}
