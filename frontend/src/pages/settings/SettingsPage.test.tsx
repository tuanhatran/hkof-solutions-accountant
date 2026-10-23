import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { SettingsDto } from "@/api/types";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { useToasts } from "@/state/toasts";

const SETTINGS: SettingsDto = {
  companyName: "HKOF",
  legalForm: "EURL",
  siren: "123 456 789",
  companyAddress: "1 rue de la Paix, 75002 Paris",
  managerName: "Camille Martin",
  homeAddress: "12 rue des Lilas, 75011 Paris",
  totalArea: "70.00",
  businessArea: "25.00",
  proRataBase: "35.71",
  issuePlace: "Paris",
};

let settingsState = {};

vi.mock("@/api/endpoints", () => ({
  api: {
    settings: { get: vi.fn(), update: vi.fn() },
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
    useSettings: () => settingsState,
    useExpenseItems: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useSignatures: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLandlords: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTenants: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLeases: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

function renderPage() {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SettingsPage tabs", () => {
  beforeEach(() => {
    settingsState = {
      data: SETTINGS,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    vi.mocked(api.settings.update).mockReset();
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
  });

  it("switches to the Quittances tab with the directories and signatures", async () => {
    renderPage();

    await userEvent
      .setup()
      .click(screen.getByRole("tab", { name: "Quittances" }));

    expect(await screen.findByRole("heading", { name: "Bailleurs" })).toBeVisible();
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

    await userEvent
      .setup()
      .click(screen.getByRole("tab", { name: "Entreprise" }));
    expect(screen.getByLabelText("Raison sociale")).toHaveValue("HKOF");
  });

  it("saves the configuration and confirms in French", async () => {
    vi.mocked(api.settings.update).mockResolvedValue(SETTINGS);
    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("Toutes les valeurs sont à jour.")).toBeVisible();
    await user.clear(screen.getByLabelText("Raison sociale"));
    await user.type(screen.getByLabelText("Raison sociale"), "HKOF 2");
    expect(screen.getByText("Modifications non enregistrées.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() =>
      expect(api.settings.update).toHaveBeenCalledWith({
        companyName: "HKOF 2",
        legalForm: "EURL",
        siren: "123 456 789",
        companyAddress: "1 rue de la Paix, 75002 Paris",
        managerName: "Camille Martin",
        homeAddress: "12 rue des Lilas, 75011 Paris",
        totalArea: "70.00",
        businessArea: "25.00",
        issuePlace: "Paris",
      }),
    );
    await waitFor(() =>
      expect(
        useToasts
          .getState()
          .toasts.map((element) => element.message),
      ).toContain(
        "Configuration enregistrée. Les prochains documents utiliseront ces valeurs.",
      ),
    );
  });

  it("shows the validation messages when required fields are empty", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Raison sociale"));
    await user.clear(screen.getByLabelText("Forme juridique"));
    await user.clear(screen.getByLabelText("Adresse de la société"));
    await user.clear(screen.getByLabelText("Adresse du logement"));
    await user.click(
      screen.getByRole("button", { name: "Enregistrer la configuration" }),
    );

    expect(
      await screen.findByText("La raison sociale est obligatoire."),
    ).toBeVisible();
    expect(screen.getByText("La forme juridique est obligatoire.")).toBeVisible();
    expect(
      screen.getByText("L'adresse de la société est obligatoire."),
    ).toBeVisible();
    expect(
      screen.getByText("L'adresse du logement est obligatoire."),
    ).toBeVisible();
    expect(api.settings.update).not.toHaveBeenCalled();
  });

  it("computes the indicative pro-rata from the areas", async () => {
    renderPage();

    expect(screen.getByText("35,71 %")).toBeVisible();

    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Surface totale (m²)"));
    await user.type(screen.getByLabelText("Surface totale (m²)"), "0");
    expect(screen.getByText("—")).toBeVisible();
  });

  it("surfaces the save error in the save bar", async () => {
    vi.mocked(api.settings.update).mockRejectedValue(
      new Error("Enregistrement impossible."),
    );
    renderPage();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Raison sociale"));
    await user.type(screen.getByLabelText("Raison sociale"), "HKOF 3");
    await user.click(
      screen.getByRole("button", { name: "Enregistrer la configuration" }),
    );

    expect(
      await screen.findByText("Enregistrement impossible."),
    ).toBeVisible();
  });

  it("shows the loading then error states of the settings", async () => {
    const refetch = vi.fn();
    settingsState = {
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
    expect(screen.getByText("Chargement de la configuration…")).toBeVisible();
    loading.unmount();

    settingsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Paramètres indisponibles"),
      refetch,
    };
    renderPage();
    expect(screen.getByText("Paramètres indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("falls back on the default pro-rata for a new expense item", async () => {
    settingsState = {
      ...settingsState,
      data: { ...SETTINGS, proRataBase: undefined },
    };
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Ajouter un type" }));

    expect(screen.getByLabelText("Prorata par défaut (%)")).toHaveValue(
      "100,00",
    );
  });
});
