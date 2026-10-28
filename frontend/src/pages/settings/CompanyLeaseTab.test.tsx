import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { CompanyDto, ExpenseItemDto, LeaseDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { CompanyLeaseTab } from "./CompanyLeaseTab";

vi.mock("@/api/endpoints", () => ({
  api: {
    companies: { list: vi.fn(), update: vi.fn() },
    persons: { list: vi.fn() },
    addresses: { list: vi.fn() },
    leases: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expenseItems: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    templates: { list: vi.fn() },
    employees: { list: vi.fn() },
    signatures: { list: vi.fn() },
    receipts: { upload: vi.fn(), delete: vi.fn(), fileUrl: vi.fn() },
    analyses: { analyze: vi.fn() },
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

const OTHER_COMPANY: CompanyDto = { ...COMPANY, id: 2, name: "Autre SARL" };

const LEASE5: LeaseDto = {
  id: 5,
  companyId: 1,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
  proRataBase: "35.71",
};

const LEASE6: LeaseDto = {
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

const LEASE7: LeaseDto = {
  id: 7,
  companyId: 2,
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  propertyAddress: "5 rue de l'Autre, 75004 Paris",
  rentExclCharges: "500.00",
  charges: "0.00",
};

const EXPENSE_ITEM: ExpenseItemDto = {
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

function queryByCy(cy: string): Element | null {
  return document.querySelector(`[data-cy="${cy}"]`);
}

function renderTab(current: CompanyDto = COMPANY) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  render(
    <CompanyLeaseTab company={current} companies={[current, OTHER_COMPANY]} />,
    {
      wrapper,
    },
  );
  return queryClient;
}

beforeEach(() => {
  vi.mocked(api.companies.list).mockReset();
  vi.mocked(api.companies.update).mockReset();
  vi.mocked(api.persons.list).mockReset();
  vi.mocked(api.addresses.list).mockReset();
  vi.mocked(api.leases.list).mockReset();
  vi.mocked(api.leases.create).mockReset();
  vi.mocked(api.leases.update).mockReset();
  vi.mocked(api.expenseItems.list).mockReset();
  vi.mocked(api.expenseItems.create).mockReset();
  vi.mocked(api.expenseItems.update).mockReset();
  vi.mocked(api.expenseItems.delete).mockReset();
  vi.mocked(api.templates.list).mockReset();
  vi.mocked(api.employees.list).mockReset();
  vi.mocked(api.signatures.list).mockReset();
  vi.mocked(api.persons.list).mockResolvedValue([
    { id: 1, name: "M. Bailleur", address: "" },
  ]);
  vi.mocked(api.addresses.list).mockResolvedValue([]);
  vi.mocked(api.leases.list).mockResolvedValue([LEASE5, LEASE6, LEASE7]);
  vi.mocked(api.expenseItems.list).mockResolvedValue([]);
  vi.mocked(api.companies.list).mockResolvedValue([COMPANY, OTHER_COMPANY]);
  vi.mocked(api.templates.list).mockResolvedValue([]);
  vi.mocked(api.employees.list).mockResolvedValue([]);
  vi.mocked(api.signatures.list).mockResolvedValue([]);
  useToasts.setState({ toasts: [] });
});

describe("CompanyLeaseTab", () => {
  it("renders the five grid column headers above the company lease rows", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    const headers = queryByCy("entetes-baux-societe") as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(within(headers).getByText("Adresse")).toBeVisible();
    expect(within(headers).getByText("Bailleur")).toBeVisible();
    expect(within(headers).getByText("Loyer")).toBeVisible();
    expect(within(headers).getByText("Charges")).toBeVisible();
    expect(within(headers).getByText("Actions")).toBeVisible();
  });

  it("renders each lease as five aligned cells without an active badge", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    const row = queryByCy("bail-societe-5") as HTMLElement;
    expect(row).toHaveTextContent("12 rue des Lilas, 75011 Paris");
    expect(row).toHaveTextContent("M. Bailleur");
    expect(queryByCy("loyer-bail-societe-5")).toHaveTextContent("900,00 €");
    expect(queryByCy("charges-bail-societe-5")).toHaveTextContent("50,00 €");
    expect(queryByCy("loyer-bail-societe-5")).toHaveClass(
      "number",
      "text-right",
    );
    expect(queryByCy("charges-bail-societe-5")).toHaveClass(
      "number",
      "text-right",
    );
    expect(queryByCy("actions-bail-societe-5")).not.toBeNull();
    expect(within(row as HTMLElement).queryByText("Bail actif")).toBeNull();
    expect(row).not.toHaveAttribute("aria-expanded");
    expect(row).not.toHaveAttribute("role");
    expect(row).not.toHaveAttribute("tabindex");
  });

  it("shows a fallback dash when the lease has no landlord", async () => {
    vi.mocked(api.leases.list).mockResolvedValue([
      { ...LEASE5, landlordName: undefined },
    ]);
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("bail-societe-5")).toHaveTextContent("—");
  });

  it("lists only the leases of the company, without a dropdown", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("bail-societe-6")).not.toBeNull();
    expect(queryByCy("bail-societe-7")).toBeNull();
    expect(queryByCy("select-bail-actif")).toBeNull();
  });

  it("keeps the row inert: a click opens no dialog and persists nothing", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(queryByCy("bail-societe-5") as HTMLElement);

    expect(queryByCy("dialogue-frais-bail-societe")).toBeNull();
    expect(queryByCy("dialogue-frais-generaux-societe")).toBeNull();
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("opens the expenses dialog scoped to the lease and restores focus on Escape", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    const opener = queryByCy(
      "btn-modifier-frais-bail-societe-6",
    ) as HTMLElement;

    await user.click(opener);

    const dialog = queryByCy("dialogue-frais-bail-societe") as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(
      within(dialog).getByRole("heading", { name: "Frais du bail" }),
    ).toBeVisible();
    expect(dialog).toHaveTextContent("8 impasse des Acacias, 69003 Lyon");
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6),
    );
    expect(api.companies.update).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");

    expect(queryByCy("dialogue-frais-bail-societe")).toBeNull();
    expect(opener).toHaveFocus();
  });

  it("uses the lease then company then 100 % pro-rata in the dialog", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(
      queryByCy("btn-modifier-frais-bail-societe-6") as HTMLElement,
    );
    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "25,00",
    );
  });

  it("falls back on the company pro-rata then 100 % for a new poste", async () => {
    vi.mocked(api.leases.list).mockResolvedValue([
      { ...LEASE6, proRataBase: null },
    ]);
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(
      queryByCy("btn-modifier-frais-bail-societe-6") as HTMLElement,
    );
    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
  });

  it("creates a new poste in the lease expenses dialog", async () => {
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 11,
      label: "Gaz",
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(
      queryByCy("btn-modifier-frais-bail-societe-6") as HTMLElement,
    );
    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));
    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 6, label: "Gaz" }),
      ),
    );
    await waitFor(() =>
      expect(document.querySelector('[data-cy="formulaire-poste"]')).toBeNull(),
    );
    expect(queryByCy("dialogue-frais-bail-societe")).not.toBeNull();
  });

  it("sorts from the column headers: inactive starts ascending, active toggles", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    expect(rowOrder()).toEqual([5, 6]);

    await user.click(screen.getByRole("button", { name: "Loyer" }));

    expect(rowOrder()).toEqual([6, 5]);
    expect(
      within(queryByCy("entetes-baux-societe") as HTMLElement).getByRole(
        "columnheader",
        { name: "Loyer" },
      ),
    ).toHaveAttribute("aria-sort", "ascending");

    await user.click(screen.getByRole("button", { name: "Loyer" }));

    expect(rowOrder()).toEqual([5, 6]);
    expect(
      within(queryByCy("entetes-baux-societe") as HTMLElement).getByRole(
        "columnheader",
        { name: "Loyer" },
      ),
    ).toHaveAttribute("aria-sort", "descending");

    // An inactive column always starts ascending, even after a descending sort.
    await user.click(screen.getByRole("button", { name: "Adresse" }));

    expect(rowOrder()).toEqual([5, 6]);
    const headers = queryByCy("entetes-baux-societe") as HTMLElement;
    expect(
      within(headers).getByRole("columnheader", { name: "Adresse" }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(
      within(headers).getByRole("columnheader", { name: "Loyer" }),
    ).toHaveAttribute("aria-sort", "none");
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("sorts by landlord with the French base locale", async () => {
    vi.mocked(api.leases.list).mockResolvedValue([
      { ...LEASE5, landlordName: "Élodie" },
      { ...LEASE6, landlordName: "alice" },
    ]);
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(screen.getByRole("button", { name: "Bailleur" }));

    expect(rowOrder()).toEqual([6, 5]);
  });

  it("marks the sorted column with aria-sort and a hidden direction icon", async () => {
    renderTab();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    const headers = queryByCy("entetes-baux-societe") as HTMLElement;

    expect(
      within(headers).getByRole("columnheader", { name: "Adresse" }),
    ).toHaveAttribute("aria-sort", "ascending");
    expect(
      within(headers).getByRole("columnheader", { name: "Bailleur" }),
    ).toHaveAttribute("aria-sort", "none");
    expect(
      within(headers).getByRole("columnheader", { name: "Actions" }),
    ).not.toHaveAttribute("aria-sort");
    expect(
      within(headers).queryByRole("button", { name: "Actions" }),
    ).toBeNull();

    const rentButton = within(headers).getByRole("button", { name: "Loyer" });
    expect(rentButton.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("keeps sorting reachable on mobile with the compact control", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    const select = queryByCy("tri-compact-baux-societe") as HTMLElement;
    const direction = queryByCy(
      "tri-compact-direction-baux-societe",
    ) as HTMLElement;
    expect(select).toHaveAttribute("aria-label", "Trier par");
    expect(direction).toHaveAttribute("aria-label", "Tri croissant");

    await user.selectOptions(select, "rent");
    expect(rowOrder()).toEqual([6, 5]);

    await user.click(direction);
    expect(direction).toHaveAttribute("aria-label", "Tri décroissant");
    expect(rowOrder()).toEqual([5, 6]);
  });

  it("labels the row action Ajouter des frais for a lease without an expense item", async () => {
    vi.mocked(api.expenseItems.list).mockImplementation(
      (_companyId, _all, leaseId) =>
        Promise.resolve(leaseId === 5 ? [EXPENSE_ITEM] : []),
    );
    renderTab();

    await waitFor(() =>
      expect(queryByCy("btn-modifier-frais-bail-societe-5")).toHaveTextContent(
        "Modifier les frais",
      ),
    );
    await waitFor(() =>
      expect(queryByCy("btn-modifier-frais-bail-societe-6")).toHaveTextContent(
        "Ajouter des frais",
      ),
    );
    expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 5);
    expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6);
  });

  it("keeps Modifier les frais while the expense query is pending", async () => {
    vi.mocked(api.expenseItems.list).mockImplementation(
      () => new Promise(() => {}),
    );
    renderTab();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("btn-modifier-frais-bail-societe-5")).toHaveTextContent(
      "Modifier les frais",
    );
  });

  it("keeps Modifier les frais when the expense query fails", async () => {
    vi.mocked(api.expenseItems.list).mockRejectedValue(new Error("boom"));
    renderTab();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await waitFor(() =>
      expect(queryByCy("btn-modifier-frais-bail-societe-5")).toHaveTextContent(
        "Modifier les frais",
      ),
    );
  });

  it("does not read the linked company.leaseId", async () => {
    renderTab({ ...COMPANY, leaseId: 6 });

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(rowOrder()).toEqual([5, 6]);
    expect(screen.queryByText("Bail actif")).toBeNull();
  });

  it("does not render the accordion, statement actions or history anymore", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("btn-afficher-frais-bail-societe-5")).toBeNull();
    expect(queryByCy("btn-note-frais-bail-societe-5")).toBeNull();
    expect(queryByCy("notes-frais-bail-5")).toBeNull();
    expect(queryByCy("bail-societe-lie")).toBeNull();
    expect(queryByCy("aucun-bail-societe")).toBeNull();
    expect(document.querySelector(".company-lease-tab-none")).toBeNull();
  });

  it("opens the shared LMNP lease modal with the company lease preset", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    await user.click(queryByCy("btn-ajouter-bail-societe") as HTMLElement);

    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    expect(queryByCy("input-bail-societe-type")).toBeChecked();
    expect(queryByCy("select-bail-locataire-societe")).toHaveValue("1");
  });

  it("shows the created lease in the list after saving", async () => {
    vi.mocked(api.leases.create).mockResolvedValue(LEASE6);
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    vi.mocked(api.leases.list).mockResolvedValue([
      LEASE5,
      LEASE6,
      LEASE7,
      {
        ...LEASE6,
        id: 8,
        propertyAddress: "3 rue Nouvelle, 75005 Paris",
      },
    ]);

    await user.click(queryByCy("btn-ajouter-bail-societe") as HTMLElement);
    await user.selectOptions(
      queryByCy("select-bail-bailleur") as HTMLElement,
      "1",
    );
    await user.type(
      queryByCy("input-bail-adresse") as HTMLElement,
      "3 rue Nouvelle, 75005 Paris",
    );
    await user.type(queryByCy("input-bail-loyer") as HTMLElement, "800,00");
    await user.type(queryByCy("input-bail-charges") as HTMLElement, "0,00");
    await user.type(queryByCy("input-surface-totale") as HTMLElement, "60,00");
    await user.type(queryByCy("input-surface-pro") as HTMLElement, "30,00");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyLease: true,
          companyId: 1,
          propertyAddress: "3 rue Nouvelle, 75005 Paris",
        }),
      ),
    );
    await waitFor(() => expect(queryByCy("bail-societe-8")).not.toBeNull());
  });

  it("opens the edit modal prefilled with the unchanged LeaseForm", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(queryByCy("btn-modifier-bail-societe-6") as HTMLElement);

    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    expect(queryByCy("input-bail-adresse")).toHaveValue(
      "8 impasse des Acacias, 69003 Lyon",
    );
    expect(queryByCy("input-bail-loyer")).toHaveValue("700,00");
    expect(queryByCy("input-surface-totale")).toHaveValue("40,00");
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("saves the edited lease through the lease update and refreshes the list", async () => {
    vi.mocked(api.leases.update).mockResolvedValue({
      ...LEASE6,
      propertyAddress: "9 rue Modifiée, 69003 Lyon",
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    vi.mocked(api.leases.list).mockResolvedValue([
      LEASE5,
      { ...LEASE6, propertyAddress: "9 rue Modifiée, 69003 Lyon" },
      LEASE7,
    ]);

    await user.click(queryByCy("btn-modifier-bail-societe-6") as HTMLElement);
    await user.clear(queryByCy("input-bail-adresse") as HTMLElement);
    await user.type(
      queryByCy("input-bail-adresse") as HTMLElement,
      "9 rue Modifiée, 69003 Lyon",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.update).toHaveBeenCalledWith(
        6,
        expect.objectContaining({
          companyLease: true,
          companyId: 1,
          propertyAddress: "9 rue Modifiée, 69003 Lyon",
        }),
      ),
    );
    await waitFor(() =>
      expect(queryByCy("dialogue-formulaire-bail")).toBeNull(),
    );
    await waitFor(() =>
      expect(queryByCy("bail-societe-6")).toHaveTextContent(
        "9 rue Modifiée, 69003 Lyon",
      ),
    );
  });

  it("closes the edit modal with Annuler without saving", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.click(queryByCy("btn-modifier-bail-societe-6") as HTMLElement);
    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(queryByCy("dialogue-formulaire-bail")).toBeNull();
    expect(api.leases.update).not.toHaveBeenCalled();
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("renders the company lease tab in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.expenseItems.list).mockImplementation(
      (_companyId, _all, leaseId) =>
        Promise.resolve(leaseId === 6 ? [] : [EXPENSE_ITEM]),
    );
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(
      screen.getByRole("heading", { name: "Company leases" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "A company can be the tenant of several leases. “Edit expenses” opens the lease expense items; items inherited at company level stay visible and editable in each lease.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Add a lease" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "General expenses" }),
    ).toBeNull();
    expect(queryByCy("bail-societe-5")).toHaveTextContent("M. Bailleur");
    expect(queryByCy("loyer-bail-societe-5")).toHaveTextContent("900,00 €");
    expect(queryByCy("charges-bail-societe-5")).toHaveTextContent("50,00 €");
    const headers = queryByCy("entetes-baux-societe") as HTMLElement;
    expect(within(headers).getByText("Address")).toBeVisible();
    expect(within(headers).getByText("Landlord")).toBeVisible();
    expect(within(headers).getByText("Rent")).toBeVisible();
    expect(within(headers).getByText("Charges")).toBeVisible();
    expect(within(headers).getByText("Actions")).toBeVisible();
    await waitFor(() =>
      expect(queryByCy("btn-modifier-frais-bail-societe-5")).toHaveTextContent(
        "Edit expenses",
      ),
    );
    await waitFor(() =>
      expect(queryByCy("btn-modifier-frais-bail-societe-6")).toHaveTextContent(
        "Add expenses",
      ),
    );
    expect(queryByCy("btn-modifier-bail-societe-5")).toHaveTextContent(
      "Edit lease",
    );
  });

  it("shows the English empty lease state", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.leases.list).mockResolvedValue([]);
    renderTab();

    await waitFor(() =>
      expect(queryByCy("liste-baux-societe-vide")).not.toBeNull(),
    );
    expect(
      screen.getByText(
        "No lease for this company. Add the first lease with “Add a lease”.",
      ),
    ).toBeVisible();
  });

  it("filters the company leases by address with a live count and no-match state", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    expect(queryByCy("filtre-compteur-baux-societe")).toHaveTextContent(
      "2 sur 2",
    );

    await user.type(queryByCy("filtre-baux-societe") as HTMLElement, "acacias");

    expect(queryByCy("bail-societe-6")).not.toBeNull();
    expect(queryByCy("bail-societe-5")).toBeNull();
    expect(queryByCy("filtre-compteur-baux-societe")).toHaveTextContent(
      "1 sur 2",
    );

    await user.click(queryByCy("filtre-effacer-baux-societe") as HTMLElement);
    expect(rowOrder()).toEqual([5, 6]);

    await user.type(queryByCy("filtre-baux-societe") as HTMLElement, "zzz");

    expect(queryByCy("aucun-resultat-baux-societe")).toHaveTextContent(
      "Aucun résultat pour « zzz ».",
    );
    expect(queryByCy("entetes-baux-societe")).toBeNull();
    expect(rowOrder()).toEqual([]);
  });

  it("keeps the filter, its live count and the add action in the section header", async () => {
    renderTab();
    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());

    const search = queryByCy("filtre-baux-societe") as HTMLElement;
    const count = queryByCy("filtre-compteur-baux-societe") as HTMLElement;
    const add = queryByCy("btn-ajouter-bail-societe") as HTMLElement;
    expect(search).not.toBeNull();
    expect(search).toHaveAttribute("aria-label", "Filtrer la liste");
    expect(search).toHaveAttribute("placeholder", "Filtrer les baux…");
    expect(search.closest(".card-header")).not.toBeNull();
    expect(count.closest(".card-header")).toBe(search.closest(".card-header"));
    expect(count).toHaveAttribute("aria-live", "polite");
    expect(count).toHaveTextContent("2 sur 2");
    expect(add.closest(".card-header")).toBe(search.closest(".card-header"));
    expect(document.querySelectorAll('input[type="search"]')).toHaveLength(1);
    expect(search.closest(".list-toolbar")).toBeNull();
    expect(queryByCy("tri-baux-societe")).toBeNull();
    expect(queryByCy("tri-direction-baux-societe")).toBeNull();
    expect(queryByCy("tri-compact-baux-societe")).not.toBeNull();
  });

  it("shows no filter, count or expenses action when there is no company lease", async () => {
    vi.mocked(api.leases.list).mockResolvedValue([]);
    renderTab();

    await waitFor(() =>
      expect(queryByCy("liste-baux-societe-vide")).not.toBeNull(),
    );
    expect(queryByCy("filtre-baux-societe")).toBeNull();
    expect(queryByCy("filtre-compteur-baux-societe")).toBeNull();
    expect(queryByCy("tri-compact-baux-societe")).toBeNull();
    expect(queryByCy("btn-frais-generaux-societe")).toBeNull();
  });
});

/** Lease ids in DOM order, read on the row elements. */
function rowOrder(): number[] {
  return [...document.querySelectorAll(".company-lease-tab-item")].map(
    (element) =>
      Number(
        (element as HTMLElement).dataset.cy?.replace("bail-societe-", "") ??
          NaN,
      ),
  );
}
