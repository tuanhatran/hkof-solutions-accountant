import "./CompanyLeaseTab.css";
import { KeyRound, Plus, ReceiptText } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { useLeases, usePersons } from "@/api/queries";
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
import { CompanyLeaseExpensesModal } from "./CompanyLeaseExpensesModal";
import { CompanyLeaseRow } from "./CompanyLeaseRow";

/**
 * "Baux & Frais" tab: the leases owned by the company as a five-column grid
 * (address, landlord, rent, charges, actions). There is no active-lease notion
 * here: the list follows the toolbar sort only, no row writes
 * `company.leaseId`, and every row stays inert. "Modifier les frais" opens the
 * scoped expenses dialog, "Frais généraux" the company-level one, and
 * "Modifier le bail" the unchanged LMNP LeaseForm.
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
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [expensesLease, setExpensesLease] = useState<LeaseDto | null>(null);

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

  function openExpenses(lease: LeaseDto | null) {
    setExpensesLease(lease);
    setExpensesOpen(true);
  }

  function closeExpenses() {
    setExpensesOpen(false);
    setExpensesLease(null);
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
                variant="secondary"
                small
                icon={<ReceiptText size={14} />}
                onClick={() => openExpenses(null)}
                data-cy="btn-frais-generaux-societe"
              >
                {t("settings.company.leaseTab.generalExpenses")}
              </Button>
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
                    label: t("settings.company.leaseTab.columns.address"),
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
                    <span>
                      {t("settings.company.leaseTab.columns.address")}
                    </span>
                    <span>
                      {t("settings.company.leaseTab.columns.landlord")}
                    </span>
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
                        onEdit={() => setEditingLease(lease)}
                        onExpenses={() => openExpenses(lease)}
                      />
                    ))}
                  </ul>
                </>
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
      {expensesOpen ? (
        <CompanyLeaseExpensesModal
          company={company}
          lease={expensesLease}
          onClose={closeExpenses}
        />
      ) : null}
    </div>
  );
}
