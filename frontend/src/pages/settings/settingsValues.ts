import type { TFunction } from "i18next";
import type { CompanyDto } from "@/api/types";
import type { CompanyFormValues } from "@/lib/validation";

export const PERIODICITIES = [
  { value: "MONTHLY", labelKey: "settings.expenses.periodicity.MONTHLY" },
  { value: "BIMONTHLY", labelKey: "settings.expenses.periodicity.BIMONTHLY" },
  { value: "ANNUAL", labelKey: "settings.expenses.periodicity.ANNUAL" },
] as const;

export type Periodicity = (typeof PERIODICITIES)[number]["value"];

/** Resolves a periodicity label through the active language at call time. */
export function periodicityLabel(
  periodicity: string | undefined,
  t: TFunction,
): string {
  const candidate = PERIODICITIES.find(
    (option) => option.value === periodicity,
  );
  return candidate ? t(candidate.labelKey) : (periodicity ?? "");
}

/** Employee titles: the enum stays English in the API, the label is translated. */
export const EMPLOYEE_TITLES = [
  { value: "CEO", labelKey: "settings.employees.titles.CEO" },
  { value: "CFO", labelKey: "settings.employees.titles.CFO" },
  { value: "ACCOUNTANT", labelKey: "settings.employees.titles.ACCOUNTANT" },
  { value: "EMPLOYEE", labelKey: "settings.employees.titles.EMPLOYEE" },
] as const;

export type EmployeeTitleValue = (typeof EMPLOYEE_TITLES)[number]["value"];

/** Resolves an employee title label through the active language at call time. */
export function employeeTitleLabel(
  title: string | undefined,
  t: TFunction,
): string {
  const candidate = EMPLOYEE_TITLES.find((option) => option.value === title);
  return candidate
    ? t(candidate.labelKey)
    : t("settings.employees.titles.EMPLOYEE");
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
    leaseId:
      company?.leaseId === undefined || company.leaseId === null
        ? ""
        : String(company.leaseId),
    issuePlace: company?.issuePlace ?? "",
  };
}
