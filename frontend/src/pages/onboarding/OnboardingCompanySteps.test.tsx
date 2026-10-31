import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { setAuthUser } from "@/api/queries";
import { OnboardingPage } from "./OnboardingPage";

vi.mock("@/api/endpoints", () => ({
  api: {
    auth: {
      completeOnboarding: vi.fn(),
      me: vi.fn(),
    },
    landlords: {
      create: vi.fn(),
    },
    companies: {
      lookup: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    leases: {
      create: vi.fn(),
    },
    expenseItems: {
      create: vi.fn(),
    },
    employees: {
      create: vi.fn(),
    },
  },
}));

const EMAIL = "societe@exemple.fr";
const COMPLETED_USER = {
  email: EMAIL,
  onboardingCompleted: true,
};
const LOOKUP_COMPANY = {
  name: "HKOF",
  legalForm: "SAS",
  siren: "123456789",
  address: "10 rue de la Paix, 75002 Paris",
  managerName: "Alice Martin",
};

const ADDRESS_RESPONSE = {
  features: [
    {
      properties: {
        id: "addr-test-1",
        label: "2 rue du Test 75001 Paris",
        postcode: "75001",
        city: "Paris",
      },
    },
  ],
};

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/welcome"]}>
        <Routes>
          <Route path="/welcome" element={<OnboardingPage />} />
          <Route
            path="/generate/expense-statement"
            element={<p>Note de frais</p>}
          />
          <Route path="/dashboard" element={<p>Tableau de bord</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Raison sociale"), "HKOF");
  await user.type(screen.getByLabelText("Gérant"), "Alice Martin");
}

async function fillLease(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByLabelText("Adresse du logement"),
    "10 rue de la Paix, 75002 Paris",
  );
  await user.type(screen.getByLabelText("Surface totale (m²)"), "100");
  await user.type(screen.getByLabelText("Surface professionnelle (m²)"), "25");
  await user.type(screen.getByLabelText("Loyer hors charges"), "1200");
  await user.type(screen.getByLabelText("Provision pour charges"), "80");
  await user.type(screen.getByLabelText("Nom du bailleur"), "Bernard Dupont");
  await user.click(screen.getByRole("button", { name: "Continuer" }));
}

async function next(
  user: ReturnType<typeof userEvent.setup>,
  label = "Continuer",
) {
  await user.click(screen.getByRole("button", { name: label }));
}

async function reachEmployees(user: ReturnType<typeof userEvent.setup>) {
  await fillIdentity(user);
  await next(user);
  await fillLease(user);
  await next(user);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  } as Response);
  localStorage.clear();
  sessionStorage.clear();
  setAuthUser({
    email: EMAIL,
    role: "USER",
    companyEnabled: true,
    lmnpEnabled: false,
    onboardingCompleted: false,
  });
  vi.mocked(api.companies.lookup).mockResolvedValue(LOOKUP_COMPANY);
  vi.mocked(api.landlords.create).mockResolvedValue({
    id: 11,
    name: "Bernard Dupont",
  });
  vi.mocked(api.companies.create).mockResolvedValue({ id: 21, name: "HKOF" });
  vi.mocked(api.companies.update).mockResolvedValue({ id: 21, name: "HKOF" });
  vi.mocked(api.leases.create).mockResolvedValue({ id: 31 });
  vi.mocked(api.expenseItems.create).mockImplementation(async (body) => ({
    id: 41,
    code: body.code,
    label: body.label,
  }));
  vi.mocked(api.employees.create).mockImplementation(async (companyId) => ({
    id: 51,
    companyId,
    firstName: "Alice",
    lastName: "Martin",
    title: "CEO",
  }));
  vi.mocked(api.auth.completeOnboarding).mockResolvedValue(COMPLETED_USER);
  vi.mocked(api.auth.me).mockResolvedValue(COMPLETED_USER);
});

describe("Company onboarding wizard", () => {
  it("renders the five company steps for a company-only account", () => {
    renderWizard();

    expect(
      screen.getByRole("heading", {
        name: "Bienvenue dans HomeOfficeExpenses",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Étapes de l'inscription société" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Étape 1 sur 5 : Identité")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByLabelText("Étape 2 sur 5 : Bail")).toBeVisible();
    expect(
      screen.getByLabelText("Étape 3 sur 5 : Postes de frais"),
    ).toBeVisible();
    expect(screen.getByLabelText("Étape 4 sur 5 : Salariés")).toBeVisible();
    expect(screen.getByLabelText("Étape 5 sur 5 : Résumé")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Profil de l'agence" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Identité de la société" }),
    ).toBeVisible();
    expect(screen.getByRole("group", { name: "Langue" })).toBeVisible();
  });

  it("prefills the company identity from the SIREN lookup", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("SIREN"), "123456789");
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    await waitFor(() =>
      expect(api.companies.lookup).toHaveBeenCalledWith("123456789"),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF"),
    );
    expect(screen.getByLabelText("Forme juridique")).toHaveValue("SAS");
    expect(screen.getByLabelText("Adresse du siège")).toHaveValue(
      "10 rue de la Paix, 75002 Paris",
    );
    expect(screen.getByLabelText("Gérant")).toHaveValue("Alice Martin");
  });

  it("shows a display-only pro-rata preview and moves to the expense categories", async () => {
    const user = userEvent.setup();
    renderWizard();

    await fillIdentity(user);
    await next(user);

    expect(screen.getByRole("heading", { name: "Bail société" })).toBeVisible();
    await user.type(
      screen.getByLabelText("Adresse du logement"),
      "10 rue de la Paix, 75002 Paris",
    );
    await user.type(screen.getByLabelText("Surface totale (m²)"), "100");
    await user.type(
      screen.getByLabelText("Surface professionnelle (m²)"),
      "25",
    );

    expect(screen.getByText("25 %")).toBeVisible();
    expect(
      screen.getByText(/Le calcul définitif reste effectué par le backend/),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Loyer hors charges"), "1200");
    await user.type(screen.getByLabelText("Provision pour charges"), "80");
    await user.type(screen.getByLabelText("Nom du bailleur"), "Bernard Dupont");
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(
      screen.getByRole("heading", { name: "Postes de frais" }),
    ).toBeVisible();
  });

  it("prefills the manager as a CEO employee and lets another employee be added", async () => {
    const user = userEvent.setup();
    renderWizard();

    await reachEmployees(user);

    expect(screen.getByRole("heading", { name: "Salariés" })).toBeVisible();
    expect(screen.getByLabelText("Prénom du salarié 1")).toHaveValue("Alice");
    expect(screen.getByLabelText("Nom du salarié 1")).toHaveValue("Martin");
    expect(screen.getByLabelText("Intitulé du salarié 1")).toHaveValue("CEO");

    await user.click(
      screen.getByRole("button", { name: "Ajouter un salarié" }),
    );
    await user.type(screen.getByLabelText("Prénom du salarié 2"), "Bob");
    await user.type(screen.getByLabelText("Nom du salarié 2"), "Durand");
    await user.type(
      screen.getByLabelText("Adresse électronique du salarié 2"),
      "bob@exemple.fr",
    );
    await user.selectOptions(
      screen.getByLabelText("Intitulé du salarié 2"),
      "EMPLOYEE",
    );

    await next(user);
    expect(screen.getByRole("heading", { name: "Résumé" })).toBeVisible();
    expect(screen.getByText("Bob Durand")).toBeVisible();
  });

  it("finalizes the company, its lease, expense items and employees, then lands on the notes page", async () => {
    const user = userEvent.setup();
    renderWizard();

    await reachEmployees(user);
    await next(user);
    await user.click(
      screen.getByRole("button", { name: "Terminer l'inscription" }),
    );

    await waitFor(() => expect(api.landlords.create).toHaveBeenCalledTimes(1));
    expect(api.landlords.create).toHaveBeenCalledWith({
      name: "Bernard Dupont",
      address: null,
      phone: null,
      addressNote: null,
      issuePlace: null,
    });
    expect(api.companies.create).toHaveBeenCalledWith({
      name: "HKOF",
      legalForm: "",
      siren: "",
      siret: null,
      address: "",
      managerName: "Alice Martin",
      leaseId: null,
      issuePlace: "",
    });
    expect(api.leases.create).toHaveBeenCalledWith({
      companyLease: true,
      companyId: 21,
      landlordId: 11,
      propertyAddress: "10 rue de la Paix, 75002 Paris",
      totalArea: "100.00",
      businessArea: "25.00",
      rentExclCharges: "1200.00",
      charges: "80.00",
    });
    expect(api.companies.update).toHaveBeenCalledWith(
      21,
      expect.objectContaining({ leaseId: 31 }),
    );
    expect(api.expenseItems.create).toHaveBeenCalledTimes(5);
    expect(api.expenseItems.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        companyId: 21,
        leaseId: 31,
        code: "loyer",
        label: "Loyer",
      }),
    );
    expect(api.employees.create).toHaveBeenCalledWith(21, {
      companyId: 21,
      firstName: "Alice",
      lastName: "Martin",
      email: null,
      address: null,
      title: "CEO",
      issuePlace: null,
    });
    expect(api.auth.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Note de frais")).toBeVisible();
  });

  it("retries a failed finalize without duplicating the landlord, the company or the lease", async () => {
    vi.mocked(api.employees.create).mockRejectedValueOnce(
      new Error("Erreur serveur"),
    );
    const user = userEvent.setup();
    renderWizard();

    await reachEmployees(user);
    await next(user);
    await user.click(
      screen.getByRole("button", { name: "Terminer l'inscription" }),
    );

    expect(await screen.findByText("Erreur serveur")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Résumé" })).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Terminer l'inscription" }),
    );

    await waitFor(() => expect(api.auth.completeOnboarding).toHaveBeenCalled());
    expect(api.landlords.create).toHaveBeenCalledTimes(1);
    expect(api.companies.create).toHaveBeenCalledTimes(1);
    expect(api.leases.create).toHaveBeenCalledTimes(1);
    expect(api.expenseItems.create).toHaveBeenCalledTimes(5);
    expect(await screen.findByText("Note de frais")).toBeVisible();
  });

  it("skips the company onboarding to the company home page", async () => {
    const user = userEvent.setup();
    renderWizard();

    const skip = screen.getByRole("button", {
      name: "Passer au tableau de bord",
    });
    expect(skip).toHaveAttribute("data-cy", "btn-skip-onboarding");
    await user.click(skip);

    expect(await screen.findByText("Note de frais")).toBeVisible();
    expect(
      sessionStorage.getItem("homeofficeexpenses.onboarding_skipped"),
    ).toBe("true");
  });

  it("persists the draft and the created ids across a remount", async () => {
    const user = userEvent.setup();
    const first = renderWizard();

    await fillIdentity(user);
    await next(user);
    await user.type(
      screen.getByLabelText("Adresse du logement"),
      "10 rue de la Paix, 75002 Paris",
    );

    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem(
          "homeofficeexpenses.company_onboarding.societe@exemple.fr",
        ) ?? "null",
      ) as { step: number; draft: { identity: { name: string } } };
      expect(stored.step).toBe(1);
      expect(stored.draft.identity.name).toBe("HKOF");
    });

    first.unmount();
    renderWizard();

    expect(screen.getByRole("heading", { name: "Bail société" })).toBeVisible();
    expect(screen.getByLabelText("Adresse du logement")).toHaveValue(
      "10 rue de la Paix, 75002 Paris",
    );
  });

  it("keeps a single skip control in the footer of every company step", async () => {
    const user = userEvent.setup();
    const { container } = renderWizard();

    const expectSkipInFooter = () => {
      const buttons = container.querySelectorAll<HTMLElement>(
        '[data-cy="btn-skip-onboarding"]',
      );
      expect(buttons).toHaveLength(1);
      expect(buttons[0]?.closest(".onboarding-actions")).not.toBeNull();
    };

    expectSkipInFooter();
    await fillIdentity(user);
    await next(user);
    expectSkipInFooter();
    await fillLease(user);
    expectSkipInFooter();
    await next(user);
    expectSkipInFooter();
    await next(user);
    expectSkipInFooter();
    expect(screen.getByRole("heading", { name: "Salariés" })).toBeVisible();
  });

  it("autocompletes the landlord and employee addresses", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ADDRESS_RESPONSE,
    } as Response);
    const user = userEvent.setup();
    renderWizard();

    await fillIdentity(user);
    await next(user);

    const landlordAddress = screen.getByRole("combobox", {
      name: "Adresse du bailleur",
    });
    await user.type(landlordAddress, "2 rue du Test");
    await user.click(
      await screen.findByRole("option", { name: "2 rue du Test 75001 Paris" }),
    );
    expect(landlordAddress).toHaveValue("2 rue du Test 75001 Paris");

    await user.type(
      screen.getByLabelText("Adresse du logement"),
      "10 rue de la Paix, 75002 Paris",
    );
    await user.type(screen.getByLabelText("Surface totale (m²)"), "100");
    await user.type(
      screen.getByLabelText("Surface professionnelle (m²)"),
      "25",
    );
    await user.type(screen.getByLabelText("Loyer hors charges"), "1200");
    await user.type(screen.getByLabelText("Provision pour charges"), "80");
    await user.type(screen.getByLabelText("Nom du bailleur"), "Bernard Dupont");
    await next(user);
    await next(user);

    const employeeAddress = screen.getByRole("combobox", {
      name: "Adresse du salarié 1",
    });
    await user.type(employeeAddress, "3 avenue du Test");

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api-adresse.data.gouv.fr/search/?q=3%20avenue%20du%20Test&limit=5",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    expect(employeeAddress).toHaveValue("3 avenue du Test");
  });
});
