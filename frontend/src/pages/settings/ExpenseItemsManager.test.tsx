import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { ExpenseItemDto } from "@/api/types";
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
    useExpenseItems: () => itemsState,
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

function renderManager(defaultProRata = "35.71") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ExpenseItemsManager companyId={1} defaultProRata={defaultProRata} />
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

    await user.click(screen.getByRole("button", { name: "Ajouter un type" }));

    expect(
      screen.getByRole("heading", { name: "Ajouter un type de frais" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "20,00",
    );
    expect(screen.getByLabelText("Ordre d’affichage")).toHaveValue(4);
    expect(
      screen.getByRole("button", { name: "Ajouter un type" }),
    ).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByLabelText("Prorata par défaut (%)")).toBeNull();
  });

  it("opens the edit form with the selected item", async () => {
    renderManager();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Modifier" })[0]);

    expect(
      screen.getByRole("heading", { name: "Modifier le poste « Loyer »" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Code")).toHaveValue("loyer");
    expect(screen.getByLabelText("Code")).toBeDisabled();
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
    expect(
      screen.getByRole("button", { name: "Ajouter un type" }),
    ).not.toBeDisabled();
  });

  it("removes an item after confirmation", async () => {
    vi.mocked(api.expenseItems.delete).mockResolvedValue(undefined);
    renderManager();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole("button", { name: "Retirer" })[1]);
    const dialog = screen.getByRole("dialog", {
      name: "Retirer ce type de frais ?",
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
        screen.getByRole("dialog", { name: "Retirer ce type de frais ?" }),
      ).getByRole("button", { name: "Retirer le poste" }),
    );

    await waitFor(() =>
      expect(
        useToasts.getState().toasts.map((element) => element.message),
      ).toContain("Poste introuvable"),
    );
  });
});
