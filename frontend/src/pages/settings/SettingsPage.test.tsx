import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { CompanyDto, EmployeeDto, LeaseDto } from "@/api/types";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { useCompanyStore } from "@/state/company";
import { useToasts } from "@/state/toasts";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

const COMPANY: CompanyDto = {
  id: 1,
  name: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  leaseId: 5,
  proRataBase: "35.71",
  proRataBaseDetail: "25,00 m² sur 70,00 m²",
  issuePlace: "Paris",
};

const OTHER: CompanyDto = {
  id: 2,
  name: "Autre SARL",
  legalForm: "SARL",
  siren: "987 654 321",
  address: "2 rue du Marché, 75003 Paris",
  managerName: "Alex Durand",
  leaseId: null,
  proRataBase: "0.00",
  proRataBaseDetail: "Surfaces non configurées",
  issuePlace: "Paris",
};

const LEASE: LeaseDto = {
  id: 5,
  addressId: 3,
  companyId: 1,
  companyName: "HKOF",
  companyLease: true,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
};

const CEO: EmployeeDto = {
  id: 3,
  companyId: 1,
  firstName: "Camille",
  lastName: "Martin",
  email: "camille.martin@exemple.fr",
  title: "CEO",
};

let companiesState: QueryLike<CompanyDto[]>;
let employeesState: QueryLike<EmployeeDto[]>;

function readyQuery<T>(data: T[]): QueryLike<T[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

vi.mock("@/api/endpoints", () => ({
  api: {
    companies: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    employees: {
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
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useCompanies: () => companiesState,
    useEmployees: (companyId: number | null) =>
      companyId === 2 ? readyQuery([]) : employeesState,
    useExpenseItems: () => readyQuery([]),
    useSignatures: () => readyQuery([]),
    useAddresses: () =>
      readyQuery([{ id: 3, label: "12 rue des Lilas, 75011 Paris" }]),
    useLeases: () => readyQuery([LEASE]),
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

function queryByCy(cy: string): Element | null {
  return document.querySelector(`[data-cy="${cy}"]`);
}

describe("SettingsPage tabs", () => {
  beforeEach(() => {
    companiesState = readyQuery([COMPANY]);
    employeesState = readyQuery([CEO]);
    useCompanyStore.setState({ activeCompanyId: 1 });
    vi.mocked(api.companies.update).mockReset();
    vi.mocked(api.companies.create).mockReset();
    vi.mocked(api.companies.delete).mockReset();
    vi.mocked(api.employees.create).mockReset();
    useToasts.setState({ toasts: [] });
  });

  it("renders the selector, the three tabs and the read-only identity by default", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Entreprise", level: 1 }),
    ).toBeVisible();
    expect(screen.getByLabelText("Société à configurer")).toHaveValue("1");
    expect(screen.getByRole("tab", { name: "Info générale" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Bail & Frais" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Salariés" })).toBeVisible();
    expect(queryByCy("info-societe")).not.toBeNull();
    expect(queryByCy("onglet-entreprise-identification")).not.toBeNull();
    expect(queryByCy("input-raison-sociale")).toBeNull();
  });

  it("no longer renders the legacy Quittances directories", () => {
    renderPage();

    expect(screen.queryByRole("heading", { name: "Bailleurs" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Locataires" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Signatures" })).toBeNull();
    expect(queryByCy("info-societe")).toHaveTextContent("HKOF");
    expect(
      screen.queryByRole("button", { name: "Enregistrer" }),
    ).not.toBeInTheDocument();
  });

  it("shows the lease view and the expense items on the Bail & Frais tab", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);

    expect(queryByCy("bail-societe-lie")).not.toBeNull();
    expect(screen.getByText("12 rue des Lilas, 75011 Paris")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Types de frais" }),
    ).toBeVisible();
    expect(screen.getAllByText("35,71 %").length).toBeGreaterThanOrEqual(1);
    expect(
      document.querySelectorAll('[data-cy="prorata-bail-societe"]'),
    ).toHaveLength(1);
    expect(queryByCy("select-bail-societe")).toBeNull();
  });

  it("shows the employees on the Salariés tab", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-salaries") as Element);

    expect(
      await screen.findByRole("heading", { name: "Salariés", level: 2 }),
    ).toBeVisible();
    expect(screen.getByText("Camille Martin")).toBeVisible();
    expect(screen.getByText("PDG")).toBeVisible();
  });

  it("scopes the employees to the company selected in the selector", async () => {
    companiesState = readyQuery([COMPANY, OTHER]);
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-salaries") as Element);
    expect(await screen.findByText("Camille Martin")).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText("Société à configurer"),
      "2",
    );
    expect(queryByCy("onglet-entreprise-identification")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.click(queryByCy("onglet-entreprise-salaries") as Element);

    expect(
      await screen.findByText(
        "Aucun salarié dans cette société. Ajoutez le gérant et les salariés signataires.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Camille Martin")).toBeNull();
  });

  it("opens the identity modal from Modifier with prefilled fields and saves it", async () => {
    vi.mocked(api.companies.update).mockResolvedValue(COMPANY);
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("btn-modifier-societe") as HTMLElement);
    expect(queryByCy("dialogue-formulaire-societe")).not.toBeNull();
    expect(queryByCy("input-raison-sociale")).toHaveValue("HKOF");

    await user.clear(queryByCy("input-raison-sociale") as HTMLElement);
    await user.type(queryByCy("input-raison-sociale") as HTMLElement, "HKOF 2");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(1, {
        name: "HKOF 2",
        legalForm: "EURL",
        siren: "123 456 789",
        address: "1 rue de la Paix, 75002 Paris",
        managerName: "Camille Martin",
        leaseId: 5,
        issuePlace: "Paris",
      }),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Société enregistrée. Les prochains documents utiliseront ces valeurs.",
      ),
    );
    await waitFor(() =>
      expect(queryByCy("dialogue-formulaire-societe")).toBeNull(),
    );
  });

  it("blocks the identity modal save while the name is empty", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("btn-modifier-societe") as HTMLElement);
    await user.clear(queryByCy("input-raison-sociale") as HTMLElement);
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText("Le nom de la société est obligatoire."),
    ).toBeVisible();
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("creates a company through the empty identity modal and activates it", async () => {
    companiesState = readyQuery([OTHER]);
    useCompanyStore.setState({ activeCompanyId: 2 });
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Nouvelle société" }));

    expect(queryByCy("dialogue-formulaire-societe")).not.toBeNull();
    expect(queryByCy("input-raison-sociale")).toHaveValue("");
    expect(queryByCy("select-societe")).not.toBeNull();

    await user.type(queryByCy("input-raison-sociale") as HTMLElement, "HKOF");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith({
        name: "HKOF",
        legalForm: "",
        siren: "",
        address: "",
        managerName: "",
        leaseId: null,
        issuePlace: "",
      }),
    );
    await waitFor(() => expect(toastMessages()).toContain("Société créée."));
    expect(useCompanyStore.getState().activeCompanyId).toBe(1);
    await waitFor(() =>
      expect(queryByCy("dialogue-formulaire-societe")).toBeNull(),
    );
  });

  it("closes modals and resets the tab when switching company", async () => {
    companiesState = readyQuery([COMPANY, OTHER]);
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("btn-modifier-societe") as HTMLElement);
    expect(queryByCy("dialogue-formulaire-societe")).not.toBeNull();

    await user.selectOptions(
      screen.getByLabelText("Société à configurer"),
      "2",
    );

    expect(queryByCy("dialogue-formulaire-societe")).toBeNull();
    expect(queryByCy("onglet-entreprise-identification")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(queryByCy("info-societe")).toHaveTextContent("Autre SARL");
  });

  it("closes the identity modal when the selected company is deleted", async () => {
    vi.mocked(api.companies.delete).mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("btn-modifier-societe") as HTMLElement);
    expect(queryByCy("dialogue-formulaire-societe")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    await user.click(
      screen.getByRole("button", { name: "Supprimer la société" }),
    );

    await waitFor(() => expect(api.companies.delete).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(toastMessages()).toContain("Société supprimée."),
    );
    expect(queryByCy("dialogue-formulaire-societe")).toBeNull();
  });

  it("shows the no-lease sentence for a company without a lease", async () => {
    companiesState = readyQuery([
      COMPANY,
      { ...OTHER, proRataBase: undefined },
    ]);
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByLabelText("Société à configurer"),
      "2",
    );
    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);

    expect(screen.getByText(/^Aucun bail sélectionné/)).toBeVisible();
    expect(queryByCy("prorata-bail-societe")).toHaveTextContent("—");
  });

  it("opens the lease modal, unlinks the lease and preserves the identity", async () => {
    vi.mocked(api.companies.update).mockResolvedValue({
      ...COMPANY,
      leaseId: null,
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);
    await user.click(queryByCy("btn-modifier-bail-societe") as HTMLElement);

    expect(queryByCy("dialogue-formulaire-bail-societe")).not.toBeNull();
    expect(queryByCy("select-bail-societe")).toHaveValue("5");
    expect(queryByCy("prorata-indicatif")).toHaveTextContent("35,71 %");

    await user.selectOptions(
      queryByCy("select-bail-societe") as HTMLElement,
      "",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ leaseId: null, name: "HKOF" }),
      ),
    );
    await waitFor(() =>
      expect(queryByCy("dialogue-formulaire-bail-societe")).toBeNull(),
    );
  });

  it("makes another company active", async () => {
    companiesState = readyQuery([COMPANY, OTHER]);
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByLabelText("Société à configurer"),
      "2",
    );
    await user.click(screen.getByRole("button", { name: "Rendre active" }));

    expect(useCompanyStore.getState().activeCompanyId).toBe(2);
  });

  it("shows the loading then error states of the companies", async () => {
    const refetch = vi.fn();
    companiesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch,
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des sociétés…")).toBeVisible();
    loading.unmount();

    companiesState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Sociétés indisponibles"),
      refetch,
    };
    renderPage();
    expect(screen.getByText("Sociétés indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("creates the first company when none is configured", async () => {
    companiesState = readyQuery([]);
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    renderPage();
    const user = userEvent.setup();

    expect(
      screen.getByText("Aucune société configurée. Créez la première société."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Nouvelle société" }));
    await user.type(queryByCy("input-raison-sociale") as HTMLElement, "HKOF");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "HKOF", leaseId: null }),
      ),
    );
    await waitFor(() => expect(toastMessages()).toContain("Société créée."));
  });

  it("opens the expense item form from the Bail & Frais tab", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);
    await user.click(screen.getByRole("button", { name: "Ajouter un type" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
  });

  it("falls back on the default pro-rata for a new expense item", async () => {
    companiesState = readyQuery([{ ...COMPANY, proRataBase: undefined }]);
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);
    await user.click(screen.getByRole("button", { name: "Ajouter un type" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "100,00",
    );
  });

  it("adds an employee from the Salariés tab", async () => {
    vi.mocked(api.employees.create).mockResolvedValue({
      id: 4,
      companyId: 1,
      firstName: "Alex",
      lastName: "Durand",
      title: "EMPLOYEE",
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-salaries") as Element);
    await user.click(
      screen.getByRole("button", { name: "Ajouter un salarié" }),
    );
    await user.type(queryByCy("input-salarie-prenom") as HTMLElement, "Alex");
    await user.type(queryByCy("input-salarie-nom") as HTMLElement, "Durand");
    await user.click(queryByCy("btn-enregistrer-salarie") as HTMLElement);

    await waitFor(() =>
      expect(api.employees.create).toHaveBeenCalledWith(1, {
        companyId: 1,
        firstName: "Alex",
        lastName: "Durand",
        address: null,
        email: null,
        title: "EMPLOYEE",
      }),
    );
  });
});
