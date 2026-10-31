import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { setAuthUser } from "@/api/queries";
import type { CompanyDto, PersonDto } from "@/api/types";
import { OnboardingPage } from "./OnboardingPage";

vi.mock("@/api/endpoints", () => ({
  api: {
    auth: {
      completeOnboarding: vi.fn(),
      me: vi.fn(),
    },
    persons: {
      create: vi.fn(),
      update: vi.fn(),
    },
    companies: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    leases: {
      create: vi.fn(),
    },
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      rename: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
  },
}));

const COMPANY: CompanyDto = { id: 3, name: "HKOF", siren: "123456789" };
const PERSON: PersonDto = { id: 7, name: "Alice Martin", signatureCount: 0 };
const COMPLETED_USER = {
  email: "bailleur@exemple.fr",
  onboardingCompleted: true,
};

let nextPersonId = 7;

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/bienvenue"]}>
        <Routes>
          <Route path="/bienvenue" element={<OnboardingPage />} />
          <Route
            path="/generer/quittance"
            element={<p>Générateur de quittances</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillProfile(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Prénom"), "Alice");
  await user.type(
    screen.getByLabelText("Nom", { selector: "#onboarding-last-name" }),
    "Martin",
  );
  await user.type(screen.getByLabelText("Téléphone"), "06 12 34 56 78");
  await user.type(
    screen.getByLabelText("Nom", { selector: "#onboarding-agency-name" }),
    "HKOF",
  );
  await user.type(screen.getByLabelText("SIREN ou SIRET"), "12345678900012");
}

async function saveAndContinueProfile(
  user: ReturnType<typeof userEvent.setup>,
) {
  await fillProfile(user);
  await user.click(
    screen.getByRole("button", { name: "Enregistrer le profil" }),
  );
  await screen.findByText(/Profil enregistré/);
  await user.click(screen.getByRole("button", { name: "Continuer" }));
}

async function fillProperty(
  user: ReturnType<typeof userEvent.setup>,
  address = "10 rue de la Paix, 75002 Paris",
  landlordFirst = "Bernard",
  landlordLast = "Dupont",
) {
  await user.type(screen.getByLabelText("Adresse du bien"), address);
  const landlordGroup = screen.getByRole("group", { name: "Bailleur" });
  await user.type(
    within(landlordGroup).getByLabelText("Prénom"),
    landlordFirst,
  );
  await user.type(within(landlordGroup).getByLabelText("Nom"), landlordLast);
  await user.click(screen.getByRole("button", { name: "Continuer" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  nextPersonId = 7;
  setAuthUser({
    email: "bailleur@exemple.fr",
    role: "USER",
    companyEnabled: true,
    lmnpEnabled: true,
    onboardingCompleted: false,
  });
  vi.mocked(api.companies.list).mockResolvedValue([]);
  vi.mocked(api.companies.create).mockResolvedValue(COMPANY);
  vi.mocked(api.companies.update).mockResolvedValue(COMPANY);
  vi.mocked(api.persons.create).mockImplementation(async (body) => ({
    id: nextPersonId++,
    name: body.name,
    signatureCount: 0,
  }));
  vi.mocked(api.persons.update).mockResolvedValue(PERSON);
  vi.mocked(api.signatures.list).mockResolvedValue([]);
  vi.mocked(api.leases.create).mockResolvedValue({ id: 9 });
  vi.mocked(api.auth.completeOnboarding).mockResolvedValue(COMPLETED_USER);
  vi.mocked(api.auth.me).mockResolvedValue(COMPLETED_USER);
});

describe("OnboardingPage", () => {
  it("shows the account e-mail and the four French steps", () => {
    renderWizard();

    expect(
      screen.getByRole("heading", {
        name: "Bienvenue dans HomeOfficeExpenses",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("Connecté en tant que bailleur@exemple.fr"),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Étapes de l'inscription" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Étape 1 sur 4 : Profil")).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByLabelText("Étape 2 sur 4 : Biens")).toBeVisible();
    expect(screen.getByLabelText("Étape 3 sur 4 : Baux")).toBeVisible();
    expect(screen.getByLabelText("Étape 4 sur 4 : Résumé")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Profil de l'agence" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "Gérant" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Agence" })).toBeVisible();
  });

  it("saves the person and the agency, then reveals the signature studio", async () => {
    const user = userEvent.setup();
    renderWizard();

    await fillProfile(user);
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le profil" }),
    );

    await waitFor(() =>
      expect(api.persons.create).toHaveBeenCalledWith({
        name: "Alice Martin",
        address: null,
        phone: "06 12 34 56 78",
        addressNote: null,
        issuePlace: null,
      }),
    );
    expect(api.companies.create).toHaveBeenCalledWith({
      name: "HKOF",
      legalForm: "",
      siren: "123456789",
      siret: "12345678900012",
      address: "",
      managerName: "",
      leaseId: null,
      issuePlace: "",
    });
    expect(await screen.findByText(/Profil enregistré/)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Dessiner une signature" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Générer une signature" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Continuer" })).toBeVisible();
  });

  it("updates the first active company instead of creating a duplicate", async () => {
    vi.mocked(api.companies.list).mockResolvedValue([
      { id: 4, name: "Ancienne agence", siren: "111111111" },
    ]);
    vi.mocked(api.companies.update).mockResolvedValue({ id: 4, name: "HKOF" });
    const user = userEvent.setup();
    renderWizard();

    await fillProfile(user);
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le profil" }),
    );

    await waitFor(() =>
      expect(api.companies.update).toHaveBeenCalledWith(
        4,
        expect.objectContaining({ name: "HKOF", siren: "123456789" }),
      ),
    );
    expect(api.companies.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid phone and a SIREN of 11 digits in French", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Prénom"), "Alice");
    await user.type(
      screen.getByLabelText("Nom", { selector: "#onboarding-last-name" }),
      "Martin",
    );
    await user.type(screen.getByLabelText("Téléphone"), "06");
    await user.type(
      screen.getByLabelText("Nom", { selector: "#onboarding-agency-name" }),
      "HKOF",
    );
    await user.type(screen.getByLabelText("SIREN ou SIRET"), "12345678901");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le profil" }),
    );

    expect(
      await screen.findByText("Saisissez un numéro de téléphone valide."),
    ).toBeVisible();
    expect(
      screen.getByText("Saisissez 9 chiffres (SIREN) ou 14 chiffres (SIRET)."),
    ).toBeVisible();
    expect(api.persons.create).not.toHaveBeenCalled();
    expect(api.companies.create).not.toHaveBeenCalled();
  });

  it("allows omitting legal form, SIREN/SIRET, and agency address", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.type(screen.getByLabelText("Prénom"), "Alice");
    await user.type(
      screen.getByLabelText("Nom", { selector: "#onboarding-last-name" }),
      "Martin",
    );
    await user.type(screen.getByLabelText("Téléphone"), "06 12 34 56 78");
    await user.type(
      screen.getByLabelText("Nom", { selector: "#onboarding-agency-name" }),
      "Agence Seule",
    );
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le profil" }),
    );

    await waitFor(() =>
      expect(api.companies.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Agence Seule",
          legalForm: "",
          siren: "",
          siret: null,
          address: "",
        }),
      ),
    );
    expect(await screen.findByText(/Profil enregistré/)).toBeVisible();
  });

  it("provides an interactive country code selector for phone", async () => {
    const user = userEvent.setup();
    renderWizard();

    const countrySelect = screen.getByLabelText("Indicatif pays");
    expect(countrySelect).toHaveValue("+33");

    await user.selectOptions(countrySelect, "+32");
    expect(countrySelect).toHaveValue("+32");
  });

  it("suggests addresses via api-adresse.data.gouv.fr and fills postal address on selection", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [2.35, 48.85] },
            properties: {
              id: "addr-paris",
              label: "10 Rue de la Paix 75002 Paris",
              name: "10 Rue de la Paix",
              postcode: "75002",
              city: "Paris",
            },
          },
        ],
      }),
    } as Response);

    const user = userEvent.setup();
    renderWizard();

    const addressInput = screen.getByLabelText("Adresse postale");
    await user.type(addressInput, "10 Rue de la Paix");

    const option = await screen.findByRole("option", {
      name: "10 Rue de la Paix 75002 Paris",
    });
    expect(option).toBeVisible();

    await user.click(option);
    expect(addressInput).toHaveValue("10 Rue de la Paix 75002 Paris");
  });

  it("keeps the profile values when returning from the property step", async () => {
    const user = userEvent.setup();
    renderWizard();

    await saveAndContinueProfile(user);
    expect(screen.getByRole("heading", { name: "Biens" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Retour" }));

    expect(screen.getByLabelText("Prénom")).toHaveValue("Alice");
    expect(screen.getByLabelText("SIREN ou SIRET")).toHaveValue(
      "12345678900012",
    );
    expect(screen.getByLabelText("Étape 1 sur 4 : Profil")).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("supports adding multiple properties with distinct landlords and no rent or charges", async () => {
    const user = userEvent.setup();
    renderWizard();

    await saveAndContinueProfile(user);
    expect(screen.getByRole("heading", { name: "Biens" })).toBeVisible();
    expect(screen.queryByLabelText(/Loyer/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/charges/i)).not.toBeInTheDocument();

    // Fill first property
    await user.type(
      screen.getByLabelText("Adresse du bien"),
      "10 rue de la Paix, 75002 Paris",
    );
    const landlordGroup1 = screen.getByRole("group", { name: "Bailleur" });
    await user.type(within(landlordGroup1).getByLabelText("Prénom"), "Bernard");
    await user.type(within(landlordGroup1).getByLabelText("Nom"), "Dupont");
    await user.type(
      within(landlordGroup1).getByLabelText("Téléphone"),
      "06 11 22 33 44",
    );
    await user.type(
      within(landlordGroup1).getByLabelText("Adresse e-mail"),
      "bernard@exemple.fr",
    );

    // Add a second property
    await user.click(screen.getByRole("button", { name: "Ajouter un bien" }));
    const addressInputs = screen.getAllByLabelText("Adresse du bien");
    expect(addressInputs).toHaveLength(2);
    await user.type(addressInputs[1], "20 avenue Foch, 75016 Paris");

    const landlordGroups = screen.getAllByRole("group", { name: "Bailleur" });
    await user.type(
      within(landlordGroups[1]).getByLabelText("Prénom"),
      "Claire",
    );
    await user.type(
      within(landlordGroups[1]).getByLabelText("Nom"),
      "Fontaine",
    );

    await user.click(screen.getByRole("button", { name: "Continuer" }));

    // On Step 3: Baux
    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
    const propertySelect = screen.getByLabelText("Bien associé");
    expect(propertySelect).toBeVisible();
    expect(propertySelect).toHaveTextContent("10 rue de la Paix, 75002 Paris");
    expect(propertySelect).toHaveTextContent("20 avenue Foch, 75016 Paris");
  });

  it("finalizes individual leases with separate rent and charges per tenant", async () => {
    const user = userEvent.setup();
    renderWizard();

    await saveAndContinueProfile(user);
    await fillProperty(user);

    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
    expect(
      screen.getByRole("radio", { name: "Bail individuel" }),
    ).toBeChecked();

    // Tenant 1
    const tenant1 = screen.getByRole("group", { name: "Locataire 1" });
    await user.type(within(tenant1).getByLabelText("Prénom"), "Bob");
    await user.type(within(tenant1).getByLabelText("Nom"), "Durand");
    await user.type(
      within(tenant1).getByLabelText("Loyer hors charges"),
      "800,00",
    );
    await user.type(
      within(tenant1).getByLabelText("Provision pour charges"),
      "50,00",
    );

    // Add Tenant 2
    await user.click(
      screen.getByRole("button", { name: "Ajouter un locataire" }),
    );
    const tenant2 = screen.getByRole("group", { name: "Locataire 2" });
    await user.type(within(tenant2).getByLabelText("Prénom"), "Chloé");
    await user.type(within(tenant2).getByLabelText("Nom"), "Petit");
    await user.type(
      within(tenant2).getByLabelText("Loyer hors charges"),
      "750,00",
    );
    await user.type(
      within(tenant2).getByLabelText("Provision pour charges"),
      "40,00",
    );

    await user.click(screen.getByRole("button", { name: "Continuer" }));

    // Step 4: Summary
    expect(screen.getByRole("heading", { name: "Résumé" })).toBeVisible();
    expect(screen.getByText("Bernard Dupont")).toBeVisible();
    expect(screen.getByText("Bob Durand")).toBeVisible();
    expect(screen.getByText("Chloé Petit")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Terminer l'inscription" }),
    );

    await waitFor(() => expect(api.leases.create).toHaveBeenCalledTimes(2));
    // Two separate leases created
    expect(api.leases.create).toHaveBeenNthCalledWith(1, {
      companyLease: false,
      landlordId: 8,
      tenantId: 9,
      tenantIds: [9],
      propertyAddress: "10 rue de la Paix, 75002 Paris",
      rentExclCharges: "800.00",
      charges: "50.00",
    });
    expect(api.leases.create).toHaveBeenNthCalledWith(2, {
      companyLease: false,
      landlordId: 8,
      tenantId: 10,
      tenantIds: [10],
      propertyAddress: "10 rue de la Paix, 75002 Paris",
      rentExclCharges: "750.00",
      charges: "40.00",
    });
    expect(api.auth.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Générateur de quittances")).toBeVisible();
  });

  it("finalizes a colocation lease, completes onboarding and redirects", async () => {
    const user = userEvent.setup();
    renderWizard();

    await saveAndContinueProfile(user);
    await fillProperty(user);

    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
    await user.click(
      screen.getByRole("radio", { name: "Bail de colocation solidaire" }),
    );

    // In colocation: total rent and charges
    await user.type(
      screen.getByLabelText("Loyer total hors charges"),
      "1200,00",
    );
    await user.type(
      screen.getByLabelText("Provision totale pour charges"),
      "80",
    );

    await user.click(
      screen.getByRole("button", { name: "Retirer le locataire 2" }),
    );
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(
      await screen.findByText(
        "Une colocation solidaire exige au moins deux locataires.",
      ),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Ajouter un locataire" }),
    );

    const first = screen.getByRole("group", { name: "Locataire 1" });
    await user.type(within(first).getByLabelText("Prénom"), "Bob");
    await user.type(within(first).getByLabelText("Nom"), "Durand");
    const second = screen.getByRole("group", { name: "Locataire 2" });
    await user.type(within(second).getByLabelText("Prénom"), "Chloé");
    await user.type(within(second).getByLabelText("Nom"), "Petit");
    await user.click(screen.getByRole("button", { name: "Continuer" }));

    expect(screen.getByRole("heading", { name: "Résumé" })).toBeVisible();
    expect(screen.getByText("Bail de colocation solidaire")).toBeVisible();
    expect(screen.getByText("Bob Durand")).toBeVisible();
    expect(screen.getByText("Chloé Petit")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Terminer l'inscription" }),
    );

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith({
        companyLease: false,
        landlordId: 8,
        tenantId: 9,
        tenantIds: [9, 10],
        propertyAddress: "10 rue de la Paix, 75002 Paris",
        rentExclCharges: "1200.00",
        charges: "80.00",
      }),
    );
    expect(api.persons.create).toHaveBeenCalledTimes(4); // manager + landlord + 2 tenants
    expect(api.auth.completeOnboarding).toHaveBeenCalledTimes(1);
    expect(api.auth.me).toHaveBeenCalled();
    expect(await screen.findByText("Générateur de quittances")).toBeVisible();
  });

  it("shows validation errors when property address or landlord name is missing, and allows removing a property", async () => {
    const user = userEvent.setup();
    renderWizard();

    await saveAndContinueProfile(user);
    expect(screen.getByRole("heading", { name: "Biens" })).toBeVisible();

    // Click continue without filling
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(
      await screen.findByText("L'adresse du bien est obligatoire."),
    ).toBeVisible();
    expect(
      screen.getByText("Le prénom du bailleur est obligatoire."),
    ).toBeVisible();
    expect(
      screen.getByText("Le nom du bailleur est obligatoire."),
    ).toBeVisible();

    // Add a second property, then remove it
    await user.click(screen.getByRole("button", { name: "Ajouter un bien" }));
    expect(screen.getAllByLabelText("Adresse du bien")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Retirer le bien 2" }));
    expect(screen.getAllByLabelText("Adresse du bien")).toHaveLength(1);
  });

  it("validates tenant rent and allows navigating back from step 3 and step 4", async () => {
    const user = userEvent.setup();
    renderWizard();

    await saveAndContinueProfile(user);
    await fillProperty(user);

    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
    const tenant1 = screen.getByRole("group", { name: "Locataire 1" });
    await user.type(within(tenant1).getByLabelText("Prénom"), "Bob");
    await user.type(within(tenant1).getByLabelText("Nom"), "Durand");
    await user.type(within(tenant1).getByLabelText("Loyer hors charges"), "0");
    await user.click(screen.getByRole("button", { name: "Continuer" }));

    expect(
      await screen.findByText(
        "Saisissez un loyer supérieur à 0 (ex. 1 200,00).",
      ),
    ).toBeVisible();

    // Fix rent
    await user.clear(within(tenant1).getByLabelText("Loyer hors charges"));
    await user.type(
      within(tenant1).getByLabelText("Loyer hors charges"),
      "900,00",
    );

    // Test back button from step 3 to step 2
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByRole("heading", { name: "Biens" })).toBeVisible();
    expect(screen.getByLabelText("Adresse du bien")).toHaveValue(
      "10 rue de la Paix, 75002 Paris",
    );

    // Advance to step 3 again
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();

    // Advance to step 4
    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.getByRole("heading", { name: "Résumé" })).toBeVisible();

    // Test back button from step 4 to step 3
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(screen.getByRole("heading", { name: "Baux" })).toBeVisible();
  });
});
