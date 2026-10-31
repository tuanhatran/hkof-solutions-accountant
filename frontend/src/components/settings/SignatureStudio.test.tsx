import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { SignatureDto } from "@/api/types";
import { useToasts } from "@/state/toasts";
import { SignatureStudio } from "./SignatureStudio";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

const SIGNATURE: SignatureDto = {
  id: 7,
  personId: 1,
  personName: "M. Bailleur",
  name: "Signature bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

let signaturesState: QueryLike<SignatureDto[]>;

vi.mock("@/api/endpoints", () => ({
  api: {
    signatures: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      rename: vi.fn(),
      imageUrl: (id: number) => `/api/signatures/${id}/image`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return { ...actual, useSignatures: () => signaturesState };
});

function readyQuery(data: SignatureDto[]): QueryLike<SignatureDto[]> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function renderStudio() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SignatureStudio personId={1} />
    </QueryClientProvider>,
  );
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

function pixelData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  data[3] = 255;
  return { data, width, height } as unknown as ImageData;
}

beforeEach(() => {
  signaturesState = readyQuery([SIGNATURE]);
  vi.mocked(api.signatures.rename).mockReset();
  vi.mocked(api.signatures.create).mockReset();
  vi.mocked(api.signatures.remove).mockReset();
  useToasts.setState({ toasts: [] });
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    value: vi.fn(() => ({
      setTransform: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(
        (_x: number, _y: number, width: number, height: number) =>
          pixelData(width, height),
      ),
      fillText: vi.fn(),
      font: "",
      fillStyle: "",
      textBaseline: "",
      lineWidth: 0,
      lineCap: "",
      lineJoin: "",
      strokeStyle: "",
    })),
  });
  Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
    configurable: true,
    value: function toBlobStub(
      this: HTMLCanvasElement,
      callback: BlobCallback,
    ) {
      callback(new Blob(["png"], { type: "image/png" }));
    },
  });
});

describe("SignatureStudio", () => {
  it("lists the signatures with their actions", () => {
    renderStudio();

    expect(screen.getByText("Signature bailleur")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Renommer Signature bailleur" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Supprimer Signature bailleur" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Signature Signature bailleur" }),
    ).toHaveAttribute("src", "/api/signatures/7/image");
  });

  it("opens the drawing pad and the cursive generator", async () => {
    renderStudio();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Dessiner une signature" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Dessiner une signature" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    await user.click(
      screen.getByRole("button", { name: "Générer une signature" }),
    );
    expect(
      screen.getByRole("dialog", { name: "Générer une signature" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(
      screen.queryByRole("dialog", { name: "Générer une signature" }),
    ).toBeNull();
  });

  it("creates a signature from the cursive generator", async () => {
    vi.mocked(api.signatures.create).mockResolvedValue({
      ...SIGNATURE,
      id: 9,
      name: "Jean Dupont",
    });
    renderStudio();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Générer une signature" }),
    );
    await user.type(
      screen.getByLabelText("Texte de la signature"),
      "Jean Dupont",
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.signatures.create).toHaveBeenCalledWith(
        1,
        "Jean Dupont",
        expect.any(File),
      ),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Signature « Jean Dupont » ajoutée."),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Générer une signature" }),
      ).toBeNull(),
    );
  });

  it("renames an owned signature and confirms in French", async () => {
    vi.mocked(api.signatures.rename).mockResolvedValue({
      ...SIGNATURE,
      name: "Signature notaire",
    });
    renderStudio();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Renommer Signature bailleur" }),
    );
    const input = screen.getByLabelText("Nom de la signature");
    expect(input).toHaveValue("Signature bailleur");
    await user.clear(input);
    await user.type(input, " Signature notaire ");
    await user.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() =>
      expect(api.signatures.rename).toHaveBeenCalledWith(
        7,
        "Signature notaire",
      ),
    );
    await waitFor(() =>
      expect(toastMessages()).toContain("Signature renommée."),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Renommer la signature" }),
      ).toBeNull(),
    );
  });

  it("requires a name before renaming", async () => {
    renderStudio();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Renommer Signature bailleur" }),
    );
    await user.clear(screen.getByLabelText("Nom de la signature"));
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(
      await screen.findByText("Le nom de la signature est obligatoire."),
    ).toBeVisible();
    expect(api.signatures.rename).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(
      screen.queryByRole("dialog", { name: "Renommer la signature" }),
    ).toBeNull();
  });

  it("keeps the rename dialog open and reports a failure", async () => {
    vi.mocked(api.signatures.rename).mockRejectedValue(
      new Error("Signature introuvable."),
    );
    renderStudio();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Renommer Signature bailleur" }),
    );
    await user.click(screen.getByRole("button", { name: "Valider" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Signature introuvable.",
    );
    expect(
      screen.getByRole("dialog", { name: "Renommer la signature" }),
    ).toBeVisible();
  });

  it("deletes a signature after confirmation", async () => {
    vi.mocked(api.signatures.remove).mockResolvedValue(undefined);
    renderStudio();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Signature bailleur" }),
    );
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(
      screen.queryByRole("dialog", { name: "Supprimer cette signature ?" }),
    ).toBeNull();
    expect(api.signatures.remove).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Supprimer Signature bailleur" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer la signature" }),
    );

    await waitFor(() => expect(api.signatures.remove).toHaveBeenCalledWith(7));
  });
});
