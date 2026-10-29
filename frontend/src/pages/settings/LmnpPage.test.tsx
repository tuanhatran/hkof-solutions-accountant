import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { AddressDto, CompanyDto, LeaseDto, PersonDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { LmnpPage } from "./LmnpPage";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

const PERSON: PersonDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
  signatureCount: 2,
};

const TENANT: PersonDto = {
  id: 2,
  name: "Mme Locataire",
  address: "12 rue de la République, 75000 Paris",
  signatureCount: 0,
};

const COMPANY: CompanyDto = { id: 3, name: "HKOF" };

const ADDRESS: AddressDto = {
  id: 4,
  label: "12 rue de la République, 75000 Paris",
};

const LEASE: LeaseDto = {
  id: 10,
  addressId: 4,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

let personsState: QueryLike<PersonDto[]>;
let addressesState: QueryLike<AddressDto[]>;
let leasesState: QueryLike<LeaseDto[]>;
let companiesState: QueryLike<CompanyDto[]>;

function readyQuery<T>(data: T): QueryLike<T> {
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
    leases: {
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
    usePersons: () => personsState,
    useCompanies: () => companiesState,
    useAddresses: () => addressesState,
    useLeases: () => leasesState,
    useSignatures: () => readyQuery([]),
  };
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LmnpPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  personsState = readyQuery([PERSON, TENANT]);
  companiesState = readyQuery([COMPANY]);
  addressesState = readyQuery([ADDRESS]);
  leasesState = readyQuery([LEASE]);
  vi.mocked(api.leases.create).mockReset();
  vi.mocked(api.leases.update).mockReset();
  vi.mocked(api.leases.delete).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("LmnpPage", () => {
  it("opens on the Baux et adresses tab by default", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "LMNP", level: 1 }),
    ).toBeVisible();
    const tabs = screen.getByRole("tablist", { name: "Sections LMNP" });
    const leasesTab = within(tabs).getByRole("tab", {
      name: "Baux et adresses",
    });
    expect(leasesTab).toHaveAttribute("aria-selected", "true");
    expect(
      within(tabs).getByRole("tab", { name: "Personnes" }),
    ).toHaveAttribute("aria-selected", "false");
    expect(
      screen.getByRole("heading", { name: "Baux et adresses" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Adresse des baux")).toHaveValue("4");
    expect(screen.getByText("M. Bailleur → Mme Locataire")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Personnes" })).toBeNull();
  });

  it("renders the LMNP page and tabs in English and relabels on switch", async () => {
    await i18n.changeLanguage("en");
    renderPage();

    expect(
      screen.getByRole("heading", { name: "LMNP", level: 1 }),
    ).toBeVisible();
    const tabs = screen.getByRole("tablist", { name: "LMNP sections" });
    expect(
      within(tabs).getByRole("tab", { name: "Leases and addresses" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "People" })).toBeVisible();
    expect(within(tabs).queryByRole("tab", { name: "Templates" })).toBeNull();
    expect(
      screen.getByText(/natural persons acting as landlords or tenants/),
    ).toBeVisible();

    await act(async () => {
      await i18n.changeLanguage("fr");
    });

    expect(screen.getByRole("tab", { name: "Baux et adresses" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Personnes" })).toBeVisible();
    expect(screen.queryByRole("tab", { name: "Modèles" })).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Baux et adresses" }),
    ).toBeVisible();
  });

  it("switches to Personnes and back to Baux et adresses", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Personnes" }));

    expect(screen.getByRole("tab", { name: "Personnes" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Personnes" })).toBeVisible();
    expect(screen.getByText("M. Bailleur")).toBeVisible();
    expect(screen.getByText("Mme Locataire")).toBeVisible();
    expect(screen.getByText("2 signatures")).toBeVisible();
    expect(screen.getByText("0 signature")).toBeVisible();
    expect(screen.queryByLabelText("Adresse des baux")).toBeNull();
    expect(screen.queryByText("HKOF")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Baux et adresses" }));

    expect(screen.getByLabelText("Adresse des baux")).toHaveValue("4");
    expect(screen.queryByRole("heading", { name: "Personnes" })).toBeNull();
  });

  it("lists natural persons without an employee entry", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: "Personnes" }));

    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("Camille Martin")).toBeNull();
    expect(screen.queryByText(/Salarié/)).toBeNull();
    expect(
      screen.getByRole("button", { name: "Ajouter une personne" }),
    ).toBeEnabled();
  });

  it("creates a normal lease between two natural persons", async () => {
    vi.mocked(api.leases.create).mockResolvedValue(LEASE);
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    expect(
      screen.getByRole("heading", { name: "Ajouter un bail" }),
    ).toBeVisible();
    expect(screen.queryByLabelText("Locataire (société)")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Bailleur"), "1");
    await user.selectOptions(screen.getByLabelText("Locataire"), "2");
    await user.type(
      screen.getByLabelText("Adresse du bien"),
      "12 rue de la République, 75000 Paris",
    );
    await user.type(screen.getByLabelText("Loyer hors charges (€)"), "900,00");
    await user.type(
      screen.getByLabelText("Provision pour charges (€)"),
      "50,00",
    );
    expect(screen.getByText("950,00 €")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith({
        companyLease: false,
        landlordId: 1,
        tenantId: 2,
        propertyAddress: "12 rue de la République, 75000 Paris",
        rentExclCharges: "900.00",
        charges: "50.00",
      }),
    );
    expect(toastMessages()).toContain("Bail ajouté.");
    expect(
      screen.queryByRole("heading", { name: "Ajouter un bail" }),
    ).toBeNull();
  });

  it("creates an enterprise lease with a company tenant and its surfaces", async () => {
    vi.mocked(api.leases.create).mockResolvedValue({
      ...LEASE,
      companyLease: true,
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    await user.click(screen.getByRole("checkbox", { name: /Bail société/ }));
    expect(screen.getByLabelText("Locataire (société)")).toBeVisible();
    expect(screen.queryByLabelText("Locataire")).toBeNull();

    await user.selectOptions(screen.getByLabelText("Bailleur"), "1");
    await user.selectOptions(screen.getByLabelText("Locataire (société)"), "3");
    await user.type(
      screen.getByLabelText("Adresse du bien"),
      "12 rue de la République, 75000 Paris",
    );
    await user.type(screen.getByLabelText("Loyer hors charges (€)"), "900,00");
    await user.type(
      screen.getByLabelText("Provision pour charges (€)"),
      "0,00",
    );
    await user.type(screen.getByLabelText("Surface totale (m²)"), "70,00");
    await user.type(
      screen.getByLabelText("Surface professionnelle (m²)"),
      "25,00",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith({
        companyLease: true,
        landlordId: 1,
        companyId: 3,
        tenantId: null,
        propertyAddress: "12 rue de la République, 75000 Paris",
        rentExclCharges: "900.00",
        charges: "0.00",
        totalArea: "70.00",
        businessArea: "25.00",
      }),
    );
  });

  it("rejects the same person on both sides in French", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    await user.selectOptions(screen.getByLabelText("Bailleur"), "1");
    await user.selectOptions(screen.getByLabelText("Locataire"), "1");
    await user.type(
      screen.getByLabelText("Adresse du bien"),
      "12 rue de la République, 75000 Paris",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText(
        "Le bailleur et le locataire doivent être deux personnes distinctes.",
      ),
    ).toBeVisible();
    expect(api.leases.create).not.toHaveBeenCalled();
  });

  it("edits a lease and sends the update", async () => {
    vi.mocked(api.leases.update).mockResolvedValue(LEASE);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier le bail 10" }),
    );
    expect(
      screen.getByRole("heading", { name: "Modifier le bail" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Bailleur")).toHaveValue("1");
    expect(screen.getByLabelText("Locataire")).toHaveValue("2");
    expect(screen.getByLabelText("Loyer hors charges (€)")).toHaveValue(
      "1300,00",
    );

    await user.clear(screen.getByLabelText("Loyer hors charges (€)"));
    await user.type(screen.getByLabelText("Loyer hors charges (€)"), "1400,00");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.update).toHaveBeenCalledWith(10, {
        companyLease: false,
        landlordId: 1,
        tenantId: 2,
        propertyAddress: "12 rue de la République, 75000 Paris",
        rentExclCharges: "1400.00",
        charges: "50.00",
      }),
    );
    expect(toastMessages()).toContain("Bail mis à jour.");
  });

  it("surfaces a lease save failure in French", async () => {
    vi.mocked(api.leases.create).mockRejectedValue(
      new Error("Un bail actif existe déjà pour ce bailleur et ce locataire."),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    await user.selectOptions(screen.getByLabelText("Bailleur"), "1");
    await user.selectOptions(screen.getByLabelText("Locataire"), "2");
    await user.type(
      screen.getByLabelText("Adresse du bien"),
      "12 rue de la République, 75000 Paris",
    );
    await user.type(screen.getByLabelText("Loyer hors charges (€)"), "900,00");
    await user.type(
      screen.getByLabelText("Provision pour charges (€)"),
      "50,00",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText(
        "Un bail actif existe déjà pour ce bailleur et ce locataire.",
      ),
    ).toBeVisible();
  });

  it("deletes a lease after confirmation", async () => {
    vi.mocked(api.leases.delete).mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer le bail 10" }),
    );
    expect(await screen.findByText("Supprimer ce bail ?")).toBeVisible();
    expect(
      screen.getByText(/ne sera plus proposé lors de la génération/),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Supprimer le bail" }));

    await waitFor(() => expect(api.leases.delete).toHaveBeenCalledWith(10));
    await waitFor(() => expect(toastMessages()).toContain("Bail supprimé."));
  });

  it("reports a lease delete failure as a French toast", async () => {
    vi.mocked(api.leases.delete).mockRejectedValue(
      new Error("Des quittances existent pour ce bail."),
    );
    renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer le bail 10" }),
    );
    await user.click(screen.getByRole("button", { name: "Supprimer le bail" }));

    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Des quittances existent pour ce bail.",
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer ce bail ?" }),
    ).toBeNull();
  });

  it("filters the leases by the selected address", async () => {
    const OTHER_ADDRESS: AddressDto = {
      id: 5,
      label: "5 rue du Marché, 69001 Lyon",
    };
    const OTHER_LEASE: LeaseDto = {
      ...LEASE,
      id: 11,
      addressId: 5,
      propertyAddress: "5 rue du Marché, 69001 Lyon",
    };
    addressesState = readyQuery([ADDRESS, OTHER_ADDRESS]);
    leasesState = readyQuery([LEASE, OTHER_LEASE]);
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("M. Bailleur → Mme Locataire")).toBeVisible();
    await user.selectOptions(screen.getByLabelText("Adresse des baux"), "5");

    expect(screen.getAllByText("5 rue du Marché, 69001 Lyon")).toHaveLength(2);
    expect(screen.getAllByText(/12 rue de la République/)).toHaveLength(1);
    expect(
      screen.queryByRole("button", { name: "Modifier le bail 10" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Modifier le bail 11" }),
    ).toBeVisible();
  });

  it("shows the address and lease loading, empty and error states", async () => {
    addressesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    leasesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LmnpPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des adresses…")).toBeVisible();
    expect(screen.getByText("Chargement des baux…")).toBeVisible();
    loading.unmount();

    addressesState = readyQuery([]);
    leasesState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LmnpPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Aucune adresse configurée")).toBeVisible();
    expect(
      screen.getByText(
        "Aucun bail pour cette adresse. Ajoutez un bail pour générer des quittances.",
      ),
    ).toBeVisible();
    empty.unmount();

    const refetch = vi.fn();
    leasesState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Baux indisponibles"),
      refetch,
    };
    renderPage();
    expect(screen.getByText("Baux indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("closes the lease form and the delete dialog on cancel", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(
      screen.queryByRole("heading", { name: "Ajouter un bail" }),
    ).toBeNull();

    await user.click(
      screen.getByRole("button", { name: "Supprimer le bail 10" }),
    );
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByText("Supprimer ce bail ?")).toBeNull();
    expect(api.leases.delete).not.toHaveBeenCalled();
  });

  it("edits an enterprise lease and switches it back to a person tenant", async () => {
    const COMPANY_LEASE: LeaseDto = {
      ...LEASE,
      companyLease: true,
      companyId: 3,
      companyName: "HKOF",
      tenantId: null,
      tenantName: "HKOF",
      totalArea: "70.00",
      businessArea: "25.00",
    };
    leasesState = readyQuery([COMPANY_LEASE]);
    vi.mocked(api.leases.update).mockResolvedValue(COMPANY_LEASE);
    renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier le bail 10" }),
    );
    expect(screen.getByLabelText("Locataire (société)")).toHaveValue("3");
    expect(screen.getByLabelText("Surface totale (m²)")).toHaveValue("70,00");

    await user.click(screen.getByRole("checkbox", { name: /Bail société/ }));
    expect(screen.getByLabelText("Locataire")).toHaveValue("");
    await user.selectOptions(screen.getByLabelText("Locataire"), "2");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.update).toHaveBeenCalledWith(10, {
        companyLease: false,
        landlordId: 1,
        tenantId: 2,
        propertyAddress: "12 rue de la République, 75000 Paris",
        rentExclCharges: "1300.00",
        charges: "50.00",
      }),
    );
  });
});
