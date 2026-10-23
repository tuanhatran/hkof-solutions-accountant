import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import type {
  LandlordDto,
  LeaseDto,
  SignatureDto,
  TenantDto,
} from "@/api/types";
import { formatEUR } from "@/lib/format";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { useToasts } from "@/state/toasts";
import { useRentReceiptPage } from "./useRentReceiptPage";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let landlordsState: QueryLike<LandlordDto[]>;
let tenantsState: QueryLike<TenantDto[]>;
let leasesState: QueryLike<LeaseDto[]>;
let templatesState: QueryLike<{ id: number; active?: boolean }[]>;
let signaturesState: QueryLike<SignatureDto[]>;
let activeReceiptState: QueryLike<{ id: number; total: string } | null>;
let mediaMobile = false;
let lastPreviewLoader: ((signal: AbortSignal) => Promise<unknown>) | null =
  null;
let lastPreviewOptions: { active: boolean } | null = null;
const navigateMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    rentReceipts: {
      create: vi.fn(),
      preview: vi.fn(),
      pdf: vi.fn(),
    },
  },
}));

vi.mock("@/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/client")>();
  return { ...actual, downloadBlob: vi.fn() };
});

vi.mock("@/api/queries", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/queries")>();
  return {
    ...actual,
    useLandlords: () => landlordsState,
    useTenants: () => tenantsState,
    useLeases: () => leasesState,
    useTemplates: () => templatesState,
    useSignatures: () => signaturesState,
    useActiveRentReceipt: () => activeReceiptState,
  };
});

vi.mock("@/hooks/useMediaQuery", () => ({
  useMediaQuery: () => mediaMobile,
}));

vi.mock("@/hooks/usePdfPreview", () => ({
  usePdfPreview: (
    load: (signal: AbortSignal) => Promise<unknown>,
    _key: string,
    options: { active: boolean },
  ) => {
    lastPreviewLoader = load;
    lastPreviewOptions = options;
    return {
      url: null,
      loading: false,
      error: null,
      updatedAt: null,
      refresh: vi.fn(),
      download: vi.fn(),
    };
  },
}));

const MONTH = "2026-01";
const LEASE: LeaseDto = {
  id: 10,
  landlordId: 1,
  tenantId: 2,
  landlordName: "M. Bailleur",
  tenantName: "Mme Locataire",
  propertyAddress: "12 rue de la République",
  rentExclCharges: "1300.00",
  charges: "50.00",
};

function readyQuery<T>(data: T): QueryLike<T> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function resetDraft(overrides: Partial<ReturnType<typeof snapshot>> = {}) {
  useRentReceiptDraft.setState({ ...snapshot(), ...overrides });
}

function snapshot() {
  return {
    month: MONTH,
    periodStart: "2026-01-01",
    periodEnd: "2026-01-31",
    rentExclCharges: "",
    charges: "",
    paymentDate: "",
    issueDate: "",
    templateId: null as number | null,
    landlordId: null as number | null,
    tenantId: null as number | null,
    initialized: false,
    dirty: false,
  };
}

function renderController() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRentReceiptPage(), { wrapper });
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  landlordsState = readyQuery([{ id: 1, name: "M. Bailleur", address: "" }]);
  tenantsState = readyQuery([{ id: 2, name: "Mme Locataire", address: "" }]);
  leasesState = readyQuery([LEASE]);
  templatesState = readyQuery([{ id: 5, active: true }]);
  signaturesState = readyQuery([
    {
      id: 7,
      type: "LANDLORD",
      name: "Signature bailleur",
      landlordId: 1,
    },
    { id: 9, type: "LANDLORD", name: "Ancienne signature", landlordId: null },
    { id: 4, type: "ENTREPRISE_CEO", name: "Gérant" },
  ]);
  activeReceiptState = readyQuery(null);
  mediaMobile = false;
  lastPreviewLoader = null;
  lastPreviewOptions = null;
  navigateMock.mockReset();
  vi.mocked(api.rentReceipts.create).mockReset();
  vi.mocked(api.rentReceipts.create).mockResolvedValue({
    id: 30,
    month: MONTH,
    version: 1,
    total: "1300.00",
  });
  vi.mocked(api.rentReceipts.preview).mockReset();
  vi.mocked(api.rentReceipts.preview).mockResolvedValue({
    blob: new Blob(),
    fileName: null,
  });
  vi.mocked(api.rentReceipts.pdf).mockReset();
  vi.mocked(api.rentReceipts.pdf).mockResolvedValue({
    blob: new Blob(),
    fileName: null,
  });
  vi.mocked(downloadBlob).mockReset();
  resetDraft();
  useStatementDraft.setState({ month: "2025-12" });
  useToasts.setState({ toasts: [] });
});

describe("useRentReceiptPage lease selection", () => {
  it("auto-selects the only lease and fills the form", () => {
    const { result } = renderController();

    expect(result.current.values.landlordId).toBe("1");
    expect(result.current.values.tenantId).toBe("2");
    expect(result.current.values.rentExclCharges).toBe("1300.00");
    expect(result.current.values.charges).toBe("50.00");
    expect(result.current.selectedLease?.id).toBe(10);
    expect(useRentReceiptDraft.getState().initialized).toBe(true);
    expect(useRentReceiptDraft.getState().dirty).toBe(false);
  });

  it("selects the lease matching the draft pair", () => {
    const OTHER: LeaseDto = {
      ...LEASE,
      id: 11,
      landlordId: 3,
      tenantId: 4,
    };
    leasesState = readyQuery([OTHER, LEASE]);
    resetDraft({ landlordId: 1, tenantId: 2 });

    const { result } = renderController();
    expect(result.current.selectedLease?.id).toBe(10);
    expect(result.current.values.landlordId).toBe("1");
  });

  it("does not auto-select when several leases do not match the draft", () => {
    leasesState = readyQuery([
      { ...LEASE, id: 11, landlordId: 3, tenantId: 4 },
      { ...LEASE, id: 12, landlordId: 5, tenantId: 6 },
    ]);
    const { result } = renderController();

    expect(result.current.values.landlordId).toBe("");
    expect(useRentReceiptDraft.getState().initialized).toBe(false);
  });

  it("skips auto-selection when pending, failed or already initialised", () => {
    leasesState = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    const pending = renderController();
    expect(pending.result.current.values.landlordId).toBe("");

    leasesState = {
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error("Baux indisponibles"),
      refetch: vi.fn(),
    };
    const failed = renderController();
    expect(failed.result.current.values.landlordId).toBe("");

    leasesState = readyQuery([LEASE]);
    resetDraft({ initialized: true });
    const initialized = renderController();
    expect(initialized.result.current.values.landlordId).toBe("");
  });

  it("handles a lease with undefined identifiers", () => {
    leasesState = readyQuery([
      { ...LEASE, landlordId: undefined, tenantId: undefined },
    ]);
    const { result } = renderController();

    expect(result.current.values.landlordId).toBe("");
    expect(result.current.values.tenantId).toBe("");
  });
});

describe("useRentReceiptPage signatures and money", () => {
  it("lists every landlord signature without a selected pair and falls back", () => {
    const { result } = renderController();

    expect(result.current.availableSignatures.map((item) => item.id)).toEqual([
      7, 9,
    ]);
    expect(result.current.selectedSignatureId).toBe(7);

    act(() => result.current.setChosenSignatureId(9));
    expect(result.current.selectedSignatureId).toBe(9);

    act(() => result.current.setChosenSignatureId(999));
    expect(result.current.selectedSignatureId).toBe(7);
  });

  it("keeps linked and legacy signatures, then resets the choice on landlord change", () => {
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));

    expect(result.current.availableSignatures.map((item) => item.id)).toEqual([
      7, 9,
    ]);
    act(() => result.current.setChosenSignatureId(9));
    expect(result.current.selectedSignatureId).toBe(9);

    act(() => result.current.selectPair("3", "4"));
    expect(result.current.selectedSignatureId).toBe(9);
  });

  it("warns when the selected landlord has no signature", () => {
    signaturesState = readyQuery([
      { id: 4, type: "ENTREPRISE_CEO", name: "Gérant" },
    ]);
    const { result } = renderController();
    expect(result.current.signatureAvailable).toBe(false);

    act(() => result.current.selectPair("1", "2"));
    expect(result.current.landlordWithoutSignature).toBe(true);
  });

  it("does not warn while signatures are loading", () => {
    signaturesState = { ...readyQuery<SignatureDto[]>([]), isPending: true };
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));

    expect(result.current.signatureAvailable).toBe(false);
    expect(result.current.landlordWithoutSignature).toBe(false);
  });

  it("computes the estimated total and tolerates invalid amounts", () => {
    const valid = renderController();
    act(() => valid.result.current.selectPair("1", "2"));
    expect(valid.result.current.estimatedTotal).toBe(formatEUR(1350));
    valid.unmount();

    leasesState = readyQuery([]);
    resetDraft({ rentExclCharges: "abc", charges: "x" });
    const { result } = renderController();
    expect(result.current.estimatedTotal).toBe(formatEUR(0));
  });

  it("selects a pair with and without a lease", () => {
    const { result } = renderController();

    act(() => result.current.selectPair("1", "2"));
    expect(useRentReceiptDraft.getState()).toMatchObject({
      landlordId: 1,
      tenantId: 2,
      rentExclCharges: "1300.00",
      charges: "50.00",
      initialized: true,
    });
    expect(result.current.selectedLease?.id).toBe(10);

    act(() => result.current.selectPair("3", "4"));
    expect(useRentReceiptDraft.getState()).toMatchObject({
      landlordId: 3,
      tenantId: 4,
    });
    expect(result.current.selectedLease).toBeNull();

    act(() => result.current.selectPair("", ""));
    expect(useRentReceiptDraft.getState()).toMatchObject({
      landlordId: null,
      tenantId: null,
    });
  });

  it("resumes the amounts of the selected lease", () => {
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));

    act(() => result.current.resumeLease());
    expect(toastMessages()).toContain("Montants repris depuis le bail.");
    expect(useRentReceiptDraft.getState().dirty).toBe(true);

    act(() => result.current.selectPair("3", "4"));
    act(() => result.current.resumeLease());
    expect(
      toastMessages().filter(
        (text) => text === "Montants repris depuis le bail.",
      ),
    ).toHaveLength(1);
  });

  it("changes month and ignores an empty month", () => {
    const { result } = renderController();

    act(() => result.current.changeMonth(""));
    expect(result.current.draft.month).toBe(MONTH);

    act(() => result.current.changeMonth("2026-02"));
    expect(result.current.draft.month).toBe("2026-02");
    expect(result.current.values.periodStart).toBe("2026-02-01");
    expect(result.current.values.periodEnd).toBe("2026-02-28");
  });
});

describe("useRentReceiptPage preview and generation", () => {
  it("keeps the preview inactive and rejects the loader without a lease", async () => {
    leasesState = readyQuery([
      { ...LEASE, id: 11, landlordId: 3, tenantId: 4 },
      { ...LEASE, id: 12, landlordId: 5, tenantId: 6 },
    ]);
    const { result } = renderController();
    expect(lastPreviewOptions?.active).toBe(false);

    await expect(
      lastPreviewLoader?.(new AbortController().signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(result.current.validation.success).toBe(false);
  });

  it("builds the request from the form and previews it", async () => {
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));

    expect(result.current.validation.success).toBe(true);
    expect(lastPreviewOptions?.active).toBe(true);
    await lastPreviewLoader?.(new AbortController().signal);

    expect(api.rentReceipts.preview).toHaveBeenCalledWith(
      {
        month: MONTH,
        landlordId: 1,
        tenantId: 2,
        periodStart: "2026-01-01",
        periodEnd: "2026-01-31",
        rentExclCharges: "1300.00",
        charges: "50.00",
        templateId: 5,
        signatureId: 7,
      },
      expect.anything(),
    );
  });

  it("uses the draft template over the active one", async () => {
    resetDraft({ templateId: 8 });
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));
    await lastPreviewLoader?.(new AbortController().signal);

    expect(result.current.selectedModel).toBe(8);
    expect(api.rentReceipts.preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ templateId: 8 }),
      expect.anything(),
    );
  });

  it("refuses to submit an invalid form", async () => {
    leasesState = readyQuery([
      { ...LEASE, id: 11, landlordId: 3, tenantId: 4 },
      { ...LEASE, id: 12, landlordId: 5, tenantId: 6 },
    ]);
    const { result } = renderController();

    await act(async () => {
      await result.current.submit(result.current.values as never);
    });
    expect(api.rentReceipts.create).not.toHaveBeenCalled();
    expect(result.current.generationInProgress).toBe(false);
  });

  it("generates a receipt from a complete form", async () => {
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));
    await act(async () => {
      result.current.submit(result.current.values as never);
    });

    await waitFor(() =>
      expect(api.rentReceipts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          month: MONTH,
          landlordId: 1,
          tenantId: 2,
          rentExclCharges: "1300.00",
          charges: "50.00",
          templateId: 5,
          signatureId: 7,
        }),
      ),
    );
    await waitFor(() => expect(result.current.result?.id).toBe(30));
    expect(toastMessages()).toContain(
      "Quittance de Janvier 2026 générée en version 1.",
    );
    expect(result.current.generationInProgress).toBe(false);
    expect(useRentReceiptDraft.getState().dirty).toBe(false);
    expect(result.current.displayedTotal).toBe(formatEUR("1300.00"));
    expect(result.current.activeVersion).toBeUndefined();
  });

  it("surfaces a generation failure", async () => {
    vi.mocked(api.rentReceipts.create).mockRejectedValue(
      new Error("Génération refusée"),
    );
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));
    await act(async () => {
      result.current.submit(result.current.values as never);
    });

    await waitFor(() =>
      expect(toastMessages()).toContain("Génération refusée"),
    );
    expect(result.current.generationInProgress).toBe(false);
  });

  it("navigates to the statement with the generated or draft month", () => {
    const { result } = renderController();
    act(() => result.current.goToStatement());
    expect(useStatementDraft.getState().month).toBe(MONTH);
    expect(navigateMock).toHaveBeenCalledWith("/generer/note-frais");
  });

  it("downloads a receipt with fallback or provided file names", async () => {
    const { result } = renderController();

    await act(async () => {
      await result.current.downloadRentReceipt({ id: 30 });
    });
    expect(api.rentReceipts.pdf).toHaveBeenCalledWith(30);
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "quittance_2026-01.pdf",
    );

    vi.mocked(api.rentReceipts.pdf).mockResolvedValue({
      blob: new Blob(),
      fileName: "custom.pdf",
    });
    await act(async () => {
      await result.current.downloadRentReceipt({ id: 31, month: "2026-03" });
    });
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "custom.pdf",
    );

    await act(async () => {
      await result.current.downloadRentReceipt({ month: MONTH });
    });
    expect(api.rentReceipts.pdf).toHaveBeenCalledTimes(2);

    vi.mocked(api.rentReceipts.pdf).mockRejectedValue(
      new Error("PDF indisponible"),
    );
    await act(async () => {
      await result.current.downloadRentReceipt({ id: 32 });
    });
    expect(toastMessages()).toContain("PDF indisponible");
  });

  it("exposes the active receipt summary, mobile panel and total", () => {
    activeReceiptState = readyQuery({ id: 40, total: "1350.00", version: 3 });
    const { result } = renderController();
    act(() => result.current.selectPair("1", "2"));

    expect(result.current.activePairReceipt?.id).toBe(40);
    expect(result.current.activeVersion).toBe(3);
    expect(result.current.displayedTotal).toBe(formatEUR(1350));

    act(() => result.current.setMobilePanel("apercu"));
    expect(result.current.mobilePanel).toBe("apercu");
    expect(result.current.mobile).toBe(false);
  });

  it("hides the active receipt when no pair is selected", () => {
    activeReceiptState = readyQuery({ id: 40, total: "1350.00", version: 3 });
    leasesState = readyQuery([
      { ...LEASE, id: 11, landlordId: 3, tenantId: 4 },
      { ...LEASE, id: 12, landlordId: 5, tenantId: 6 },
    ]);
    const { result } = renderController();

    expect(result.current.activeRentReceipt.data?.id).toBe(40);
    expect(result.current.activePairReceipt).toBeNull();
    expect(result.current.displayedTotal).toBeNull();
  });
});
