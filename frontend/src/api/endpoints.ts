import { request, blobRequest, type ResponseBlob } from "./client";
import type {
  AnalysisDto,
  AnalysisStartResponse,
  DraftDto,
  CalculationResponse,
  ReceiptDto,
  LlmConfigDto,
  LlmConfigRequest,
  LlmModelDto,
  LlmStatusDto,
  LlmTestResponse,
  StatementPreviewRequest,
  StatementCalculationRequest,
  StatementDto,
  StatementGenerationRequest,
  SettingsDto,
  SettingsRequest,
  ExpenseItemDto,
  ExpenseItemRequest,
  RentReceiptDto,
  RentReceiptRequest,
  TemplateDto,
  TemplateVariableDto,
  TemplateType,
} from "./types";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(init: RequestInit): RequestInit {
  return { ...init, headers: JSON_HEADERS };
}

export const api = {
  settings: {
    get: () => request<SettingsDto>("/api/settings"),
    update: (requestBody: SettingsRequest) =>
      request<SettingsDto>(
        "/api/settings",
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
  },

  expenseItems: {
    list: (all = false) =>
      request<ExpenseItemDto[]>(`/api/expense-items?all=${all}`),
    create: (requestBody: ExpenseItemRequest) =>
      request<ExpenseItemDto>(
        "/api/expense-items",
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    update: (id: number, requestBody: ExpenseItemRequest) =>
      request<ExpenseItemDto>(
        `/api/expense-items/${id}`,
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    delete: (id: number) =>
      request<void>(`/api/expense-items/${id}`, { method: "DELETE" }),
  },

  rentReceipts: {
    list: (month?: string) =>
      request<RentReceiptDto[]>(
        `/api/rent-receipts${month ? `?month=${encodeURIComponent(month)}` : ""}`,
      ),
    active: async (month: string): Promise<RentReceiptDto | null> => {
      const result = await request<RentReceiptDto | undefined>(
        `/api/rent-receipts/active?month=${encodeURIComponent(month)}`,
      );
      return result ?? null;
    },
    create: (requestBody: RentReceiptRequest) =>
      request<RentReceiptDto>(
        "/api/rent-receipts",
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    preview: (
      requestBody: RentReceiptRequest,
      signal?: AbortSignal,
    ): Promise<ResponseBlob> =>
      blobRequest(
        "/api/rent-receipts/preview",
        json({ method: "POST", body: JSON.stringify(requestBody), signal }),
      ),
    pdf: (id: number): Promise<ResponseBlob> =>
      blobRequest(`/api/rent-receipts/${id}/pdf`),
    pdfUrl: (id: number) => `/api/rent-receipts/${id}/pdf`,
  },

  expenseStatements: {
    list: (month?: string) =>
      request<StatementDto[]>(
        `/api/expense-statements${month ? `?month=${encodeURIComponent(month)}` : ""}`,
      ),
    active: async (month: string): Promise<StatementDto | null> => {
      const result = await request<StatementDto | undefined>(
        `/api/expense-statements/active?month=${encodeURIComponent(month)}`,
      );
      return result ?? null;
    },
    draft: (month: string) =>
      request<DraftDto>(
        `/api/expense-statements/draft?month=${encodeURIComponent(month)}`,
        {
          method: "POST",
        },
      ),
    calculate: (
      requestBody: StatementCalculationRequest,
      signal?: AbortSignal,
    ) =>
      request<CalculationResponse>(
        "/api/expense-statements/calculation",
        json({ method: "POST", body: JSON.stringify(requestBody), signal }),
      ),
    preview: (
      requestBody: StatementPreviewRequest,
      signal?: AbortSignal,
    ): Promise<ResponseBlob> =>
      blobRequest(
        "/api/expense-statements/preview",
        json({ method: "POST", body: JSON.stringify(requestBody), signal }),
      ),
    create: (requestBody: StatementGenerationRequest) =>
      request<StatementDto>(
        "/api/expense-statements",
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    pdf: (id: number, complete: boolean): Promise<ResponseBlob> =>
      blobRequest(`/api/expense-statements/${id}/pdf?complete=${complete}`),
    pdfUrl: (id: number, complete: boolean) =>
      `/api/expense-statements/${id}/pdf?complete=${complete}`,
  },

  receipts: {
    upload: (file: File): Promise<ReceiptDto> => {
      const payload = new FormData();
      payload.append("file", file);
      return request<ReceiptDto>("/api/receipts", {
        method: "POST",
        body: payload,
      });
    },
    delete: (id: number) =>
      request<void>(`/api/receipts/${id}`, { method: "DELETE" }),
    fileUrl: (id: number) => `/api/receipts/${id}/file`,
  },

  analyses: {
    start: (receiptId: number) =>
      request<AnalysisStartResponse>(`/api/receipts/${receiptId}/analysis`, {
        method: "POST",
      }),
    get: (id: number, signal?: AbortSignal) =>
      request<AnalysisDto>(`/api/analyses/${id}`, { signal }),
    cancel: (id: number) =>
      request<AnalysisDto>(`/api/analyses/${id}`, { method: "DELETE" }),
  },

  llm: {
    get: () => request<LlmConfigDto>("/api/admin/llm"),
    update: (requestBody: LlmConfigRequest) =>
      request<LlmConfigDto>(
        "/api/admin/llm",
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    models: () => request<LlmModelDto[]>("/api/admin/llm/models"),
    test: () =>
      request<LlmTestResponse>("/api/admin/llm/test", { method: "POST" }),
    status: () => request<LlmStatusDto>("/api/admin/llm/status"),
    defaultPrompt: () =>
      request<{ prompt?: string }>("/api/admin/llm/default-prompt"),
  },

  templates: {
    list: (type: TemplateType) =>
      request<TemplateDto[]>(`/api/templates?type=${type}`),
    variables: (type: TemplateType) =>
      request<TemplateVariableDto[]>(`/api/templates/variables?type=${type}`),
    upload: (
      type: TemplateType,
      name: string,
      file: File,
    ): Promise<TemplateDto> => {
      const payload = new FormData();
      payload.append("type", type);
      payload.append("name", name);
      payload.append("file", file);
      return request<TemplateDto>("/api/templates", {
        method: "POST",
        body: payload,
      });
    },
    activate: (id: number) =>
      request<TemplateDto>(`/api/templates/${id}/activate`, { method: "POST" }),
    preview: (id: number): Promise<ResponseBlob> =>
      blobRequest(`/api/templates/${id}/preview`, { method: "POST" }),
    file: (id: number): Promise<ResponseBlob> =>
      blobRequest(`/api/templates/${id}/file`),
    delete: (id: number) =>
      request<void>(`/api/templates/${id}`, { method: "DELETE" }),
    getDefault: (type: TemplateType): Promise<ResponseBlob> =>
      blobRequest(`/api/templates/default/${type}`),
    resetDefault: (type: TemplateType) =>
      request<TemplateDto>(`/api/templates/default/${type}`, {
        method: "POST",
      }),
  },
};
