import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { PersonDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { PersonForm } from "./PersonForm";

const PERSON: PersonDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
  signatureCount: 1,
};

vi.mock("@/api/endpoints", () => ({
  api: {
    persons: {
      create: vi.fn(),
      update: vi.fn(),
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
    useSignatures: () => ({
      data: [],
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

function renderForm(item: PersonDto | null = null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <PersonForm item={item} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { onClose };
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  vi.mocked(api.persons.create).mockReset();
  vi.mocked(api.persons.update).mockReset();
  useToasts.setState({ toasts: [] });
});

describe("PersonForm", () => {
  it("opens in create mode with the signature hint and no signature section", () => {
    renderForm();

    expect(
      screen.getByRole("heading", { name: "Ajouter une personne" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Nom de la personne")).toHaveValue("");
    expect(
      screen.getByText(
        "Enregistrez la personne pour ajouter ses signatures sans fermer cette fenêtre.",
      ),
    ).toBeVisible();
    expect(screen.queryByText("Signatures")).toBeNull();
  });

  it("creates the person, stays open and shows the signature section", async () => {
    vi.mocked(api.persons.create).mockResolvedValue({
      id: 5,
      name: "M. Nouveau",
      address: "2 rue du Marché, 75003 Paris",
      signatureCount: 0,
    });
    const { onClose } = renderForm();
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Nom de la personne"),
      "  M. Nouveau  ",
    );
    await user.type(
      screen.getByLabelText("Adresse"),
      "2 rue du Marché, 75003 Paris",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.persons.create).toHaveBeenCalledWith({
        name: "M. Nouveau",
        address: "2 rue du Marché, 75003 Paris",
      }),
    );
    expect(
      await screen.findByText(
        "Personne enregistrée. Ajoutez ou retirez ses signatures ci-dessous.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Signatures")).toBeVisible();
    expect(
      screen.getByText(
        "Aucune signature enregistrée. Ajoutez une image pour signer les documents de cette personne.",
      ),
    ).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
    expect(toastMessages()).toContain("Personne « M. Nouveau » ajoutée.");
  });

  it("rejects an empty name in French without calling the API", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText("Le nom de la personne est obligatoire."),
    ).toBeVisible();
    expect(api.persons.create).not.toHaveBeenCalled();
  });

  it("updates an existing person and exposes the saved signatures", async () => {
    vi.mocked(api.persons.update).mockResolvedValue({
      ...PERSON,
      name: "M. Bailleur Modifié",
    });
    const { onClose } = renderForm(PERSON);
    const user = userEvent.setup();

    expect(
      screen.getByRole("heading", { name: "Modifier une personne physique" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Nom de la personne")).toHaveValue(
      "M. Bailleur",
    );
    expect(screen.getByLabelText("Adresse")).toHaveValue(
      "1 avenue du Parc, 75011 Paris",
    );
    expect(screen.getByText("Signatures")).toBeVisible();

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
    expect(onClose).not.toHaveBeenCalled();
    expect(toastMessages()).toContain(
      "Personne « M. Bailleur Modifié » mise à jour.",
    );
  });

  it("shows a French API error in the modal", async () => {
    vi.mocked(api.persons.create).mockRejectedValue(
      new Error("Ce nom est déjà utilisé."),
    );
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nom de la personne"), "M. Doublon");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ce nom est déjà utilisé.",
    );
  });

  it("closes explicitly through the modal close button", async () => {
    const { onClose } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
