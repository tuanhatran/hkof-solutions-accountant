import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import type { AddressDto, AgencyDto, LeaseDto, PersonDto } from "@/api/types";

const mockUseCompanies = vi.fn();
const mockUseAgency = vi.fn();
const mockUsePersons = vi.fn();
const mockUseAddresses = vi.fn();
const mockUseLeases = vi.fn();
const mockUseAuthState = vi.fn();

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useCompanies: () => {
      mockUseCompanies();
      throw new Error("useCompanies should not be called in DashboardPage");
    },
    useAgency: () => mockUseAgency(),
    usePersons: () => mockUsePersons(),
    useAddresses: () => mockUseAddresses(),
    useLeases: () => mockUseLeases(),
    useAuthState: () => mockUseAuthState(),
  };
});

function readyQuery<T>(data: T) {
  return { data, isPending: false, isError: false, error: null };
}

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const AGENCY: AgencyDto = {
  id: 1,
  name: "Immobilier Parisien",
  isPersonal: false,
  managerName: "Jean Dupont",
  siren: "123456789",
  siret: "12345678900012",
  address: "12 rue de la Paix, 75002 Paris",
};

const ADDRESSES: AddressDto[] = [
  { id: 10, label: "10 rue Victor Hugo, 75016 Paris" },
  { id: 20, label: "25 avenue Montaigne, 75008 Paris" },
];

const PERSONS: PersonDto[] = [
  { id: 100, name: "Jean Dupont", phone: "06 11 22 33 44" },
  { id: 101, name: "Pierre Durand", phone: "06 55 66 77 88" },
  { id: 201, name: "Alice Martin" },
  { id: 202, name: "Bob Thomas" },
];

const LEASES: LeaseDto[] = [
  {
    id: 1001,
    addressId: 10,
    propertyAddress: "10 rue Victor Hugo, 75016 Paris",
    landlordId: 101,
    landlordName: "Pierre Durand",
    tenantId: 201,
    tenantIds: [201],
    tenantName: "Alice Martin",
    rentExclCharges: "800.00",
    charges: "50.00",
  },
  {
    id: 1002,
    addressId: 20,
    propertyAddress: "25 avenue Montaigne, 75008 Paris",
    landlordId: 101,
    landlordName: "Pierre Durand",
    tenantId: 202,
    tenantIds: [202],
    tenantName: "Bob Thomas",
    rentExclCharges: "1200.00",
    charges: "100.00",
  },
];

describe("DashboardPage", () => {
  beforeEach(() => {
    mockUseCompanies.mockReset();
    mockUseAgency.mockReturnValue(readyQuery(AGENCY));
    mockUsePersons.mockReturnValue(readyQuery(PERSONS));
    mockUseAddresses.mockReturnValue(readyQuery(ADDRESSES));
    mockUseLeases.mockReturnValue(readyQuery(LEASES));
    mockUseAuthState.mockReturnValue({
      user: { email: "test@example.com", onboardingCompleted: true },
      loading: false,
    });
  });

  it("renders page header and agency profile card using useAgency without useCompanies", () => {
    renderDashboard();

    expect(mockUseCompanies).not.toHaveBeenCalled();
    expect(screen.getByText("Gestion locative")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Tableau de bord" }),
    ).toBeVisible();

    const profileCard = screen.getByTestId("agency-profile-card");
    expect(within(profileCard).getByText("Immobilier Parisien")).toBeVisible();
    expect(within(profileCard).getByText("Jean Dupont")).toBeVisible();
    expect(within(profileCard).getByText("12345678900012")).toBeVisible();
    expect(
      within(profileCard).getByText("12 rue de la Paix, 75002 Paris"),
    ).toBeVisible();
  });

  it("renders personal agency profile cleanly with personal management label and '—' for SIREN", () => {
    const PERSONAL_AGENCY: AgencyDto = {
      id: 2,
      name: "Mon Patrimoine",
      isPersonal: true,
      managerName: "Alice Dupont",
      siren: null,
      siret: null,
      address: null,
    };
    mockUseAgency.mockReturnValue(readyQuery(PERSONAL_AGENCY));

    renderDashboard();

    const profileCard = screen.getByTestId("agency-profile-card");
    expect(within(profileCard).getByText("Mon Patrimoine")).toBeVisible();
    expect(within(profileCard).getByText("Alice Dupont")).toBeVisible();
    expect(within(profileCard).getByText("—")).toBeVisible();
    expect(within(profileCard).getByText("Gestion personnelle")).toBeVisible();
  });

  it("renders OnboardingProgressCard when user.onboardingCompleted === false with resume CTA", () => {
    mockUseAuthState.mockReturnValue({
      user: { email: "test@example.com", onboardingCompleted: false },
      loading: false,
    });

    renderDashboard();

    const resumeBtn = screen.getByTestId("btn-resume-onboarding");
    expect(resumeBtn).toBeVisible();
    expect(resumeBtn).toHaveAttribute("href", "/welcome");
    expect(resumeBtn).toHaveTextContent("Reprendre l'inscription");
  });

  it("does not render OnboardingProgressCard when user.onboardingCompleted === true", () => {
    mockUseAuthState.mockReturnValue({
      user: { email: "test@example.com", onboardingCompleted: true },
      loading: false,
    });

    renderDashboard();

    expect(screen.queryByTestId("btn-resume-onboarding")).toBeNull();
  });

  it("displays the four KPI cards with correct calculated values", () => {
    renderDashboard();

    const kpiProperties = screen.getByTestId("kpi-properties");
    expect(within(kpiProperties).getByText("2")).toBeVisible();
    expect(within(kpiProperties).getByText("Biens gérés")).toBeVisible();

    const kpiLeases = screen.getByTestId("kpi-leases");
    expect(within(kpiLeases).getByText("2")).toBeVisible();
    expect(within(kpiLeases).getByText("Baux actifs")).toBeVisible();

    const kpiTenants = screen.getByTestId("kpi-tenants");
    expect(within(kpiTenants).getByText("2")).toBeVisible();
    expect(within(kpiTenants).getByText("Locataires")).toBeVisible();

    const kpiRent = screen.getByTestId("kpi-rent");
    // 800 + 50 + 1200 + 100 = 2150.00 EUR
    expect(within(kpiRent).getByText(/2\s?150,00\s?€/)).toBeVisible();
    expect(within(kpiRent).getByText("Total loyers mensuels")).toBeVisible();
  });

  it("renders quick action links with correct destinations", () => {
    renderDashboard();

    const receiptAction = screen.getByRole("link", {
      name: /Générer une quittance/i,
    });
    expect(receiptAction).toHaveAttribute("href", "/generate/rent-receipt");

    const addPropertyAction = screen.getByRole("link", {
      name: /Ajouter un bien/i,
    });
    expect(addPropertyAction).toHaveAttribute("href", "/settings/agency");

    const manageLeasesAction = screen.getByRole("link", {
      name: /Gérer les baux/i,
    });
    expect(manageLeasesAction).toHaveAttribute("href", "/settings/agency");
  });

  it("lists managed properties, landlords, and active tenants in portfolio overview", () => {
    renderDashboard();

    expect(screen.getByText("Aperçu du portefeuille")).toBeVisible();

    // Properties
    expect(
      screen.getAllByText("10 rue Victor Hugo, 75016 Paris").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("25 avenue Montaigne, 75008 Paris").length,
    ).toBeGreaterThan(0);

    // Landlords
    expect(screen.getAllByText("Pierre Durand").length).toBeGreaterThan(0);

    // Active tenants
    expect(screen.getByText("Alice Martin")).toBeVisible();
    expect(screen.getByText("Bob Thomas")).toBeVisible();
    expect(screen.getByText(/850,00\s?€/)).toBeVisible();
    expect(screen.getByText(/1\s?300,00\s?€/)).toBeVisible();
  });

  it("handles empty data gracefully", () => {
    mockUseAgency.mockReturnValue(readyQuery(null));
    mockUsePersons.mockReturnValue(readyQuery([]));
    mockUseAddresses.mockReturnValue(readyQuery([]));
    mockUseLeases.mockReturnValue(readyQuery([]));

    renderDashboard();

    const kpiRent = screen.getByTestId("kpi-rent");
    expect(within(kpiRent).getByText(/0,00\s?€/)).toBeVisible();

    expect(screen.getByText("Aucun bien enregistré")).toBeVisible();
    expect(screen.getByText("Aucun bailleur enregistré")).toBeVisible();
    expect(screen.getByText("Aucun locataire actif")).toBeVisible();
  });
});
