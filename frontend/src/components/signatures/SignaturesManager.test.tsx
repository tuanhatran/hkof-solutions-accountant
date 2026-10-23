import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { LandlordDto, SignatureDto } from "@/api/types";
import { SignaturesManager } from "@/components/signatures/SignaturesManager";

vi.mock("@/api/endpoints", () => ({
  api: {
    landlords: {
      list: vi.fn(),
    },
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
  },
}));

const CREATED_AT = "2026-10-23T10:00:00Z";

const LANDLORD: LandlordDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
};

function pngFixture(name = "signature-bailleur.png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, {
    type: "image/png",
  });
}

function signature(overrides: Partial<SignatureDto> = {}): SignatureDto {
  return {
    id: 7,
    type: "LANDLORD",
    name: "Signature du bailleur",
    mimeType: "image/png",
    createdAt: CREATED_AT,
    landlordId: 1,
    landlordName: "M. Bailleur",
    ...overrides,
  };
}

let stored: SignatureDto[] = [];
let landlords: LandlordDto[] = [];

function renderManager() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SignaturesManager />
    </QueryClientProvider>,
  );
}

describe("SignaturesManager", () => {
  beforeEach(() => {
    stored = [];
    landlords = [LANDLORD];
    vi.mocked(api.landlords.list).mockImplementation(async () => landlords);
    vi.mocked(api.signatures.list).mockImplementation(async () => stored);
    vi.mocked(api.signatures.create).mockReset();
    vi.mocked(api.signatures.remove).mockResolvedValue(undefined);
    URL.createObjectURL = vi.fn(() => "blob:signature-preview");
    URL.revokeObjectURL = vi.fn();
  });

  it("creates a landlord signature linked to the selected bailleur and lists it", async () => {
    vi.mocked(api.signatures.create).mockImplementation(
      async (type, name, file, landlordId) => {
        const created = signature({
          id: 7,
          type,
          name,
          mimeType: file.type,
          landlordId,
          landlordName: landlordId === 1 ? "M. Bailleur" : null,
        });
        stored = [created];
        return created;
      },
    );

    renderManager();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );

    await user.type(screen.getByLabelText("Nom"), "Signature du bailleur");
    await user.selectOptions(
      screen.getByLabelText("Bailleur de la signature"),
      "1",
    );
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      pngFixture(),
    );

    expect(
      await screen.findByAltText("Aperçu de signature-bailleur.png"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );

    await waitFor(() => expect(api.signatures.create).toHaveBeenCalledTimes(1));
    expect(api.signatures.create).toHaveBeenCalledWith(
      "LANDLORD",
      "Signature du bailleur",
      expect.any(File),
      1,
    );
    expect(await screen.findByText("Signature du bailleur")).toBeInTheDocument();
    expect(
      screen.getByAltText("Signature Signature du bailleur"),
    ).toBeInTheDocument();
    expect(screen.getByText("Ajoutée le 23/10/2026")).toBeInTheDocument();
    expect(screen.getByText("M. Bailleur")).toBeInTheDocument();
    await waitFor(() => expect(api.signatures.list).toHaveBeenCalledTimes(2));
  });

  it("requires a bailleur for a landlord signature", async () => {
    renderManager();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );

    await user.type(screen.getByLabelText("Nom"), "Sans bailleur");
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      pngFixture(),
    );
    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );

    expect(
      await screen.findByText("Le bailleur de la signature est obligatoire."),
    ).toBeInTheDocument();
    expect(api.signatures.create).not.toHaveBeenCalled();
  });

  it("keeps the ENTREPRISE_CEO type without a bailleur", async () => {
    vi.mocked(api.signatures.create).mockResolvedValue(
      signature({
        id: 9,
        type: "ENTREPRISE_CEO",
        name: "Gérant",
        landlordId: null,
        landlordName: null,
      }),
    );

    renderManager();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );

    await user.selectOptions(
      screen.getByLabelText("Type de signature"),
      "ENTREPRISE_CEO",
    );
    expect(
      screen.queryByLabelText("Bailleur de la signature"),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Nom"), "Gérant");
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      pngFixture("signature-gerant.png"),
    );
    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );

    await waitFor(() => expect(api.signatures.create).toHaveBeenCalledTimes(1));
    expect(api.signatures.create).toHaveBeenCalledWith(
      "ENTREPRISE_CEO",
      "Gérant",
      expect.any(File),
      null,
    );
  });

  it("shows a legacy signature as not linked", async () => {
    stored = [
      signature({
        id: 8,
        name: "Ancienne signature",
        landlordId: null,
        landlordName: null,
      }),
    ];
    renderManager();

    expect(await screen.findByText("Ancienne signature")).toBeInTheDocument();
    expect(screen.getByText("Non liée")).toBeInTheDocument();
  });

  it("refuses an image over 2 MB and refuses to submit without a name", async () => {
    renderManager();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );

    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );
    expect(
      await screen.findByText("Le nom de la signature est obligatoire."),
    ).toBeInTheDocument();
    expect(api.signatures.create).not.toHaveBeenCalled();

    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], "grande.png", {
        type: "image/png",
      }),
    );
    expect(
      await screen.findByText("Fichier trop volumineux (2 Mo maximum)."),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Nom"), "Trop grande");
    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );
    expect(
      await screen.findByText("Sélectionnez une image PNG ou JPEG."),
    ).toBeInTheDocument();
    expect(api.signatures.create).not.toHaveBeenCalled();
  });

  it("deletes a listed signature after confirmation", async () => {
    stored = [signature()];
    renderManager();

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", {
        name: "Supprimer Signature du bailleur",
      }),
    );

    expect(
      await screen.findByRole("dialog", {
        name: "Supprimer cette signature ?",
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Supprimer la signature" }),
    );

    await waitFor(() => expect(api.signatures.remove).toHaveBeenCalledTimes(1));
    expect(api.signatures.remove).toHaveBeenCalledWith(7);
  });
});
