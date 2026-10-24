import type { CompanyDto } from "@/api/types";
import type { CompanyFormValues } from "@/lib/validation";

export const PERIODICITIES = [
  { value: "MONTHLY", label: "Mensuelle" },
  { value: "BIMONTHLY", label: "Bimestrielle" },
  { value: "ANNUAL", label: "Annuelle" },
] as const;

export type Periodicity = (typeof PERIODICITIES)[number]["value"];

/** Employee titles: the enum stays English in the API, the UI is French. */
export const EMPLOYEE_TITLES = [
  { value: "CEO", label: "PDG" },
  { value: "CFO", label: "DAF" },
  { value: "ACCOUNTANT", label: "Comptable" },
  { value: "EMPLOYEE", label: "Salarié" },
] as const;

export type EmployeeTitleValue = (typeof EMPLOYEE_TITLES)[number]["value"];

export function employeeTitleLabel(title: string | undefined): string {
  return (
    EMPLOYEE_TITLES.find((candidate) => candidate.value === title)?.label ??
    "Salarié"
  );
}

/** Formats an API decimal string for a French decimal input. */
export function decimalFormatter(value: string | undefined): string {
  return value ? value.replace(".", ",") : "";
}

/** Maps the API company to the React Hook Form values. */
export function valuesFromCompany(
  company: CompanyDto | undefined,
): CompanyFormValues {
  return {
    name: company?.name ?? "",
    legalForm: company?.legalForm ?? "",
    siren: company?.siren ?? "",
    address: company?.address ?? "",
    managerName: company?.managerName ?? "",
    homeAddress: company?.homeAddress ?? "",
    totalArea: decimalFormatter(company?.totalArea),
    businessArea: decimalFormatter(company?.businessArea),
    issuePlace: company?.issuePlace ?? "",
  };
}
