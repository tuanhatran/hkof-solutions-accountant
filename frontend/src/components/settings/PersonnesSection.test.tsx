import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { PersonDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { PersonnesSection } from "./PersonnesSection";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let personsState: QueryLike<PersonDto[]>;

const LANDLORD: PersonDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
  signatureCount: 1,
};

const TENANT: PersonDto = {
  id: 2,
  name: "Mme Locataire",
  address: null,
  signatureCount: 0,
};

function readyQuery(data: PersonDto[]): QueryLike<PersonDto[]> {
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
    persons: {
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
    usePersons: () => personsState,
    useSignatures: () => readyQuery([]),
  };
});

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PersonnesSection />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  personsState = readyQuery([LANDLORD, TENANT]);
  vi.mocked(api.persons.create).mockReset();
  vi.mocked(api.persons.update).mockReset();
  vi.mocked(api.persons.remove).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("PersonnesSection", () => {
  it("lists natural persons with their address and signature count", () => {
    renderSection();

    expect(screen.getByRole("heading", { name: "Personnes" })).toBeVisible();
    expect(screen.getByText("M. Bailleur")).toBeVisible();
    expect(screen.getByText("1 avenue du Parc, 75011 Paris")).toBeVisible();
    expect(screen.getByText("1 signature")).toBeVisible();
    expect(screen.getByText("Mme Locataire")).toBeVisible();
    expect(screen.getByText("Adresse non renseignée")).toBeVisible();
    expect(screen.getByText("0 signature")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    ).toBeVisible();
  });

  it("shows the loading, empty and error states", async () => {
    personsState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonnesSection />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des personnes…")).toBeVisible();
    loading.unmount();

    personsState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonnesSection />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText(
        "Aucune personne configurée. Ajoutez le bailleur ou le locataire du logement.",
      ),
    ).toBeVisible();
    empty.unmount();

    const refetch = vi.fn();
    personsState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Personnes indisponibles"),
      refetch,
    };
    renderSection();
    expect(screen.getByText("Personnes indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("creates a person, keeps the modal open and shows the signature section", async () => {
    vi.mocked(api.persons.create).mockResolvedValue({
      id: 5,
      name: "M. Nouveau",
      address: null,
      signatureCount: 0,
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter une personne" }),
    );
    await user.type(
      screen.getByLabelText("Nom de la personne"),
      " M. Nouveau ",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.persons.create).toHaveBeenCalledWith({
        name: "M. Nouveau",
        address: null,
      }),
    );
    expect(
      await screen.findByText(
        "Personne enregistrée. Ajoutez ou retirez ses signatures ci-dessous.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Signatures")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ajouter une personne" }),
    ).toBeDisabled();
    expect(toastMessages()).toContain("Personne « M. Nouveau » ajoutée.");
  });

  it("updates a person and exposes the existing signatures", async () => {
    vi.mocked(api.persons.update).mockResolvedValue({
      ...LANDLORD,
      name: "M. Bailleur Modifié",
    });
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Modifier M. Bailleur" }),
    );
    expect(screen.getByLabelText("Nom de la personne")).toHaveValue(
      "M. Bailleur",
    );
    await user.clear(screen.getByLabelText("Nom de la personne"));
    await user.type(
      screen.getByLabelText("Nom de la personne"),
      "M. Bailleur Modifié",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.persons.update).toHaveBeenCalledWith(1, {
        name: "M. Bailleur Modifié",
        address: "1 avenue du Parc, 75011 Paris",
      }),
    );
    expect(toastMessages()).toContain(
      "Personne « M. Bailleur Modifié » mise à jour.",
    );
    expect(screen.getByText("Signatures")).toBeVisible();
  });

  it("deletes a person after confirmation in French", async () => {
    vi.mocked(api.persons.remove).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    expect(await screen.findByText("Supprimer cette personne ?")).toBeVisible();
    expect(
      screen.getByText(/Une personne utilisée par un bail actif/),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer la personne" }),
    );

    await waitFor(() => expect(api.persons.remove).toHaveBeenCalledWith(1));
    await waitFor(() =>
      expect(toastMessages()).toContain("Personne supprimée."),
    );
  });

  it("reports a delete failure in French", async () => {
    vi.mocked(api.persons.remove).mockRejectedValue(
      new Error("Cette personne est utilisée par un bail actif."),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer M. Bailleur" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer la personne" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain(
        "Cette personne est utilisée par un bail actif.",
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer cette personne ?" }),
    ).toBeNull();
  });
});
