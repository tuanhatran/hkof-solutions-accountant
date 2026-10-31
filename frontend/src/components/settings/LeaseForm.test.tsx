import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, type LandlordDto, type TenantDto } from "@/api/endpoints";
import type { LeaseDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { LeaseForm } from "./LeaseForm";

const LANDLORD: LandlordDto = {
  id: 1,
  name: "M. Bailleur",
  address: null,
  issuePlace: "Paris",
  signatureCount: 0,
};

const TENANT: TenantDto = {
  id: 2,
  name: "Mme Locataire",
  address: null,
  email: "locataire@exemple.fr",
};

const FOREIGN_COMPANY = {
  name: "Charlie Conseil",
  siren: "987 654 321",
  legalForm: "SARL",
  address: "1 rue de la Paix, 75002 Paris",
  managerName: "Mme Gérante",
};

const SAVED_LEASE: LeaseDto = {
  id: 42,
  addressId: 4,
  companyId: 9,
  companyName: "Charlie Conseil",
  companySiren: "987 654 321",
  companyLease: true,
  landlordId: 1,
  landlordName: "M. Bailleur",
  tenantName: "Charlie Conseil",
  propertyAddress: "12 rue des Lilas, 75011 Paris",
  rentExclCharges: "900.00",
  charges: "50.00",
  totalArea: "70.00",
  businessArea: "25.00",
};

vi.mock("@/api/endpoints", () => ({
  api: {
    companies: {
      lookup: vi.fn(),
    },
    leases: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function renderForm(item: LeaseDto | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <LeaseForm
        item={item}
        landlords={[LANDLORD]}
        tenants={[TENANT]}
        companies={[]}
        onClose={onClose}
      />
    </QueryClientProvider>,
  );
  return { onClose };
}

async function fillCommonFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Bailleur"), "1");
  await user.type(
    screen.getByLabelText("Adresse du bien"),
    "12 rue des Lilas, 75011 Paris",
  );
  await user.type(screen.getByLabelText("Loyer hors charges (€)"), "900");
  await user.type(screen.getByLabelText("Provision pour charges (€)"), "50");
  await user.type(screen.getByLabelText("Surface totale (m²)"), "70");
  await user.type(screen.getByLabelText("Surface professionnelle (m²)"), "25");
}

beforeEach(() => {
  vi.mocked(api.companies.lookup).mockReset();
  vi.mocked(api.leases.create).mockReset();
  vi.mocked(api.leases.update).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("LeaseForm cross-user company lease", () => {
  it("looks up another account's company by SIREN and links it read-only", async () => {
    vi.mocked(api.companies.lookup).mockResolvedValue(FOREIGN_COMPANY);
    vi.mocked(api.leases.create).mockResolvedValue(SAVED_LEASE);
    const { onClose } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: /Bail société/ }));
    await fillCommonFields(user);
    await user.type(
      screen.getByLabelText("SIREN de la société locataire"),
      "987654321",
    );
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    const result = await screen.findByText(/Forme juridique : SARL/);
    const card = result.closest(
      '[data-cy="company-lookup-result"]',
    ) as HTMLElement;
    expect(within(card).getByText("Charlie Conseil")).toBeVisible();
    expect(screen.getByText(/Forme juridique : SARL/)).toBeVisible();
    expect(screen.getByText(/Représentant légal : Mme Gérante/)).toBeVisible();
    expect(api.companies.lookup).toHaveBeenCalledWith("987654321");

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyLease: true,
          companySiren: "987 654 321",
          landlordId: 1,
        }),
      ),
    );
    expect(api.leases.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ companyId: expect.anything() }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a French error when no company matches the SIREN", async () => {
    vi.mocked(api.companies.lookup).mockRejectedValue(
      new Error("Société introuvable."),
    );
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("checkbox", { name: /Bail société/ }));
    await user.type(
      screen.getByLabelText("SIREN de la société locataire"),
      "999888777",
    );
    await user.click(screen.getByRole("button", { name: "Rechercher" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Société introuvable.",
    );
    expect(screen.queryByText("Charlie Conseil")).toBeNull();
  });

  it("edits an existing cross-user lease with its public identity prefilled", async () => {
    vi.mocked(api.leases.update).mockResolvedValue(SAVED_LEASE);
    renderForm(SAVED_LEASE);
    const user = userEvent.setup();

    expect(screen.getByLabelText("SIREN de la société locataire")).toHaveValue(
      "987 654 321",
    );
    const card = document.querySelector(
      '[data-cy="company-lookup-result"]',
    ) as HTMLElement;
    expect(within(card).getByText("Charlie Conseil")).toBeVisible();
    expect(within(card).getByText(/SIREN : 987 654 321/)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.leases.update).toHaveBeenCalledWith(
        42,
        expect.objectContaining({
          companyLease: true,
          companySiren: "987 654 321",
        }),
      ),
    );
    expect(api.leases.update).not.toHaveBeenCalledWith(
      42,
      expect.objectContaining({ companyId: expect.anything() }),
    );
  });
});
