import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  LeaseDto,
  PersonDto,
  RentReceiptDto,
  SignatureDto,
  TemplateDto,
} from "@/api/types";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { GenerateRentReceiptPage } from "@/pages/rent-receipt/GenerateRentReceiptPage";

type PersonRow = PersonDto;

let signatureList: SignatureDto[] = [];
let signatureError: Error | null = null;
let activeReceipt: RentReceiptDto | null = null;
let landlordList: PersonRow[] = [];
let tenantList: PersonRow[] = [];
let leaseList: LeaseDto[] = [];
let templatesList: TemplateDto[] = [];
let directoriesUndefined = false;
let signaturesUndefined = false;
let leaseError: Error | null = null;
let companiesError: Error | null = null;
let personsError: Error | null = null;
const personsRefetch = vi.fn();
const companiesRefetch = vi.fn();
const leaseRefetch = vi.fn();
const signatureRefetch = vi.fn();
let lastPreviewLoader: ((signal: AbortSignal) => Promise<unknown>) | null =
  null;

vi.mock("@/components/pdf/PdfViewer", () => ({
  PdfViewer: ({ actions }: { actions?: ReactNode }) => <div>{actions}</div>,
}));

vi.mock("@/hooks/usePdfPreview", () => ({
  usePdfPreview: (load: (signal: AbortSignal) => Promise<unknown>) => {
    lastPreviewLoader = load;
    return {
      url: null,
      loading: false,
      error: null,
      updatedAt: null,
      refresh: () => undefined,
      download: () => undefined,
    };
  },
}));

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      create: vi.fn(),
      preview: vi.fn(),
      pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    usePersons: () => ({
      data: directoriesUndefined ? undefined : [...landlordList, ...tenantList],
      isPending: false,
      isError: personsError !== null,
      error: personsError,
      refetch: personsRefetch,
    }),
    useLeases: () => ({
      data: directoriesUndefined ? undefined : leaseList,
      isPending: false,
      isError: leaseError !== null,
      error: leaseError,
      refetch: leaseRefetch,
    }),
    useTemplates: () => ({
      data: directoriesUndefined ? undefined : templatesList,
      isPending: false,
    }),
    useCompanies: () => ({
      data: [{ id: 3, name: "HKOF" }],
      isPending: false,
      isError: companiesError !== null,
      error: companiesError,
      refetch: companiesRefetch,
    }),
    useActiveRentReceipt: () => ({ data: activeReceipt, isPending: false }),
    useSignatures: (personId: number | null) => ({
      data: signaturesUndefined
        ? undefined
        : personId === null
          ? []
          : signatureList.filter(
              (signature) => signature.personId === personId,
            ),
      isPending: false,
      isError: signatureError !== null,
      error: signatureError,
      refetch: signatureRefetch,
    }),
  };
});

const MONTH = "2026-01";

const LANDLORD: SignatureDto = {
  id: 7,
  personId: 1,
  personName: "M. Bailleur",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const LANDLORD_V2: SignatureDto = {
  id: 11,
  personId: 1,
  personName: "M. Bailleur",
  name: "Bailleur 2026",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const OTHER_LANDLORD_SIGNATURE: SignatureDto = {
  id: 12,
  personId: 3,
  personName: "Mme Propriétaire",
  name: "Autre bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const LANDLORD_ROW: PersonRow = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
};

const TENANT_ROW: PersonRow = {
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

function renderPage() {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKeys.rentReceiptActive(MONTH), null);
  queryClient.setQueryData(queryKeys.rentReceipts(null, MONTH), []);

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GenerateRentReceiptPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

function setMobile(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

describe("GenerateRentReceiptPage", () => {
  beforeEach(() => {
    lastPreviewLoader = null;
    signatureList = [LANDLORD];
    signatureError = null;
    signaturesUndefined = false;
    activeReceipt = null;
    landlordList = [LANDLORD_ROW];
    tenantList = [TENANT_ROW];
    leaseList = [LEASE];
    templatesList = [];
    directoriesUndefined = false;
    leaseError = null;
    companiesError = null;
    personsError = null;
    personsRefetch.mockReset();
    companiesRefetch.mockReset();
    leaseRefetch.mockReset();
    signatureRefetch.mockReset();
    setMobile(false);
    vi.mocked(api.rentReceipts.create).mockReset();
    vi.mocked(api.rentReceipts.preview).mockReset();
    vi.mocked(api.rentReceipts.preview).mockResolvedValue({
      blob: new Blob(),
      fileName: null,
    });
    useRentReceiptDraft.setState({
      month: MONTH,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      rentExclCharges: "1300.00",
      charges: "0.00",
      paymentDate: "2026-01-05",
      issueDate: "2026-01-05",
      templateId: null,
      landlordId: 1,
      tenantKey: "person:2",
      initialized: true,
      dirty: false,
    });
  });

  it("invalidates the active rent receipt query after generating", async () => {
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    const queryClient = renderPage();

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: /Générer la quittance/ }),
      );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledTimes(1),
    );
    await waitFor(() =>
      expect(
        queryClient.getQueryState(queryKeys.rentReceiptActive(MONTH))
          ?.isInvalidated,
      ).toBe(true),
    );
    expect(
      queryClient.getQueryState(queryKeys.rentReceipts(null, MONTH))
        ?.isInvalidated,
    ).toBe(true);
  });

  it("auto-selects the only active lease and prefills the pair, amounts and property", async () => {
    useRentReceiptDraft.setState({
      landlordId: null,
      tenantKey: null,
      rentExclCharges: "",
      charges: "",
      initialized: false,
    });
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    renderPage();

    expect(
      document.querySelector('[data-cy="societe-quittance"]'),
    ).toHaveTextContent("HKOF");
    expect(await screen.findByLabelText("Bailleur")).toHaveValue("1");
    expect(screen.getByLabelText("Locataire")).toHaveValue("person:2");
    expect(screen.getByLabelText("Loyer hors charges")).toHaveValue("1300.00");
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue("0.00");
    expect(screen.getByText(/12 rue de la République/)).toBeInTheDocument();

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: /Générer la quittance/ }),
      );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith(
        expect.objectContaining({ landlordId: 1, tenantId: 2 }),
      ),
    );
  });

  it("prefills the amounts of the newly selected pair", async () => {
    const otherLandlord: PersonRow = {
      id: 3,
      name: "Mme Propriétaire",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherTenant: PersonRow = {
      id: 4,
      name: "M. Occupant",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherLease: LeaseDto = {
      id: 11,
      landlordId: 3,
      tenantId: 4,
      landlordName: "Mme Propriétaire",
      tenantName: "M. Occupant",
      propertyAddress: "5 rue du Marché, 69001 Lyon",
      rentExclCharges: "900.00",
      charges: "50.00",
    };
    landlordList = [LANDLORD_ROW, otherLandlord];
    tenantList = [TENANT_ROW, otherTenant];
    leaseList = [LEASE, otherLease];

    renderPage();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Bailleur"), "3");
    await user.selectOptions(screen.getByLabelText("Locataire"), "person:4");

    await waitFor(() =>
      expect(screen.getByLabelText("Loyer hors charges")).toHaveValue("900.00"),
    );
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue(
      "50.00",
    );
    expect(screen.getByText(/5 rue du Marché/)).toBeInTheDocument();
  });

  it("shows a French message and blocks generation when the pair has no lease", async () => {
    const otherTenant: PersonRow = {
      id: 4,
      name: "M. Occupant",
      address: "5 rue du Marché, 69001 Lyon",
    };
    tenantList = [TENANT_ROW, otherTenant];

    renderPage();

    const user = userEvent.setup();
    await user.selectOptions(
      await screen.findByLabelText("Locataire"),
      "person:4",
    );

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-cy",
      "alerte-bail-manquant",
    );
    expect(screen.getByText(/Aucun bail actif/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
    expect(api.rentReceipts.create).not.toHaveBeenCalled();
  });

  it("preselects the LANDLORD signature and sends the pair and signatureId to the preview and the generation", async () => {
    signatureList = [
      {
        id: 8,
        personId: 9,
        personName: "Camille Martin",
        name: "Gérant",
        mimeType: "image/jpeg",
        createdAt: "2026-10-23T10:00:00Z",
      },
      LANDLORD,
    ];
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    renderPage();

    const select = await screen.findByLabelText("Signature");
    expect(select).toHaveValue("7");

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenCalledWith(
      expect.objectContaining({
        landlordId: 1,
        tenantId: 2,
        signatureId: 7,
      }),
      expect.anything(),
    );

    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: /Générer la quittance/ }),
      );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          landlordId: 1,
          tenantId: 2,
          signatureId: 7,
        }),
      ),
    );
  });

  it("lists only the selected landlord's signatures", async () => {
    signatureList = [
      {
        id: 8,
        personId: 9,
        personName: "Camille Martin",
        name: "Gérant",
        mimeType: "image/jpeg",
        createdAt: "2026-10-23T10:00:00Z",
      },
      LANDLORD,
      LANDLORD_V2,
      OTHER_LANDLORD_SIGNATURE,
    ];

    renderPage();

    const select = await screen.findByLabelText("Signature");
    const options = Array.from(
      select.querySelectorAll<HTMLOptionElement>("option"),
    ).map((option) => option.value);
    expect(options).toEqual(["7", "11"]);
    expect(select).toHaveValue("7");
  });

  it("resets the signature choice when the landlord changes", async () => {
    const otherLandlord: PersonRow = {
      id: 3,
      name: "Mme Propriétaire",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherTenant: PersonRow = {
      id: 4,
      name: "M. Occupant",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherLease: LeaseDto = {
      id: 11,
      landlordId: 3,
      tenantId: 4,
      landlordName: "Mme Propriétaire",
      tenantName: "M. Occupant",
      propertyAddress: "5 rue du Marché, 69001 Lyon",
      rentExclCharges: "900.00",
      charges: "50.00",
    };
    landlordList = [LANDLORD_ROW, otherLandlord];
    tenantList = [TENANT_ROW, otherTenant];
    leaseList = [LEASE, otherLease];
    signatureList = [LANDLORD, LANDLORD_V2, OTHER_LANDLORD_SIGNATURE];

    renderPage();

    const user = userEvent.setup();
    const signatureSelect = await screen.findByLabelText("Signature");
    await user.selectOptions(signatureSelect, "11");
    expect(signatureSelect).toHaveValue("11");

    await user.selectOptions(screen.getByLabelText("Bailleur"), "3");

    await waitFor(() => expect(signatureSelect).toHaveValue("12"));
    const options = Array.from(
      signatureSelect.querySelectorAll<HTMLOptionElement>("option"),
    ).map((option) => option.value);
    expect(options).toEqual(["12"]);
  });

  it("warns and blocks generation when the selected landlord has no signature", async () => {
    const otherLandlord: PersonRow = {
      id: 3,
      name: "Mme Propriétaire",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherTenant: PersonRow = {
      id: 4,
      name: "M. Occupant",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherLease: LeaseDto = {
      id: 11,
      landlordId: 3,
      tenantId: 4,
      landlordName: "Mme Propriétaire",
      tenantName: "M. Occupant",
      propertyAddress: "5 rue du Marché, 69001 Lyon",
      rentExclCharges: "900.00",
      charges: "50.00",
    };
    landlordList = [LANDLORD_ROW, otherLandlord];
    tenantList = [TENANT_ROW, otherTenant];
    leaseList = [LEASE, otherLease];

    renderPage();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Bailleur"), "3");
    await user.selectOptions(screen.getByLabelText("Locataire"), "person:4");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-cy", "alerte-signature-bailleur");
    expect(alert).toHaveTextContent(/Aucune signature pour ce bailleur/);
    expect(screen.queryByText(/Aucune signature trouvée/)).toBeNull();
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
    expect(api.rentReceipts.create).not.toHaveBeenCalled();
  });

  it("generates without the regeneration dialog when an active receipt already exists", async () => {
    activeReceipt = {
      id: 5,
      month: MONTH,
      version: 2,
      total: "1300.00",
      status: "ACTIVE",
    };
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 6,
      month: MONTH,
      version: 3,
      total: "1300.00",
    });

    renderPage();

    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /Générer la quittance/ }),
    );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledTimes(1),
    );
    expect(
      document.querySelector('[data-cy="dialogue-regeneration-quittance"]'),
    ).toBeNull();
  });

  it("hides the active receipt panel and version hint while no pair is selected", async () => {
    activeReceipt = {
      id: 5,
      month: MONTH,
      version: 2,
      total: "1300.00",
      status: "ACTIVE",
    };
    useRentReceiptDraft.setState({
      landlordId: null,
      tenantKey: null,
      initialized: true,
    });

    renderPage();

    expect(await screen.findByLabelText("Bailleur")).toHaveValue("");
    expect(screen.getByLabelText("Locataire")).toHaveValue("");
    expect(screen.queryByText(/Quittance déjà active/)).toBeNull();
    expect(screen.queryByText(/Dernière version/)).toBeNull();
    expect(
      screen.getByText(/Le PDF définitif est enregistré/),
    ).toBeInTheDocument();
  });

  it("shows the active receipt panel once the pair is selected", async () => {
    activeReceipt = {
      id: 5,
      month: MONTH,
      version: 2,
      total: "1300.00",
      status: "ACTIVE",
    };
    useRentReceiptDraft.setState({
      landlordId: null,
      tenantKey: null,
      initialized: true,
    });

    renderPage();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Bailleur"), "1");
    expect(screen.queryByText(/Quittance déjà active/)).toBeNull();
    await user.selectOptions(screen.getByLabelText("Locataire"), "person:2");

    expect(
      await screen.findByText(
        "Quittance déjà active pour ce bailleur et ce locataire",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Total .*version 2/)).toBeInTheDocument();
    expect(
      screen.getByText("Dernière version : v2 → v3 à la génération."),
    ).toBeInTheDocument();
  });

  it("warns and blocks generation when the selected landlord has no signature", async () => {
    signatureList = [];

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-cy", "alerte-signature-bailleur");
    expect(alert).toHaveTextContent(/Aucune signature pour ce bailleur/);
    expect(
      screen.getByRole("link", { name: "LMNP · Personnes" }),
    ).toHaveAttribute("href", "/configuration/lmnp");
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
  });

  it("shows a French error and blocks generation when the signatures fail to load", async () => {
    signatureError = new Error("Service indisponible");
    signatureList = [];

    renderPage();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveAttribute("data-cy", "alerte-signatures-erreur");
    expect(alert).toHaveTextContent(
      "Les signatures n’ont pas pu être chargées : Service indisponible",
    );
    expect(screen.queryByText(/Aucune signature pour ce bailleur/)).toBeNull();
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
    expect(api.rentReceipts.create).not.toHaveBeenCalled();
  });

  it("renders the built-in template and empty selects when the directories are not loaded yet", () => {
    directoriesUndefined = true;
    signaturesUndefined = true;

    renderPage();

    const landlordSelect = screen.getByLabelText<HTMLSelectElement>("Bailleur");
    expect(landlordSelect.selectedOptions).toHaveLength(0);
    expect(
      within(landlordSelect).getByRole("option", {
        name: "Sélectionnez un bailleur",
      }),
    ).toBeInTheDocument();
    expect(within(landlordSelect).getAllByRole("option")).toHaveLength(1);
    const tenantSelect = screen.getByLabelText<HTMLSelectElement>("Locataire");
    expect(tenantSelect.selectedOptions).toHaveLength(0);
    expect(
      within(tenantSelect).getByRole("option", {
        name: "Sélectionnez un locataire",
      }),
    ).toBeInTheDocument();
    expect(within(tenantSelect).getAllByRole("option")).toHaveLength(2);
    expect(
      within(tenantSelect).getByRole("option", { name: "HKOF" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Template")).toHaveDisplayValue(
      "Modèle intégré",
    );
    expect(
      screen.getAllByRole("option", { name: "Modèle intégré" }),
    ).toHaveLength(2);
  });

  it("reports the lease directory error and retries every directory", async () => {
    leaseError = new Error("Baux indisponibles");

    renderPage();

    expect(await screen.findByText("Baux indisponibles")).toBeInTheDocument();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Réessayer" }));
    expect(personsRefetch).toHaveBeenCalledTimes(1);
    expect(companiesRefetch).toHaveBeenCalledTimes(1);
    expect(leaseRefetch).toHaveBeenCalledTimes(1);
  });

  it("reports the persons directory error when leases are available", async () => {
    personsError = new Error("Personnes indisponibles");

    renderPage();

    expect(
      await screen.findByText("Personnes indisponibles"),
    ).toBeInTheDocument();
  });

  it("reports the companies directory error when the other directories are available", async () => {
    companiesError = new Error("Sociétés indisponibles");

    renderPage();

    expect(
      await screen.findByText("Sociétés indisponibles"),
    ).toBeInTheDocument();
  });

  it("shows French validation messages for invalid months, dates, amounts and landlord", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Mois concerné"));
    expect(
      await screen.findByText("Choisissez un mois valide."),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Début de période"));
    expect(
      await screen.findByText("Date de début invalide."),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Fin de période"));
    expect(
      await screen.findByText("Date de fin invalide."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Début de période"), {
      target: { value: "2026-01-31" },
    });
    fireEvent.change(screen.getByLabelText("Fin de période"), {
      target: { value: "2026-01-01" },
    });
    expect(
      await screen.findByText(
        "La fin de période doit être postérieure au début.",
      ),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Loyer hors charges"));
    await user.type(screen.getByLabelText("Loyer hors charges"), "abc");
    expect(
      await screen.findByText("Loyer hors charges invalide."),
    ).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Provision pour charges"));
    await user.type(screen.getByLabelText("Provision pour charges"), "abc");
    expect(
      await screen.findByText("Provision pour charges invalide."),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Bailleur"), "");
    expect(
      await screen.findByText("Sélectionnez un bailleur."),
    ).toBeInTheDocument();
  });

  it("lists the templates, marks the active one and supports the built-in template", async () => {
    templatesList = [
      { id: 3, name: "Modèle actif", version: 2, active: true },
      { id: 4, name: "Modèle inactif", version: 1, active: false },
    ];

    renderPage();
    const user = userEvent.setup();

    const partySelect = await screen.findByLabelText("Template");
    expect(partySelect).toHaveValue("3");
    expect(
      screen.getByRole("option", { name: "Modèle actif — v2 (actif)" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", { name: "Modèle inactif — v1" }),
    ).toHaveLength(2);
    expect(screen.queryByRole("option", { name: "Modèle intégré" })).toBeNull();

    await user.selectOptions(partySelect, "4");
    expect(partySelect).toHaveValue("4");
    fireEvent.change(partySelect, { target: { value: "" } });
    expect(partySelect).toHaveValue("3");

    const previewSelect = screen.getByLabelText("Template de la quittance");
    await user.selectOptions(previewSelect, "4");
    expect(previewSelect).toHaveValue("4");
    fireEvent.change(previewSelect, { target: { value: "" } });
    expect(previewSelect).toHaveValue("3");
  });

  it("shows a generated receipt without id or version", async () => {
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      month: MONTH,
      total: "1300.00",
    });

    renderPage();
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /Générer la quittance/ }),
    );

    expect(await screen.findByText("Quittance générée")).toBeInTheDocument();
    expect(screen.getByText(/· version 1 ·/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ouvrir" })).toBeNull();
    expect(screen.getByText(/modèle intégré/)).toBeInTheDocument();
  });

  it("prefills empty amounts from a lease without amounts and resumes it", async () => {
    leaseList = [{ ...LEASE, rentExclCharges: undefined, charges: undefined }];
    useRentReceiptDraft.setState({
      rentExclCharges: "",
      charges: "",
      initialized: false,
      landlordId: null,
      tenantKey: null,
    });

    renderPage();
    const user = userEvent.setup();

    expect(
      await screen.findByRole("button", { name: "Reprendre le bail" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Reprendre le bail" }));

    expect(screen.getByLabelText("Loyer hors charges")).toHaveValue("");
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue("");
  });

  it("clears the amounts when the selected pair has a lease without amounts", async () => {
    const otherLandlord: PersonRow = {
      id: 3,
      name: "Mme Propriétaire",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherTenant: PersonRow = {
      id: 4,
      name: "M. Occupant",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherLease: LeaseDto = {
      id: 11,
      landlordId: 3,
      tenantId: 4,
      landlordName: "Mme Propriétaire",
      tenantName: "M. Occupant",
      propertyAddress: "5 rue du Marché, 69001 Lyon",
      rentExclCharges: undefined,
      charges: undefined,
    };
    landlordList = [LANDLORD_ROW, otherLandlord];
    tenantList = [TENANT_ROW, otherTenant];
    leaseList = [LEASE, otherLease];

    renderPage();
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Bailleur"), "3");
    await user.selectOptions(screen.getByLabelText("Locataire"), "person:4");

    await waitFor(() =>
      expect(screen.getByLabelText("Loyer hors charges")).toHaveValue(""),
    );
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue("");
  });

  it("switches the mobile input and preview panels", async () => {
    setMobile(true);
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("tab", { name: "Aperçu" }));
    expect(document.querySelector('[data-cy="volet-saisie"]')).toHaveClass(
      "hidden",
    );
    expect(document.querySelector('[data-cy="volet-apercu"]')).not.toHaveClass(
      "hidden",
    );

    await user.click(screen.getByRole("tab", { name: "Saisie" }));
    expect(document.querySelector('[data-cy="volet-saisie"]')).not.toHaveClass(
      "hidden",
    );
    expect(document.querySelector('[data-cy="volet-apercu"]')).toHaveClass(
      "hidden",
    );
  });
});
