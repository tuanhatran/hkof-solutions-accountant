import "./CompanyLeaseTab.css";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, KeyRound, PencilLine, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { api } from "@/api/endpoints";
import { queryKeys, useLeases, usePersons, useStatements } from "@/api/queries";
import type { CompanyDto, CompanyRequest, LeaseDto } from "@/api/types";
import { CompanyLeaseStatementHistory } from "@/components/settings/CompanyLeaseStatementHistory";
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
import { CompanyLeaseStatementModal } from "./CompanyLeaseStatementModal";
import { CompanyLeaseView } from "./CompanyLeaseView";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

/**
 * "Baux & Frais" tab: the leases owned by the company as a compact accordion
 * list. Every row arrives collapsed, including the active lease, and the
 * active lease is listed first. Clicking a collapsed row selects it as bail
 * actif (persisted through `PUT /api/companies/{id}` only when it was not
 * already active; the backend answers the authoritative pro-rata) and expands
 * its details and postes inline; clicking the expanded row collapses it and
 * keeps it active. Each item also offers a "Modifier" button opening the
 * shared LMNP LeaseForm in edit mode, without touching selection or
 * expansion, and a "Note de frais" button opening the full expense-statement
 * editor scoped to that company+lease. Below every row its generated
 * statements are always visible, grouped by month.
 */
export function CompanyLeaseTab({
  company,
  companies,
}: {
  company: CompanyDto;
  companies: CompanyDto[];
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const leases = useLeases();
  const persons = usePersons();
  const statements = useStatements(company.id as number, undefined, null);
  const [selectedLeaseId, setSelectedLeaseId] = useState<number | null>(
    company.leaseId ?? null,
  );
  const [expandedLeaseId, setExpandedLeaseId] = useState<number | null>(null);
  const [addingLease, setAddingLease] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseDto | null>(null);
  const [statementLease, setStatementLease] = useState<LeaseDto | null>(null);

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
      setExpandedLeaseId(null);
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
  const orderedLeases = useMemo(() => {
    const active = companyLeases.filter(
      (lease) => lease.id === selectedLeaseId,
    );
    const others = companyLeases.filter(
      (lease) => lease.id !== selectedLeaseId,
    );
    return [...active, ...others];
  }, [companyLeases, selectedLeaseId]);
  const selectedLease =
    companyLeases.find((lease) => lease.id === selectedLeaseId) ?? null;

  function toggleLease(leaseId: number) {
    if (leaseId === expandedLeaseId) {
      setExpandedLeaseId(null);
      return;
    }
    setExpandedLeaseId(leaseId);
    if (leaseId !== selectedLeaseId) {
      setSelectedLeaseId(leaseId);
      linkLease.mutate(leaseId);
    }
  }

  return (
    <div className="company-lease-tab">
      <section className="company-lease-tab-leases">
        <SectionHeader
          icon={KeyRound}
          title={t("settings.company.leaseTab.title")}
          description={t("settings.company.leaseTab.description")}
          action={
            <Button
              variant="primary"
              small
              icon={<Plus size={14} />}
              onClick={() => setAddingLease(true)}
              disabled={addingLease}
              data-cy="btn-ajouter-bail-societe"
            >
              {t("settings.company.leaseTab.add")}
            </Button>
          }
        />
        <div className="card-body company-lease-tab-body">
          {leases.isError ? (
            <ErrorState
              message={errorMessage(leases.error)}
              onRetry={() => void leases.refetch()}
            />
          ) : leases.isPending ? (
            <LoadingState message={t("settings.company.leaseTab.loading")} />
          ) : companyLeases.length === 0 ? (
            <EmptyState
              text={t("settings.company.leaseTab.empty")}
              dataCy="liste-baux-societe-vide"
            />
          ) : (
            <ul className="company-lease-tab-list">
              {orderedLeases.map((lease) => {
                const selected = lease.id === selectedLeaseId;
                const expanded = lease.id === expandedLeaseId;
                return (
                  <li key={lease.id} className="company-lease-tab-list-item">
                    <div
                      className={cn(
                        "company-lease-tab-item",
                        selected && "company-lease-tab-item-selected",
                      )}
                    >
                      <button
                        type="button"
                        className="company-lease-tab-item-toggle"
                        onClick={() => toggleLease(lease.id as number)}
                        aria-expanded={expanded}
                        disabled={linkLease.isPending}
                        data-cy={`bail-societe-${lease.id}`}
                      >
                        <span className="company-lease-tab-item-main">
                          <span className="company-lease-tab-item-address">
                            {lease.propertyAddress ??
                              t("settings.company.leaseTab.addressFallback")}
                          </span>
                          <span className="company-lease-tab-item-meta">
                            {t("settings.company.leaseTab.meta", {
                              landlord: lease.landlordName ?? "—",
                              rent: formatEUR(lease.rentExclCharges ?? "0.00"),
                              charges: formatEUR(lease.charges ?? "0.00"),
                            })}
                          </span>
                        </span>
                        {selected ? (
                          <span className="badge badge-accent">
                            {t("settings.company.leaseTab.activeBadge")}
                          </span>
                        ) : null}
                      </button>
                      <Button
                        variant="ghost"
                        small
                        icon={<FileText size={13} />}
                        onClick={() => setStatementLease(lease)}
                        data-cy={`btn-note-frais-bail-societe-${lease.id}`}
                      >
                        {t("settings.company.leaseTab.statement")}
                      </Button>
                      <Button
                        variant="ghost"
                        small
                        icon={<PencilLine size={13} />}
                        onClick={() => setEditingLease(lease)}
                        data-cy={`btn-modifier-bail-societe-${lease.id}`}
                      >
                        {t("settings.company.leaseTab.edit")}
                      </Button>
                    </div>
                    <CompanyLeaseStatementHistory
                      lease={lease}
                      statements={statements.data}
                      isPending={statements.isPending}
                      isError={statements.isError}
                      error={statements.error}
                      onRetry={() => void statements.refetch()}
                    />
                    {expanded ? (
                      <div className="company-lease-tab-item-expanded">
                        <CompanyLeaseView
                          lease={lease}
                          proRataBase={lease.proRataBase ?? null}
                        />
                        <ExpenseItemsManager
                          companyId={company.id as number}
                          leaseId={lease.id as number}
                          defaultProRata={
                            lease.proRataBase ?? company.proRataBase ?? "100.00"
                          }
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {!leases.isPending && selectedLease === null ? (
        <>
          <section className="company-lease-tab-none">
            <div className="card-body">
              <CompanyLeaseView lease={null} proRataBase={null} />
            </div>
          </section>
          <ExpenseItemsManager
            companyId={company.id as number}
            leaseId={null}
            defaultProRata={company.proRataBase ?? "100.00"}
          />
        </>
      ) : null}

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
      {editingLease ? (
        <LeaseForm
          key={`edit-company-lease-${editingLease.id}`}
          item={editingLease}
          persons={persons.data ?? []}
          companies={companies}
          onClose={() => setEditingLease(null)}
        />
      ) : null}
      {statementLease ? (
        <CompanyLeaseStatementModal
          key={`note-frais-bail-${statementLease.id}`}
          lease={statementLease}
          companyId={company.id as number}
          onClose={() => setStatementLease(null)}
        />
      ) : null}
    </div>
  );
}
