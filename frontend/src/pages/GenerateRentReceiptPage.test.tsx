import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queries";
import type {
  LandlordDto,
  LeaseDto,
  SignatureDto,
  TenantDto,
} from "@/api/types";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { GenerateRentReceiptPage } from "./GenerateRentReceiptPage";

let signatureList: SignatureDto[] = [];
let signatureError: Error | null = null;
let landlordList: LandlordDto[] = [];
let tenantList: TenantDto[] = [];
let leaseList: LeaseDto[] = [];
let lastPreviewLoader:
  | ((signal: AbortSignal) => Promise<unknown>)
  | null = null;

vi.mock("@/components/PdfViewer", () => ({
  PdfViewer: () => null,
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
    useLandlords: () => ({
      data: landlordList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTenants: () => ({
      data: tenantList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useLeases: () => ({
      data: leaseList,
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useTemplates: () => ({ data: [], isPending: false }),
    useActiveRentReceipt: () => ({ data: null, isPending: false }),
    useSignatures: () => ({
      data: signatureList,
      isPending: false,
      isError: signatureError !== null,
      error: signatureError,
      refetch: vi.fn(),
    }),
  };
});

const MONTH = "2026-01";

const LANDLORD: SignatureDto = {
  id: 7,
  type: "LANDLORD",
  name: "Bailleur",
  mimeType: "image/png",
  createdAt: "2026-10-23T10:00:00Z",
};

const LANDLORD_ROW: LandlordDto = {
  id: 1,
  name: "M. Bailleur",
  address: "1 avenue du Parc, 75011 Paris",
};

const TENANT_ROW: TenantDto = {
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
  queryClient.setQueryData(queryKeys.rentReceipts(MONTH), []);

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GenerateRentReceiptPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return queryClient;
}

describe("GenerateRentReceiptPage", () => {
  beforeEach(() => {
    lastPreviewLoader = null;
    signatureList = [LANDLORD];
    signatureError = null;
    landlordList = [LANDLORD_ROW];
    tenantList = [TENANT_ROW];
    leaseList = [LEASE];
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
      tenantId: 2,
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
      queryClient.getQueryState(queryKeys.rentReceipts(MONTH))?.isInvalidated,
    ).toBe(true);
  });

  it("auto-selects the only active lease and prefills the pair, amounts and property", async () => {
    useRentReceiptDraft.setState({
      landlordId: null,
      tenantId: null,
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

    expect(await screen.findByLabelText("Bailleur")).toHaveValue("1");
    expect(screen.getByLabelText("Locataire")).toHaveValue("2");
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
    const otherLandlord: LandlordDto = {
      id: 3,
      name: "Mme Propriétaire",
      address: "5 rue du Marché, 69001 Lyon",
    };
    const otherTenant: TenantDto = {
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
    await user.selectOptions(screen.getByLabelText("Locataire"), "4");

    await waitFor(() =>
      expect(screen.getByLabelText("Loyer hors charges")).toHaveValue(
        "900.00",
      ),
    );
    expect(screen.getByLabelText("Provision pour charges")).toHaveValue(
      "50.00",
    );
    expect(screen.getByText(/5 rue du Marché/)).toBeInTheDocument();
  });

  it("shows a French message and blocks generation when the pair has no lease", async () => {
    const otherTenant: TenantDto = {
      id: 4,
      name: "M. Occupant",
      address: "5 rue du Marché, 69001 Lyon",
    };
    tenantList = [TENANT_ROW, otherTenant];

    renderPage();

    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Locataire"), "4");

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
        type: "ENTREPRISE_CEO",
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

  it("warns and blocks generation when no signature is configured", async () => {
    signatureList = [];

    renderPage();

    expect(
      await screen.findByText(/Aucune signature trouvée/),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Paramètres" })).toHaveAttribute(
      "href",
      "/configuration",
    );
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
    expect(screen.queryByText(/Aucune signature trouvée/)).toBeNull();
    expect(
      screen.getByRole("button", { name: /Générer la quittance/ }),
    ).toBeDisabled();
    expect(api.rentReceipts.create).not.toHaveBeenCalled();
  });
});
