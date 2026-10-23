import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { LandlordDto, LeaseDto, TenantDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { RentReceiptSettings } from "@/components/settings/RentReceiptSettings";

let landlordList: LandlordDto[] = [];
let tenantList: TenantDto[] = [];
let leaseList: LeaseDto[] = [];
interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
let landlordState: QueryLike<LandlordDto[]>;
let tenantState: QueryLike<TenantDto[]>;
let leaseState: QueryLike<LeaseDto[]>;

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
    useLandlords: () => landlordState,
    useTenants: () => tenantState,
    useLeases: () => leaseState,
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
    landlordState = {
      data: landlordList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    tenantState = {
      data: tenantList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    leaseState = {
      data: leaseList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
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

  it("edits a landlord and a tenant, updating them", async () => {
    vi.mocked(api.landlords.update).mockResolvedValue({
      id: 1,
      name: "M. Bailleur",
      address: "1 avenue du Parc, 75011 Paris",
    });
    vi.mocked(api.tenants.update).mockResolvedValue({
      id: 2,
      name: "Mme Locataire",
      address: "12 rue de la République, 75000 Paris",
    });

    renderSettings();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Modifier le bailleur « M. Bailleur »",
      }),
    ).toBeVisible();
    expect(screen.getByLabelText("Nom du bailleur")).toHaveValue("M. Bailleur");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le bailleur" }),
    );

    await waitFor(() =>
      expect(api.landlords.update).toHaveBeenCalledWith(1, {
        name: "M. Bailleur",
        address: "1 avenue du Parc, 75011 Paris",
      }),
    );
    await waitFor(() => {
      const messages = useToasts
        .getState()
        .toasts.map((element) => element.message);
      expect(messages).toContain("Bailleur « M. Bailleur » mis à jour.");
    });

    await user.click(
      screen.getByRole("button", { name: "Modifier Mme Locataire" }),
    );
    expect(
      screen.getByRole("heading", {
        name: "Modifier le locataire « Mme Locataire »",
      }),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le locataire" }),
    );

    await waitFor(() =>
      expect(api.tenants.update).toHaveBeenCalledWith(2, {
        name: "Mme Locataire",
        address: "12 rue de la République, 75000 Paris",
      }),
    );
    await waitFor(() => {
      const messages = useToasts
        .getState()
        .toasts.map((element) => element.message);
      expect(messages).toContain("Locataire « Mme Locataire » mis à jour.");
    });
  });

  it("edits a lease with its prefilled values", async () => {
    vi.mocked(api.leases.update).mockResolvedValue(LEASE);

    renderSettings();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier le bail 10" }),
    );
    expect(
      screen.getByRole("heading", { name: "Modifier le bail" }),
    ).toBeVisible();
    const form = screen.getByLabelText("Bailleur du bail").closest("form");
    if (!form) {
      throw new Error("Lease form not found");
    }
    expect(within(form).getByLabelText("Adresse du bien")).toHaveValue(
      "12 rue de la République, 75000 Paris",
    );
    expect(within(form).getByLabelText("Loyer hors charges (€)")).toHaveValue(
      "1300,00",
    );
    expect(
      within(form).getByLabelText("Provision pour charges (€)"),
    ).toHaveValue("0,00");

    await user.click(
      within(form).getByRole("button", { name: "Enregistrer le bail" }),
    );

    await waitFor(() =>
      expect(api.leases.update).toHaveBeenCalledWith(10, {
        landlordId: 1,
        tenantId: 2,
        propertyAddress: "12 rue de la République, 75000 Paris",
        rentExclCharges: "1300.00",
        charges: "0.00",
      }),
    );
    await waitFor(() => {
      const messages = useToasts
        .getState()
        .toasts.map((element) => element.message);
      expect(messages).toContain("Bail mis à jour.");
    });
  });

  it("removes a tenant and a lease after confirmation", async () => {
    vi.mocked(api.tenants.delete).mockResolvedValue(undefined);
    vi.mocked(api.leases.delete).mockResolvedValue(undefined);

    renderSettings();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Mme Locataire" }),
    );
    const tenantDialog = screen.getByRole("dialog", {
      name: "Supprimer ce locataire ?",
    });
    await user.click(
      within(tenantDialog).getByRole("button", {
        name: "Supprimer le locataire",
      }),
    );
    await waitFor(() => expect(api.tenants.delete).toHaveBeenCalledWith(2));

    await user.click(
      screen.getByRole("button", { name: "Supprimer le bail 10" }),
    );
    const leaseDialog = screen.getByRole("dialog", {
      name: "Supprimer ce bail ?",
    });
    await user.click(
      within(leaseDialog).getByRole("button", { name: "Supprimer le bail" }),
    );
    await waitFor(() => expect(api.leases.delete).toHaveBeenCalledWith(10));

    await waitFor(() => {
      const messages = useToasts
        .getState()
        .toasts.map((element) => element.message);
      expect(messages).toContain("Locataire supprimé.");
      expect(messages).toContain("Bail supprimé.");
    });
  });

  it("surfaces tenant and lease deletion errors", async () => {
    vi.mocked(api.tenants.delete).mockRejectedValue(
      new Error("Ce locataire est utilisé par un bail actif."),
    );
    vi.mocked(api.leases.delete).mockRejectedValue(
      new Error("Le bail ne peut pas être supprimé."),
    );

    renderSettings();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Mme Locataire" }),
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Supprimer ce locataire ?" }),
      ).getByRole("button", { name: "Supprimer le locataire" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer le bail 10" }),
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Supprimer ce bail ?" }),
      ).getByRole("button", { name: "Supprimer le bail" }),
    );

    await waitFor(() => {
      const messages = useToasts
        .getState()
        .toasts.map((element) => element.message);
      expect(messages).toContain("Ce locataire est utilisé par un bail actif.");
      expect(messages).toContain("Le bail ne peut pas être supprimé.");
    });
  });

  it("cancels the deletion dialogs without calling the API", async () => {
    renderSettings();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Supprimer ce bailleur ?",
    });
    expect(
      within(dialog).getByText(/« M\. Bailleur » ne sera plus proposé/),
    ).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(api.landlords.delete).not.toHaveBeenCalled();
  });

  it("shows the empty directory states", () => {
    landlordState = { ...landlordState, data: [] };
    tenantState = { ...tenantState, data: [] };
    leaseState = { ...leaseState, data: [] };

    renderSettings();

    expect(screen.getByText(/Aucun bailleur configuré/)).toBeVisible();
    expect(screen.getByText(/Aucun locataire configuré/)).toBeVisible();
    expect(screen.getByText(/Aucun bail configuré/)).toBeVisible();
  });

  it("shows the loading states of the three directories", () => {
    landlordState = { ...landlordState, data: undefined, isPending: true };
    tenantState = { ...tenantState, data: undefined, isPending: true };
    leaseState = { ...leaseState, data: undefined, isPending: true };

    renderSettings();

    expect(screen.getByText("Chargement des bailleurs…")).toBeVisible();
    expect(screen.getByText("Chargement des locataires…")).toBeVisible();
    expect(screen.getByText("Chargement des baux…")).toBeVisible();
  });

  it("shows the error states and retries the three directories", async () => {
    const landlordRefetch = vi.fn();
    const tenantRefetch = vi.fn();
    const leaseRefetch = vi.fn();
    landlordState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Bailleurs indisponibles"),
      refetch: landlordRefetch,
    };
    tenantState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Locataires indisponibles"),
      refetch: tenantRefetch,
    };
    leaseState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Baux indisponibles"),
      refetch: leaseRefetch,
    };

    renderSettings();
    const user = userEvent.setup();

    expect(screen.getByText("Bailleurs indisponibles")).toBeVisible();
    expect(screen.getByText("Locataires indisponibles")).toBeVisible();
    expect(screen.getByText("Baux indisponibles")).toBeVisible();

    const retryButtons = screen.getAllByRole("button", { name: "Réessayer" });
    for (const button of retryButtons) {
      await user.click(button);
    }

    expect(landlordRefetch).toHaveBeenCalledTimes(1);
    expect(tenantRefetch).toHaveBeenCalledTimes(1);
    expect(leaseRefetch).toHaveBeenCalledTimes(1);
  });

  it("falls back on generic labels for unnamed entries and missing addresses", () => {
    landlordState = {
      ...landlordState,
      data: [{ id: 7 }],
    };
    tenantState = {
      ...tenantState,
      data: [{ id: 8, name: "Locataire sans adresse" }],
    };
    leaseState = {
      ...leaseState,
      data: [
        {
          id: 12,
          landlordId: 7,
          tenantId: 8,
          tenantName: "Locataire sans adresse",
          propertyAddress: "3 rue du Test",
          rentExclCharges: undefined,
          charges: undefined,
        },
      ],
    };

    renderSettings();

    expect(screen.getByText("Bailleur")).toBeVisible();
    expect(screen.getAllByText("Adresse non renseignée")).toHaveLength(2);
    expect(screen.getByText("Locataire sans adresse")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Modifier le bailleur" }),
    ).toHaveLength(1);
  });

  it("blocks empty submissions with the French validation messages", async () => {
    renderSettings();
    const user = userEvent.setup();

    const landlordForm = screen
      .getByRole("button", { name: "Ajouter un bailleur" })
      .closest("section");
    await user.click(
      screen.getByRole("button", { name: "Ajouter un bailleur" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ajouter le bailleur" }),
    );
    expect(
      await screen.findByText("Le nom du bailleur est obligatoire."),
    ).toBeVisible();
    expect(landlordForm).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un locataire" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ajouter le locataire" }),
    );
    expect(
      await screen.findByText("Le nom du locataire est obligatoire."),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    await user.click(screen.getByRole("button", { name: "Ajouter le bail" }));
    expect(await screen.findByText("Sélectionnez un bailleur.")).toBeVisible();
    expect(screen.getByText("Sélectionnez un locataire.")).toBeVisible();
    expect(
      screen.getByText("L'adresse du bien est obligatoire."),
    ).toBeVisible();
    expect(screen.getByText("Loyer hors charges invalide.")).toBeVisible();
    expect(screen.getByText("Provision pour charges invalide.")).toBeVisible();
    expect(api.landlords.create).not.toHaveBeenCalled();
    expect(api.tenants.create).not.toHaveBeenCalled();
    expect(api.leases.create).not.toHaveBeenCalled();
  });

  it("surfaces create request errors on the three forms", async () => {
    vi.mocked(api.landlords.create).mockRejectedValue(
      new Error("Bailleur refusé."),
    );
    vi.mocked(api.tenants.create).mockRejectedValue(
      new Error("Locataire refusé."),
    );
    vi.mocked(api.leases.create).mockRejectedValue(new Error("Bail refusé."));

    renderSettings();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un bailleur" }),
    );
    await user.type(screen.getByLabelText("Nom du bailleur"), "M. Refusé");
    await user.click(
      screen.getByRole("button", { name: "Ajouter le bailleur" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bailleur refusé.",
    );

    await user.click(
      screen.getByRole("button", { name: "Ajouter un locataire" }),
    );
    await user.type(screen.getByLabelText("Nom du locataire"), "Mme Refusée");
    await user.click(
      screen.getByRole("button", { name: "Ajouter le locataire" }),
    );
    await waitFor(() =>
      expect(screen.getByText("Locataire refusé.")).toBeVisible(),
    );

    await user.click(screen.getByRole("button", { name: "Ajouter un bail" }));
    const form = screen.getByLabelText("Bailleur du bail").closest("form");
    if (!form) {
      throw new Error("Lease form not found");
    }
    await user.selectOptions(screen.getByLabelText("Bailleur du bail"), "1");
    await user.selectOptions(
      within(form).getByLabelText("Locataire du bail"),
      "2",
    );
    await user.type(
      within(form).getByLabelText("Adresse du bien"),
      "1 rue du Bail",
    );
    await user.type(
      within(form).getByLabelText("Loyer hors charges (€)"),
      "900",
    );
    await user.type(
      within(form).getByLabelText("Provision pour charges (€)"),
      "50",
    );
    await user.click(
      within(form).getByRole("button", { name: "Ajouter le bail" }),
    );
    await waitFor(() => expect(screen.getByText("Bail refusé.")).toBeVisible());
  });
});
