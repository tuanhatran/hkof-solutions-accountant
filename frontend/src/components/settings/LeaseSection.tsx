import "./LeaseSection.css";
import { Home, PencilLine, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "@/api/client";
import { useAllRentReceipts } from "@/api/queries";
import type { LeaseDto } from "@/api/types";
import { ListSearch } from "@/components/settings/ListToolbar";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { useListQuery } from "@/hooks/useListQuery";
import { formatEUR } from "@/lib/format";
import { LeaseForm } from "./LeaseForm";
import { LeaseReceiptHistory } from "./LeaseReceiptHistory";
import { EmptyState, SectionHeader } from "./SettingsSection";
import {
  SettingsListMobileSort,
  SettingsListSortHeader,
  type SettingsListColumn,
} from "./SettingsListSortHeader";
import type { RentReceiptSettingsController } from "./useRentReceiptSettings";

/** Leases section: address filter, list, create/update modal and delete triggers. */
export function LeaseSection({ c }: { c: RentReceiptSettingsController }) {
  const { t } = useTranslation();
  // One shared query for every row's receipt history; the lease receipt modal
  // refreshes it through the existing `rentReceiptsAll` invalidation.
  const allRentReceipts = useAllRentReceipts();
  const listQuery = useListQuery<LeaseDto>({
    items: c.leaseList,
    searchText: (lease) =>
      [
        lease.landlordName,
        lease.tenantName,
        lease.propertyAddress,
        lease.companyName,
      ]
        .filter(Boolean)
        .join(" "),
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
        value: "company",
        compare: (left, right) =>
          (left.companyName ?? "").localeCompare(
            right.companyName ?? "",
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
      {
        value: "total",
        compare: (left, right) =>
          Number(left.rentExclCharges ?? 0) +
          Number(left.charges ?? 0) -
          (Number(right.rentExclCharges ?? 0) + Number(right.charges ?? 0)),
      },
    ],
    defaultSort: "lease",
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
      key: "lease",
      label: t("settings.lease.section.columns.lease"),
      dataCy: "sort-leases-lease",
    },
    {
      key: "company",
      label: t("settings.lease.section.columns.company"),
      dataCy: "sort-leases-company",
    },
    {
      key: "rent",
      label: t("settings.lease.section.columns.rent"),
      dataCy: "sort-leases-rent",
      numeric: true,
    },
    {
      key: "charges",
      label: t("settings.lease.section.columns.charges"),
      dataCy: "sort-leases-charges",
      numeric: true,
    },
    {
      key: "total",
      label: t("settings.lease.section.columns.total"),
      dataCy: "sort-leases-total",
      numeric: true,
    },
  ];

  return (
    <section className="card lease-section">
      <SectionHeader
        icon={Home}
        title={t("settings.lease.section.title")}
        description={t("settings.lease.section.description")}
        action={
          <div className="lease-section-header-actions">
            <Button
              variant="primary"
              icon={<Plus size={14} />}
              onClick={() => c.setLeaseForm("new")}
              disabled={c.leaseForm === "new"}
              data-cy="btn-add-lease"
            >
              {t("settings.lease.section.add")}
            </Button>
            <select
              className="field mt-0 lease-section-address-select"
              value={c.activeAddressId ?? ""}
              onChange={(event) =>
                c.selectAddress(
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
              disabled={c.addressList.length === 0}
              aria-label={t("settings.lease.section.addressLabel")}
              data-cy="select-rent-receipts-address"
            >
              {c.addressList.length === 0 ? (
                <option value="">
                  {c.addresses.isPending
                    ? t("settings.lease.section.loadingAddresses")
                    : t("settings.lease.section.noAddress")}
                </option>
              ) : null}
              {c.addressList.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label}
                </option>
              ))}
            </select>
            {c.leaseList.length > 0 ? (
              <>
                <div className="lease-section-header-search">
                  <ListSearch
                    list="leases"
                    placeholder={t("settings.lease.section.filterPlaceholder")}
                    query={listQuery.query}
                    onQueryChange={listQuery.setQuery}
                  />
                </div>
                <span
                  className="lease-section-count"
                  aria-live="polite"
                  data-cy="filter-count-leases"
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
                  selectDataCy="sort-leases-compact"
                  directionDataCy="sort-leases-compact-direction"
                />
              </>
            ) : null}
          </div>
        }
      />
      <div className="card-body lease-section-body">
        {c.leaseForm !== null ? (
          <LeaseForm
            key={c.leaseForm === "new" ? "new" : c.leaseForm.id}
            item={c.leaseForm === "new" ? null : c.leaseForm}
            landlords={c.landlordList}
            tenants={c.tenantList}
            companies={c.companyList}
            onSaved={c.handleLeaseSaved}
            onClose={() => c.setLeaseForm(null)}
          />
        ) : null}

        {c.leases.isError ? (
          <ErrorState
            message={errorMessage(c.leases.error)}
            onRetry={() => void c.leases.refetch()}
          />
        ) : c.leases.isPending ? (
          <LoadingState message={t("settings.lease.section.loading")} />
        ) : c.leaseList.length === 0 ? (
          <EmptyState
            text={t("settings.lease.section.empty")}
            dataCy="no-lease"
          />
        ) : (
          <>
            {listQuery.visible.length === 0 ? (
              <EmptyState
                text={t("settings.list.noMatch", {
                  query: listQuery.query.trim(),
                })}
                dataCy="no-results-leases"
              />
            ) : (
              <>
                <div className="lease-section-table" role="table">
                  <SettingsListSortHeader
                    columns={columns}
                    sort={listQuery.sort}
                    direction={listQuery.direction}
                    onSort={sortBy}
                    actionsLabel={t("settings.lease.section.columns.actions")}
                    dataCy="leases-headers"
                    className="lease-section-headers"
                  />
                  <ul className="lease-section-list">
                    {listQuery.visible.map((lease) => (
                      <li
                        key={lease.id}
                        className="lease-section-item"
                        data-cy={`lease-${lease.id}`}
                      >
                        <div className="lease-section-cell lease-section-cell-title">
                          <p className="lease-section-item-title">
                            {lease.landlordName} → {lease.tenantName}
                          </p>
                          <p className="lease-section-item-address">
                            {lease.propertyAddress}
                          </p>
                        </div>
                        <p
                          className="lease-section-cell lease-section-cell-company"
                          data-cy={`company-lease-${lease.id}`}
                        >
                          {lease.companyName ??
                            t("settings.lease.section.noCompany")}
                          {lease.companySiren ? (
                            <span className="lease-section-cell-company-siren">
                              SIREN {lease.companySiren}
                            </span>
                          ) : null}
                        </p>
                        <span className="lease-section-cell lease-section-cell-rent text-right">
                          {formatEUR(lease.rentExclCharges ?? "0.00")}
                        </span>
                        <span className="lease-section-cell lease-section-cell-charges text-right">
                          {formatEUR(lease.charges ?? "0.00")}
                        </span>
                        <span
                          className="lease-section-cell lease-section-cell-total lease-section-item-total text-right"
                          data-cy={`lease-total-${lease.id}`}
                        >
                          {formatEUR(
                            Number(lease.rentExclCharges ?? 0) +
                              Number(lease.charges ?? 0),
                          )}
                        </span>
                        <div className="lease-section-cell lease-section-cell-actions">
                          <Button
                            variant="ghost"
                            small
                            icon={<PencilLine size={13} />}
                            onClick={() => c.setLeaseForm(lease)}
                            aria-label={t("settings.lease.section.editAria", {
                              id: lease.id,
                            })}
                            data-cy={`btn-edit-lease-${lease.id}`}
                          >
                            {t("settings.lease.section.edit")}
                          </Button>
                          <Button
                            variant="ghost"
                            small
                            icon={<Trash2 size={13} />}
                            className="text-danger hover:bg-danger-soft"
                            onClick={() => c.setLeaseToDelete(lease)}
                            aria-label={t("settings.lease.section.removeAria", {
                              id: lease.id,
                            })}
                            data-cy={`btn-delete-lease-${lease.id}`}
                          >
                            {t("settings.lease.section.remove")}
                          </Button>
                        </div>
                        <LeaseReceiptHistory
                          lease={lease}
                          receipts={allRentReceipts.data}
                          isPending={allRentReceipts.isPending}
                          isError={allRentReceipts.isError}
                          error={allRentReceipts.error}
                          onRetry={() => void allRentReceipts.refetch()}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={c.leaseToDelete !== null}
        title={t("settings.lease.section.deleteDialog.title")}
        message={
          c.leaseToDelete
            ? t("settings.lease.section.deleteDialog.message", {
                tenant:
                  c.leaseToDelete.tenantName ??
                  t("settings.lease.section.deleteDialog.fallbackTenant"),
              })
            : ""
        }
        confirmLabel={t("settings.lease.section.deleteDialog.confirm")}
        variant="danger"
        onConfirm={() => {
          if (c.leaseToDelete) {
            c.removeLease.mutate(c.leaseToDelete);
          }
        }}
        onCancel={() => c.setLeaseToDelete(null)}
        dataCy="dialog-delete-lease"
      />
    </section>
  );
}
