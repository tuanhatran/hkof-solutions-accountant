import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, type LandlordDto } from "@/api/endpoints";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { LandlordsSection } from "./LandlordsSection";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

const LANDLORD: LandlordDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
  signatureCount: 1,
};

const ACCENTED: LandlordDto = {
  id: 3,
  name: "Élodie Zéphyr",
  address: "2 rue de l'Église, 75005 Paris",
  signatureCount: 2,
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

let landlordsState: QueryLike<LandlordDto[]>;

/** Landlord ids in DOM order, read on the row items. */
function landlordOrder(): number[] {
  return [...document.querySelectorAll('[data-cy^="landlord-"]')]
    .map((element) =>
      Number(
        (element as HTMLElement).dataset.cy?.replace("landlord-", "") ?? NaN,
      ),
    )
    .filter((id) => Number.isInteger(id));
}

function readyQuery(data: LandlordDto[]): QueryLike<LandlordDto[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

vi.mock("@/api/endpoints", () => ({
  api: {
    landlords: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
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
    useLandlords: () => landlordsState,
    useSignatures: () => readyQuery([]),
  };
});

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <LandlordsSection />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ features: [] }),
  } as Response);
  landlordsState = readyQuery([LANDLORD, ACCENTED]);
  vi.mocked(api.landlords.create).mockReset();
  vi.mocked(api.landlords.update).mockReset();
  vi.mocked(api.landlords.remove).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("LandlordsSection", () => {
  it("lists landlords with their address and signature count", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Bailleurs" })).toBeVisible();
    expect(screen.getByText("M. Bailleur")).toBeVisible();
    expect(screen.getByText("1 avenue du Parc, 75011 Paris")).toBeVisible();
    expect(screen.getByText("1 signature")).toBeVisible();
    expect(screen.getByText("2 signatures")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    ).toBeVisible();
  });

  it("renders dense column headers above the landlords list", () => {
    renderSection();

    const headers = document.querySelector(
      '[data-cy="landlords-headers"]',
    ) as HTMLElement;
    expect(headers).not.toBeNull();
    expect(headers).toHaveAttribute("role", "row");
    expect(headers).toHaveClass("hidden", "md:grid");
    expect(
      within(headers)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Bailleur", "Adresse", "Signatures", "Actions"]);
    const table = headers.closest('[role="table"]') as HTMLElement;
    expect(table).toHaveClass("landlords-section-table");
  });

  it("shows the loading, empty and error states", async () => {
    landlordsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <LandlordsSection />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des bailleurs…")).toBeVisible();
    loading.unmount();

    landlordsState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <LandlordsSection />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText(
        "Aucun bailleur configuré. Ajoutez le bailleur du logement.",
      ),
    ).toBeVisible();
    empty.unmount();

    const refetch = vi.fn();
    landlordsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Bailleurs indisponibles"),
      refetch,
    };
    renderSection();
    expect(screen.getByText("Bailleurs indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("creates a landlord, keeps the modal open and shows the signature section", async () => {
    vi.mocked(api.landlords.create).mockResolvedValue({
      id: 5,
      name: "M. Nouveau",
      address: null,
      signatureCount: 0,
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un bailleur" }),
    );
    await user.type(screen.getByLabelText("Nom du bailleur"), " M. Nouveau ");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.landlords.create).toHaveBeenCalledWith({
        name: "M. Nouveau",
        address: null,
        issuePlace: null,
        phone: "",
        addressNote: "",
      }),
    );
    expect(
      await screen.findByText(
        "Bailleur enregistré. Ajoutez ou retirez ses signatures ci-dessous.",
      ),
    ).toBeVisible();
    expect(
      within(
        document.querySelector('[data-cy="landlord-form"]') as HTMLElement,
      ).getByText("Signatures"),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter un bailleur" }),
    ).toBeDisabled();
    expect(toastMessages()).toContain("Bailleur « M. Nouveau » ajouté.");
  });

  it("updates a landlord and exposes the existing signatures", async () => {
    vi.mocked(api.landlords.update).mockResolvedValue({
      ...LANDLORD,
      name: "M. Bailleur Modifié",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    );
    expect(screen.getByLabelText("Nom du bailleur")).toHaveValue("M. Bailleur");
    await user.clear(screen.getByLabelText("Nom du bailleur"));
    await user.type(
      screen.getByLabelText("Nom du bailleur"),
      "M. Bailleur Modifié",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.landlords.update).toHaveBeenCalledWith(1, {
        name: "M. Bailleur Modifié",
        address: "1 avenue du Parc, 75011 Paris",
        issuePlace: null,
        phone: "",
        addressNote: "",
      }),
    );
    expect(toastMessages()).toContain(
      "Bailleur « M. Bailleur Modifié » mis à jour.",
    );
  });

  it("deletes a landlord after confirmation in French", async () => {
    vi.mocked(api.landlords.remove).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    expect(await screen.findByText("Supprimer ce bailleur ?")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer le bailleur" }),
    );

    await waitFor(() => expect(api.landlords.remove).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(toastMessages()).toContain("Bailleur supprimé."),
    );
  });

  it("filters and sorts the landlords with a live count", async () => {
    renderSection();
    const user = userEvent.setup();

    expect(
      document.querySelector('[data-cy="filter-count-landlords"]'),
    ).toHaveTextContent("2 sur 2");

    await user.type(screen.getByLabelText("Filtrer la liste"), "elodie");
    expect(landlordOrder()).toEqual([3]);
    await user.click(
      document.querySelector(
        '[data-cy="filter-clear-landlords"]',
      ) as HTMLElement,
    );

    await user.click(
      document.querySelector(
        '[data-cy="sort-landlords-signatures"]',
      ) as HTMLElement,
    );
    expect(landlordOrder()).toEqual([1, 3]);
  });

  it("renders the landlords list and actions in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    expect(screen.getByRole("heading", { name: "Landlords" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add a landlord" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Edit M. Bailleur" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete M. Bailleur" }),
    ).toBeVisible();

    await i18n.changeLanguage("fr");
  });

  it("reports a delete failure in French", async () => {
    vi.mocked(api.landlords.remove).mockRejectedValue(
      new Error("Ce bailleur est utilisé par un bail actif."),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer le bailleur" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Ce bailleur est utilisé par un bail actif.",
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer ce bailleur ?" }),
    ).toBeNull();
  });

  it("autocompletes the landlord address and saves the selected suggestion", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ADDRESS_RESPONSE,
    } as Response);
    vi.mocked(api.landlords.create).mockResolvedValue({
      id: 6,
      name: "M. Nouveau",
      address: "2 rue du Test 75001 Paris",
      signatureCount: 0,
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter un bailleur" }),
    );
    await user.type(screen.getByLabelText("Nom du bailleur"), "M. Nouveau");
    const address = screen.getByRole("combobox", { name: "Adresse" });
    await user.type(address, "2 rue du Test");

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://api-adresse.data.gouv.fr/search/?q=2%20rue%20du%20Test&limit=5",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      ),
    );
    await user.click(
      await screen.findByRole("option", { name: "2 rue du Test 75001 Paris" }),
    );
    expect(address).toHaveValue("2 rue du Test 75001 Paris");

    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.landlords.create).toHaveBeenCalledWith(
        expect.objectContaining({ address: "2 rue du Test 75001 Paris" }),
      ),
    );
  });
});
