import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { SortDirection } from "@/hooks/useListQuery";
import { cn } from "@/lib/cn";

export const SORT_COLUMNS = [
  {
    key: "address",
    labelKey: "settings.company.leaseTab.columns.address",
    dataCy: "sort-company-leases-address",
    numeric: false,
  },
  {
    key: "landlord",
    labelKey: "settings.company.leaseTab.columns.landlord",
    dataCy: "sort-company-leases-landlord",
    numeric: false,
  },
  {
    key: "rent",
    labelKey: "settings.company.leaseTab.columns.rent",
    dataCy: "sort-company-leases-rent",
    numeric: true,
  },
  {
    key: "charges",
    labelKey: "settings.company.leaseTab.columns.charges",
    dataCy: "sort-company-leases-charges",
    numeric: true,
  },
] as const;

/** Sortable column headers of the company lease grid, with `aria-sort`. */
export function CompanyLeaseSortHeader({
  sort,
  direction,
  onSort,
}: {
  sort: string;
  direction: SortDirection;
  onSort: (column: string) => void;
}) {
  const { t } = useTranslation();
  const ascending = direction === "asc";

  return (
    <div
      className="company-lease-tab-headers hidden md:grid"
      role="row"
      data-cy="company-leases-headers"
    >
      {SORT_COLUMNS.map((column) => {
        const active = sort === column.key;
        return (
          <div
            key={column.key}
            role="columnheader"
            aria-sort={
              active ? (ascending ? "ascending" : "descending") : "none"
            }
            className={cn(
              column.numeric === true && "company-lease-tab-headers-amount",
            )}
          >
            <button
              type="button"
              className={cn(
                "company-lease-tab-sort",
                column.numeric === true && "company-lease-tab-sort-amount",
              )}
              onClick={() => onSort(column.key)}
              data-cy={column.dataCy}
            >
              <span>{t(column.labelKey)}</span>
              {active ? (
                ascending ? (
                  <ArrowUp size={13} aria-hidden="true" />
                ) : (
                  <ArrowDown size={13} aria-hidden="true" />
                )
              ) : (
                <ArrowUpDown size={13} aria-hidden="true" />
              )}
            </button>
          </div>
        );
      })}
      <div role="columnheader" className="company-lease-tab-headers-actions">
        {t("settings.company.leaseTab.columns.actions")}
      </div>
    </div>
  );
}

/** Compact sort control that keeps sorting reachable below `md`. */
export function CompanyLeaseMobileSort({
  sort,
  direction,
  onSort,
  onToggleDirection,
}: {
  sort: string;
  direction: SortDirection;
  onSort: (column: string) => void;
  onToggleDirection: () => void;
}) {
  const { t } = useTranslation();
  const ascending = direction === "asc";

  return (
    <div className="company-lease-tab-mobile-sort md:hidden">
      <select
        className="field mt-0 w-full sm:w-auto"
        value={sort}
        onChange={(event) => onSort(event.target.value)}
        aria-label={t("settings.list.sortLabel")}
        data-cy="sort-company-leases-compact"
      >
        {SORT_COLUMNS.map((column) => (
          <option key={column.key} value={column.key}>
            {t(column.labelKey)}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        small
        className="company-lease-tab-mobile-sort-direction"
        icon={ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        aria-label={
          ascending
            ? t("settings.list.ascending")
            : t("settings.list.descending")
        }
        onClick={onToggleDirection}
        data-cy="sort-company-leases-compact-direction"
      />
    </div>
  );
}
