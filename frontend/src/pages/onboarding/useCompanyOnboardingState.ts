import { useCallback, useState } from "react";
import type { EmployeeRequest } from "@/api/types";
import i18n from "@/i18n";
import { formatPercentage, parseAmount } from "@/lib/format";

export const COMPANY_ONBOARDING_STEP_KEYS = [
  "identity",
  "lease",
  "expenses",
  "employees",
  "summary",
] as const;

export type CompanyOnboardingStepKey =
  (typeof COMPANY_ONBOARDING_STEP_KEYS)[number];

export type CompanyEmployeeTitle = EmployeeRequest["title"];

/** French message of the company onboarding validation namespace. */
export function companyOnboardingMessage(key: string): string {
  return i18n.t(`onboarding.company.validation.${key}`);
}

export interface CompanyIdentityValues {
  name: string;
  legalForm: string;
  siren: string;
  siret: string;
  address: string;
  managerName: string;
  issuePlace: string;
}

export interface CompanyLeaseValues {
  propertyAddress: string;
  totalArea: string;
  businessArea: string;
  rentExclCharges: string;
  charges: string;
  landlordName: string;
  landlordAddress: string;
  landlordPhone: string;
}

export interface CompanyExpenseValues {
  code: string;
  label: string;
  selected: boolean;
  proRataPct: string;
  periodicity: string;
}

export interface CompanyEmployeeValues {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  title: CompanyEmployeeTitle;
  issuePlace: string;
}

/** Ids and codes already created, replayed by a retried finalize. */
export interface CompanyCreatedIds {
  landlordId?: number;
  companyId?: number;
  leaseId?: number;
  expenseCodes: string[];
  employeeKeys: string[];
}

export interface CompanyOnboardingDraft {
  identity: CompanyIdentityValues;
  lease: CompanyLeaseValues;
  expenses: CompanyExpenseValues[];
  employees: CompanyEmployeeValues[];
}

export const EMPTY_COMPANY_IDENTITY: CompanyIdentityValues = {
  name: "",
  legalForm: "",
  siren: "",
  siret: "",
  address: "",
  managerName: "",
  issuePlace: "",
};

export const EMPTY_COMPANY_LEASE: CompanyLeaseValues = {
  propertyAddress: "",
  totalArea: "",
  businessArea: "",
  rentExclCharges: "",
  charges: "",
  landlordName: "",
  landlordAddress: "",
  landlordPhone: "",
};

/** Standard company expense categories, seeded codes and default rates. */
export const DEFAULT_COMPANY_EXPENSES: CompanyExpenseValues[] = [
  {
    code: "loyer",
    label: "Loyer",
    selected: true,
    proRataPct: "100",
    periodicity: "MONTHLY",
  },
  {
    code: "electricite",
    label: "Électricité",
    selected: true,
    proRataPct: "100",
    periodicity: "MONTHLY",
  },
  {
    code: "gaz",
    label: "Gaz / Chauffage",
    selected: true,
    proRataPct: "100",
    periodicity: "MONTHLY",
  },
  {
    code: "telephone",
    label: "Internet & Téléphonie",
    selected: true,
    proRataPct: "100",
    periodicity: "MONTHLY",
  },
  {
    code: "assurance",
    label: "Assurance habitation",
    selected: true,
    proRataPct: "100",
    periodicity: "ANNUAL",
  },
];

export const EMPTY_COMPANY_ONBOARDING_DRAFT: CompanyOnboardingDraft = {
  identity: EMPTY_COMPANY_IDENTITY,
  lease: EMPTY_COMPANY_LEASE,
  expenses: DEFAULT_COMPANY_EXPENSES.map((expense) => ({ ...expense })),
  employees: [{ ...companyManagerEmployee("") }],
};

export const EMPTY_COMPANY_CREATED_IDS: CompanyCreatedIds = {
  expenseCodes: [],
  employeeKeys: [],
};

/** Manager row created from the identity manager name; CEO by convention. */
export function companyManagerEmployee(
  managerName: string,
): CompanyEmployeeValues {
  const firstName = managerName.trim().split(/\s+/)[0] ?? "";
  const lastName = managerName.trim().split(/\s+/).slice(1).join(" ");
  return {
    firstName: managerName.trim() === "" ? "" : firstName,
    lastName,
    email: "",
    address: "",
    title: "CEO",
    issuePlace: "",
  };
}

/** Stable key used to skip an employee already created by a previous attempt. */
export function companyEmployeeKey(employee: {
  firstName: string;
  lastName: string;
}): string {
  return `${employee.firstName.trim()} ${employee.lastName.trim()}`
    .trim()
    .toLowerCase();
}

/**
 * Display-only pro-rata preview from the two surfaces. The backend
 * CalculationService remains the authoritative source of the stored base.
 */
export function proRataPreview(
  totalArea: string,
  businessArea: string,
): string {
  const total = parseAmount(totalArea);
  const business = parseAmount(businessArea);
  if (
    total === null ||
    business === null ||
    Number(total) <= 0 ||
    Number(business) > Number(total)
  ) {
    return "—";
  }
  return formatPercentage((Number(business) / Number(total)) * 100);
}

/**
 * Company wizard draft, current step and created ids. The identity update
 * seeds the manager row only while it is still blank, so an edited manager is
 * never overwritten by a later identity change.
 */
export function useCompanyOnboardingState(initial?: {
  step?: number;
  draft?: CompanyOnboardingDraft;
  created?: CompanyCreatedIds;
}) {
  const [step, setStep] = useState(initial?.step ?? 0);
  const [draft, setDraft] = useState<CompanyOnboardingDraft>(
    initial?.draft ?? EMPTY_COMPANY_ONBOARDING_DRAFT,
  );
  const [created, setCreated] = useState<CompanyCreatedIds>(
    initial?.created ?? EMPTY_COMPANY_CREATED_IDS,
  );

  const restoreState = useCallback(
    (
      newStep: number,
      newDraft: CompanyOnboardingDraft,
      newCreated: CompanyCreatedIds,
    ) => {
      setStep(newStep);
      setDraft(newDraft);
      setCreated(newCreated);
    },
    [],
  );

  const next = useCallback(() => {
    setStep((current) =>
      Math.min(current + 1, COMPANY_ONBOARDING_STEP_KEYS.length - 1),
    );
  }, []);

  const back = useCallback(() => {
    setStep((current) => Math.max(current - 1, 0));
  }, []);

  const updateIdentity = useCallback((identity: CompanyIdentityValues) => {
    setDraft((current) => {
      const manager = companyManagerEmployee(identity.managerName);
      const managerRow = current.employees[0];
      const blankManager =
        managerRow === undefined ||
        (managerRow.firstName.trim() === "" &&
          managerRow.lastName.trim() === "");
      return {
        ...current,
        identity,
        employees: blankManager
          ? [manager, ...current.employees.slice(1)]
          : current.employees,
      };
    });
  }, []);

  const updateLease = useCallback((lease: CompanyLeaseValues) => {
    setDraft((current) => ({ ...current, lease }));
  }, []);

  const updateExpenses = useCallback((expenses: CompanyExpenseValues[]) => {
    setDraft((current) => ({ ...current, expenses }));
  }, []);

  const updateEmployees = useCallback((employees: CompanyEmployeeValues[]) => {
    setDraft((current) => ({ ...current, employees }));
  }, []);

  const markCreated = useCallback((patch: Partial<CompanyCreatedIds>) => {
    setCreated((current) => ({
      ...current,
      ...patch,
      expenseCodes: patch.expenseCodes ?? current.expenseCodes,
      employeeKeys: patch.employeeKeys ?? current.employeeKeys,
    }));
  }, []);

  return {
    step,
    draft,
    created,
    next,
    back,
    restoreState,
    updateIdentity,
    updateLease,
    updateExpenses,
    updateEmployees,
    markCreated,
  };
}
