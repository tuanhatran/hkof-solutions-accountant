import "./ListToolbar.css";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { SortDirection } from "@/hooks/useListQuery";

interface SortOption {
  value: string;
  label: string;
}

interface ListToolbarProps {
  list: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  direction: SortDirection;
  onToggleDirection: () => void;
  sortOptions: SortOption[];
  visible: number;
  total: number;
  /** Opt-out used when the caller places the search field in a section header. */
  showSearch?: boolean;
}

interface ListSearchProps {
  list: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
}

/** Search field with its clear button, shared by the toolbar and list headers. */
export function ListSearch({
  list,
  placeholder,
  query,
  onQueryChange,
}: ListSearchProps) {
  const { t } = useTranslation();
  return (
    <div className="list-toolbar-search">
      <input
        type="search"
        className="field mt-0 pr-10"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        aria-label={t("settings.list.filterLabel")}
        data-cy={`filter-${list}`}
      />
      {query.length > 0 ? (
        <Button
          variant="ghost"
          small
          className="list-toolbar-clear"
          icon={<X size={13} />}
          aria-label={t("settings.list.clear")}
          onClick={() => onQueryChange("")}
          data-cy={`filter-clear-${list}`}
        />
      ) : null}
    </div>
  );
}

/** Search, sort field, direction toggle and live count of a settings list. */
export function ListToolbar({
  list,
  placeholder,
  query,
  onQueryChange,
  sort,
  onSortChange,
  direction,
  onToggleDirection,
  sortOptions,
  visible,
  total,
  showSearch = true,
}: ListToolbarProps) {
  const { t } = useTranslation();
  const ascending = direction === "asc";

  return (
    <div className="list-toolbar">
      {showSearch ? (
        <ListSearch
          list={list}
          placeholder={placeholder}
          query={query}
          onQueryChange={onQueryChange}
        />
      ) : null}
      <div className="list-toolbar-controls">
        <select
          className="field mt-0 w-full sm:w-auto"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label={t("settings.list.sortLabel")}
          data-cy={`sort-${list}`}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          variant="ghost"
          small
          icon={ascending ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          aria-label={
            ascending
              ? t("settings.list.ascending")
              : t("settings.list.descending")
          }
          onClick={onToggleDirection}
          data-cy={`sort-direction-${list}`}
        />
        <span
          className="list-toolbar-count"
          aria-live="polite"
          data-cy={`filter-count-${list}`}
        >
          {t("settings.list.count", { visible, total })}
        </span>
      </div>
    </div>
  );
}
