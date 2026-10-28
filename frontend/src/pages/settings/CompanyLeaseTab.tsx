import "./CompanyLeaseTab.css";
import { KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { useLeases, usePersons, useStatements } from "@/api/queries";
import type { CompanyDto, LeaseDto } from "@/api/types";
import { LeaseForm } from "@/components/settings/LeaseForm";
import { ListSearch, ListToolbar } from "@/components/settings/ListToolbar";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { CompanyLeaseRow } from "./CompanyLeaseRow";
import { CompanyLeaseStatementModal } from "./CompanyLeaseStatementModal";
import { CompanyLeaseView } from "./CompanyLeaseView";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

/**
 * "Baux & Frais" tab: the leases owned by the company as a compact accordion
 * list. There is no active-lease notion here: the list follows the toolbar
 * sort only, and no row writes `company.leaseId`. Every row arrives collapsed;
 * only its "Afficher les frais" button expands that lease's details and postes
 * inline, switching the expansion from another row and toggling the same row
 * closed (the row itself is not clickable). While no lease is expanded the
 * company-level fallback (details and postes without a lease) stays visible.
 * The search
 * field sits in the section header next to "Ajouter un bail", while the sort
 * field, direction toggle and count remain in the shared toolbar. Each row
 * also offers "Générer la note de frais", opening the full expense-statement
 * editor scoped to that company+lease, and "Modifier le bail", opening the
 * shared LMNP LeaseForm in edit mode. Below every row its generated statements
 * are always visible, grouped by month.
 */
export function CompanyLeaseTab({
  company,
  companies,
}: {
  company: CompanyDto;
  companies: CompanyDto[];
}) {
  const { t } = useTranslation();
  const leases = useLeases();
  const persons = usePersons();
  const statements = useStatements(company.id as number, undefined, null);
  const [expandedLeaseId, setExpandedLeaseId] = useState<number | null>(null);
  const [addingLease, setAddingLease] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseDto | null>(null);
  const [statementLease, setStatementLease] = useState<LeaseDto | null>(null);

  const companyLeases = useMemo(
    () =>
      (leases.data ?? []).filter(
        (lease) => lease.companyId === (company.id as number),
      ),
    [leases.data, company.id],
  );
  const listQuery = useListQuery<LeaseDto>({
    items: companyLeases,
    searchText: (lease) =>
      [lease.propertyAddress, lease.landlordName].filter(Boolean).join(" "),
    sorts: [
      {
        value: "lease",
        compare: (left, right) =>
          (left.propertyAddress ?? "").localeCompare(
            right.propertyAddress ?? "",
            "fr",
            { sensitivity: "base" },
          ),
      },
      {
        value: "rent",
        compare: (left, right) =>
          Number(left.rentExclCharges ?? 0) -
          Number(right.rentExclCharges ?? 0),
      },
      {
        value: "charges",
        compare: (left, right) =>
          Number(left.charges ?? 0) - Number(right.charges ?? 0),
      },
    ],
    defaultSort: "lease",
  });

  function toggleLease(leaseId: number) {
    setExpandedLeaseId((current) => (current === leaseId ? null : leaseId));
  }

  return (
    <div className="company-lease-tab">
      <section className="company-lease-tab-leases">
        <SectionHeader
          icon={KeyRound}
          title={t("settings.company.leaseTab.title")}
          description={t("settings.company.leaseTab.description")}
          action={
            <div className="company-lease-tab-header-actions">
              {companyLeases.length > 0 ? (
                <div className="company-lease-tab-header-search">
                  <ListSearch
                    list="baux-societe"
                    placeholder={t(
                      "settings.company.leaseTab.filterPlaceholder",
                    )}
                    query={listQuery.query}
                    onQueryChange={listQuery.setQuery}
                  />
                </div>
              ) : null}
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
            </div>
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
            <>
              <ListToolbar
                list="baux-societe"
                placeholder={t("settings.company.leaseTab.filterPlaceholder")}
                query={listQuery.query}
                onQueryChange={listQuery.setQuery}
                sort={listQuery.sort}
                onSortChange={listQuery.setSort}
                direction={listQuery.direction}
                onToggleDirection={listQuery.toggleDirection}
                sortOptions={[
                  {
                    value: "lease",
                    label: t("settings.company.leaseTab.columns.lease"),
                  },
                  {
                    value: "rent",
                    label: t("settings.company.leaseTab.columns.rent"),
                  },
                  {
                    value: "charges",
                    label: t("settings.company.leaseTab.columns.charges"),
                  },
                ]}
                visible={listQuery.visible.length}
                total={listQuery.total}
                showSearch={false}
              />
              {listQuery.visible.length === 0 ? (
                <EmptyState
                  text={t("settings.list.noMatch", {
                    query: listQuery.query.trim(),
                  })}
                  dataCy="aucun-resultat-baux-societe"
                />
              ) : (
                <>
                  <div
                    className="company-lease-tab-headers hidden md:grid"
                    data-cy="entetes-baux-societe"
                  >
                    <span>{t("settings.company.leaseTab.columns.lease")}</span>
                    <span className="company-lease-tab-headers-amount">
                      {t("settings.company.leaseTab.columns.rent")}
                    </span>
                    <span className="company-lease-tab-headers-amount">
                      {t("settings.company.leaseTab.columns.charges")}
                    </span>
                    <span className="company-lease-tab-headers-actions">
                      {t("settings.company.leaseTab.columns.actions")}
                    </span>
                  </div>
                  <ul className="company-lease-tab-list">
                    {listQuery.visible.map((lease) => (
                      <CompanyLeaseRow
                        key={lease.id}
                        lease={lease}
                        companyId={company.id as number}
                        companyProRataBase={company.proRataBase}
                        expanded={lease.id === expandedLeaseId}
                        onToggle={() => toggleLease(lease.id as number)}
                        onEdit={() => setEditingLease(lease)}
                        onStatement={() => setStatementLease(lease)}
                        statements={statements.data}
                        statementsPending={statements.isPending}
                        statementsError={statements.isError}
                        statementsErrorValue={statements.error}
                        onRetryStatements={() => void statements.refetch()}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {!leases.isPending && expandedLeaseId === null ? (
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
