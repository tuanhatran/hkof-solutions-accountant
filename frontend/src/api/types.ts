import type { components } from './schema';

type Schemas = components['schemas'];

export type SettingsDto = Schemas['ParametresDto'];
export type SettingsRequest = Schemas['ParametresRequest'];
export type ExpenseItemDto = Schemas['PosteDto'];
export type ExpenseItemRequest = Schemas['PosteRequest'];
export type RentReceiptDto = Schemas['QuittanceDto'];
export type RentReceiptRequest = Schemas['QuittanceRequest'];
export type LineRequest = Schemas['LigneRequest'];
export type LineDto = Schemas['LigneDto'];
export type StatementDto = Schemas['NoteDto'];
export type StatementCalculRequest = Schemas['NoteCalculRequest'];
export type StatementGenerationRequest = Schemas['NoteGenerationRequest'];
export type StatementPreviewRequest = Schemas['NoteApercuRequest'];
export type CalculationResponse = Schemas['CalculResponse'];
export type DraftDto = Schemas['BrouillonDto'];
export type ReceiptDto = Schemas['JustificatifDto'];
export type AnalysisDto = Schemas['AnalyseDto'];
export type ExtractionDto = Schemas['ExtractionDto'];
export type AnalysisStartResponse = Schemas['AnalyseStartResponse'];
export type LlmConfigDto = Schemas['LlmConfigDto'];
export type LlmConfigRequest = Schemas['LlmConfigRequest'];
export type LlmModelDto = Schemas['LlmModelDto'];
export type LlmStatusDto = Schemas['LlmStatusDto'];
export type LlmTestResponse = Schemas['LlmTestResponse'];
export type TemplateDto = Schemas['TemplateDto'];
export type TemplateVariableDto = Schemas['TemplateVariableDto'];
export type ValidationReportDto = Schemas['RapportValidationDto'];

export type TemplateType = 'QUITTANCE' | 'NOTE_FRAIS';
export type AnalysisStatus = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ECHEC' | 'ANNULEE';
export type AiConfidence = 'haute' | 'moyenne' | 'basse';
export type SourceMontant = 'MANUAL' | 'AI';
export type Periodicity = 'MENSUELLE' | 'BIMESTRIELLE' | 'TRIMESTRIELLE' | 'ANNUELLE';
export type LlmStatus = 'PRET' | 'PRET_DISTANT' | 'MODELE_ABSENT' | 'INJOIGNABLE' | 'DESACTIVE';
