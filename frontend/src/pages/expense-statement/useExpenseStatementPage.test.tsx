import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadBlob } from "@/api/client";
import { api } from "@/api/endpoints";
import type {
  CompanyDto,
  EmployeeDto,
  ExpenseItemDto,
  SignatureDto,
  TemplateDto,
} from "@/api/types";
import type { DraftLine } from "@/lib/lines";
import { useCompanyStore } from "@/state/company";
import { useRentReceiptDraft } from "@/state/rentReceiptDraft";
import { useStatementDraft } from "@/state/statementDraft";
import { useToasts } from "@/state/toasts";
import type { AnalysisState } from "@/hooks/useAnalysis";
import { useExpenseStatementPage } from "./useExpenseStatementPage";

interface QueryLike<T> {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: ReturnType<typeof vi.fn>;
}

let companiesState: QueryLike<CompanyDto[]>;
let employeesState: QueryLike<EmployeeDto[]>;
let itemsState: QueryLike<ExpenseItemDto[]>;
let templatesState: QueryLike<TemplateDto[]>;
let rentReceiptState: QueryLike<{ id: number; total: string }>;
let activeStatementState: QueryLike<{ id: number; version: number }>;
let signaturesState: QueryLike<SignatureDto[]>;
let analysisState: AnalysisState;
let mediaMobile = false;
let lastPreviewLoader: ((signal: AbortSignal) => Promise<unknown>) | null =
  null;
let lastPreviewOptions: { active: boolean } | null = null;
const startMock = vi.fn();
const cancelMock = vi.fn();
const resetAnalysisMock = vi.fn();
const navigateMock = vi.fn();
const refusalMock = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/api/endpoints", () => ({
  api: {
    receipts: {
      upload: vi.fn(),
      delete: vi.fn(),
    },
    expenseStatements: {
      calculate: vi.fn(),
      preview: vi.fn(),
      create: vi.fn(),
      pdf: vi.fn(),
      zip: vi.fn(),
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
    useCompanies: () => companiesState,
    useEmployees: () => employeesState,
    useExpenseItems: () => itemsState,
    useTemplates: () => templatesState,
    useActiveRentReceipt: () => rentReceiptState,
    useActiveStatement: () => activeStatementState,
    useSignatures: () => signaturesState,
  };
});

vi.mock("@/hooks/useAnalysis", () => ({
  useAnalysis: () => ({
    state: analysisState,
    start: startMock,
    cancel: cancelMock,
    reset: resetAnalysisMock,
  }),
}));

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
      refresh: refusalMock,
      download: refusalMock,
    };
  },
}));

const ITEMS: ExpenseItemDto[] = [
  {
    code: "loyer",
    label: "Loyer",
    sortOrder: 3,
    active: true,
    multipleLinesAllowed: true,
    proRataPct: "100",
  },
  {
    code: "gaz",
    label: "Gaz",
    sortOrder: 1,
    active: true,
    multipleLinesAllowed: true,
    proRataPct: "100",
  },
  {
    code: "internet",
    label: "Internet",
    sortOrder: 2,
    active: true,
    multipleLinesAllowed: false,
    proRataPct: "50",
  },
  {
    code: "eau",
    label: "Eau",
    sortOrder: 0,
    active: true,
    multipleLinesAllowed: true,
    proRataPct: "0",
  },
];

const TEMPLATES: TemplateDto[] = [
  { id: 5, name: "Modele actif", active: true, builtIn: false },
  { id: 6, name: "Modele archive", active: false, builtIn: false },
];

const COMPANY: CompanyDto = { id: 1, name: "HKOF" };
const CEO_EMPLOYEE: EmployeeDto = {
  id: 9,
  companyId: 1,
  firstName: "Camille",
  lastName: "Martin",
  title: "CEO",
};
const CEO: SignatureDto = {
  id: 4,
  type: "EMPLOYEE",
  name: "Gérant",
  employeeId: 9,
};
const LANDLORD: SignatureDto = { id: 3, type: "LANDLORD", name: "Bailleur" };

const MONTH = "2026-01";

function readyQuery<T>(data: T): QueryLike<T> {
  return {
    data,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function line(overrides: Partial<DraftLine> = {}): DraftLine {
  return {
    key: "line-1",
    itemCode: "gaz",
    amountInclVat: "80.00",
    proRataPct: "100",
    receiptId: null,
    receiptName: null,
    amountSource: "MANUAL",
    aiDetectedAmount: null,
    aiConfidence: null,
    detectedSupplier: null,
    ...overrides,
  };
}

function resetDraft(lines: DraftLine[] = []) {
  useStatementDraft.setState({
    month: MONTH,
    linesByMonth: lines.length > 0 ? { [MONTH]: lines } : {},
    templatesByMonth: {},
    completeByMonth: {},
    primedReceiptByMonth: {},
    dirtyByMonth: {},
  });
}

function renderController() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useExpenseStatementPage(), { wrapper });
}

function toastMessages(): string[] {
  return useToasts.getState().toasts.map((element) => element.message);
}

beforeEach(() => {
  companiesState = readyQuery([COMPANY]);
  employeesState = readyQuery([CEO_EMPLOYEE]);
  useCompanyStore.setState({ activeCompanyId: 1 });
  itemsState = readyQuery(ITEMS);
  templatesState = readyQuery(TEMPLATES);
  rentReceiptState = readyQuery({ id: 7, total: "1300.00" });
  activeStatementState = readyQuery(
    null as unknown as { id: number; version: number },
  );
  signaturesState = readyQuery([LANDLORD, CEO]);
  analysisState = { status: "idle" };
  mediaMobile = false;
  lastPreviewLoader = null;
  lastPreviewOptions = null;
  navigateMock.mockReset();
  startMock.mockReset();
  startMock.mockResolvedValue(undefined);
  cancelMock.mockReset();
  cancelMock.mockResolvedValue(undefined);
  resetAnalysisMock.mockReset();
  refusalMock.mockReset();
  vi.mocked(api.receipts.upload).mockReset();
  vi.mocked(api.receipts.delete).mockReset();
  vi.mocked(api.receipts.delete).mockResolvedValue(undefined);
  vi.mocked(api.expenseStatements.calculate).mockReset();
  vi.mocked(api.expenseStatements.calculate).mockResolvedValue({
    total: "80.00",
    lines: [],
  });
  vi.mocked(api.expenseStatements.preview).mockReset();
  vi.mocked(api.expenseStatements.preview).mockResolvedValue({
    blob: new Blob(),
    fileName: null,
  });
  vi.mocked(api.expenseStatements.create).mockReset();
  vi.mocked(api.expenseStatements.create).mockResolvedValue({
    id: 12,
    month: MONTH,
    version: 2,
  });
  vi.mocked(api.expenseStatements.pdf).mockReset();
  vi.mocked(api.expenseStatements.pdf).mockResolvedValue({
    blob: new Blob(),
    fileName: null,
  });
  vi.mocked(api.expenseStatements.zip).mockReset();
  vi.mocked(api.expenseStatements.zip).mockResolvedValue({
    blob: new Blob(),
    fileName: "pieces.zip",
  });
  vi.mocked(downloadBlob).mockReset();
  resetDraft();
  useRentReceiptDraft.setState({
    month: "2025-12",
    dirty: false,
  });
  useToasts.setState({ toasts: [] });
});

describe("useExpenseStatementPage defaults", () => {
  it("orders items, resolves template, signature and rent availability", () => {
    const { result } = renderController();

    expect(result.current.expenseItems.map((item) => item.code)).toEqual([
      "eau",
      "gaz",
      "internet",
      "loyer",
    ]);
    expect(result.current.activeModel?.id).toBe(5);
    expect(result.current.selectedTemplate).toBe(5);
    expect(result.current.selectedSignatureId).toBe(4);
    expect(result.current.signatureAvailable).toBe(true);
    expect(result.current.availableRent).toBe(true);
    expect(result.current.currentTemplate).toBe("Modele actif");
    expect(result.current.complete).toBe(true);
    expect(result.current.omittedTypes).toEqual(["internet"]);
    expect(result.current.isRent).toBe(false);
  });

  it("disables the calculation without an active company", async () => {
    companiesState = readyQuery([]);
    useCompanyStore.setState({ activeCompanyId: null });
    resetDraft([line()]);
    const { result } = renderController();

    await waitFor(() => expect(result.current.activeCompanyId).toBeNull());
    expect(result.current.previewRequest).toBeNull();
    expect(api.expenseStatements.calculate).not.toHaveBeenCalled();
  });

  it("recalculates for the newly active company", async () => {
    companiesState = readyQuery([COMPANY, { id: 2, name: "Autre SARL" }]);
    resetDraft([line()]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });

    act(() => useCompanyStore.setState({ activeCompanyId: 2 }));

    await waitFor(() => expect(result.current.activeCompanyId).toBe(2));
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });
    expect(api.expenseStatements.calculate).toHaveBeenLastCalledWith(
      expect.objectContaining({ companyId: 2 }),
      expect.anything(),
    );
  });

  it("tolerates pending optional queries and items without order or code", () => {
    itemsState = readyQuery([
      { ...ITEMS[1] },
      {
        label: "Sans ordre",
        code: "sans-ordre",
        active: true,
        proRataPct: "100",
      },
      { label: "Sans code", active: true, proRataPct: "100" },
    ]);
    const pending = {
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };
    templatesState = pending;
    signaturesState = pending;
    employeesState = pending;
    rentReceiptState = pending;
    const { result } = renderController();

    expect(result.current.activeModel).toBeNull();
    expect(result.current.currentTemplate).toBe("modèle intégré");
    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.selectedSignatureId).toBeNull();
    expect(result.current.signatureAvailable).toBe(false);
    expect(result.current.availableRent).toBe(false);
    expect(result.current.optionDisabled(result.current.expenseItems[2]!)).toBe(
      false,
    );
  });

  it("disables a single-line type already added, except while editing it", () => {
    resetDraft([line({ itemCode: "internet" })]);
    const { result } = renderController();
    const internet = result.current.expenseItemByCode.get("internet");
    const gaz = result.current.expenseItemByCode.get("gaz");
    expect(internet).toBeDefined();
    expect(gaz).toBeDefined();
    expect(result.current.optionDisabled(internet!)).toBe(true);
    expect(result.current.optionDisabled(gaz!)).toBe(false);

    act(() => result.current.editLine(result.current.orderedLines[0]!));
    expect(result.current.optionDisabled(internet!)).toBe(false);
  });

  it("falls back to the first signature and the built-in template", () => {
    signaturesState = readyQuery([LANDLORD]);
    templatesState = readyQuery([{ id: 6, name: "Ancien", active: false }]);

    const { result } = renderController();

    expect(result.current.selectedSignatureId).toBe(3);
    expect(result.current.activeModel).toBeNull();
    expect(result.current.selectedTemplate).toBeNull();
    expect(result.current.currentTemplate).toBe("modèle intégré");
  });

  it("exposes the mobile viewport and panel", () => {
    mediaMobile = true;
    const { result } = renderController();

    expect(result.current.mobile).toBe(true);
    act(() => result.current.setMobilePanel("preview"));
    expect(result.current.mobilePanel).toBe("preview");
  });
});

describe("useExpenseStatementPage form and upload", () => {
  it("changes type, applies the rent amount and clears it back", () => {
    const { result } = renderController();

    act(() => result.current.changeType("gaz"));
    expect(result.current.values.itemCode).toBe("gaz");
    expect(result.current.values.proRataPct).toBe("100");
    expect(result.current.isRent).toBe(false);

    act(() => result.current.changeType("internet"));
    expect(result.current.values.proRataPct).toBe("50");

    act(() => result.current.changeType("loyer"));
    expect(result.current.values.amountInclVat).toBe("1300.00");
    expect(result.current.isRent).toBe(true);
    expect(cancelMock).toHaveBeenCalledWith(true);

    act(() => result.current.changeType("gaz"));
    expect(result.current.values.amountInclVat).toBe("");
  });

  it("leaves the amount empty when no rent receipt exists", () => {
    rentReceiptState = readyQuery(
      null as unknown as { id: number; total: string },
    );
    const { result } = renderController();

    act(() => result.current.changeType("loyer"));
    expect(result.current.values.amountInclVat).toBe("");
    expect(result.current.availableRent).toBe(false);
  });

  it("uploads a receipt, replaces it and releases it", async () => {
    vi.mocked(api.receipts.upload).mockResolvedValue({
      id: 9,
      fileName: "facture.pdf",
      size: 2048,
      mimeType: "application/pdf",
    });
    const { result } = renderController();

    await act(async () => {
      await result.current.upload(
        new File(["a"], "original.pdf", { type: "application/pdf" }),
      );
    });

    expect(result.current.receipt).toEqual({
      id: 9,
      name: "facture.pdf",
      size: 2048,
      mimeType: "application/pdf",
    });
    expect(startMock).toHaveBeenCalledWith(9);
    expect(result.current.uploading).toBe(false);

    vi.mocked(api.receipts.upload).mockResolvedValue({
      id: 10,
      fileName: undefined,
      size: undefined,
      mimeType: undefined,
    });
    await act(async () => {
      await result.current.upload(
        new File(["b"], "second.jpg", { type: "image/jpeg" }),
      );
    });
    expect(result.current.receipt).toMatchObject({
      id: 10,
      name: "second.jpg",
      size: 1,
      mimeType: "image/jpeg",
    });
    expect(api.receipts.delete).toHaveBeenCalledWith(9);

    await act(async () => {
      result.current.removeFile();
    });
    expect(api.receipts.delete).toHaveBeenCalledWith(10);
    expect(result.current.receipt).toBeNull();
    expect(cancelMock).toHaveBeenCalledWith(true);
  });

  it("reports an upload without id or rejected and keeps the previous file", async () => {
    const { result } = renderController();

    vi.mocked(api.receipts.upload).mockResolvedValue({});
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    expect(result.current.fileError).toBe(
      "Le justificatif n’a pas pu être enregistré.",
    );
    expect(result.current.receipt).toBeNull();

    vi.mocked(api.receipts.upload).mockResolvedValue({
      id: 9,
      fileName: "ok.pdf",
    });
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    expect(result.current.receipt?.id).toBe(9);

    vi.mocked(api.receipts.upload).mockRejectedValue(new Error("Refusé"));
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    expect(result.current.fileError).toBe("Refusé");
    expect(result.current.receipt?.id).toBe(9);
    expect(result.current.uploading).toBe(false);
  });

  it("edits and cancels the edition of an existing line", () => {
    resetDraft([
      line({
        key: "edit-me",
        receiptId: 55,
        receiptName: "facture.pdf",
        amountSource: "AI",
        aiDetectedAmount: "80.00",
        aiConfidence: "haute",
        detectedSupplier: "EDF",
      }),
    ]);
    const { result } = renderController();

    act(() =>
      result.current.editLine(
        useStatementDraft.getState().linesByMonth[MONTH][0],
      ),
    );
    expect(result.current.lineBeingEdited).toBe("edit-me");
    expect(result.current.receipt).toEqual({
      id: 55,
      name: "facture.pdf",
      size: null,
      mimeType: null,
    });
    expect(result.current.ai).toMatchObject({
      amount: true,
      amountConfirmed: true,
      detectedAmount: "80.00",
      supplier: "EDF",
      confidence: "haute",
    });
    expect(result.current.values.itemCode).toBe("gaz");

    act(() => result.current.cancelEdit());
    expect(result.current.lineBeingEdited).toBeNull();
    expect(result.current.receipt).toBeNull();
    expect(result.current.values.itemCode).toBe("");
    expect(api.receipts.delete).not.toHaveBeenCalled();
  });

  it("edits a line without receipt and uses the rent total for the rent line", () => {
    resetDraft([
      line({
        key: "rent-line",
        itemCode: "loyer",
        amountInclVat: "100.00",
        receiptId: null,
      }),
    ]);
    const { result } = renderController();

    act(() =>
      result.current.editLine(
        useStatementDraft.getState().linesByMonth[MONTH][0],
      ),
    );
    expect(result.current.receipt).toBeNull();
    expect(result.current.values.amountInclVat).toBe("1300.00");
  });

  it("ignores an empty or unchanged month change", () => {
    const { result } = renderController();

    act(() => result.current.changeMonth(""));
    expect(result.current.month).toBe(MONTH);
    act(() => result.current.changeMonth(MONTH));
    expect(result.current.month).toBe(MONTH);
  });

  it("marks and confirms the AI amount flags", () => {
    const { result } = renderController();

    act(() => result.current.markAmountEdited());
    expect(result.current.ai.amount).toBe(false);
    expect(result.current.ai.amountConfirmed).toBe(true);
    act(() => result.current.confirmAmount());
    expect(result.current.ai.amountConfirmed).toBe(true);
  });

  it("changes month, releases the receipt and navigates to the rent receipt", () => {
    const { result } = renderController();

    act(() => result.current.changeMonth(MONTH));
    act(() => result.current.changeMonth(""));
    expect(useStatementDraft.getState().month).toBe(MONTH);

    act(() => result.current.changeMonth("2026-02"));
    expect(useStatementDraft.getState().month).toBe("2026-02");
    expect(result.current.mobilePanel).toBe("input");

    act(() => result.current.goToRentReceipt());
    expect(useRentReceiptDraft.getState().month).toBe("2026-02");
    expect(navigateMock).toHaveBeenCalledWith("/generer/quittance");
  });
});

describe("useExpenseStatementPage analysis", () => {
  async function uploadReceipt() {
    vi.mocked(api.receipts.upload).mockResolvedValue({
      id: 9,
      fileName: "facture.pdf",
    });
  }

  it("applies the suggested type and detected amount once", async () => {
    await uploadReceipt();
    const { result, rerender } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });

    analysisState = {
      status: "done",
      analysis: {
        id: 11,
        receiptId: 9,
        result: {
          suggestedType: "gaz",
          amountInclVat: "80,00",
          currency: "EUR",
          supplier: "EDF",
          confidence: "haute",
          sourceExcerpt: "TTC 80",
        },
      },
    };
    rerender();

    await waitFor(() => expect(result.current.values.itemCode).toBe("gaz"));
    expect(result.current.values.amountInclVat).toBe("80.00");
    expect(result.current.ai).toMatchObject({
      type: true,
      amount: true,
      amountConfirmed: false,
      detectedAmount: "80.00",
      supplier: "EDF",
      confidence: "haute",
    });
    expect(result.current.amountConfirmationPending).toBe(true);
    expect(toastMessages()).toContain(
      "Des champs ont été pré-remplis par l’IA. Vérifiez-les avant d’ajouter le frais.",
    );

    const toastCount = toastMessages().length;
    rerender();
    expect(toastMessages().length).toBe(toastCount);
  });

  it("ignores foreign currencies, the rent type and unknown confidence", async () => {
    await uploadReceipt();
    const { result, rerender } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    act(() => result.current.changeType("eau"));
    resetDraft([line({ key: "internet-1", itemCode: "internet" })]);

    analysisState = {
      status: "done",
      analysis: {
        id: 12,
        receiptId: 9,
        result: {
          suggestedType: "loyer",
          amountInclVat: "80.00",
          currency: "USD",
          confidence: "inconnue",
        },
      },
    };
    rerender();

    await waitFor(() => expect(result.current.ai.detectedAmount).toBeNull());
    expect(result.current.values.itemCode).toBe("eau");
    expect(result.current.values.amountInclVat).toBe("");
    expect(result.current.ai.confidence).toBeNull();
    expect(result.current.ai.type).toBe(false);
    expect(result.current.ai.amount).toBe(false);
  });

  it("does not apply an analysis of another receipt, without result or without items", async () => {
    await uploadReceipt();
    const { result, rerender } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });

    analysisState = {
      status: "done",
      analysis: {
        id: 13,
        receiptId: 999,
        result: { suggestedType: "gaz", currency: "EUR" },
      },
    };
    rerender();
    expect(result.current.values.itemCode).toBe("");

    analysisState = {
      status: "done",
      analysis: { id: 14, receiptId: 9 },
    };
    rerender();
    expect(result.current.ai.detectedAmount).toBeNull();

    analysisState = {
      status: "done",
      analysis: { id: undefined, receiptId: 9, result: { currency: "EUR" } },
    };
    rerender();
    itemsState = { ...readyQuery(ITEMS), data: undefined, isPending: true };
    rerender();
    expect(result.current.values.itemCode).toBe("");
  });

  it("keeps the current type and prorata when a type is already set", async () => {
    await uploadReceipt();
    const { result, rerender } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    act(() => result.current.changeType("eau"));

    analysisState = {
      status: "done",
      analysis: {
        id: 15,
        receiptId: 9,
        result: {
          suggestedType: "gaz",
          amountInclVat: "55.00",
          currency: "EUR",
          confidence: "moyenne",
        },
      },
    };
    rerender();

    await waitFor(() =>
      expect(result.current.values.amountInclVat).toBe("55.00"),
    );
    expect(result.current.values.itemCode).toBe("eau");
    expect(result.current.values.proRataPct).toBe("0");
    expect(result.current.ai.type).toBe(false);
    expect(result.current.ai.amount).toBe(true);

    act(() => result.current.markAmountEdited());
    expect(result.current.ai.amount).toBe(false);
    expect(result.current.ai.amountConfirmed).toBe(true);
    act(() => result.current.confirmAmount());
    expect(result.current.ai.amountConfirmed).toBe(true);
  });
});

describe("useExpenseStatementPage save", () => {
  it("adds a manual line and resets the form", async () => {
    vi.mocked(api.receipts.upload).mockResolvedValue({
      id: 9,
      fileName: "facture.pdf",
    });
    const { result } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    act(() => result.current.changeType("gaz"));

    act(() =>
      result.current.saveExpense({
        itemCode: "gaz",
        amountInclVat: "80,50",
        proRataPct: "100",
      }),
    );

    const lines = useStatementDraft.getState().linesByMonth[MONTH];
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      itemCode: "gaz",
      amountInclVat: "80.50",
      receiptId: 9,
      amountSource: "MANUAL",
    });
    expect(toastMessages()).toContain("Frais ajouté.");
    expect(result.current.receipt).toBeNull();
    expect(result.current.values.itemCode).toBe("");
  });

  it("updates an edited line instead of adding one", () => {
    resetDraft([
      line({ key: "edit-me", amountInclVat: "80.00", receiptId: 55 }),
    ]);
    const { result } = renderController();

    act(() =>
      result.current.editLine(
        useStatementDraft.getState().linesByMonth[MONTH][0],
      ),
    );
    act(() =>
      result.current.saveExpense({
        itemCode: "gaz",
        amountInclVat: "95,00",
        proRataPct: "100",
      }),
    );

    const lines = useStatementDraft.getState().linesByMonth[MONTH];
    expect(lines).toHaveLength(1);
    expect(lines[0].amountInclVat).toBe("95.00");
    expect(toastMessages()).toContain("Frais modifié.");
  });

  it("refuses an unconfirmed AI amount", async () => {
    vi.mocked(api.receipts.upload).mockResolvedValue({ id: 9 });
    const { result, rerender } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    analysisState = {
      status: "done",
      analysis: {
        id: 16,
        receiptId: 9,
        result: {
          suggestedType: "gaz",
          amountInclVat: "80.00",
          currency: "EUR",
        },
      },
    };
    rerender();
    await waitFor(() => expect(result.current.ai.amount).toBe(true));

    act(() =>
      result.current.saveExpense({
        itemCode: "gaz",
        amountInclVat: "80,00",
        proRataPct: "100",
      }),
    );
    expect(useStatementDraft.getState().linesByMonth[MONTH]).toBeUndefined();
    expect(toastMessages()).toContain(
      "Confirmez le montant détecté par IA avant d’ajouter le frais.",
    );

    act(() => result.current.confirmAmount());
    act(() =>
      result.current.saveExpense({
        itemCode: "gaz",
        amountInclVat: "80,00",
        proRataPct: "100",
      }),
    );
    const lines = useStatementDraft.getState().linesByMonth[MONTH];
    expect(lines[0].amountSource).toBe("AI");
    expect(lines[0].aiDetectedAmount).toBe("80.00");
  });

  it("sets form and file errors for unsupported saves", async () => {
    vi.mocked(api.receipts.upload).mockResolvedValue({ id: 9 });
    resetDraft([line({ key: "internet-1", itemCode: "internet" })]);
    const { result, rerender } = renderController();
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });

    act(() =>
      result.current.saveExpense({
        itemCode: "unknown",
        amountInclVat: "10,00",
        proRataPct: "100",
      }),
    );
    expect(result.current.errors.itemCode?.message).toBe(
      "Sélectionnez un type de frais.",
    );

    act(() =>
      result.current.saveExpense({
        itemCode: "internet",
        amountInclVat: "10,00",
        proRataPct: "50",
      }),
    );
    expect(result.current.errors.itemCode?.message).toBe(
      "Ce type est déjà présent. Modifiez la ligne existante ou autorisez plusieurs lignes.",
    );

    rentReceiptState = readyQuery(
      null as unknown as { id: number; total: string },
    );
    rerender();
    act(() =>
      result.current.saveExpense({
        itemCode: "loyer",
        amountInclVat: "10,00",
        proRataPct: "100",
      }),
    );
    expect(result.current.fileError).toBe(
      "Ajoutez d’abord la quittance du mois pour utiliser ce type.",
    );

    act(() => result.current.removeFile());
    act(() =>
      result.current.saveExpense({
        itemCode: "gaz",
        amountInclVat: "10,00",
        proRataPct: "100",
      }),
    );
    expect(result.current.fileError).toBe(
      "Le justificatif est obligatoire pour ce type de frais.",
    );

    vi.mocked(api.receipts.upload).mockResolvedValue({ id: 10 });
    await act(async () => {
      await result.current.upload(new File(["a"], "a.pdf"));
    });
    const before = useStatementDraft.getState().linesByMonth[MONTH];
    act(() =>
      result.current.saveExpense({
        itemCode: "gaz",
        amountInclVat: "abc",
        proRataPct: "100",
      }),
    );
    expect(useStatementDraft.getState().linesByMonth[MONTH]).toEqual(before);
  });

  it("saves a rent line without a receipt and disables duplicate options", () => {
    resetDraft([
      line({ key: "internet-1", itemCode: "internet" }),
      line({ key: "rent-1", itemCode: "loyer", receiptId: null }),
    ]);
    const { result } = renderController();

    expect(result.current.optionDisabled(ITEMS[2])).toBe(true);
    expect(result.current.optionDisabled(ITEMS[1])).toBe(false);

    act(() =>
      result.current.editLine(
        useStatementDraft.getState().linesByMonth[MONTH][1],
      ),
    );
    expect(result.current.optionDisabled(ITEMS[2])).toBe(true);

    act(() =>
      result.current.saveExpense({
        itemCode: "loyer",
        amountInclVat: "1300,00",
        proRataPct: "100",
      }),
    );
    const lines = useStatementDraft.getState().linesByMonth[MONTH];
    expect(lines.map((item) => item.itemCode)).toEqual(["internet", "loyer"]);
    const rentLine = lines[1];
    expect(rentLine.receiptId).toBeNull();
  });

  it("removes a line and resets the edition when needed", () => {
    resetDraft([line({ key: "remove-me" })]);
    const { result } = renderController();
    const target = useStatementDraft.getState().linesByMonth[MONTH][0];

    act(() => result.current.setLineToRemove(target));
    act(() => result.current.removeLine());

    expect(useStatementDraft.getState().linesByMonth[MONTH]).toHaveLength(0);
    expect(toastMessages()).toContain("Frais supprimé.");
    expect(result.current.lineToRemove).toBeNull();
  });

  it("ignores removeLine without a selected line", () => {
    const { result } = renderController();
    act(() => result.current.removeLine());
    expect(result.current.lineToRemove).toBeNull();
  });
});

describe("useExpenseStatementPage calculation, preview and generation", () => {
  it("calculates the lines, builds the preview request and loads it", async () => {
    resetDraft([line()]);
    const { result } = renderController();

    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });
    expect(api.expenseStatements.calculate).toHaveBeenCalledWith(
      {
        companyId: 1,
        month: MONTH,
        lines: [
          expect.objectContaining({
            itemCode: "gaz",
            amountInclVat: "80.00",
            proRataPct: "100",
          }),
        ],
      },
      expect.anything(),
    );
    expect(result.current.calculation?.total).toBe("80.00");
    expect(result.current.calculationInProgress).toBe(false);
    expect(result.current.previewRequest).toEqual({
      companyId: 1,
      month: MONTH,
      complete: true,
      lines: [
        {
          itemCode: "gaz",
          amountInclVat: "80.00",
          proRataPct: "100",
          amountSource: "MANUAL",
        },
      ],
      templateId: 5,
      signatureId: 4,
    });
    expect(lastPreviewOptions?.active).toBe(true);

    await lastPreviewLoader?.(new AbortController().signal);
    expect(api.expenseStatements.preview).toHaveBeenCalledWith(
      result.current.previewRequest,
      expect.anything(),
    );
  });

  it("honours the complete flag and the chosen signature", () => {
    useStatementDraft.setState({
      month: MONTH,
      linesByMonth: { [MONTH]: [line()] },
      templatesByMonth: {},
      completeByMonth: { [MONTH]: false },
      primedReceiptByMonth: {},
      dirtyByMonth: {},
    });
    const { result } = renderController();

    act(() => result.current.setChosenSignatureId(3));
    expect(result.current.previewRequest?.complete).toBe(false);
    expect(result.current.previewRequest?.signatureId).toBe(3);
  });

  it("rejects an inactive preview and reports invalid lines", async () => {
    renderController();

    expect(lastPreviewOptions?.active).toBe(false);
    await expect(
      lastPreviewLoader?.(new AbortController().signal),
    ).rejects.toMatchObject({ name: "AbortError" });

    resetDraft([line({ amountInclVat: "abc" })]);
    const invalid = renderController();
    await waitFor(() =>
      expect(invalid.result.current.calculationError).toBe(
        "Le montant TTC est invalide.",
      ),
    );
    expect(api.expenseStatements.calculate).not.toHaveBeenCalled();
    expect(invalid.result.current.calculationInProgress).toBe(false);
  });

  it("reports an invalid prorata and a backend calculation failure", async () => {
    resetDraft([line({ proRataPct: "abc" })]);
    const invalid = renderController();
    await waitFor(() =>
      expect(invalid.result.current.calculationError).toBe(
        "Le prorata est invalide.",
      ),
    );

    resetDraft([line()]);
    vi.mocked(api.expenseStatements.calculate).mockRejectedValue(
      new Error("Calcul refusé"),
    );
    const failed = renderController();
    await waitFor(() =>
      expect(failed.result.current.calculationError).toBe("Calcul refusé"),
    );
    expect(failed.result.current.calculationUpToDate).toBe(false);
  });

  it("generates a statement once the calculation is up to date", async () => {
    resetDraft([line()]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });

    act(() => result.current.requestGeneration());

    await waitFor(() => expect(result.current.result?.id).toBe(12));
    expect(api.expenseStatements.create).toHaveBeenCalledWith({
      companyId: 1,
      month: MONTH,
      lines: [
        {
          itemCode: "gaz",
          amountInclVat: "80.00",
          proRataPct: "100",
          amountSource: "MANUAL",
        },
      ],
      templateId: 5,
      signatureId: 4,
    });
    expect(toastMessages()).toContain(
      "Note de Janvier 2026 générée en version 2.",
    );
    expect(result.current.generationInProgress).toBe(false);
  });

  it("generates without a template and defaults the version to 1", async () => {
    templatesState = readyQuery([]);
    vi.mocked(api.expenseStatements.create).mockResolvedValue({
      id: 14,
      month: MONTH,
    });
    resetDraft([line()]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });

    await act(async () => {
      await result.current.generateStatement();
    });

    expect(api.expenseStatements.create).toHaveBeenCalledWith({
      companyId: 1,
      month: MONTH,
      lines: [
        {
          itemCode: "gaz",
          amountInclVat: "80.00",
          proRataPct: "100",
          amountSource: "MANUAL",
        },
      ],
      signatureId: 4,
    });
    expect(
      vi.mocked(api.expenseStatements.create).mock.calls[0][0],
    ).not.toHaveProperty("templateId");
    expect(toastMessages()).toContain(
      "Note de Janvier 2026 générée en version 1.",
    );
  });

  it("asks for confirmation when a statement version already exists", async () => {
    activeStatementState = readyQuery({ id: 1, version: 1 });
    resetDraft([line()]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });

    act(() => result.current.requestGeneration());
    expect(result.current.regenerationDialog).toBe(true);
    expect(result.current.activeVersion).toBe(1);
    expect(api.expenseStatements.create).not.toHaveBeenCalled();

    act(() => result.current.setRegenerationDialog(false));
    expect(result.current.regenerationDialog).toBe(false);
  });

  it("refuses to generate without signature, lines or up-to-date calculation", async () => {
    signaturesState = readyQuery([]);
    resetDraft([line()]);
    const { result } = renderController();
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });

    await act(async () => {
      await result.current.generateStatement();
    });
    expect(api.expenseStatements.create).not.toHaveBeenCalled();
    expect(result.current.signatureAvailable).toBe(false);

    resetDraft([]);
    const empty = renderController();
    await act(async () => {
      await empty.result.current.generateStatement();
    });
    expect(api.expenseStatements.create).not.toHaveBeenCalled();
  });

  it("reports a generation failure and cancels the analysis", async () => {
    resetDraft([line()]);
    vi.mocked(api.expenseStatements.create).mockRejectedValue(
      new Error("Génération refusée"),
    );
    const { result } = renderController();
    await waitFor(() => expect(result.current.calculationUpToDate).toBe(true), {
      timeout: 2000,
    });

    await act(async () => {
      await result.current.generateStatement();
    });
    expect(toastMessages()).toContain("Génération refusée");
    expect(result.current.generationInProgress).toBe(false);

    act(() => result.current.cancelAnalysis());
    expect(cancelMock).toHaveBeenCalled();
  });

  it("downloads the note or the complete archive with fallback names", async () => {
    const { result } = renderController();

    await act(async () => {
      await result.current.downloadStatement({ id: 12, month: MONTH }, false);
    });
    expect(api.expenseStatements.pdf).toHaveBeenCalledWith(12, false);
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "note_frais_2026-01.pdf",
    );

    await act(async () => {
      await result.current.downloadStatement({ id: 12 }, true);
    });
    expect(api.expenseStatements.zip).toHaveBeenCalledWith(12);
    expect(downloadBlob).toHaveBeenLastCalledWith(
      expect.any(Blob),
      "pieces.zip",
    );

    await act(async () => {
      await result.current.downloadStatement({ month: MONTH }, false);
    });
    expect(api.expenseStatements.pdf).toHaveBeenCalledTimes(1);

    vi.mocked(api.expenseStatements.pdf).mockRejectedValue(
      new Error("PDF indisponible"),
    );
    await act(async () => {
      await result.current.downloadStatement({ id: 12, month: MONTH }, false);
    });
    expect(toastMessages()).toContain("PDF indisponible");
  });

  it("estimates the retained amount from the current form values", () => {
    const { result } = renderController();
    act(() => result.current.changeType("internet"));
    expect(result.current.displayedRetainedAmount).toBe("—");

    act(() =>
      result.current.saveExpense({
        itemCode: "internet",
        amountInclVat: "100,00",
        proRataPct: "50",
      }),
    );
    expect(result.current.displayedRetainedAmount).toBe("—");
  });
});
