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
import { api, type RentReceiptDraftDto } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import i18n from "@/i18n";
import type {
  LeaseDto,
  PersonDto,
  RentReceiptDto,
  SignatureDto,
  TemplateDto,
} from "@/api/types";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useToasts } from "@/state/toasts";
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
let savedDraft: RentReceiptDraftDto | null = null;
let savedDraftCache: RentReceiptDraftDto | null = null;
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
    drafts: {
      getRentReceipt: vi.fn(),
      saveRentReceipt: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  const { useQueryClient } = await import("@tanstack/react-query");
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
    // Reads the real query cache when the test seeds it, so a stale saved row
    // behaves like the production query after a save.
    useSavedRentReceiptDraft: (
      month: string,
      landlordId: number | null,
      tenantId: number | null,
      tenantCompanyId: number | null,
    ) => {
      const queryClient = useQueryClient();
      const cached = queryClient.getQueryData<RentReceiptDraftDto | null>(
        actual.queryKeys.rentReceiptDraft(
          month,
          landlordId,
          tenantId,
          tenantCompanyId,
        ),
      );
      return {
        data: cached === undefined ? savedDraft : cached,
        isPending: false,
      };
    },
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
  if (savedDraftCache) {
    queryClient.setQueryData(
      queryKeys.rentReceiptDraft(MONTH, 1, 2, null),
      savedDraftCache,
    );
  }

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
    savedDraft = null;
    savedDraftCache = null;
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
    vi.mocked(api.drafts.saveRentReceipt).mockReset();
    vi.mocked(api.drafts.saveRentReceipt).mockResolvedValue({
      id: 50,
      month: MONTH,
      landlordId: 1,
      tenantId: 2,
      savedAt: "2026-01-15T10:30:00Z",
    });
    vi.mocked(api.drafts.delete).mockReset();
    vi.mocked(api.drafts.delete).mockResolvedValue(undefined);
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
      additionalCharges: [],
      initialized: true,
      dirty: false,
    });
    useToasts.setState({ toasts: [] });
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
      document.querySelector('[data-cy="company-rent-receipt"]'),
    ).toBeNull();
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
      "alert-missing-lease",
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
    expect(alert).toHaveAttribute("data-cy", "alert-landlord-signature");
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
    expect(alert).toHaveAttribute("data-cy", "alert-landlord-signature");
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
    expect(alert).toHaveAttribute("data-cy", "alert-signatures-error");
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
    expect(screen.getByLabelText("Modèle")).toHaveDisplayValue(
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

    const partySelect = await screen.findByLabelText("Modèle");
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

    const previewSelect = screen.getByLabelText("Modèle de la quittance");
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

  it("renders its labels, help text, toasts and resolver errors in English", async () => {
    await i18n.changeLanguage("en");
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    renderPage();
    const user = userEvent.setup();

    expect(screen.getByText("Generate · Rent receipt")).toBeInTheDocument();
    expect(screen.getByText("Rent receipt")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Monthly expense statement" }),
    ).toBeInTheDocument();
    expect(await screen.findByLabelText("Landlord")).toHaveValue("1");
    expect(
      screen.getByText("Editable for a one-off adjustment."),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Generate the rent receipt" }),
    );

    expect(
      await screen.findByText("Rent receipt generated"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        useToasts.getState().toasts.map((element) => element.message),
      ).toContain("Quittance for January 2026 generated as version 1."),
    );

    await user.clear(screen.getByLabelText("Month"));
    expect(
      await screen.findByText("Choose a valid month."),
    ).toBeInTheDocument();
  });

  it("keeps one header month control that updates the draft, the period and the preview", async () => {
    renderPage();

    const monthInputs = document.querySelectorAll('[data-cy="select-month"]');
    expect(monthInputs).toHaveLength(1);
    const month = screen.getByLabelText("Mois concerné");
    expect(month).toBeVisible();
    expect(month).toHaveValue(MONTH);
    expect(screen.queryByText("Janvier 2026")).toBeNull();

    fireEvent.change(month, { target: { value: "2026-02" } });

    expect(month).toHaveValue("2026-02");
    expect(screen.queryByText("Février 2026")).toBeNull();
    expect(useRentReceiptDraft.getState().month).toBe("2026-02");
    expect(useRentReceiptDraft.getState().periodStart).toBe("2026-02-01");
    expect(useRentReceiptDraft.getState().periodEnd).toBe("2026-02-28");
    expect(screen.queryByLabelText("Début de période")).toBeNull();
    expect(screen.queryByLabelText("Fin de période")).toBeNull();

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        month: "2026-02",
        periodStart: "2026-02-01",
        periodEnd: "2026-02-28",
      }),
      expect.anything(),
    );
  });

  it("shows the empty draft status and saves the current form", async () => {
    renderPage();

    expect(await screen.findByText("Aucun brouillon enregistré")).toBeVisible();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Enregistrer le brouillon" }));

    await waitFor(() =>
      expect(api.drafts.saveRentReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          month: MONTH,
          landlordId: 1,
          tenantId: 2,
          rentExclCharges: "1300.00",
        }),
      ),
    );
    await waitFor(() =>
      expect(useRentReceiptDraft.getState().savedAt).toBe(
        "2026-01-15T10:30:00Z",
      ),
    );
    expect(
      useToasts.getState().toasts.map((element) => element.message),
    ).toContain("Brouillon enregistré.");
  });

  it("shows the saved timestamp and reloads the saved draft values", async () => {
    savedDraft = {
      id: 60,
      month: MONTH,
      landlordId: 1,
      tenantId: 2,
      periodStart: "2026-01-02",
      periodEnd: "2026-01-30",
      rentExclCharges: "1200.00",
      charges: "40.00",
      paymentDate: "2026-01-04",
      issueDate: "2026-01-03",
      savedAt: "2026-01-10T09:00:00Z",
    };

    renderPage();

    expect(await screen.findByText(/Brouillon enregistré le/)).toBeVisible();
    await waitFor(() =>
      expect(screen.getByLabelText("Loyer hors charges")).toHaveValue(
        "1200.00",
      ),
    );
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue(
      "40.00",
    );
    expect(useRentReceiptDraft.getState().dirty).toBe(false);
    expect(screen.queryByLabelText("Début de période")).toBeNull();
    expect(screen.queryByLabelText("Fin de période")).toBeNull();
    expect(useRentReceiptDraft.getState().periodStart).toBe("2026-01-01");
    expect(useRentReceiptDraft.getState().periodEnd).toBe("2026-01-31");

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
      }),
      expect.anything(),
    );
  });

  it("keeps an unsaved edit and clears the draft pane when generating after a save", async () => {
    const saved: RentReceiptDraftDto = {
      id: 40,
      month: MONTH,
      landlordId: 1,
      tenantId: 2,
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      rentExclCharges: "1200.00",
      charges: "0.00",
      paymentDate: "2026-01-05",
      issueDate: "2026-01-05",
      savedAt: "2026-01-10T09:00:00Z",
    };
    savedDraftCache = saved;
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1500.00",
    });

    const queryClient = renderPage();
    const user = userEvent.setup();
    const rent = await screen.findByLabelText("Loyer hors charges");

    // The saved draft still hydrates normally on first load.
    await waitFor(() => expect(rent).toHaveValue("1200.00"));
    expect(useRentReceiptDraft.getState().draftId).toBe(40);

    // Saving replaces the active row: the refetched cache holds the new id.
    await user.click(
      screen.getByRole("button", { name: "Enregistrer le brouillon" }),
    );
    await waitFor(() =>
      expect(useRentReceiptDraft.getState().draftId).toBe(50),
    );
    queryClient.setQueryData(queryKeys.rentReceiptDraft(MONTH, 1, 2, null), {
      ...saved,
      id: 50,
      savedAt: "2026-01-15T10:30:00Z",
    });

    // Edit after the save, without saving again, then generate.
    await user.clear(rent);
    await user.type(rent, "1500.00");

    await user.click(
      await screen.findByRole("button", { name: /Générer la quittance/ }),
    );

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith(
        expect.objectContaining({ rentExclCharges: "1500.00" }),
      ),
    );
    await waitFor(() =>
      expect(useRentReceiptDraft.getState().draftId).toBeNull(),
    );
    expect(rent).toHaveValue("1500.00");
    expect(screen.getByText("Aucun brouillon enregistré")).toBeVisible();
  });

  it("disables the draft save button while a save is in flight", async () => {
    let resolveSave: (value: RentReceiptDraftDto) => void = () => undefined;
    vi.mocked(api.drafts.saveRentReceipt).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );

    renderPage();
    const save = await screen.findByRole("button", {
      name: "Enregistrer le brouillon",
    });
    await userEvent.setup().click(save);

    await waitFor(() => expect(save).toBeDisabled());

    resolveSave({
      id: 50,
      month: MONTH,
      landlordId: 1,
      tenantId: 2,
      savedAt: "2026-01-15T10:30:00Z",
    });
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("renders the draft save as a primary action before generate and keeps only the status in the preview", () => {
    renderPage();

    const save = screen.getByRole("button", {
      name: "Enregistrer le brouillon",
    });
    const generate = screen.getByRole("button", {
      name: /Générer la quittance/,
    });
    expect(save).toHaveClass("btn-primary");
    expect(generate).toHaveClass("btn-primary");
    expect(save.parentElement).toBe(generate.parentElement);
    expect(
      save.compareDocumentPosition(generate) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).not.toBe(0);

    const preview = document.querySelector('[data-cy="preview-pane"]');
    expect(preview).not.toBeNull();
    expect(
      within(preview as HTMLElement).queryByRole("button", {
        name: "Enregistrer le brouillon",
      }),
    ).toBeNull();
    expect(
      within(preview as HTMLElement).getByText("Aucun brouillon enregistré"),
    ).toBeVisible();
  });

  it("leaves the draft deletion to the backend after generating the receipt", async () => {
    useRentReceiptDraft.setState({
      draftId: 70,
      savedAt: "2026-01-10T09:00:00Z",
    });
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1300.00",
    });

    renderPage();
    await userEvent
      .setup()
      .click(
        await screen.findByRole("button", { name: /Générer la quittance/ }),
      );

    await waitFor(() => expect(api.rentReceipts.create).toHaveBeenCalled());
    expect(api.drafts.delete).not.toHaveBeenCalled();
    expect(useRentReceiptDraft.getState().draftId).toBeNull();
    expect(useRentReceiptDraft.getState().savedAt).toBeNull();
  });

  it("echoes the payment and issue dates in French under the native date inputs", () => {
    renderPage();

    expect(screen.getAllByText("05/01/2026")).toHaveLength(2);

    fireEvent.change(screen.getByLabelText("Date de paiement"), {
      target: { value: "2026-02-01" },
    });

    expect(screen.getByText("01/02/2026")).toBeVisible();
  });

  it("removes the technical generation copy", () => {
    renderPage();

    expect(screen.queryByText("Étape 1")).toBeNull();
    expect(screen.queryByText("Calcul backend")).toBeNull();
    expect(screen.queryByText(/recalcul automatique/)).toBeNull();
    expect(screen.getByText("Paramètres de la quittance")).toBeVisible();
    expect(
      screen.getByText(
        "Affichage estimé. Le total du PDF est recalculé avec arrondi au centime.",
      ),
    ).toBeVisible();
  });

  it("adds a charge with plain labels, saves it as read-only text and edits it back", async () => {
    renderPage();
    const user = userEvent.setup();

    expect(screen.queryByText("Charges supplémentaires")).toBeNull();
    const addButton = screen.getByRole("button", {
      name: "Ajouter une charge supplémentaire",
    });
    await user.click(addButton);
    expect(screen.getByText("Charges supplémentaires")).toBeVisible();
    expect(screen.getByLabelText("Libellé")).toBeVisible();
    expect(screen.getByLabelText("Montant")).toBeVisible();
    expect(addButton).toBeDisabled();

    // An invalid row stays editable and shows the French errors.
    await user.type(screen.getByLabelText("Montant"), "0");
    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer la charge supplémentaire",
      }),
    );
    expect(
      await screen.findByText(
        "Le libellé de la charge supplémentaire est obligatoire.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Le montant de la charge supplémentaire doit être strictement positif.",
      ),
    ).toBeVisible();
    expect(screen.getByLabelText("Libellé")).toBeVisible();

    // The unsaved row never reaches the estimate.
    await user.type(screen.getByLabelText("Libellé"), "Eau");
    await user.clear(screen.getByLabelText("Montant"));
    await user.type(screen.getByLabelText("Montant"), "20,00");
    expect(screen.getByText(/1\s?300,00/)).toBeVisible();
    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer la charge supplémentaire",
      }),
    );

    const row = document.querySelector('[data-cy="extra-charge-0"]');
    expect(row).not.toBeNull();
    expect(within(row as HTMLElement).getByText("Eau")).toBeVisible();
    expect(within(row as HTMLElement).getByText(/20,00\s?€/)).toBeVisible();
    expect(screen.queryByLabelText("Libellé")).toBeNull();
    expect(screen.getByText(/1\s?320,00/)).toBeVisible();
    expect(addButton).toBeEnabled();

    // Editing re-opens the saved values and keeps them in the estimate.
    await user.click(
      screen.getByRole("button", {
        name: "Modifier la charge supplémentaire 1",
      }),
    );
    expect(screen.getByLabelText("Libellé")).toHaveValue("Eau");
    expect(screen.getByLabelText("Montant")).toHaveValue("20.00");
    expect(addButton).toBeDisabled();
    expect(screen.getByText(/1\s?320,00/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.getByText(/1\s?320,00/)).toBeVisible();

    await user.click(
      screen.getByRole("button", {
        name: "Retirer la charge supplémentaire 1",
      }),
    );
    expect(screen.queryByText("Charges supplémentaires")).toBeNull();
    expect(screen.getByText(/1\s?300,00/)).toBeVisible();
  });

  it("sends saved additional charges to the preview, the generation and the saved draft", async () => {
    vi.mocked(api.rentReceipts.create).mockResolvedValue({
      id: 1,
      month: MONTH,
      version: 1,
      total: "1320.00",
    });

    renderPage();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Ajouter une charge supplémentaire" }),
    );
    await user.type(screen.getByLabelText("Libellé"), "Eau");
    await user.type(screen.getByLabelText("Montant"), "20.00");

    // An unsaved row blocks generation: it is never silently discarded.
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer la charge supplémentaire",
      }),
    );
    await waitFor(() => expect(screen.getByText(/1\s?320,00/)).toBeVisible());

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCharges: [{ label: "Eau", amount: "20.00" }],
      }),
      expect.anything(),
    );

    await user.click(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    );
    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalCharges: [{ label: "Eau", amount: "20.00" }],
        }),
      ),
    );

    await user.click(
      screen.getByRole("button", { name: "Enregistrer le brouillon" }),
    );
    await waitFor(() =>
      expect(api.drafts.saveRentReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalCharges: [{ label: "Eau", amount: "20.00" }],
        }),
      ),
    );
  });

  it("keeps the saved charge in the estimate and the preview while editing", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Ajouter une charge supplémentaire" }),
    );
    await user.type(screen.getByLabelText("Libellé"), "Eau");
    await user.type(screen.getByLabelText("Montant"), "20.00");
    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer la charge supplémentaire",
      }),
    );
    await waitFor(() => expect(screen.getByText(/1\s?320,00/)).toBeVisible());

    await user.click(
      screen.getByRole("button", {
        name: "Modifier la charge supplémentaire 1",
      }),
    );
    await user.clear(screen.getByLabelText("Montant"));
    await user.type(screen.getByLabelText("Montant"), "25,00");
    expect(screen.getByText(/1\s?320,00/)).toBeVisible();

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCharges: [{ label: "Eau", amount: "20.00" }],
      }),
      expect.anything(),
    );

    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer la charge supplémentaire",
      }),
    );
    await waitFor(() => expect(screen.getByText(/1\s?325,00/)).toBeVisible());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCharges: [{ label: "Eau", amount: "25.00" }],
      }),
      expect.anything(),
    );
    expect(
      screen.getByRole("button", { name: "Ajouter une charge supplémentaire" }),
    ).toBeEnabled();
  });

  it("saves the edited charge in place when an earlier row is removed", async () => {
    renderPage();
    const user = userEvent.setup();

    const addCharge = async (label: string, amount: string) => {
      await user.click(
        screen.getByRole("button", {
          name: "Ajouter une charge supplémentaire",
        }),
      );
      await user.type(screen.getByLabelText("Libellé"), label);
      await user.type(screen.getByLabelText("Montant"), amount);
      await user.click(
        screen.getByRole("button", {
          name: "Enregistrer la charge supplémentaire",
        }),
      );
      await screen.findByText(label);
    };

    await addCharge("Eau", "10.00");
    await addCharge("Gaz", "20.00");
    await addCharge("Bois", "30.00");

    // Edit the middle row, then remove the first one: the edit must stay on Gaz.
    await user.click(
      screen.getByRole("button", {
        name: "Modifier la charge supplémentaire 2",
      }),
    );
    await user.clear(screen.getByLabelText("Montant"));
    await user.type(screen.getByLabelText("Montant"), "25,00");
    await user.click(
      screen.getByRole("button", {
        name: "Retirer la charge supplémentaire 1",
      }),
    );
    expect(screen.getByLabelText("Libellé")).toHaveValue("Gaz");
    await user.click(
      screen.getByRole("button", {
        name: "Enregistrer la charge supplémentaire",
      }),
    );

    await waitFor(() =>
      expect(
        document.querySelector('[data-cy="extra-charge-1"]'),
      ).not.toBeNull(),
    );
    const first = document.querySelector('[data-cy="extra-charge-0"]');
    const second = document.querySelector('[data-cy="extra-charge-1"]');
    expect(within(first as HTMLElement).getByText("Gaz")).toBeVisible();
    expect(within(first as HTMLElement).getByText(/25,00\s?€/)).toBeVisible();
    expect(within(second as HTMLElement).getByText("Bois")).toBeVisible();
    expect(within(second as HTMLElement).getByText(/30,00\s?€/)).toBeVisible();
    expect(document.querySelector('[data-cy="extra-charge-2"]')).toBeNull();
    expect(screen.getByText(/1\s?355,00/)).toBeVisible();
    expect(useRentReceiptDraft.getState().additionalCharges).toEqual([
      { label: "Gaz", amount: "25.00" },
      { label: "Bois", amount: "30.00" },
    ]);

    await waitFor(() => expect(lastPreviewLoader).not.toBeNull());
    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({
        additionalCharges: [
          { label: "Gaz", amount: "25.00" },
          { label: "Bois", amount: "30.00" },
        ],
      }),
      expect.anything(),
    );
  });

  it("restores the saved additional charges of a draft as read-only text", async () => {
    savedDraft = {
      id: 60,
      month: MONTH,
      landlordId: 1,
      tenantId: 2,
      periodStart: "2026-01-02",
      periodEnd: "2026-01-30",
      rentExclCharges: "1200.00",
      charges: "40.00",
      paymentDate: "2026-01-04",
      issueDate: "2026-01-03",
      additionalCharges: [{ label: "Eau", amount: "15.50" }],
      savedAt: "2026-01-10T09:00:00Z",
    };

    renderPage();

    await waitFor(() => expect(screen.getByText("Eau")).toBeVisible());
    expect(screen.getByText(/15,50\s?€/)).toBeVisible();
    expect(screen.queryByLabelText("Libellé")).toBeNull();
    expect(screen.getByText(/1\s?255,50/)).toBeVisible();
  });

  it("switches the mobile input and preview panels", async () => {
    setMobile(true);
    renderPage();
    const user = userEvent.setup();

    const inputPanel = document.querySelector('[data-cy="entry-pane"]');
    const previewPanel = document.querySelector('[data-cy="preview-pane"]');
    expect(inputPanel).toHaveAttribute("id", "rent-receipt-input-panel");
    expect(inputPanel).toHaveAttribute("role", "tabpanel");
    expect(inputPanel).toHaveAttribute(
      "aria-labelledby",
      "rent-receipt-view-tab-saisie",
    );
    expect(previewPanel).toHaveAttribute("id", "rent-receipt-preview-panel");

    const previewTab = await screen.findByRole("tab", { name: "Aperçu" });
    expect(previewTab).toHaveAttribute("id", "rent-receipt-view-tab-apercu");
    expect(previewTab).toHaveAttribute(
      "aria-controls",
      "rent-receipt-preview-panel",
    );

    await user.click(previewTab);
    expect(document.querySelector('[data-cy="entry-pane"]')).toHaveClass(
      "hidden",
    );
    expect(document.querySelector('[data-cy="preview-pane"]')).not.toHaveClass(
      "hidden",
    );
    expect(document.querySelector('[data-cy="preview-pane"]')).toHaveAttribute(
      "role",
      "tabpanel",
    );
    expect(document.querySelector('[data-cy="preview-pane"]')).toHaveAttribute(
      "aria-labelledby",
      "rent-receipt-view-tab-apercu",
    );

    await user.click(screen.getByRole("tab", { name: "Saisie" }));
    expect(document.querySelector('[data-cy="entry-pane"]')).not.toHaveClass(
      "hidden",
    );
    expect(document.querySelector('[data-cy="preview-pane"]')).toHaveClass(
      "hidden",
    );
  });
});
