import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { useExpenseItems } from "@/api/queries";
import type { ExpenseItemDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { ExpenseItemsManager } from "./ExpenseItemsManager";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

let itemsState: QueryLike<ExpenseItemDto[]>;

vi.mock("@/api/endpoints", () => ({
  api: {
    expenseItems: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useExpenseItems: vi.fn(() => itemsState),
  };
});

const ITEMS: ExpenseItemDto[] = [
  {
    id: 1,
    code: "loyer",
    label: "Loyer",
    supplier: "Agence",
    proRataPct: "35.71",
    periodicity: "MONTHLY",
    sortOrder: 1,
    active: true,
    multipleLinesAllowed: false,
  },
  {
    id: 2,
    code: "eau",
    label: "Eau",
    supplier: "",
    proRataPct: "12.50",
    periodicity: "ANNUAL",
    sortOrder: 3,
    active: false,
    multipleLinesAllowed: true,
  },
  {
    id: 3,
    code: "divers",
    label: "Divers",
    proRataPct: undefined,
    periodicity: "TRIMESTRIEL",
    sortOrder: undefined,
    active: true,
    multipleLinesAllowed: false,
  },
];

function readyState(data: ExpenseItemDto[]): QueryLike<ExpenseItemDto[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function renderManager(
  defaultProRata = "35.71",
  leaseId: number | null = null,
  embedded = false,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ExpenseItemsManager
        companyId={1}
        leaseId={leaseId}
        defaultProRata={defaultProRata}
        embedded={embedded}
      />
    </QueryClientProvider>,
  );
  return { queryClient, unmount: view.unmount };
}

describe("ExpenseItemsManager", () => {
  beforeEach(() => {
    itemsState = readyState(ITEMS);
    vi.mocked(api.expenseItems.create).mockReset();
    vi.mocked(api.expenseItems.update).mockReset();
    vi.mocked(api.expenseItems.delete).mockReset();
    useToasts.setState({ toasts: [] });
  });

  it("scopes the poste list query to the selected lease", () => {
    renderManager("35.71", 7);

    expect(vi.mocked(useExpenseItems)).toHaveBeenCalledWith(1, true, 7);
  });

  it("creates a new poste for the selected lease", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 10,
      label: "Gaz",
    });
    renderManager("35.71", 7);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 7, label: "Gaz" }),
      ),
    );
  });

  it("renders the scoped dense table with right-aligned numbers", () => {
    renderManager();

    const table = document.querySelector(
      "table.expense-items-table",
    ) as HTMLElement;
    expect(table).not.toBeNull();
    expect(table).toHaveClass("expense-table", "expense-items-table");
    const proRata = within(table).getByRole("columnheader", {
      name: "Prorata",
    });
    expect(proRata).toHaveClass("text-right");
    const order = within(table).getByRole("columnheader", { name: "Ordre" });
    expect(order).toHaveClass("text-right");
    const numericCells = table.querySelectorAll("td.number");
    expect(numericCells).toHaveLength(6);
    numericCells.forEach((cell) => {
      expect(cell).toHaveClass("number", "text-right");
    });
  });

  it("lists the expense items with their formatted options", () => {
    renderManager();
    expect(screen.getByText("Loyer")).toBeVisible();
    expect(screen.getByText("35,71 %")).toBeVisible();
    expect(screen.getByText("Mensuelle")).toBeVisible();
    expect(screen.getByText("Annuelle")).toBeVisible();
    expect(screen.getByText("TRIMESTRIEL")).toBeVisible();
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getByText("inactif")).toBeVisible();
    expect(screen.getByText("multi-lignes")).toBeVisible();
    expect(screen.getAllByText("une ligne")).toHaveLength(2);
    expect(screen.getByText("Agence")).toBeVisible();
  });

  it("shows the loading, error and empty states", async () => {
    itemsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = renderManager();
    expect(screen.getByText("Chargement des postes…")).toBeVisible();
    loading.unmount();

    const refetch = vi.fn();
    itemsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Serveur indisponible"),
      refetch,
    };
    const failing = renderManager();
    expect(screen.getByText("Serveur indisponible")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    failing.unmount();
  });

  it("shows the empty list state", () => {
    itemsState = readyState([]);
    renderManager();

    expect(screen.getByText(/Aucun poste configuré/)).toBeVisible();
  });

  it("opens the creation form with the next order and the default prorata", async () => {
    renderManager("20,00");
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(
      document.querySelector('[data-cy="dialogue-item-form"]'),
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Ajouter un poste" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "20,00",
    );
    expect(screen.getByLabelText("Ordre d’affichage")).toHaveValue(4);
    expect(
      screen.getByRole("button", { name: "Ajouter un poste" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByLabelText("Prorata par défaut (%)")).toBeNull();
  });

  it("opens the edit form with the selected item", async () => {
    renderManager();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Modifier" })[0]);

    expect(
      screen.getByRole("heading", { name: "Modifier le poste" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Code")).toHaveValue("loyer");
    expect(screen.getByLabelText("Code")).toBeDisabled();
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
    expect(
      screen.getByRole("button", { name: "Ajouter un poste" }),
    ).not.toBeDisabled();
  });

  it("removes an item after confirmation", async () => {
    vi.mocked(api.expenseItems.delete).mockResolvedValue(undefined);
    renderManager();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Retirer" })[1]);
    const dialog = screen.getByRole("dialog", {
      name: "Retirer ce poste ?",
    });
    expect(
      within(dialog).getByText(/« Eau » ne sera plus proposé/),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Retirer le poste" }),
    );

    await waitFor(() =>
      expect(api.expenseItems.delete).toHaveBeenCalledWith(2),
    );
    await waitFor(() =>
      expect(
        useToasts.getState().toasts.map((element) => element.message),
      ).toContain("Poste désactivé et retiré de la liste des frais."),
    );
  });

  it("renders the expense item table in English", async () => {
    await i18n.changeLanguage("en");
    renderManager();

    expect(
      screen.getByRole("heading", { name: "Expense items" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add an expense item" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "Label",
      "Supplier",
      "Pro rata",
      "Periodicity",
      "Order",
      "Options",
      "Actions",
    ]);
    expect(screen.getByText("Monthly")).toBeVisible();
    expect(screen.getByText("Annual")).toBeVisible();
    expect(screen.getByText("inactive")).toBeVisible();
    expect(screen.getByText("multiple lines")).toBeVisible();
    expect(screen.getAllByText("single line")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(3);
  });

  it("shows the empty state and the removal confirmation in English", async () => {
    await i18n.changeLanguage("en");
    itemsState = readyState([]);
    const empty = renderManager();
    expect(screen.getByText(/No expense item configured/)).toBeVisible();
    empty.unmount();

    vi.mocked(api.expenseItems.delete).mockResolvedValue(undefined);
    itemsState = readyState(ITEMS);
    renderManager();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Remove" })[1]);
    const dialog = screen.getByRole("dialog", {
      name: "Remove this expense item?",
    });
    expect(dialog).toHaveTextContent("“Eau” will no longer be offered");
    await user.click(
      within(dialog).getByRole("button", { name: "Remove the expense item" }),
    );

    await waitFor(() =>
      expect(api.expenseItems.delete).toHaveBeenCalledWith(2),
    );
    await waitFor(() =>
      expect(
        useToasts.getState().toasts.map((element) => element.message),
      ).toContain("Expense item disabled and removed from the expense list."),
    );
  });

  it("surfaces a removal error and cancels the dialog", async () => {
    vi.mocked(api.expenseItems.delete).mockRejectedValue(
      new Error("Poste introuvable"),
    );
    renderManager();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Retirer" })[0]);
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(api.expenseItems.delete).not.toHaveBeenCalled();

    await user.click(screen.getAllByRole("button", { name: "Retirer" })[0]);
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Retirer ce poste ?" }),
      ).getByRole("button", { name: "Retirer le poste" }),
    );

    await waitFor(() =>
      expect(
        useToasts.getState().toasts.map((element) => element.message),
      ).toContain("Poste introuvable"),
    );
  });

  it("tags every expense item row with its poste code", () => {
    renderManager();

    expect(document.querySelector('[data-cy="item-loyer"]')).not.toBeNull();
    expect(document.querySelector('[data-cy="item-eau"]')).not.toBeNull();
    expect(document.querySelector('[data-cy="item-divers"]')).not.toBeNull();
  });

  it("filters the expense items on label, code and supplier with a live count", async () => {
    renderManager();
    const user = userEvent.setup();

    expect(
      document.querySelector('[data-cy="filter-count-items"]'),
    ).toHaveTextContent("3 sur 3");

    await user.type(screen.getByLabelText("Filtrer la liste"), "eau");
    expect(itemOrder()).toEqual(["eau"]);
    expect(
      document.querySelector('[data-cy="filter-count-items"]'),
    ).toHaveTextContent("1 sur 3");

    await user.click(
      document.querySelector('[data-cy="filter-clear-items"]') as HTMLElement,
    );
    await user.type(screen.getByLabelText("Filtrer la liste"), "agence");
    expect(itemOrder()).toEqual(["loyer"]);

    await user.click(
      document.querySelector('[data-cy="filter-clear-items"]') as HTMLElement,
    );
    await user.type(screen.getByLabelText("Filtrer la liste"), "divers");
    expect(itemOrder()).toEqual(["divers"]);
  });

  it("shows a no-match message instead of the table", async () => {
    renderManager();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Filtrer la liste"), "zzz");

    expect(
      document.querySelector('[data-cy="no-results-items"]'),
    ).toHaveTextContent("Aucun résultat pour « zzz ».");
    expect(document.querySelector("table.expense-items-table")).toBeNull();
    expect(itemOrder()).toEqual([]);
  });

  it("sorts the expense items and toggles the direction", async () => {
    renderManager();
    const user = userEvent.setup();

    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Ordre", "Libellé", "Prorata", "Périodicité"]);
    expect(itemOrder()).toEqual(["loyer", "eau", "divers"]);

    await user.selectOptions(screen.getByLabelText("Trier par"), "label");
    expect(itemOrder()).toEqual(["divers", "eau", "loyer"]);

    await user.click(screen.getByRole("button", { name: "Tri croissant" }));
    expect(itemOrder()).toEqual(["loyer", "eau", "divers"]);
  });

  it("hides the list toolbar when there is no expense item", () => {
    itemsState = readyState([]);
    renderManager();

    expect(document.querySelector('[data-cy="filter-items"]')).toBeNull();
  });

  it("renders the embedded manager without the section heading", () => {
    renderManager("35.71", 7, true);

    expect(screen.queryByRole("heading", { name: "Postes" })).toBeNull();
    expect(
      document.querySelector("section.expense-items-manager"),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Ajouter un poste" }),
    ).toBeVisible();
    expect(screen.getByText("Loyer")).toBeVisible();
  });

  it("swaps the list and the inline form in the same window", async () => {
    renderManager("35.71", 7, true);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(document.querySelector('[data-cy="item-form"]')).not.toBeNull();
    expect(document.querySelector('[data-cy="dialogue-item-form"]')).toBeNull();
    expect(document.querySelector("table.expense-items-table")).toBeNull();
    expect(screen.queryByText("Loyer")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(document.querySelector('[data-cy="item-form"]')).toBeNull();
    expect(document.querySelector("table.expense-items-table")).not.toBeNull();
    expect(screen.getByText("Loyer")).toBeVisible();
  });

  it("creates a poste from the embedded form and returns to the list", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 10,
      label: "Gaz",
    });
    renderManager("35.71", 7, true);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 7, label: "Gaz" }),
      ),
    );
    await waitFor(() =>
      expect(document.querySelector('[data-cy="item-form"]')).toBeNull(),
    );
    expect(document.querySelector("table.expense-items-table")).not.toBeNull();
  });

  it("opens the embedded edit form for the selected item", async () => {
    renderManager("35.71", 7, true);
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Modifier" })[0]);

    expect(document.querySelector('[data-cy="item-form"]')).not.toBeNull();
    expect(screen.getByLabelText("Code")).toHaveValue("loyer");
    expect(screen.getByLabelText("Code")).toBeDisabled();
    expect(document.querySelector("table.expense-items-table")).toBeNull();
  });
});

/** Expense item codes in DOM order, read on the row items. */
function itemOrder(): string[] {
  return [...document.querySelectorAll('[data-cy^="item-"]')].map(
    (element) =>
      (element as HTMLElement).dataset.cy?.replace("item-", "") ?? "",
  );
}
