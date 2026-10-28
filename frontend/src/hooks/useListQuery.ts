import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface ListSort<T> {
  value: string;
  compare: (left: T, right: T) => number;
}

export interface UseListQueryOptions<T> {
  items: T[];
  searchText: (item: T) => string;
  sorts: readonly ListSort<T>[];
  defaultSort: string;
  pinFirst?: (item: T) => boolean;
}

export interface ListQuery<T> {
  query: string;
  setQuery: (query: string) => void;
  sort: string;
  setSort: (sort: string) => void;
  direction: SortDirection;
  toggleDirection: () => void;
  visible: T[];
  total: number;
  isFiltered: boolean;
}

/** Accent- and case-insensitive form used by the client-side list filter. */
export function normalizeListText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr");
}

/**
 * Client-side filter and sort of a settings list. Filtering trims the query
 * and ignores case and diacritics; sorting works on a copy, the caller's
 * items are never mutated, and `pinFirst` rows stay first in both directions.
 */
export function useListQuery<T>({
  items,
  searchText,
  sorts,
  defaultSort,
  pinFirst,
}: UseListQueryOptions<T>): ListQuery<T> {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [direction, setDirection] = useState<SortDirection>("asc");
  const trimmedQuery = query.trim();
  const isFiltered = trimmedQuery.length > 0;

  const visible = useMemo(() => {
    const needle = normalizeListText(trimmedQuery);
    const filtered = isFiltered
      ? items.filter((item) =>
          normalizeListText(searchText(item)).includes(needle),
        )
      : items;
    const activeSort =
      sorts.find((option) => option.value === sort) ?? sorts[0];
    const ordered = [...filtered];
    if (activeSort) {
      const factor = direction === "desc" ? -1 : 1;
      ordered.sort((left, right) => factor * activeSort.compare(left, right));
    }
    if (!pinFirst) {
      return ordered;
    }
    return [
      ...ordered.filter((item) => pinFirst(item)),
      ...ordered.filter((item) => !pinFirst(item)),
    ];
  }, [
    items,
    searchText,
    sorts,
    sort,
    direction,
    pinFirst,
    trimmedQuery,
    isFiltered,
  ]);

  function toggleDirection() {
    setDirection((current) => (current === "asc" ? "desc" : "asc"));
  }

  return {
    query,
    setQuery,
    sort,
    setSort,
    direction,
    toggleDirection,
    visible,
    total: items.length,
    isFiltered,
  };
}
