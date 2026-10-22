import { requete, requeteBlob, type ReponseBlob } from './client';
import type {
  AnalyseDto,
  AnalyseStartResponse,
  BrouillonDto,
  CalculResponse,
  JustificatifDto,
  LlmConfigDto,
  LlmConfigRequest,
  LlmModelDto,
  LlmStatusDto,
  LlmTestResponse,
  NoteApercuRequest,
  NoteCalculRequest,
  NoteDto,
  NoteGenerationRequest,
  ParametresDto,
  ParametresRequest,
  PosteDto,
  PosteRequest,
  QuittanceDto,
  QuittanceRequest,
  TemplateDto,
  TemplateVariableDto,
  TypeTemplate,
} from './types';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function json(init: RequestInit): RequestInit {
  return { ...init, headers: JSON_HEADERS };
}

export const api = {
  parametres: {
    obtenir: () => requete<ParametresDto>('/api/parametres'),
    enregistrer: (corps: ParametresRequest) =>
      requete<ParametresDto>('/api/parametres', json({ method: 'PUT', body: JSON.stringify(corps) })),
  },

  postes: {
    lister: (tous = false) => requete<PosteDto[]>(`/api/postes?tous=${tous}`),
    creer: (corps: PosteRequest) =>
      requete<PosteDto>('/api/postes', json({ method: 'POST', body: JSON.stringify(corps) })),
    modifier: (id: number, corps: PosteRequest) =>
      requete<PosteDto>(`/api/postes/${id}`, json({ method: 'PUT', body: JSON.stringify(corps) })),
    supprimer: (id: number) => requete<void>(`/api/postes/${id}`, { method: 'DELETE' }),
  },

  quittances: {
    lister: (mois?: string) =>
      requete<QuittanceDto[]>(`/api/quittances${mois ? `?mois=${encodeURIComponent(mois)}` : ''}`),
    active: async (mois: string): Promise<QuittanceDto | null> => {
      const resultat = await requete<QuittanceDto | undefined>(
        `/api/quittances/active?mois=${encodeURIComponent(mois)}`,
      );
      return resultat ?? null;
    },
    generer: (corps: QuittanceRequest) =>
      requete<QuittanceDto>('/api/quittances', json({ method: 'POST', body: JSON.stringify(corps) })),
    apercu: (corps: QuittanceRequest, signal?: AbortSignal): Promise<ReponseBlob> =>
      requeteBlob('/api/quittances/apercu', json({ method: 'POST', body: JSON.stringify(corps), signal })),
    pdf: (id: number): Promise<ReponseBlob> => requeteBlob(`/api/quittances/${id}/pdf`),
    urlPdf: (id: number) => `/api/quittances/${id}/pdf`,
  },

  notes: {
    lister: (mois?: string) =>
      requete<NoteDto[]>(`/api/notes-frais${mois ? `?mois=${encodeURIComponent(mois)}` : ''}`),
    active: async (mois: string): Promise<NoteDto | null> => {
      const resultat = await requete<NoteDto | undefined>(
        `/api/notes-frais/active?mois=${encodeURIComponent(mois)}`,
      );
      return resultat ?? null;
    },
    brouillon: (mois: string) =>
      requete<BrouillonDto>(`/api/notes-frais/brouillon?mois=${encodeURIComponent(mois)}`, {
        method: 'POST',
      }),
    calculer: (corps: NoteCalculRequest, signal?: AbortSignal) =>
      requete<CalculResponse>(
        '/api/notes-frais/calcul',
        json({ method: 'POST', body: JSON.stringify(corps), signal }),
      ),
    apercu: (corps: NoteApercuRequest, signal?: AbortSignal): Promise<ReponseBlob> =>
      requeteBlob('/api/notes-frais/apercu', json({ method: 'POST', body: JSON.stringify(corps), signal })),
    generer: (corps: NoteGenerationRequest) =>
      requete<NoteDto>('/api/notes-frais', json({ method: 'POST', body: JSON.stringify(corps) })),
    pdf: (id: number, complet: boolean): Promise<ReponseBlob> =>
      requeteBlob(`/api/notes-frais/${id}/pdf?complet=${complet}`),
    urlPdf: (id: number, complet: boolean) => `/api/notes-frais/${id}/pdf?complet=${complet}`,
  },

  justificatifs: {
    uploader: (fichier: File): Promise<JustificatifDto> => {
      const donnees = new FormData();
      donnees.append('fichier', fichier);
      return requete<JustificatifDto>('/api/justificatifs', { method: 'POST', body: donnees });
    },
    supprimer: (id: number) => requete<void>(`/api/justificatifs/${id}`, { method: 'DELETE' }),
    urlFichier: (id: number) => `/api/justificatifs/${id}/fichier`,
  },

  analyses: {
    demarrer: (justificatifId: number) =>
      requete<AnalyseStartResponse>(`/api/justificatifs/${justificatifId}/analyse`, {
        method: 'POST',
      }),
    obtenir: (id: number, signal?: AbortSignal) =>
      requete<AnalyseDto>(`/api/analyses/${id}`, { signal }),
    annuler: (id: number) => requete<AnalyseDto>(`/api/analyses/${id}`, { method: 'DELETE' }),
  },

  llm: {
    obtenir: () => requete<LlmConfigDto>('/api/admin/llm'),
    enregistrer: (corps: LlmConfigRequest) =>
      requete<LlmConfigDto>('/api/admin/llm', json({ method: 'PUT', body: JSON.stringify(corps) })),
    modeles: () => requete<LlmModelDto[]>('/api/admin/llm/models'),
    tester: () => requete<LlmTestResponse>('/api/admin/llm/test', { method: 'POST' }),
    statut: () => requete<LlmStatusDto>('/api/admin/llm/status'),
    promptDefaut: () => requete<{ prompt?: string }>('/api/admin/llm/prompt-defaut'),
  },

  templates: {
    lister: (type: TypeTemplate) => requete<TemplateDto[]>(`/api/templates?type=${type}`),
    variables: (type: TypeTemplate) =>
      requete<TemplateVariableDto[]>(`/api/templates/variables?type=${type}`),
    uploader: (type: TypeTemplate, nom: string, fichier: File): Promise<TemplateDto> => {
      const donnees = new FormData();
      donnees.append('type', type);
      donnees.append('nom', nom);
      donnees.append('fichier', fichier);
      return requete<TemplateDto>('/api/templates', { method: 'POST', body: donnees });
    },
    activer: (id: number) =>
      requete<TemplateDto>(`/api/templates/${id}/activer`, { method: 'POST' }),
    apercu: (id: number): Promise<ReponseBlob> =>
      requeteBlob(`/api/templates/${id}/apercu`, { method: 'POST' }),
    fichier: (id: number): Promise<ReponseBlob> => requeteBlob(`/api/templates/${id}/fichier`),
    supprimer: (id: number) => requete<void>(`/api/templates/${id}`, { method: 'DELETE' }),
    defaut: (type: TypeTemplate): Promise<ReponseBlob> =>
      requeteBlob(`/api/templates/defaut/${type}`),
    reinitialiser: (type: TypeTemplate) =>
      requete<TemplateDto>(`/api/templates/defaut/${type}`, { method: 'POST' }),
  },
};
