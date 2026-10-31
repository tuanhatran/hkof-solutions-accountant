import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { AgencyDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { AgencySection } from "./AgencySection";

const mockAgency: AgencyDto = {
  id: 1,
  name: "Immobilier Parisien",
  isPersonal: false,
  managerName: "Jean Dupont",
  legalForm: "SAS",
  siren: "123456789",
  siret: "12345678900012",
  address: "12 rue de la Paix, 75002 Paris",
};

let currentAgency: AgencyDto | null = mockAgency;

vi.mock("@/api/endpoints", () => ({
  api: {
    agency: {
      get: vi.fn(() => Promise.resolve(currentAgency)),
      save: vi.fn(),
    },
  },
}));

function renderAgencySection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AgencySection />
    </QueryClientProvider>,
  );
}

describe("AgencySection", () => {
  beforeEach(() => {
    currentAgency = { ...mockAgency };
    vi.mocked(api.agency.get).mockResolvedValue(currentAgency);
    vi.mocked(api.agency.save).mockReset();
    useToasts.setState({ toasts: [] });
  });

  it("renders agency profile form prefilled with existing data", async () => {
    renderAgencySection();

    expect(
      await screen.findByRole("heading", { name: "Profil de l'agence" }),
    ).toBeVisible();

    expect(screen.getByLabelText("Nom de l'agence")).toHaveValue(
      "Immobilier Parisien",
    );
    expect(screen.getByLabelText("Gestionnaire")).toHaveValue("Jean Dupont");
    expect(screen.getByLabelText("Forme juridique")).toHaveValue("SAS");
    expect(screen.getByLabelText("SIREN ou SIRET")).toHaveValue(
      "12345678900012",
    );
    expect(screen.getByLabelText("Adresse du siège")).toHaveValue(
      "12 rue de la Paix, 75002 Paris",
    );
    expect(
      screen.getByRole("checkbox", { name: /Agence personnelle/ }),
    ).not.toBeChecked();
  });

  it("toggles personal agency, hiding corporate fields and sending personal agency request", async () => {
    const user = userEvent.setup();
    vi.mocked(api.agency.save).mockResolvedValue({
      ...mockAgency,
      isPersonal: true,
      legalForm: null,
      siren: null,
      siret: null,
      address: null,
    });

    renderAgencySection();

    expect(
      await screen.findByRole("heading", { name: "Profil de l'agence" }),
    ).toBeVisible();

    // Toggle personal agency checkbox
    const checkbox = screen.getByRole("checkbox", {
      name: /Agence personnelle/,
    });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // Corporate fields are hidden
    expect(screen.queryByLabelText("Forme juridique")).toBeNull();
    expect(screen.queryByLabelText("SIREN ou SIRET")).toBeNull();
    expect(screen.queryByLabelText("Adresse du siège")).toBeNull();

    // Submit form
    await user.click(
      screen.getByRole("button", { name: "Enregistrer l'agence" }),
    );

    await waitFor(() =>
      expect(api.agency.save).toHaveBeenCalledWith({
        name: "Immobilier Parisien",
        isPersonal: true,
        managerName: "Jean Dupont",
        legalForm: null,
        siren: null,
        siret: null,
        address: null,
      }),
    );

    expect(useToasts.getState().toasts[0]?.message).toBe(
      "Profil de l'agence enregistré.",
    );
  });

  it("updates professional agency details and calls api.agency.save", async () => {
    const user = userEvent.setup();
    vi.mocked(api.agency.save).mockResolvedValue({
      ...mockAgency,
      name: "Nouvelle Agence",
      managerName: "Alice Martin",
    });

    renderAgencySection();

    expect(
      await screen.findByRole("heading", { name: "Profil de l'agence" }),
    ).toBeVisible();

    await user.clear(screen.getByLabelText("Nom de l'agence"));
    await user.type(
      screen.getByLabelText("Nom de l'agence"),
      "Nouvelle Agence",
    );

    await user.clear(screen.getByLabelText("Gestionnaire"));
    await user.type(screen.getByLabelText("Gestionnaire"), "Alice Martin");

    await user.click(
      screen.getByRole("button", { name: "Enregistrer l'agence" }),
    );

    await waitFor(() =>
      expect(api.agency.save).toHaveBeenCalledWith({
        name: "Nouvelle Agence",
        isPersonal: false,
        managerName: "Alice Martin",
        legalForm: "SAS",
        siren: "123456789",
        siret: "12345678900012",
        address: "12 rue de la Paix, 75002 Paris",
      }),
    );
  });
});
