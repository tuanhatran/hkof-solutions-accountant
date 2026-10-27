import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { SignatureDto } from "@/api/types";
import i18n from "@/i18n";
import { useToasts } from "@/state/toasts";
import { PersonSignatureSection } from "./PersonSignatureSection";
import { MAX_SIGNATURE_SIZE, signatureImageError } from "./signatureUpload";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let signaturesState: QueryLike<SignatureDto[]>;
const createObjectURL = vi.fn();

const SIGNATURE: SignatureDto = {
  id: 7,
  personId: 1,
  personName: "M. Bailleur",
  name: "Signature bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const SECOND: SignatureDto = {
  id: 8,
  personId: 1,
  personName: "M. Bailleur",
  name: "Signature 2026",
  mimeType: "image/jpeg",
  createdAt: "2026-10-24T10:00:00Z",
};

function readyQuery(data: SignatureDto[]): QueryLike<SignatureDto[]> {
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
  return { ...actual, useSignatures: () => signaturesState };
});

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PersonSignatureSection personId={1} />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

function imageFile(name = "signature.png", type = "image/png") {
  return new File([new Uint8Array([137, 80, 78, 71])], name, { type });
}

beforeEach(() => {
  signaturesState = readyQuery([SIGNATURE, SECOND]);
  vi.mocked(api.signatures.create).mockReset();
  vi.mocked(api.signatures.remove).mockReset();
  useToasts.setState({ toasts: [] });
  createObjectURL.mockReset();
  createObjectURL.mockReturnValue("blob:signature");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("PersonSignatureSection", () => {
  it("lists the signatures of the person with their creation date", () => {
    renderSection();

    expect(screen.getByText("Signatures")).toBeVisible();
    expect(screen.getByText("Signature bailleur")).toBeVisible();
    expect(screen.getByText("Signature 2026")).toBeVisible();
    expect(screen.getByText("Ajoutée le 23/10/2026")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Signature Signature bailleur" }),
    ).toHaveAttribute("src", "/api/signatures/7/image");
    expect(
      screen.getByRole("button", { name: "Supprimer Signature bailleur" }),
    ).toBeVisible();
  });

  it("shows the loading, empty and error states", async () => {
    signaturesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonSignatureSection personId={1} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des signatures…")).toBeVisible();
    loading.unmount();

    signaturesState = readyQuery([]);
    const empty = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonSignatureSection personId={1} />
      </QueryClientProvider>,
    );
    expect(
      screen.getByText(
        "Aucune signature enregistrée. Ajoutez une image pour signer les documents de cette personne.",
      ),
    ).toBeVisible();
    empty.unmount();

    const refetch = vi.fn();
    signaturesState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Signatures indisponibles"),
      refetch,
    };
    renderSection();
    expect(screen.getByText("Signatures indisponibles")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("requires a name and an image before uploading", async () => {
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Ajouter la signature" }),
    );
    expect(
      await screen.findByText("Le nom de la signature est obligatoire."),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Nom de la signature"), "Bailleur");
    await user.click(
      screen.getByRole("button", { name: "Ajouter la signature" }),
    );
    expect(
      await screen.findByText("Sélectionnez une image PNG ou JPEG."),
    ).toBeVisible();
    expect(api.signatures.create).not.toHaveBeenCalled();
  });

  it("documents the accepted signature formats in French", () => {
    expect(signatureImageError(imageFile("notes.txt", "text/plain"))).toBe(
      "Format non accepté. Formats : PNG, JPEG.",
    );
    expect(
      signatureImageError(
        new File([new Uint8Array(MAX_SIGNATURE_SIZE + 1)], "grand.png", {
          type: "image/png",
        }),
      ),
    ).toBe("Fichier trop volumineux (2 Mo maximum).");
    expect(signatureImageError(imageFile("ok.jpeg", "image/jpeg"))).toBeNull();
  });

  it("uploads a signature for the person and confirms in French", async () => {
    vi.mocked(api.signatures.create).mockResolvedValue({
      id: 9,
      personId: 1,
      personName: "M. Bailleur",
      name: "Bailleur",
    });
    renderSection();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nom de la signature"), " Bailleur ");
    const file = imageFile();
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      file,
    );
    expect(await screen.findByText("signature.png")).toBeVisible();
    expect(createObjectURL).toHaveBeenCalledWith(file);

    await user.click(
      screen.getByRole("button", { name: "Ajouter la signature" }),
    );

    await waitFor(() =>
      expect(api.signatures.create).toHaveBeenCalledWith(1, "Bailleur", file),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Signature « Bailleur » ajoutée."),
    );
    expect(screen.getByLabelText("Nom de la signature")).toHaveValue("");
  });

  it("surfaces an upload failure in the section", async () => {
    vi.mocked(api.signatures.create).mockRejectedValue(
      new Error("Format d’image refusé par le serveur."),
    );
    renderSection();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Nom de la signature"), "Bailleur");
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      imageFile(),
    );
    await user.click(
      screen.getByRole("button", { name: "Ajouter la signature" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Format d’image refusé par le serveur.",
    );
  });

  it("removes a signature after confirmation", async () => {
    vi.mocked(api.signatures.remove).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Signature bailleur" }),
    );
    expect(
      await screen.findByText("Supprimer cette signature ?"),
    ).toBeVisible();
    expect(
      screen.getByText(/ne sera plus proposée dans les documents/),
    ).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Supprimer la signature" }),
    );

    await waitFor(() => expect(api.signatures.remove).toHaveBeenCalledWith(7));
    await waitFor(() =>
      expect(toastMessages()).toContain("Signature supprimée."),
    );
  });

  it("renders the signature list, form and hints in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();

    expect(screen.getByText("Signatures")).toBeVisible();
    expect(screen.getByText("Signature bailleur")).toBeVisible();
    expect(screen.getByText("Added on 23/10/2026")).toBeVisible();
    expect(screen.getByLabelText("Signature name")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add the signature" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Delete Signature bailleur" }),
    ).toBeVisible();
    expect(
      screen.getByText("A person can keep several signatures."),
    ).toBeVisible();
    expect(
      screen.getByText(
        "PNG or JPEG images, 2 MB maximum. Logical deletion only.",
      ),
    ).toBeVisible();
  });

  it("requires a name and an image in English", async () => {
    await i18n.changeLanguage("en");
    renderSection();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add the signature" }));
    expect(
      await screen.findByText("The signature name is required."),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Signature name"), "Bailleur");
    await user.click(screen.getByRole("button", { name: "Add the signature" }));
    expect(
      await screen.findByText("Select a PNG or JPEG image."),
    ).toBeVisible();
    expect(api.signatures.create).not.toHaveBeenCalled();
  });

  it("documents the accepted signature formats in English", async () => {
    await i18n.changeLanguage("en");

    expect(signatureImageError(imageFile("notes.txt", "text/plain"))).toBe(
      "Unsupported format. Formats: PNG, JPEG.",
    );
    expect(
      signatureImageError(
        new File([new Uint8Array(MAX_SIGNATURE_SIZE + 1)], "grand.png", {
          type: "image/png",
        }),
      ),
    ).toBe("File too large (2 MB maximum).");
    expect(signatureImageError(imageFile("ok.jpeg", "image/jpeg"))).toBeNull();
  });

  it("uploads a signature and shows the preview in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.signatures.create).mockResolvedValue({
      id: 9,
      personId: 1,
      personName: "M. Bailleur",
      name: "Bailleur",
    });
    renderSection();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Signature name"), " Bailleur ");
    const file = imageFile();
    await user.upload(screen.getByLabelText("Choose a signature image"), file);
    expect(await screen.findByText("signature.png")).toBeVisible();
    expect(screen.getByAltText("Preview of signature.png")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Remove the signature image" }),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Add the signature" }));

    await waitFor(() =>
      expect(api.signatures.create).toHaveBeenCalledWith(1, "Bailleur", file),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Signature “Bailleur” added."),
    );
  });

  it("confirms the deletion in English and toasts in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.signatures.remove).mockResolvedValue(undefined);
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Delete Signature bailleur" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete this signature?",
    });
    expect(dialog).toHaveTextContent(
      "“Signature bailleur” will no longer be offered in documents.",
    );
    await user.click(
      screen.getByRole("button", { name: "Delete the signature" }),
    );

    await waitFor(() => expect(api.signatures.remove).toHaveBeenCalledWith(7));
    await waitFor(() =>
      expect(toastMessages()).toContain("Signature deleted."),
    );
  });

  it("shows the English loading and empty states", async () => {
    await i18n.changeLanguage("en");
    signaturesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const loading = render(
      <QueryClientProvider client={new QueryClient()}>
        <PersonSignatureSection personId={1} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Loading signatures…")).toBeVisible();
    loading.unmount();

    signaturesState = readyQuery([]);
    renderSection();
    expect(
      screen.getByText(
        "No signature recorded. Add an image to sign this person's documents.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("A person can keep several signatures."),
    ).toBeVisible();
  });

  it("reports a removal failure as a French toast", async () => {
    vi.mocked(api.signatures.remove).mockRejectedValue(
      new Error("Signature déjà supprimée."),
    );
    renderSection();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Signature bailleur" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer la signature" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain("Signature déjà supprimée."),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer cette signature ?" }),
    ).toBeNull();
  });
});
