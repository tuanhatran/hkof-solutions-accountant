import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { LandlordDto, LeaseDto, TenantDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { RentReceiptSettings } from "./RentReceiptSettings";

let landlordList: LandlordDto[] = [];
let tenantList: TenantDto[] = [];
let leaseList: LeaseDto[] = [];

vi.mock("@/api/endpoints", () => ({
  api: {
    landlords: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenants: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    leases: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useLandlords: () => ({
      data: landlordList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTenants: () => ({
      data: tenantList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLeases: () => ({
      data: leaseList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const LANDLORD: LandlordDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
};

const TENANT: TenantDto = {
  id: 2,
  name: "Mme Locataire",
  address: "12 rue de la République, 75000 Paris",
};

const LEASE: LeaseDto = {
  id: 10,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue de la République, 75000 Paris",
  rentExclCharges: "1300.00",
  charges: "0.00",
};

function renderSettings() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RentReceiptSettings />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("RentReceiptSettings", () => {
  beforeEach(() => {
    landlordList = [LANDLORD];
    tenantList = [TENANT];
    leaseList = [LEASE];
    vi.mocked(api.landlords.create).mockReset();
    vi.mocked(api.landlords.update).mockReset();
    vi.mocked(api.landlords.delete).mockReset();
    vi.mocked(api.tenants.create).mockReset();
    vi.mocked(api.tenants.update).mockReset();
    vi.mocked(api.tenants.delete).mockReset();
    vi.mocked(api.leases.create).mockReset();
    vi.mocked(api.leases.update).mockReset();
    vi.mocked(api.leases.delete).mockReset();
    useToasts.setState({ toasts: [] });
  });

  it("creates a landlord with its name and address", async () => {
    vi.mocked(api.landlords.create).mockResolvedValue({
      id: 5,
      name: "M. Dupont",
      address: "1 rue de Paris",
    });

    renderSettings();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Ajouter un bailleur" }),
    );
    await user.type(screen.getByLabelText("Nom du bailleur"), "M. Dupont");
    await user.type(
      screen.getByLabelText("Adresse du bailleur"),
      "1 rue de Paris",
    );
    await user.click(
      screen.getByRole("button", { name: "Ajouter le bailleur" }),
    );

    await waitFor(() =>
      expect(api.landlords.create).toHaveBeenCalledWith({
        name: "M. Dupont",
        address: "1 rue de Paris",
      }),
    );
  });

  it("creates a lease with the selected pair and shows the total", async () => {
    vi.mocked(api.leases.create).mockResolvedValue({
      ...LEASE,
      id: 11,
    });

    renderSettings();

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    const landlordSelect = screen.getByLabelText("Bailleur du bail");
    const form = landlordSelect.closest("form");
    if (!form) {
      throw new Error("Lease form not found");
    }
    await user.selectOptions(landlordSelect, "1");
    await user.selectOptions(
      within(form).getByLabelText("Locataire du bail"),
      "2",
    );
    await user.type(
      within(form).getByLabelText("Adresse du bien"),
      "12 rue de la République, 75000 Paris",
    );
    await user.type(
      within(form).getByLabelText("Loyer hors charges (€)"),
      "1300,00",
    );
    await user.type(
      within(form).getByLabelText("Provision pour charges (€)"),
      "50,00",
    );

    expect(within(form).getByText("1 350,00 €")).toBeInTheDocument();

    await user.click(
      within(form).getByRole("button", { name: "Ajouter le bail" }),
    );

    await waitFor(() =>
      expect(api.leases.create).toHaveBeenCalledWith({
        landlordId: 1,
        tenantId: 2,
        propertyAddress: "12 rue de la République, 75000 Paris",
        rentExclCharges: "1300.00",
        charges: "50.00",
      }),
    );
  });

  it("confirms before deleting a lease", async () => {
    vi.mocked(api.leases.delete).mockResolvedValue(undefined);

    renderSettings();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Supprimer le bail 10" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Supprimer ce bail ?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Supprimer le bail" }),
    );

    await waitFor(() => expect(api.leases.delete).toHaveBeenCalledWith(10));
  });

  it("surfaces the French refusal when a referenced landlord is deleted", async () => {
    vi.mocked(api.landlords.delete).mockRejectedValue(
      new Error(
        "Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé.",
      ),
    );

    renderSettings();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Supprimer ce bailleur ?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Supprimer le bailleur" }),
    );

    await waitFor(() => {
      const messages = useToasts
        .getState()
        .toasts.map((element) => element.message);
      expect(messages).toContain(
        "Ce bailleur est utilisé par un bail actif et ne peut pas être supprimé.",
      );
    });
  });
});
