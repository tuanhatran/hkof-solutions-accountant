import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { EmployeeDto } from "@/api/types";
import { Button } from "@/components/ui/Button";
import type { ListSort, SortDirection } from "@/hooks/useListQuery";
import { cn } from "@/lib/cn";
import { employeeTitleLabel } from "./settingsValues";

export const SORT_COLUMNS = [
  {
    key: "name",
    labelKey: "settings.employees.columns.employee",
    dataCy: "sort-employees-name",
    numeric: false,
  },
  {
    key: "title",
    labelKey: "settings.employees.columns.title",
    dataCy: "sort-employees-title",
    numeric: false,
  },
  {
    key: "contact",
    labelKey: "settings.employees.columns.contact",
    dataCy: "sort-employees-contact",
    numeric: false,
  },
  {
    key: "signatures",
    labelKey: "settings.employees.columns.signatures",
    dataCy: "sort-employees-signatures",
    numeric: true,
  },
] as const;

/** Client-side comparators of the employee table, in display order. */
export function createEmployeeSorts(t: TFunction): ListSort<EmployeeDto>[] {
  return [
    {
      value: "name",
      compare: (left, right) =>
        `${left.firstName ?? ""} ${left.lastName ?? ""}`.localeCompare(
          `${right.firstName ?? ""} ${right.lastName ?? ""}`,
          "fr",
          { sensitivity: "base" },
        ),
    },
    {
      value: "title",
      compare: (left, right) =>
        employeeTitleLabel(left.title, t).localeCompare(
          employeeTitleLabel(right.title, t),
          "fr",
        ),
    },
    {
      value: "contact",
      compare: (left, right) =>
        (left.email ?? "").localeCompare(right.email ?? "", "fr", {
          sensitivity: "base",
        }) ||
        (left.address ?? "").localeCompare(right.address ?? "", "fr", {
          sensitivity: "base",
        }),
    },
    {
      value: "signatures",
      compare: (left, right) =>
        (left.signatureCount ?? 0) - (right.signatureCount ?? 0),
    },
  ];
}

/** Sortable column headers of the employee table, with `aria-sort`. */
export function EmployeeSortHeader({
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
      className="employee-section-headers hidden md:grid"
      role="row"
      data-cy="employees-headers"
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
              column.numeric === true && "employee-section-headers-signatures",
            )}
          >
            <button
              type="button"
              className={cn(
                "employee-section-sort",
                column.numeric === true && "employee-section-sort-amount",
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
      <div role="columnheader" className="employee-section-headers-actions">
        {t("settings.employees.columns.actions")}
      </div>
    </div>
  );
}

/** Compact sort control that keeps sorting reachable below `md`. */
export function EmployeeMobileSort({
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
    <div className="employee-section-mobile-sort md:hidden">
      <select
        className="field mt-0 w-full sm:w-auto"
        value={sort}
        onChange={(event) => onSort(event.target.value)}
        aria-label={t("settings.list.sortLabel")}
        data-cy="sort-employees-compact"
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
        className="employee-section-mobile-sort-direction"
        icon={ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        aria-label={
          ascending
            ? t("settings.list.ascending")
            : t("settings.list.descending")
        }
        onClick={onToggleDirection}
        data-cy="sort-employees-compact-direction"
      />
    </div>
  );
}
