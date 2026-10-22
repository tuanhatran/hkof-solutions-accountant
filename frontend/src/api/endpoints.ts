import { request, blobRequest, type ResponseBlob } from './client';
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
  StatementCalculRequest,
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
} from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(init: RequestInit): RequestInit {
  return { ...init, headers: JSON_HEADERS };
}

export const api = {
  parametres: {
    obtenir: () => request<SettingsDto>('/api/parametres'),
    enregistrer: (requestBody: SettingsRequest) =>
      request<SettingsDto>('/api/parametres', json({ method: 'PUT', body: JSON.stringify(requestBody) })),
  },

  postes: {
    lister: (all = false) => request<ExpenseItemDto[]>(`/api/postes?tous=${all}`),
    creer: (requestBody: ExpenseItemRequest) =>
      request<ExpenseItemDto>('/api/postes', json({ method: 'POST', body: JSON.stringify(requestBody) })),
    modifier: (id: number, requestBody: ExpenseItemRequest) =>
      request<ExpenseItemDto>(`/api/postes/${id}`, json({ method: 'PUT', body: JSON.stringify(requestBody) })),
    supprimer: (id: number) => request<void>(`/api/postes/${id}`, { method: 'DELETE' }),
  },

  quittances: {
    lister: (month?: string) =>
      request<RentReceiptDto[]>(`/api/quittances${month ? `?mois=${encodeURIComponent(month)}` : ''}`),
    active: async (month: string): Promise<RentReceiptDto | null> => {
      const result = await request<RentReceiptDto | undefined>(
        `/api/quittances/active?mois=${encodeURIComponent(month)}`,
      );
      return result ?? null;
    },
    generer: (requestBody: RentReceiptRequest) =>
      request<RentReceiptDto>('/api/quittances', json({ method: 'POST', body: JSON.stringify(requestBody) })),
    apercu: (requestBody: RentReceiptRequest, signal?: AbortSignal): Promise<ResponseBlob> =>
      blobRequest('/api/quittances/apercu', json({ method: 'POST', body: JSON.stringify(requestBody), signal })),
    pdf: (id: number): Promise<ResponseBlob> => blobRequest(`/api/quittances/${id}/pdf`),
    urlPdf: (id: number) => `/api/quittances/${id}/pdf`,
  },

  notes: {
    lister: (month?: string) =>
      request<StatementDto[]>(`/api/notes-frais${month ? `?mois=${encodeURIComponent(month)}` : ''}`),
    active: async (month: string): Promise<StatementDto | null> => {
      const result = await request<StatementDto | undefined>(
        `/api/notes-frais/active?mois=${encodeURIComponent(month)}`,
      );
      return result ?? null;
    },
    brouillon: (month: string) =>
      request<DraftDto>(`/api/notes-frais/brouillon?mois=${encodeURIComponent(month)}`, {
        method: 'POST',
      }),
    calculer: (requestBody: StatementCalculRequest, signal?: AbortSignal) =>
      request<CalculationResponse>(
        '/api/notes-frais/calcul',
        json({ method: 'POST', body: JSON.stringify(requestBody), signal }),
      ),
    apercu: (requestBody: StatementPreviewRequest, signal?: AbortSignal): Promise<ResponseBlob> =>
      blobRequest('/api/notes-frais/apercu', json({ method: 'POST', body: JSON.stringify(requestBody), signal })),
    generer: (requestBody: StatementGenerationRequest) =>
      request<StatementDto>('/api/notes-frais', json({ method: 'POST', body: JSON.stringify(requestBody) })),
    pdf: (id: number, complete: boolean): Promise<ResponseBlob> =>
      blobRequest(`/api/notes-frais/${id}/pdf?complet=${complete}`),
    urlPdf: (id: number, complete: boolean) => `/api/notes-frais/${id}/pdf?complet=${complete}`,
  },

  justificatifs: {
    uploader: (file: File): Promise<ReceiptDto> => {
      const payload = new FormData();
      payload.append('fichier', file);
      return request<ReceiptDto>('/api/justificatifs', { method: 'POST', body: payload });
    },
    supprimer: (id: number) => request<void>(`/api/justificatifs/${id}`, { method: 'DELETE' }),
    urlFichier: (id: number) => `/api/justificatifs/${id}/fichier`,
  },

  analyses: {
    demarrer: (receiptId: number) =>
      request<AnalysisStartResponse>(`/api/justificatifs/${receiptId}/analyse`, {
        method: 'POST',
      }),
    obtenir: (id: number, signal?: AbortSignal) =>
      request<AnalysisDto>(`/api/analyses/${id}`, { signal }),
    annuler: (id: number) => request<AnalysisDto>(`/api/analyses/${id}`, { method: 'DELETE' }),
  },

  llm: {
    obtenir: () => request<LlmConfigDto>('/api/admin/llm'),
    enregistrer: (requestBody: LlmConfigRequest) =>
      request<LlmConfigDto>('/api/admin/llm', json({ method: 'PUT', body: JSON.stringify(requestBody) })),
    modeles: () => request<LlmModelDto[]>('/api/admin/llm/models'),
    tester: () => request<LlmTestResponse>('/api/admin/llm/test', { method: 'POST' }),
    statut: () => request<LlmStatusDto>('/api/admin/llm/status'),
    promptDefaut: () => request<{ prompt?: string }>('/api/admin/llm/prompt-defaut'),
  },

  templates: {
    lister: (type: TemplateType) => request<TemplateDto[]>(`/api/templates?type=${type}`),
    variables: (type: TemplateType) =>
      request<TemplateVariableDto[]>(`/api/templates/variables?type=${type}`),
    uploader: (type: TemplateType, name: string, file: File): Promise<TemplateDto> => {
      const payload = new FormData();
      payload.append('type', type);
      payload.append('nom', name);
      payload.append('fichier', file);
      return request<TemplateDto>('/api/templates', { method: 'POST', body: payload });
    },
    activer: (id: number) =>
      request<TemplateDto>(`/api/templates/${id}/activer`, { method: 'POST' }),
    apercu: (id: number): Promise<ResponseBlob> =>
      blobRequest(`/api/templates/${id}/apercu`, { method: 'POST' }),
    fichier: (id: number): Promise<ResponseBlob> => blobRequest(`/api/templates/${id}/fichier`),
    supprimer: (id: number) => request<void>(`/api/templates/${id}`, { method: 'DELETE' }),
    defaut: (type: TemplateType): Promise<ResponseBlob> =>
      blobRequest(`/api/templates/defaut/${type}`),
    reinitialiser: (type: TemplateType) =>
      request<TemplateDto>(`/api/templates/defaut/${type}`, { method: 'POST' }),
  },
};
