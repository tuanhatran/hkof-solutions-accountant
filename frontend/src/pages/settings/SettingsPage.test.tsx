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
  legalForm: "SAS",
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
    useLandlords: () => readyQuery([]),
    useTenants: () => readyQuery([]),
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

  it("opens on the Entreprise tab with the company form", () => {
    renderPage();

    expect(screen.getByRole("tab", { name: "Entreprise" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF");
    expect(screen.queryByRole("heading", { name: "Bailleurs" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Salariés" })).toBeNull();
    expect(screen.getByText("Location bail")).toBeVisible();
  });

  it("switches to the Quittances tab with the directories and signatures", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Quittances" }));

    expect(
      await screen.findByRole("heading", { name: "Bailleurs" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Locataires" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Signatures" })).toBeVisible();
    expect(screen.queryByLabelText("Raison sociale")).toBeNull();
    expect(screen.getByRole("tab", { name: "Quittances" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "Enregistrer" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Entreprise" }));
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF");
  });

  it("lists the employees of the selected company with their French title", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Salariés" }),
    ).toBeVisible();
    expect(screen.getByText("Camille Martin")).toBeVisible();
    expect(screen.getByText("PDG")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter un salarié" }),
    ).toBeEnabled();
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF");
  });

  it("scopes the employees to the company selected in the Entreprise tab", async () => {
    companiesState = readyQuery([COMPANY, OTHER]);
    renderPage();
    const user = userEvent.setup();

    expect(await screen.findByText("Camille Martin")).toBeVisible();

    await user.selectOptions(
      screen.getByLabelText("Société à configurer"),
      "2",
    );

    expect(
      await screen.findByText(
        "Aucun salarié dans cette société. Ajoutez le gérant et les salariés signataires.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Camille Martin")).toBeNull();
  });

  it("saves the company configuration and confirms in French", async () => {
    vi.mocked(api.companies.update).mockResolvedValue(COMPANY);
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("Toutes les valeurs sont à jour.")).toBeVisible();
    await user.clear(screen.getByLabelText("Raison sociale"));
    await user.type(screen.getByLabelText("Raison sociale"), "HKOF 2");
    expect(screen.getByText("Modifications non enregistrées.")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Enregistrer la configuration" }),
    );

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
  });

  it("shows the validation message when the company name is empty", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Raison sociale"));
    await user.click(
      screen.getByRole("button", { name: "Enregistrer la configuration" }),
    );

    expect(
      await screen.findByText("Le nom de la société est obligatoire."),
    ).toBeVisible();
    expect(api.companies.update).not.toHaveBeenCalled();
  });

  it("computes the indicative pro-rata from the selected lease surfaces", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("35,71 %")).toBeVisible();
    expect(screen.getByLabelText("Bail de la société")).toHaveValue("5");

    await user.selectOptions(screen.getByLabelText("Bail de la société"), "");

    expect(
      document.querySelector('[data-cy="prorata-indicatif"]'),
    ).toHaveTextContent("—");
  });

  it("unlinks the lease when Aucun bail is selected", async () => {
    vi.mocked(api.companies.update).mockResolvedValue(OTHER);
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(screen.getByLabelText("Bail de la société"), "");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer la configuration" }),
    );

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ leaseId: null }),
      ),
    );
  });

  it("surfaces the save error in the save bar", async () => {
    vi.mocked(api.companies.update).mockRejectedValue(
      new Error("Enregistrement impossible."),
    );
    renderPage();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Raison sociale"));
    await user.type(screen.getByLabelText("Raison sociale"), "HKOF 3");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer la configuration" }),
    );

    expect(await screen.findByText("Enregistrement impossible.")).toBeVisible();
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

    await user.type(screen.getByLabelText("Raison sociale"), "HKOF");
    await user.click(screen.getByRole("button", { name: "Créer la société" }));

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

  it("hides the company selector while creating a new company", async () => {
    companiesState = readyQuery([COMPANY, OTHER]);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Nouvelle société" }));

    expect(screen.queryByLabelText("Société à configurer")).toBeNull();
    expect(
      screen.queryByText(
        "Aucune société configurée. Créez la première société.",
      ),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Supprimer" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Salariés" })).toBeNull();
    expect(
      document.querySelector('[data-cy="formulaire-societe"]'),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    const selector = screen.getByLabelText("Société à configurer");
    await user.selectOptions(selector, "2");
    expect(selector).toHaveValue("2");
  });

  it("deletes a company after confirmation", async () => {
    vi.mocked(api.companies.delete).mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(await screen.findByText("Supprimer cette société ?")).toBeVisible();
    expect(screen.getByText(/et ses salariés seront supprimés/)).toBeVisible();
    expect(screen.getByText(/baux seront détachés/)).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer la société" }),
    );

    await waitFor(() => expect(api.companies.delete).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(toastMessages()).toContain("Société supprimée."),
    );
  });

  it("adds an employee to the active company", async () => {
    vi.mocked(api.employees.create).mockResolvedValue({
      id: 4,
      companyId: 1,
      firstName: "Alex",
      lastName: "Durand",
      title: "EMPLOYEE",
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un salarié" }),
    );
    await user.type(screen.getByLabelText("Prénom"), "Alex");
    await user.type(screen.getByLabelText("Nom"), "Durand");
    await user.click(
      screen.getByRole("button", { name: "Ajouter le salarié" }),
    );

    await waitFor(() =>
      expect(api.employees.create).toHaveBeenCalledWith(1, {
        companyId: 1,
        firstName: "Alex",
        lastName: "Durand",
        email: null,
        title: "EMPLOYEE",
      }),
    );
  });

  it("falls back on the default pro-rata for a new expense item", async () => {
    companiesState = readyQuery([{ ...COMPANY, proRataBase: undefined }]);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un type" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "100,00",
    );
  });
});
