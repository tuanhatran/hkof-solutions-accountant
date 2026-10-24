import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import type { EmployeeDto, LandlordDto, SignatureDto } from "@/api/types";
import { SignaturesManager } from "@/components/signatures/SignaturesManager";
import { useToasts } from "@/state/toasts";

vi.mock("@/api/endpoints", () => ({
  api: {
    landlords: {
      list: vi.fn(),
    },
    employees: {
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

const CEO: EmployeeDto = {
  id: 3,
  companyId: 1,
  firstName: "Camille",
  lastName: "Martin",
  title: "CEO",
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
let employees: EmployeeDto[] = [];

function renderManager(companyId: number | null = 1) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SignaturesManager companyId={companyId} />
    </QueryClientProvider>,
  );
}

describe("SignaturesManager", () => {
  beforeEach(() => {
    stored = [];
    landlords = [LANDLORD];
    employees = [CEO];
    vi.mocked(api.landlords.list).mockImplementation(async () => landlords);
    vi.mocked(api.employees.list).mockImplementation(async () => employees);
    vi.mocked(api.signatures.list).mockImplementation(async () => stored);
    vi.mocked(api.signatures.create).mockReset();
    vi.mocked(api.signatures.remove).mockResolvedValue(undefined);
    useToasts.setState({ toasts: [] });
    URL.createObjectURL = vi.fn(() => "blob:signature-preview");
    URL.revokeObjectURL = vi.fn();
  });

  function toastMessages(): string[] {
    return useToasts.getState().toasts.map((element) => element.message);
  }

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
      null,
    );
    expect(
      await screen.findByText("Signature du bailleur"),
    ).toBeInTheDocument();
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

  it("limits a signature without company to the landlord type and cancels", async () => {
    renderManager(null);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );
    const type = screen.getByLabelText("Type de signature");
    expect(within(type).getAllByRole("option")).toHaveLength(1);
    expect(
      within(type).getByRole("option", { name: "Bailleur" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByLabelText("Type de signature")).toBeNull();
  });

  it("requires a salarié for an employee signature", async () => {
    renderManager();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );
    await user.selectOptions(
      screen.getByLabelText("Type de signature"),
      "EMPLOYEE",
    );
    await user.type(screen.getByLabelText("Nom"), "Sans salarié");
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      pngFixture(),
    );
    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );

    expect(
      await screen.findByText("Le salarié de la signature est obligatoire."),
    ).toBeInTheDocument();
    expect(api.signatures.create).not.toHaveBeenCalled();
  });

  it("removes the selected image and reports a creation error", async () => {
    vi.mocked(api.signatures.create).mockRejectedValue(
      new Error("Enregistrement refusé"),
    );
    renderManager();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );
    await user.type(screen.getByLabelText("Nom"), "Signature test");
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
      screen.getByRole("button", {
        name: "Retirer l’image de la signature",
      }),
    );
    expect(
      screen.queryByAltText("Aperçu de signature-bailleur.png"),
    ).toBeNull();

    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      pngFixture(),
    );
    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enregistrement refusé",
    );
  });

  it("creates an employee signature linked to the selected salarié", async () => {
    vi.mocked(api.signatures.create).mockResolvedValue(
      signature({
        id: 9,
        type: "EMPLOYEE",
        name: "Signature du gérant",
        landlordId: null,
        landlordName: null,
        companyId: 1,
        companyName: "HKOF",
        employeeId: 3,
        employeeName: "Camille Martin",
      }),
    );

    renderManager();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Ajouter une signature/ }),
    );

    await user.selectOptions(
      screen.getByLabelText("Type de signature"),
      "EMPLOYEE",
    );
    expect(
      screen.queryByLabelText("Bailleur de la signature"),
    ).not.toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("Salarié de la signature"),
      "3",
    );
    await user.type(screen.getByLabelText("Nom"), "Signature du gérant");
    await user.upload(
      screen.getByLabelText("Choisir une image de signature"),
      pngFixture("signature-gerant.png"),
    );
    await user.click(
      screen.getByRole("button", { name: /Ajouter la signature/ }),
    );

    await waitFor(() => expect(api.signatures.create).toHaveBeenCalledTimes(1));
    expect(api.signatures.create).toHaveBeenCalledWith(
      "EMPLOYEE",
      "Signature du gérant",
      expect.any(File),
      null,
      3,
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

  it("highlights the CEO employee signature as the statement default", async () => {
    stored = [
      signature({
        id: 10,
        type: "EMPLOYEE",
        name: "Signature PDG",
        landlordId: null,
        landlordName: null,
        companyId: 1,
        companyName: "HKOF",
        employeeId: 3,
        employeeName: "Camille Martin",
      }),
    ];
    renderManager();

    expect(
      await screen.findByText("Signature par défaut des notes de frais"),
    ).toBeVisible();
    expect(screen.getByText("Salarié")).toBeVisible();
    expect(screen.getByText("HKOF")).toBeVisible();
  });

  it("filters the signatures by employee", async () => {
    stored = [signature()];
    renderManager();
    const user = userEvent.setup();

    const filter = await screen.findByLabelText("Filtrer par salarié");
    await waitFor(() => expect(filter).toBeEnabled());
    await user.selectOptions(filter, "3");

    await waitFor(() => expect(api.signatures.list).toHaveBeenCalledWith(1, 3));
  });

  it("disables the employee filter without a company", () => {
    renderManager(null);

    expect(screen.getByLabelText("Filtrer par salarié")).toBeDisabled();
  });

  it("shows the loading and error states of the signatures", async () => {
    vi.mocked(api.signatures.list).mockImplementation(
      () => new Promise(() => undefined),
    );
    const pending = render(
      <QueryClientProvider client={new QueryClient()}>
        <SignaturesManager companyId={1} />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Chargement des signatures…")).toBeVisible();
    pending.unmount();

    vi.mocked(api.signatures.list).mockRejectedValue(
      new Error("Service indisponible"),
    );
    renderManager();
    expect(await screen.findByText("Service indisponible")).toBeVisible();
    const callsBefore = vi.mocked(api.signatures.list).mock.calls.length;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() =>
      expect(vi.mocked(api.signatures.list).mock.calls.length).toBeGreaterThan(
        callsBefore,
      ),
    );
  });

  it("reports a delete failure as a toast", async () => {
    stored = [signature()];
    vi.mocked(api.signatures.remove).mockRejectedValue(
      new Error("Signature utilisée"),
    );
    renderManager();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", {
        name: "Supprimer Signature du bailleur",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Supprimer la signature" }),
    );

    await waitFor(() =>
      expect(toastMessages()).toContain("Signature utilisée"),
    );
    expect(
      screen.queryByRole("dialog", { name: "Supprimer cette signature ?" }),
    ).toBeNull();
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
