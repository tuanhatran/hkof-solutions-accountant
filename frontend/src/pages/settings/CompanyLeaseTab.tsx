import "./CompanyLeaseTab.css";
import { KeyRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import {
  useLeaseExpenseItemPresence,
  useLeases,
  usePersons,
} from "@/api/queries";
import type { CompanyDto, LeaseDto } from "@/api/types";
import { LeaseForm } from "@/components/settings/LeaseForm";
import { ListSearch } from "@/components/settings/ListToolbar";
import {
  EmptyState,
  SectionHeader,
} from "@/components/settings/SettingsSection";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { CompanyLeaseExpensesModal } from "./CompanyLeaseExpensesModal";
import { CompanyLeaseRow } from "./CompanyLeaseRow";
import {
  CompanyLeaseMobileSort,
  CompanyLeaseSortHeader,
} from "./CompanyLeaseSortHeader";

/**
 * "Baux & Frais" tab: the leases owned by the company as a five-column grid
 * (address, landlord, rent, charges, actions). There is no active-lease notion
 * here: sorting lives in the column headers (with a compact mobile control),
 * no row writes `company.leaseId`, and every row stays inert. "Modifier les
 * frais" opens the scoped expenses dialog and "Modifier le bail" the unchanged
 * LMNP LeaseForm.
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
  const [addingLease, setAddingLease] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseDto | null>(null);
  const [expensesLease, setExpensesLease] = useState<LeaseDto | null>(null);

  const companyLeases = useMemo(
    () =>
      (leases.data ?? []).filter(
        (lease) => lease.companyId === (company.id as number),
      ),
    [leases.data, company.id],
  );
  const leaseIds = useMemo(
    () => companyLeases.map((lease) => lease.id as number),
    [companyLeases],
  );
  const expensePresence = useLeaseExpenseItemPresence(
    company.id as number,
    leaseIds,
  );

  const listQuery = useListQuery<LeaseDto>({
    items: companyLeases,
    searchText: (lease) =>
      [lease.propertyAddress, lease.landlordName].filter(Boolean).join(" "),
    sorts: [
      {
        value: "address",
        compare: (left, right) =>
          (left.propertyAddress ?? "").localeCompare(
            right.propertyAddress ?? "",
            "fr",
            { sensitivity: "base" },
          ),
      },
      {
        value: "landlord",
        compare: (left, right) =>
          (left.landlordName ?? "").localeCompare(
            right.landlordName ?? "",
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
    defaultSort: "address",
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
                <>
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
                  <span
                    className="company-lease-tab-count"
                    aria-live="polite"
                    data-cy="filtre-compteur-baux-societe"
                  >
                    {t("settings.list.count", {
                      visible: listQuery.visible.length,
                      total: listQuery.total,
                    })}
                  </span>
                  <CompanyLeaseMobileSort
                    sort={listQuery.sort}
                    direction={listQuery.direction}
                    onSort={sortBy}
                    onToggleDirection={listQuery.toggleDirection}
                  />
                </>
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
              {listQuery.visible.length === 0 ? (
                <EmptyState
                  text={t("settings.list.noMatch", {
                    query: listQuery.query.trim(),
                  })}
                  dataCy="aucun-resultat-baux-societe"
                />
              ) : (
                <div className="company-lease-tab-table">
                  <CompanyLeaseSortHeader
                    sort={listQuery.sort}
                    direction={listQuery.direction}
                    onSort={sortBy}
                  />
                  <ul className="company-lease-tab-list">
                    {listQuery.visible.map((lease) => (
                      <CompanyLeaseRow
                        key={lease.id}
                        lease={lease}
                        showAddExpenses={
                          expensePresence.get(lease.id as number) === false
                        }
                        onEdit={() => setEditingLease(lease)}
                        onExpenses={() => setExpensesLease(lease)}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>

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
      {expensesLease ? (
        <CompanyLeaseExpensesModal
          company={company}
          lease={expensesLease}
          onClose={() => setExpensesLease(null)}
        />
      ) : null}
    </div>
  );
}
