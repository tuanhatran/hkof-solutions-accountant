import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type { ExpenseItemDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { ExpenseItemForm } from "./ExpenseItemForm";

vi.mock("@/api/endpoints", () => ({
  api: {
    expenseItems: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const ITEM: ExpenseItemDto = {
  id: 9,
  code: "gaz",
  label: "Gaz",
  supplier: "EDF",
  proRataPct: "12.50",
  periodicity: "ANNUAL",
  sortOrder: 2,
  active: false,
  multipleLinesAllowed: true,
};

function renderForm(
  props: Partial<Parameters<typeof ExpenseItemForm>[0]> = {},
) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  render(
    <ExpenseItemForm
      item={null}
      companyId={1}
      leaseId={null}
      defaultProRata="35.71"
      defaultOrder={4}
      onClose={onClose}
      {...props}
    />,
    { wrapper },
  );
  return { onClose, queryClient };
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  vi.mocked(api.expenseItems.create).mockReset();
  vi.mocked(api.expenseItems.update).mockReset();
  vi.mocked(api.expenseItems.delete).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("ExpenseItemForm", () => {
  it("defaults a new item from the provided prorata and order", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: "Ajouter un frais de frais" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Code")).toBeEnabled();
    expect(screen.getByLabelText("Code")).toHaveValue("");
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
    expect(screen.getByLabelText("Ordre d’affichage")).toHaveValue(4);
    expect(screen.getByLabelText(/Poste actif/)).toBeChecked();
    expect(
      screen.getByLabelText(/Plusieurs lignes autorisées/),
    ).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Valider" })).toBeInTheDocument();
  });

  it("renders inside a form modal and closes without saving on Annuler or Escape", async () => {
    const { onClose } = renderForm();
    const user = userEvent.setup();

    expect(
      document.querySelector(
        '[data-cy="dialogue-formulaire-poste"] [data-cy="formulaire-poste"]',
      ),
    ).not.toBeNull();

    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.expenseItems.create).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(api.expenseItems.create).not.toHaveBeenCalled();
  });

  it("rejects an empty label and an invalid prorata", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(
      await screen.findByText("Le libellé est obligatoire."),
    ).toBeVisible();
    expect(api.expenseItems.create).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.clear(screen.getByLabelText("Prorata par défaut (%)"));
    await user.type(screen.getByLabelText("Prorata par défaut (%)"), "120");
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(
      await screen.findByText("Prorata attendu entre 0 et 100."),
    ).toBeVisible();
    expect(api.expenseItems.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid code", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Code"), "bad code");
    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText(
        "Code invalide : lettres, chiffres, tirets et underscores uniquement.",
      ),
    ).toBeVisible();
    expect(api.expenseItems.create).not.toHaveBeenCalled();
  });

  it("creates an item with normalized values and closes", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 1,
      label: "Gaz",
    });
    const { onClose, queryClient } = renderForm();
    queryClient.setQueryData(queryKeys.expenseItems(1, true), []);
    queryClient.setQueryData(queryKeys.expenseItems(1, false), []);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Code"), "gaz-2");
    await user.type(screen.getByLabelText("Libellé affiché"), "  Gaz  ");
    await user.type(screen.getByLabelText("Fournisseur"), " EDF ");
    await user.clear(screen.getByLabelText("Prorata par défaut (%)"));
    await user.type(screen.getByLabelText("Prorata par défaut (%)"), "12,5");
    await user.selectOptions(screen.getByLabelText("Périodicité"), "ANNUAL");
    await user.click(screen.getByLabelText(/Plusieurs lignes autorisées/));
    await user.click(screen.getByLabelText(/Poste actif/));
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith({
        companyId: 1,
        leaseId: null,
        code: "gaz-2",
        label: "Gaz",
        supplier: "EDF",
        proRataPct: "12.5",
        periodicity: "ANNUAL",
        sortOrder: 4,
        active: false,
        multipleLinesAllowed: true,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toastMessages()).toContain(
      "Poste « Gaz » ajouté à la liste des frais.",
    );
    expect(
      queryClient.getQueryState(queryKeys.expenseItems(1, true))?.isInvalidated,
    ).toBe(true);
  });

  it("omits an empty optional code", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 2,
      label: "Eau",
    });
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Libellé affiché"), "Eau");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ label: "Eau", proRataPct: "35.71" }),
      ),
    );
    expect(
      vi.mocked(api.expenseItems.create).mock.calls[0][0],
    ).not.toHaveProperty("code");
  });

  it("edits an existing item without sending its immutable code", async () => {
    vi.mocked(api.expenseItems.update).mockResolvedValue({
      id: 9,
      label: "Gaz",
    });
    const { onClose } = renderForm({ item: ITEM });

    expect(
      screen.getByRole("heading", { name: "Modifier le type de frais" }),
    ).toBeVisible();
    expect(screen.getByText("gaz")).toBeVisible();
    expect(screen.getByLabelText("Code")).toBeDisabled();
    expect(screen.getByLabelText("Code")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "12,50",
    );
    expect(screen.getByLabelText("Périodicité")).toHaveValue("ANNUAL");
    expect(screen.getByLabelText("Ordre d’affichage")).toHaveValue(2);
    expect(screen.getByLabelText(/Poste actif/)).not.toBeChecked();
    expect(screen.getByLabelText(/Plusieurs lignes autorisées/)).toBeChecked();

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.update).toHaveBeenCalledWith(9, {
        companyId: 1,
        leaseId: null,
        label: "Gaz",
        supplier: "EDF",
        proRataPct: "12.5",
        periodicity: "ANNUAL",
        sortOrder: 2,
        active: false,
        multipleLinesAllowed: true,
      }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(toastMessages()).toContain("Poste « Gaz » mis à jour.");
  });

  it("creates the poste for the selected lease", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 1,
      label: "Gaz",
    });
    renderForm({ leaseId: 7 });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 7, label: "Gaz" }),
      ),
    );
  });

  it("keeps the item's own lease when editing, not the selected lease", async () => {
    vi.mocked(api.expenseItems.update).mockResolvedValue({
      id: 9,
      label: "Gaz",
      leaseId: 3,
    });
    renderForm({ item: { ...ITEM, leaseId: 3 }, leaseId: 7 });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.update).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ leaseId: 3 }),
      ),
    );
  });

  it("renders the creation form, help and validation in English", async () => {
    await i18n.changeLanguage("en");
    renderForm();
    const user = userEvent.setup();

    expect(
      screen.getByRole("heading", { name: "Add an expense item" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Code")).toBeVisible();
    expect(screen.getByLabelText("Displayed label")).toBeVisible();
    expect(screen.getByLabelText("Supplier")).toBeVisible();
    expect(screen.getByLabelText("Default pro rata (%)")).toBeVisible();
    expect(screen.getByLabelText("Periodicity")).toBeVisible();
    expect(screen.getByRole("option", { name: "Monthly" })).toBeVisible();
    expect(screen.getByLabelText("Display order")).toBeVisible();
    expect(screen.getByLabelText(/Active expense item/)).toBeVisible();
    expect(screen.getByLabelText(/Multiple lines allowed/)).toBeVisible();
    expect(
      screen.getByText("Optional: generated from the label when empty."),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Code"), "bad code");
    await user.clear(screen.getByLabelText("Default pro rata (%)"));
    await user.type(screen.getByLabelText("Default pro rata (%)"), "120");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText(
        "Invalid code: letters, digits, hyphens and underscores only.",
      ),
    ).toBeVisible();
    expect(screen.getByText("The label is required.")).toBeVisible();
    expect(
      screen.getByText("Pro rata must be between 0 and 100."),
    ).toBeVisible();
    expect(api.expenseItems.create).not.toHaveBeenCalled();
  });

  it("renders the edit form and toasts the update in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.expenseItems.update).mockResolvedValue({
      id: 9,
      label: "Gaz",
    });
    renderForm({ item: ITEM });

    expect(
      screen.getByRole("heading", { name: "Edit the expense type" }),
    ).toBeVisible();
    expect(
      screen.getByText("The code is immutable after creation."),
    ).toBeVisible();

    await userEvent.setup().click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(toastMessages()).toContain("Expense item “Gaz” updated."),
    );
  });

  it("surfaces a request error, clears it and closes with Annuler", async () => {
    vi.mocked(api.expenseItems.create).mockRejectedValue(
      new Error("Poste déjà existant"),
    );
    const { onClose } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Poste déjà existant");

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
