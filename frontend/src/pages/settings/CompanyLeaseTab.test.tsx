import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { CompanyDto, LeaseDto } from "@/api/types";
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
  vi.mocked(api.expenseItems.list).mockReset();
  vi.mocked(api.expenseItems.create).mockReset();
  vi.mocked(api.persons.list).mockResolvedValue([
    { id: 1, name: "M. Bailleur", address: "" },
  ]);
  vi.mocked(api.addresses.list).mockResolvedValue([]);
  vi.mocked(api.leases.list).mockResolvedValue([LEASE5, LEASE6, LEASE7]);
  vi.mocked(api.expenseItems.list).mockResolvedValue([]);
  useToasts.setState({ toasts: [] });
});

describe("CompanyLeaseTab", () => {
  it("lists only the leases of the company and marks the active one", async () => {
    renderTab();

    await waitFor(() => expect(queryByCy("bail-societe-5")).not.toBeNull());
    expect(queryByCy("bail-societe-6")).not.toBeNull();
    expect(queryByCy("bail-societe-7")).toBeNull();
    expect(
      withinLease("bail-societe-5").getByText("Bail actif"),
    ).toBeInTheDocument();
    expect(withinLease("bail-societe-6").queryByText("Bail actif")).toBeNull();
  });

  it("defaults the dropdown to the company's active lease", async () => {
    renderTab();

    await waitFor(() =>
      expect(queryByCy("select-bail-actif")).toHaveValue("5"),
    );
  });

  it("switching the lease persists it via the company update and switches the postes scope", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: 6,
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("select-bail-actif")).not.toBeNull());
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 5),
    );

    await user.selectOptions(
      queryByCy("select-bail-actif") as HTMLElement,
      "6",
    );

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: "HKOF", leaseId: 6 }),
      ),
    );
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6),
    );
    expect(queryByCy("bail-societe-lie")).toHaveTextContent(
      "8 impasse des Acacias, 69003 Lyon",
    );
    expect(queryByCy("prorata-bail-societe")).toHaveTextContent("25 %");
    expect(queryByCy("prorata-indicatif")).toBeNull();
  });

  it("reverts the selection and shows a French toast when the switch fails", async () => {
    vi.mocked(api.companies.update).mockRejectedValue(
      new Error("Ce bail est déjà lié à une autre société."),
    );
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.selectOptions(
      queryByCy("select-bail-actif") as HTMLElement,
      "6",
    );

    await waitFor(() =>
      expect(
        useToasts
          .getState()
          .toasts.some(
            (entry) =>
              entry.type === "error" &&
              entry.message === "Ce bail est déjà lié à une autre société.",
          ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect(queryByCy("select-bail-actif")).toHaveValue("5"),
    );
  });

  it("persists an active-lease change and the unselection for a sparse company", async () => {
    vi.mocked(api.companies.update)
      .mockResolvedValueOnce({ id: 1, leaseId: 6 })
      .mockResolvedValueOnce({ leaseId: null });
    renderTab({ id: 1 });
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());
    expect(queryByCy("aucun-bail-societe")).not.toBeNull();

    await user.selectOptions(
      queryByCy("select-bail-actif") as HTMLElement,
      "6",
    );
    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: "",
          legalForm: "",
          siren: "",
          address: "",
          managerName: "",
          issuePlace: "",
          leaseId: 6,
        }),
      ),
    );
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, 6),
    );

    await user.selectOptions(queryByCy("select-bail-actif") as HTMLElement, "");
    await waitFor(() =>
      expect(api.companies.update).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ leaseId: null }),
      ),
    );
    await waitFor(() =>
      expect(api.expenseItems.list).toHaveBeenCalledWith(1, true, null),
    );
    expect(queryByCy("aucun-bail-societe")).not.toBeNull();
  });

  it("keeps the backend pro-rata visible for the linked lease", async () => {
    renderTab();
    await waitFor(() => expect(queryByCy("bail-societe-lie")).not.toBeNull());

    expect(api.companies.update).not.toHaveBeenCalled();
    expect(queryByCy("prorata-bail-societe")).toHaveTextContent("35,71 %");
    expect(queryByCy("prorata-indicatif")).toBeNull();
  });

  it("opens the shared LMNP lease modal with the company lease preset", async () => {
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("select-bail-actif")).not.toBeNull());

    await user.click(queryByCy("btn-ajouter-bail-societe") as HTMLElement);

    expect(queryByCy("dialogue-formulaire-bail")).not.toBeNull();
    expect(queryByCy("input-bail-societe-type")).toBeChecked();
    expect(queryByCy("select-bail-locataire-societe")).toHaveValue("1");
  });

  it("shows the created lease in the list after saving", async () => {
    vi.mocked(api.leases.create).mockResolvedValue(LEASE6);
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("select-bail-actif")).not.toBeNull());
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

  it("creates a new poste for the selected lease", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: 6,
    });
    vi.mocked(api.expenseItems.create).mockResolvedValue({
      id: 11,
      label: "Gaz",
    });
    renderTab();
    const user = userEvent.setup();
    await waitFor(() => expect(queryByCy("select-bail-actif")).not.toBeNull());
    await waitFor(() => expect(queryByCy("bail-societe-6")).not.toBeNull());

    await user.selectOptions(
      queryByCy("select-bail-actif") as HTMLElement,
      "6",
    );
    await user.click(screen.getByRole("button", { name: "Ajouter un type" }));
    await user.type(screen.getByLabelText("Libellé affiché"), "Gaz");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.expenseItems.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 1, leaseId: 6, label: "Gaz" }),
      ),
    );
  });
});

function withinLease(cy: string): ReturnType<typeof within> {
  const element = queryByCy(cy);
  if (!element) {
    throw new Error(`missing ${cy}`);
  }
  return within(element as HTMLElement);
}
