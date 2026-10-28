import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type {
  CompanyDto,
  EmployeeDto,
  LeaseDto,
  TemplateDto,
  TemplateType,
} from "@/api/types";
import i18n from "@/i18n";
import { SettingsPage } from "@/pages/settings/SettingsPage";
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
  proRataBase: "35.71",
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
let leasesState: QueryLike<LeaseDto[]>;

const EXPENSE_BUILT_IN: TemplateDto = {
  id: 3,
  type: "EXPENSE_STATEMENT",
  name: "Note de frais intégrée",
  version: 1,
  format: "HTML",
  active: true,
  builtIn: true,
  createdAt: "2026-02-01T10:00:00Z",
};

let templatesByType: Record<TemplateType, TemplateDto[]>;

function readyQuery<T>(data: T[]): QueryLike<T[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: () => null,
}));

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
    usePersons: () => readyQuery([]),
    useSignatures: () => readyQuery([]),
    useAddresses: () =>
      readyQuery([{ id: 3, label: "12 rue des Lilas, 75011 Paris" }]),
    useLeases: () => leasesState,
    useTemplates: (type: TemplateType) => readyQuery(templatesByType[type]),
    useTemplateVariables: () => readyQuery([]),
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
    leasesState = readyQuery([LEASE]);
    employeesState = readyQuery([CEO]);
    templatesByType = {
      RENT_RECEIPT: [],
      EXPENSE_STATEMENT: [EXPENSE_BUILT_IN],
    };
    vi.mocked(api.companies.update).mockReset();
    vi.mocked(api.companies.create).mockReset();
    vi.mocked(api.companies.delete).mockReset();
    vi.mocked(api.employees.create).mockReset();
    useToasts.setState({ toasts: [] });
  });

  it("renders the selector, the four tabs and the read-only identity by default", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Société", level: 1 }),
    ).toBeVisible();
    expect(screen.getByLabelText("Société à configurer")).toHaveValue("1");
    expect(screen.getByRole("tab", { name: "Info générale" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Baux & Frais" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Salariés" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Modèles" })).toBeVisible();
    expect(queryByCy("info-societe")).not.toBeNull();
    expect(queryByCy("onglet-entreprise-identification")).not.toBeNull();
    expect(queryByCy("input-raison-sociale")).toBeNull();
  });

  it("renders the settings page, toolbar, tabs and identity in English", async () => {
    await i18n.changeLanguage("en");
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Company", level: 1 }),
    ).toBeVisible();
    expect(screen.getByLabelText("Company to configure")).toHaveValue("1");
    expect(screen.getByRole("tab", { name: "General info" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("tab", { name: "Leases & Expenses" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "Employees" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Templates" })).toBeVisible();
    expect(screen.getByText("Company name")).toBeVisible();
    expect(screen.getByText("Manager")).toBeVisible();
    expect(screen.getByRole("button", { name: "New company" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete" })).toBeVisible();
    expect(queryByCy("info-societe")).toHaveTextContent("HKOF");
  });

  it("relabels the tabs without a reload when the language switches", async () => {
    renderPage();
    expect(screen.getByRole("tab", { name: "Info générale" })).toBeVisible();

    await act(async () => {
      await i18n.changeLanguage("en");
    });

    expect(screen.getByRole("tab", { name: "General info" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Info générale" })).toBeNull();
    expect(screen.getByText("Company name")).toBeVisible();
  });

  it("asks to delete a company in English and toasts in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.companies.delete).mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog", {
      name: "Delete this company?",
    });
    expect(dialog).toHaveTextContent(
      "“HKOF” and its employees will be deleted.",
    );
    await user.click(
      screen.getByRole("button", { name: "Delete the company" }),
    );

    await waitFor(() => expect(api.companies.delete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(toastMessages()).toContain("Company deleted."));
  });

  it("orders the company toolbar, the four tabs and the company card like LMNP", () => {
    renderPage();

    const selector = screen.getByLabelText("Société à configurer");
    const toolbar = selector.closest(".company-section-toolbar");
    expect(toolbar).not.toBeNull();
    const controls = Array.from(toolbar?.children ?? []);
    expect(controls[0]).toBe(selector);
    expect(controls[1]).toHaveTextContent("Nouvelle société");
    expect(controls[2]).toHaveTextContent("Supprimer");

    const tabs = screen.getByRole("tablist", {
      name: "Sections de la société",
    });
    const card = document.querySelector("section.card.company-section");
    expect(card).not.toBeNull();
    expect(
      toolbar!.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      tabs.compareDocumentPosition(card!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const panel = document.querySelector(
      '[role="tabpanel"].company-section-tabpanel',
    );
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("id", "company-section-panel");
    expect(panel).toHaveAttribute(
      "aria-labelledby",
      "company-tabs-tab-identification",
    );
    expect(panel?.closest("section.card.company-section")).not.toBeNull();

    const identity = queryByCy("info-societe");
    expect(identity?.closest("section")?.classList.contains("card")).toBe(
      false,
    );
  });

  it("removes the inner card chrome from the Baux & Frais and Salariés tabs", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);
    expect(
      document
        .querySelector("section.company-lease-tab-leases")
        ?.classList.contains("card"),
    ).toBe(false);

    await user.click(queryByCy("bail-societe-5") as Element);
    expect(
      document
        .querySelector("section.expense-items-manager")
        ?.classList.contains("card"),
    ).toBe(false);

    await user.click(queryByCy("onglet-entreprise-salaries") as Element);
    expect(
      document
        .querySelector("section.employee-section")
        ?.classList.contains("card"),
    ).toBe(false);
  });

  it("renders the embedded templates tab without a nested card", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-templates") as Element);

    const templates = document.querySelector("section.templates-card");
    expect(templates).not.toBeNull();
    expect(templates?.classList.contains("card")).toBe(false);
  });

  it("shows only the expense statement template card on the Templates tab", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-templates") as Element);

    expect(
      await screen.findByRole("heading", {
        name: "Note de frais d’occupation",
      }),
    ).toBeVisible();
    expect(queryByCy("dropzone-template-note")).not.toBeNull();
    expect(queryByCy("dropzone-template-quittance")).toBeNull();
    expect(
      screen.getByText(/Les modèles ne peuvent exécuter aucun code/),
    ).toBeVisible();
    expect(queryByCy("info-societe")).toBeNull();
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

  it("shows the lease view and the expense items on the Baux & Frais tab", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);

    // Arriving on the tab, every lease is collapsed, even the active one.
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("bail-societe-lie")).toBeNull();

    await user.click(queryByCy("bail-societe-5") as Element);

    expect(queryByCy("bail-societe-lie")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Postes" })).toBeVisible();
    expect(queryByCy("select-bail-actif")).toBeNull();
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(api.companies.update).not.toHaveBeenCalled();
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

  it("creates a company through the empty identity modal and selects it for configuration", async () => {
    companiesState = readyQuery([OTHER]);
    vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Nouvelle société" }));

    expect(queryByCy("dialogue-formulaire-societe")).not.toBeNull();
    expect(queryByCy("input-raison-sociale")).toHaveValue("");
    expect(queryByCy("select-societe")).not.toBeNull();

    await user.type(queryByCy("input-raison-sociale") as HTMLElement, "HKOF");
    // The create mutation invalidates the companies query: the refetched list
    // contains the new company before the modal closes.
    companiesState = readyQuery([COMPANY, OTHER]);
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
    await waitFor(() =>
      expect(screen.getByLabelText("Société à configurer")).toHaveValue("1"),
    );
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
    // The delete mutation invalidates the companies query: the refetched list is
    // empty, so the selector disappears.
    companiesState = readyQuery([]);
    await user.click(
      screen.getByRole("button", { name: "Supprimer la société" }),
    );

    await waitFor(() => expect(api.companies.delete).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(toastMessages()).toContain("Société supprimée."),
    );
    expect(queryByCy("dialogue-formulaire-societe")).toBeNull();
    expect(queryByCy("select-societe")).toBeNull();
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

    expect(screen.getByText(/^Aucun bail déplié/)).toBeVisible();
  });

  it("lists the company's leases with show-expenses and edit buttons, without the legacy modal", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);

    expect(queryByCy("select-bail-actif")).toBeNull();
    expect(queryByCy("bail-societe-5")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(queryByCy("dialogue-formulaire-bail-societe")).toBeNull();
    expect(queryByCy("btn-modifier-bail-societe")).toBeNull();
    expect(queryByCy("btn-modifier-bail-societe-5")).not.toBeNull();
    expect(queryByCy("btn-afficher-frais-bail-societe-5")).not.toBeNull();
    expect(queryByCy("btn-note-frais-bail-societe-5")).not.toBeNull();
    expect(screen.queryByText("Bail actif")).toBeNull();
  });

  it("selects the company locally in the configuration selector", async () => {
    companiesState = readyQuery([COMPANY, OTHER]);
    renderPage();
    const user = userEvent.setup();

    await user.selectOptions(
      screen.getByLabelText("Société à configurer"),
      "2",
    );

    expect(screen.queryByRole("button", { name: "Rendre active" })).toBeNull();
    expect(queryByCy("btn-rendre-active")).toBeNull();
    expect(screen.getByLabelText("Société à configurer")).toHaveValue("2");
    expect(queryByCy("info-societe")).toHaveTextContent("Autre SARL");
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

  it("opens the expense item form from the Baux & Frais tab", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);
    await user.click(queryByCy("bail-societe-5") as Element);
    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "35,71",
    );
  });

  it("falls back on the default pro-rata for a new expense item", async () => {
    companiesState = readyQuery([{ ...COMPANY, proRataBase: undefined }]);
    leasesState = readyQuery([{ ...LEASE, proRataBase: null }]);
    renderPage();
    const user = userEvent.setup();

    await user.click(queryByCy("onglet-entreprise-bail-frais") as Element);
    await user.click(queryByCy("bail-societe-5") as Element);
    await user.click(screen.getByRole("button", { name: "Ajouter un poste" }));

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
        issuePlace: null,
      }),
    );
  });
});
