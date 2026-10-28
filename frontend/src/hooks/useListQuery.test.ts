import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useListQuery, type ListSort } from "./useListQuery";

interface Row {
  id: number;
  name: string;
  email: string;
  score: number;
  pinned?: boolean;
}

const ROWS: Row[] = [
  { id: 1, name: "Élodie Zéphyr", email: "elodie@exemple.fr", score: 3 },
  { id: 2, name: "alice Martin", email: "alice@exemple.fr", score: 1 },
  {
    id: 3,
    name: "Zoé Bernard",
    email: "zoe@exemple.fr",
    score: 2,
    pinned: true,
  },
];

const SORTS: ListSort<Row>[] = [
  {
    value: "name",
    compare: (left, right) =>
      left.name.localeCompare(right.name, "fr", { sensitivity: "base" }),
  },
  {
    value: "score",
    compare: (left, right) => left.score - right.score,
  },
];

function renderRows(pinFirst?: (row: Row) => boolean) {
  return renderHook(() =>
    useListQuery<Row>({
      items: ROWS,
      searchText: (row) => `${row.name} ${row.email}`,
      sorts: SORTS,
      defaultSort: "name",
      pinFirst,
    }),
  );
}

describe("useListQuery", () => {
  it("exposes every item with the default sort and no filter", () => {
    const { result } = renderRows();

    expect(result.current.total).toBe(3);
    expect(result.current.isFiltered).toBe(false);
    expect(result.current.visible.map((row) => row.id)).toEqual([2, 1, 3]);
  });

  it("filters on the trimmed query, ignoring case and diacritics", () => {
    const { result } = renderRows();

    act(() => result.current.setQuery("  ELODIE "));

    expect(result.current.isFiltered).toBe(true);
    expect(result.current.visible.map((row) => row.id)).toEqual([1]);
    expect(result.current.total).toBe(3);

    act(() => result.current.setQuery("zoe"));
    expect(result.current.visible.map((row) => row.id)).toEqual([3]);
  });

  it("matches substrings of any searchable field and clears back to all rows", () => {
    const { result } = renderRows();

    act(() => result.current.setQuery("exemple.fr"));
    expect(result.current.visible).toHaveLength(3);

    act(() => result.current.setQuery("alice@"));
    expect(result.current.visible.map((row) => row.id)).toEqual([2]);

    act(() => result.current.setQuery(""));
    expect(result.current.visible).toHaveLength(3);
    expect(result.current.isFiltered).toBe(false);
  });

  it("treats a whitespace-only query as no filter", () => {
    const { result } = renderRows();

    act(() => result.current.setQuery("   "));

    expect(result.current.isFiltered).toBe(false);
    expect(result.current.visible).toHaveLength(3);
  });

  it("sorts a copy of the items and toggles the direction", () => {
    const snapshot = [...ROWS];
    const { result } = renderRows();

    act(() => result.current.setSort("score"));
    expect(result.current.visible.map((row) => row.id)).toEqual([2, 3, 1]);
    expect(ROWS).toEqual(snapshot);

    act(() => result.current.toggleDirection());
    expect(result.current.direction).toBe("desc");
    expect(result.current.visible.map((row) => row.id)).toEqual([1, 3, 2]);

    act(() => result.current.toggleDirection());
    expect(result.current.direction).toBe("asc");
    expect(result.current.visible.map((row) => row.id)).toEqual([2, 3, 1]);
  });

  it("never mutates the items array", () => {
    const items = [...ROWS];
    const { result } = renderHook(() =>
      useListQuery<Row>({
        items,
        searchText: (row) => row.name,
        sorts: SORTS,
        defaultSort: "score",
      }),
    );

    act(() => result.current.setSort("score"));
    act(() => result.current.toggleDirection());

    expect(items).toEqual(ROWS);
  });

  it("keeps pinFirst rows first in both directions", () => {
    const { result } = renderRows((row) => row.pinned === true);

    act(() => result.current.setSort("score"));
    expect(result.current.visible.map((row) => row.id)).toEqual([3, 2, 1]);

    act(() => result.current.toggleDirection());
    expect(result.current.visible.map((row) => row.id)).toEqual([3, 1, 2]);
  });

  it("keeps pinFirst rows first when the query filters rows out", () => {
    const { result } = renderRows((row) => row.pinned === true);

    act(() => result.current.setQuery("zoe"));
    act(() => result.current.setSort("name"));

    expect(result.current.visible.map((row) => row.id)).toEqual([3]);
  });
});
