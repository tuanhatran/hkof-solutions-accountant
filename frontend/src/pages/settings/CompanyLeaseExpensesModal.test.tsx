import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { CompanyDto, ExpenseItemDto, LeaseDto } from "@/api/types";
import { CompanyLeaseExpensesModal } from "./CompanyLeaseExpensesModal";

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

const COMPANY: CompanyDto = {
  id: 1,
  name: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  leaseId: 5,
  proRataBase: "35.71",
  issuePlace: "Paris",
};

const LEASE: LeaseDto = {
  id: 6,
  companyId: 1,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "8 impasse des Acacias, 69003 Lyon",
  rentExclCharges: "700.00",
  charges: "0.00",
  totalArea: "40.00",
  businessArea: "10.00",
  proRataBase: "25.00",
};

const ITEM: ExpenseItemDto = {
  id: 1,
  code: "gaz",
  label: "Gaz",
  supplier: "EDF",
  proRataPct: "25.00",
  periodicity: "MONTHLY",
  sortOrder: 1,
  active: true,
  multipleLinesAllowed: false,
};

function renderModal(lease: LeaseDto = LEASE, company: CompanyDto = COMPANY) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <CompanyLeaseExpensesModal
        company={company}
        lease={lease}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  vi.mocked(api.expenseItems.list).mockReset();
  vi.mocked(api.expenseItems.create).mockReset();
  vi.mocked(api.expenseItems.update).mockReset();
  vi.mocked(api.expenseItems.delete).mockReset();
  vi.mocked(api.expenseItems.list).mockResolvedValue([ITEM]);
});

describe("CompanyLeaseExpensesModal", () => {
  it("opens the lease expenses dialog scoped to the lease", async () => {
    renderModal();

    const dialog = screen.getByRole("dialog", { name: "Frais du bail" });
    expect(dialog).toHaveAttribute("data-cy", "dialogue-frais-bail-societe");
    expect(dialog).toHaveTextContent("8 impasse des Acacias, 69003 Lyon");
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6),
    );
    expect(await screen.findByText("Gaz")).toBeVisible();
  });

  it("swaps the list and the item form inside the same dialog", async () => {
    renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(
      document.querySelector('[data-cy="dialogue-frais-bail-societe"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="formulaire-poste"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('[data-cy="dialogue-formulaire-poste"]'),
    ).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "25,00",
    );

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(document.querySelector('[data-cy="formulaire-poste"]')).toBeNull();
    expect(document.querySelector("table.expense-items-table")).not.toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("returns to the list after Valider, then closes the whole dialog once", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 2,
      label: "Eau",
    });
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    await user.type(screen.getByLabelText("Libellé affiché"), "Eau");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 6, label: "Eau" }),
      ),
    );
    await waitFor(() =>
      expect(document.querySelector('[data-cy="formulaire-poste"]')).toBeNull(),
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the whole dialog on Escape from the form view", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    expect(
      document.querySelector('[data-cy="formulaire-poste"]'),
    ).not.toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on the close button and on the backdrop", async () => {
    const { onClose } = renderModal();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.mouseDown(
      within(screen.getByRole("dialog")).getByRole("heading", {
        name: "Frais du bail",
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("falls back on the company pro-rata then on 100 %", async () => {
    renderModal({ ...LEASE, proRataBase: null });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
  });

  it("falls back on 100 % when neither the lease nor the company has a pro-rata", async () => {
    renderModal(
      { ...LEASE, proRataBase: null },
      { ...COMPANY, proRataBase: undefined },
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "100,00",
    );
  });
});
