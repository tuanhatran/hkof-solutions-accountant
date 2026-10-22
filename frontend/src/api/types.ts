import type { components } from './schema';

type Schemas = components['schemas'];

export type ParametresDto = Schemas['ParametresDto'];
export type ParametresRequest = Schemas['ParametresRequest'];
export type PosteDto = Schemas['PosteDto'];
export type PosteRequest = Schemas['PosteRequest'];
export type QuittanceDto = Schemas['QuittanceDto'];
export type QuittanceRequest = Schemas['QuittanceRequest'];
export type LigneRequest = Schemas['LigneRequest'];
export type LigneDto = Schemas['LigneDto'];
export type NoteDto = Schemas['NoteDto'];
export type NoteCalculRequest = Schemas['NoteCalculRequest'];
export type NoteGenerationRequest = Schemas['NoteGenerationRequest'];
export type NoteApercuRequest = Schemas['NoteApercuRequest'];
export type CalculResponse = Schemas['CalculResponse'];
export type BrouillonDto = Schemas['BrouillonDto'];
export type JustificatifDto = Schemas['JustificatifDto'];
export type AnalyseDto = Schemas['AnalyseDto'];
export type ExtractionDto = Schemas['ExtractionDto'];
export type AnalyseStartResponse = Schemas['AnalyseStartResponse'];
export type LlmConfigDto = Schemas['LlmConfigDto'];
export type LlmConfigRequest = Schemas['LlmConfigRequest'];
export type LlmModelDto = Schemas['LlmModelDto'];
export type LlmStatusDto = Schemas['LlmStatusDto'];
export type LlmTestResponse = Schemas['LlmTestResponse'];
export type TemplateDto = Schemas['TemplateDto'];
export type TemplateVariableDto = Schemas['TemplateVariableDto'];
export type RapportValidationDto = Schemas['RapportValidationDto'];

export type TypeTemplate = 'QUITTANCE' | 'NOTE_FRAIS';
export type StatutAnalyse = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ECHEC' | 'ANNULEE';
export type ConfianceIa = 'haute' | 'moyenne' | 'basse';
export type SourceMontant = 'MANUAL' | 'AI';
export type Periodicite = 'MENSUELLE' | 'BIMESTRIELLE' | 'TRIMESTRIELLE' | 'ANNUELLE';
export type StatutLlm = 'PRET' | 'PRET_DISTANT' | 'MODELE_ABSENT' | 'INJOIGNABLE' | 'DESACTIVE';
