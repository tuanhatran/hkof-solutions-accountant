import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SortDirection } from "@/hooks/useListQuery";
import { ListToolbar } from "./ListToolbar";

interface ListToolbarTestProps {
  list: string;
  placeholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  direction: SortDirection;
  onToggleDirection: () => void;
  sortOptions: { value: string; label: string }[];
  visible: number;
  total: number;
  showSearch?: boolean;
}

const SORT_OPTIONS = [
  { value: "name", label: "Salarié" },
  { value: "signatures", label: "Signatures" },
];

function renderToolbar(overrides: Partial<ListToolbarTestProps> = {}) {
  const props: ListToolbarTestProps = {
    list: "employees",
    placeholder: "Filtrer les salariés…",
    query: "",
    onQueryChange: vi.fn(),
    sort: "name",
    onSortChange: vi.fn(),
    direction: "asc",
    onToggleDirection: vi.fn(),
    sortOptions: SORT_OPTIONS,
    visible: 2,
    total: 3,
    ...overrides,
  };
  render(<ListToolbar {...props} />);
  return props;
}

describe("ListToolbar", () => {
  it("renders the search, sort, direction and live count controls", () => {
    renderToolbar();

    const search = screen.getByRole("searchbox", {
      name: "Filtrer la liste",
    });
    expect(search).toHaveAttribute("placeholder", "Filtrer les salariés…");
    expect(document.querySelector('[data-cy="filter-employees"]')).toBe(search);

    const sort = screen.getByRole("combobox", { name: "Trier par" });
    expect(sort).toHaveValue("name");
    expect(document.querySelector('[data-cy="sort-employees"]')).toBe(sort);
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Salarié", "Signatures"]);

    const direction = screen.getByRole("button", { name: "Tri croissant" });
    expect(document.querySelector('[data-cy="sort-direction-employees"]')).toBe(
      direction,
    );

    const count = document.querySelector('[data-cy="filter-count-employees"]');
    expect(count).toHaveTextContent("2 sur 3");
    expect(count).toHaveAttribute("aria-live", "polite");

    expect(
      document.querySelector('[data-cy="filter-clear-employees"]'),
    ).toBeNull();
  });

  it("reports the typed query and clears it with the X button", () => {
    const props = renderToolbar({ query: "zoé" });

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "zoe" },
    });
    expect(props.onQueryChange).toHaveBeenCalledWith("zoe");

    const clear = document.querySelector(
      '[data-cy="filter-clear-employees"]',
    ) as HTMLElement;
    expect(clear).toHaveAttribute("aria-label", "Effacer le filtre");
    fireEvent.click(clear);
    expect(props.onQueryChange).toHaveBeenCalledWith("");
  });

  it("reports the sort field and the direction toggle", async () => {
    const props = renderToolbar();
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Trier par" }),
      "signatures",
    );
    expect(props.onSortChange).toHaveBeenCalledWith("signatures");

    fireEvent.click(screen.getByRole("button", { name: "Tri croissant" }));
    expect(props.onToggleDirection).toHaveBeenCalledTimes(1);
  });

  it("shows the descending direction after a toggle", () => {
    renderToolbar({ direction: "desc" });

    expect(
      screen.getByRole("button", { name: "Tri décroissant" }),
    ).toBeVisible();
    expect(
      document.querySelector('[data-cy="sort-direction-employees"]'),
    ).not.toBeNull();
  });

  it("hides the search field on request but keeps sort, direction and count", () => {
    renderToolbar({ showSearch: false });

    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(document.querySelector('[data-cy="filter-employees"]')).toBeNull();
    expect(
      document.querySelector('[data-cy="filter-clear-employees"]'),
    ).toBeNull();
    expect(screen.getByRole("combobox", { name: "Trier par" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Tri croissant" })).toBeVisible();
    expect(
      document.querySelector('[data-cy="filter-count-employees"]'),
    ).toHaveTextContent("2 sur 3");
  });
});
