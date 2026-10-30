import type { components } from "./schema";

type Schemas = components["schemas"];

export type CompanyDto = Schemas["CompanyDto"];
export type CompanyLookupDto = Schemas["CompanyLookupDto"];
export type CompanyRequest = Schemas["CompanyRequest"];
export type EmployeeDto = Schemas["EmployeeDto"];
export type EmployeeRequest = Schemas["EmployeeRequest"];
export type PersonDto = Schemas["PersonDto"];
export type PersonRequest = Schemas["PersonRequest"];
export type AddressDto = Schemas["AddressDto"];
export type LeaseDto = Schemas["LeaseDto"];
export type LeaseRequest = Schemas["LeaseRequest"];
export type ExpenseItemDto = Schemas["ExpenseItemDto"];
export type ExpenseItemRequest = Schemas["ExpenseItemRequest"];
export type RentReceiptDto = Schemas["RentReceiptDto"] & {
  /** Set by the history merge for a receipt issued by another account. */
  received?: boolean;
};
export type RentReceiptRequest = Schemas["RentReceiptRequest"];
export type LineRequest = Schemas["ExpenseLineRequest"];
export type LineDto = Schemas["ExpenseLineDto"];
export type StatementDto = Schemas["StatementDto"];
export type StatementCalculationRequest =
  Schemas["StatementCalculationRequest"];
export type StatementGenerationRequest = Schemas["StatementGenerationRequest"];
export type StatementPreviewRequest = Schemas["StatementPreviewRequest"];
export type CalculationResponse = Schemas["CalculationResponse"];
export type DraftDto = Schemas["DraftDto"];
export type ReceiptDto = Schemas["ReceiptDto"];
export type AnalysisDto = Schemas["AnalysisDto"];
export type ExtractionDto = Schemas["ExtractionDto"];
export type AnalysisStartResponse = Schemas["AnalysisStartResponse"];
export type LlmConfigDto = Schemas["LlmConfigDto"];
export type LlmConfigRequest = Schemas["LlmConfigRequest"];
export type LlmModelDto = Schemas["LlmModelDto"];
export type LlmStatusDto = Schemas["LlmStatusDto"];
export type LlmTestResponse = Schemas["LlmTestResponse"];
export type SignatureDto = Schemas["SignatureDto"];
export type TemplateDto = Schemas["TemplateDto"];
export type TemplateVariableDto = Schemas["TemplateVariableDto"];
export type ValidationReportDto = Schemas["ValidationReportDto"];

export type TemplateType = "RENT_RECEIPT" | "EXPENSE_STATEMENT";
export type AnalysisStatus =
  "PENDING" | "RUNNING" | "DONE" | "FAILED" | "CANCELLED";
export type AiConfidence = "haute" | "moyenne" | "basse";
export type AmountSource = "MANUAL" | "AI";
export type Periodicity = "MONTHLY" | "BIMONTHLY" | "ANNUAL";
export type LlmStatus =
  "PRET" | "PRET_DISTANT" | "MODELE_ABSENT" | "INJOIGNABLE" | "DESACTIVE";
