import { request, blobRequest, type ResponseBlob } from "./client";
import type { components } from "./schema";

type Schemas = components["schemas"];
export type RentReceiptDraftRequest = Schemas["RentReceiptDraftRequest"];
export type RentReceiptDraftDto = Schemas["RentReceiptDraftDto"];
export type StatementDraftRequest = Schemas["StatementDraftRequest"];
export type StatementDraftDto = Schemas["StatementDraftDto"];
export type CurrentUserDto = Schemas["CurrentUserDto"];
export type LoginRequest = Schemas["LoginRequest"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type ConfirmEmailRequest = Schemas["ConfirmEmailRequest"];
export type ResendConfirmationRequest = Schemas["ResendConfirmationRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];
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
  CompanyDto,
  CompanyRequest,
  EmployeeDto,
  EmployeeRequest,
  AddressDto,
  PersonDto,
  PersonRequest,
  LeaseDto,
  LeaseRequest,
  ExpenseItemDto,
  ExpenseItemRequest,
  RentReceiptDto,
  RentReceiptRequest,
  SignatureDto,
  TemplateDto,
  TemplateVariableDto,
  TemplateType,
} from "./types";

const JSON_HEADERS = { "Content-Type": "application/json" };

function json(init: RequestInit): RequestInit {
  return { ...init, headers: JSON_HEADERS };
}

function query(
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const serialized = search.toString();
  return serialized ? `?${serialized}` : "";
}

export const api = {
  auth: {
    me: () => request<CurrentUserDto>("/api/auth/me"),
    login: (body: LoginRequest) =>
      request<CurrentUserDto>(
        "/api/auth/login",
        json({ method: "POST", body: JSON.stringify(body) }),
      ),
    register: (body: RegisterRequest) =>
      request<void>(
        "/api/auth/register",
        json({ method: "POST", body: JSON.stringify(body) }),
      ),
    confirmEmail: (body: ConfirmEmailRequest) =>
      request<void>(
        "/api/auth/confirm-email",
        json({ method: "POST", body: JSON.stringify(body) }),
      ),
    resendConfirmation: (body: ResendConfirmationRequest) =>
      request<void>(
        "/api/auth/resend-confirmation",
        json({ method: "POST", body: JSON.stringify(body) }),
      ),
    changePassword: (body: ChangePasswordRequest) =>
      request<CurrentUserDto>(
        "/api/auth/change-password",
        json({ method: "POST", body: JSON.stringify(body) }),
      ),
    logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  },

  companies: {
    list: () => request<CompanyDto[]>("/api/companies"),
    get: (id: number) => request<CompanyDto>(`/api/companies/${id}`),
    create: (requestBody: CompanyRequest) =>
      request<CompanyDto>(
        "/api/companies",
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    update: (id: number, requestBody: CompanyRequest) =>
      request<CompanyDto>(
        `/api/companies/${id}`,
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    delete: (id: number) =>
      request<void>(`/api/companies/${id}`, { method: "DELETE" }),
  },

  employees: {
    list: (companyId: number) =>
      request<EmployeeDto[]>(`/api/companies/${companyId}/employees`),
    create: (companyId: number, requestBody: EmployeeRequest) =>
      request<EmployeeDto>(
        `/api/companies/${companyId}/employees`,
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    update: (id: number, requestBody: EmployeeRequest) =>
      request<EmployeeDto>(
        `/api/employees/${id}`,
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    delete: (id: number) =>
      request<void>(`/api/employees/${id}`, { method: "DELETE" }),
  },

  persons: {
    list: () => request<PersonDto[]>("/api/persons"),
    create: (requestBody: PersonRequest) =>
      request<PersonDto>(
        "/api/persons",
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    update: (id: number, requestBody: PersonRequest) =>
      request<PersonDto>(
        `/api/persons/${id}`,
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    remove: (id: number) =>
      request<void>(`/api/persons/${id}`, { method: "DELETE" }),
  },

  addresses: {
    list: () => request<AddressDto[]>("/api/addresses"),
  },

  leases: {
    list: () => request<LeaseDto[]>("/api/leases"),
    create: (requestBody: LeaseRequest) =>
      request<LeaseDto>(
        "/api/leases",
        json({ method: "POST", body: JSON.stringify(requestBody) }),
      ),
    update: (id: number, requestBody: LeaseRequest) =>
      request<LeaseDto>(
        `/api/leases/${id}`,
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    delete: (id: number) =>
      request<void>(`/api/leases/${id}`, { method: "DELETE" }),
  },

  expenseItems: {
    list: (companyId: number, all = false, leaseId?: number | null) =>
      request<ExpenseItemDto[]>(
        `/api/expense-items${query({ companyId, leaseId, all })}`,
      ),
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
    list: (companyId?: number | null, month?: string) =>
      request<RentReceiptDto[]>(
        `/api/rent-receipts${query({ companyId, month })}`,
      ),
    active: async (
      month: string,
      companyId?: number | null,
      landlordId?: number | null,
      tenantId?: number | null,
      tenantCompanyId?: number | null,
    ): Promise<RentReceiptDto | null> => {
      const result = await request<RentReceiptDto | undefined>(
        `/api/rent-receipts/active${query({ month, companyId, landlordId, tenantId, tenantCompanyId })}`,
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
    list: (companyId: number, month?: string, leaseId?: number | null) =>
      request<StatementDto[]>(
        `/api/expense-statements${query({ companyId, month, leaseId })}`,
      ),
    active: async (
      companyId: number,
      month: string,
      leaseId?: number | null,
    ): Promise<StatementDto | null> => {
      const result = await request<StatementDto | undefined>(
        `/api/expense-statements/active${query({ companyId, month, leaseId })}`,
      );
      return result ?? null;
    },
    draft: (companyId: number, month: string, leaseId?: number | null) =>
      request<DraftDto>(
        `/api/expense-statements/draft${query({ companyId, month, leaseId })}`,
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
    zip: (id: number): Promise<ResponseBlob> =>
      blobRequest(`/api/expense-statements/${id}/zip`),
    zipUrl: (id: number) => `/api/expense-statements/${id}/zip`,
  },

  drafts: {
    getRentReceipt: async (
      month: string,
      landlordId: number,
      tenantId?: number | null,
      tenantCompanyId?: number | null,
    ): Promise<RentReceiptDraftDto | null> => {
      const result = await request<RentReceiptDraftDto | undefined>(
        `/api/drafts/rent-receipts${query({ month, landlordId, tenantId, tenantCompanyId })}`,
      );
      return result ?? null;
    },
    saveRentReceipt: (requestBody: RentReceiptDraftRequest) =>
      request<RentReceiptDraftDto>(
        "/api/drafts/rent-receipts",
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    getStatement: async (
      companyId: number,
      month: string,
      leaseId?: number | null,
    ): Promise<StatementDraftDto | null> => {
      const result = await request<StatementDraftDto | undefined>(
        `/api/drafts/expense-statements${query({ companyId, month, leaseId })}`,
      );
      return result ?? null;
    },
    saveStatement: (requestBody: StatementDraftRequest) =>
      request<StatementDraftDto>(
        "/api/drafts/expense-statements",
        json({ method: "PUT", body: JSON.stringify(requestBody) }),
      ),
    delete: (id: number) =>
      request<void>(`/api/drafts/${id}`, { method: "DELETE" }),
  },

  signatures: {
    list: (personId?: number | null) =>
      request<SignatureDto[]>(`/api/signatures${query({ personId })}`),
    // The browser must set the multipart boundary: never set Content-Type here.
    create: (
      personId: number,
      name: string,
      file: File,
    ): Promise<SignatureDto> => {
      const payload = new FormData();
      payload.append("personId", String(personId));
      payload.append("name", name);
      payload.append("file", file);
      return request<SignatureDto>("/api/signatures", {
        method: "POST",
        body: payload,
      });
    },
    remove: (id: number) =>
      request<void>(`/api/signatures/${id}`, { method: "DELETE" }),
    imageUrl: (id: number) => `/api/signatures/${id}/image`,
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
