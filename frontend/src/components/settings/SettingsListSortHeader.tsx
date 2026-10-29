import "./SettingsListSortHeader.css";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { SortDirection } from "@/hooks/useListQuery";
import { cn } from "@/lib/cn";

export interface SettingsListColumn {
  key: string;
  label: string;
  dataCy: string;
  numeric?: boolean;
}

interface SettingsListSortHeaderProps {
  columns: readonly SettingsListColumn[];
  sort: string;
  direction: SortDirection;
  onSort: (column: string) => void;
  actionsLabel: string;
  dataCy: string;
  /** List-specific class carrying the `grid-cols-*` template. */
  className: string;
}

/**
 * Sortable column headers of a settings list, with `aria-sort` and the same
 * compact look as the Company "Baux & Frais" and Employee tables.
 */
export function SettingsListSortHeader({
  columns,
  sort,
  direction,
  onSort,
  actionsLabel,
  dataCy,
  className,
}: SettingsListSortHeaderProps) {
  const ascending = direction === "asc";

  return (
    <div
      className={cn("settings-list-sort-header hidden md:grid", className)}
      role="row"
      data-cy={dataCy}
    >
      {columns.map((column) => {
        const active = sort === column.key;
        return (
          <div
            key={column.key}
            role="columnheader"
            aria-sort={
              active ? (ascending ? "ascending" : "descending") : "none"
            }
            className={cn(
              column.numeric === true && "settings-list-sort-header-amount",
            )}
          >
            <button
              type="button"
              className={cn(
                "settings-list-sort",
                column.numeric === true && "settings-list-sort-amount",
              )}
              onClick={() => onSort(column.key)}
              data-cy={column.dataCy}
            >
              <span>{column.label}</span>
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
      <div role="columnheader" className="settings-list-sort-header-actions">
        {actionsLabel}
      </div>
    </div>
  );
}

interface SettingsListMobileSortProps {
  columns: readonly SettingsListColumn[];
  sort: string;
  direction: SortDirection;
  onSort: (column: string) => void;
  onToggleDirection: () => void;
  selectDataCy: string;
  directionDataCy: string;
}

/** Compact sort control that keeps sorting reachable below `md`. */
export function SettingsListMobileSort({
  columns,
  sort,
  direction,
  onSort,
  onToggleDirection,
  selectDataCy,
  directionDataCy,
}: SettingsListMobileSortProps) {
  const { t } = useTranslation();
  const ascending = direction === "asc";

  return (
    <div className="settings-list-mobile-sort md:hidden">
      <select
        className="field mt-0 w-full sm:w-auto"
        value={sort}
        onChange={(event) => onSort(event.target.value)}
        aria-label={t("settings.list.sortLabel")}
        data-cy={selectDataCy}
      >
        {columns.map((column) => (
          <option key={column.key} value={column.key}>
            {column.label}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        small
        className="settings-list-mobile-sort-direction"
        icon={ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        aria-label={
          ascending
            ? t("settings.list.ascending")
            : t("settings.list.descending")
        }
        onClick={onToggleDirection}
        data-cy={directionDataCy}
      />
    </div>
  );
}
