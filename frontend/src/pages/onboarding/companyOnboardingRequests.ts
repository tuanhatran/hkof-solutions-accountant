import { api } from "@/api/endpoints";
import type { LandlordRequest } from "@/api/endpoints";
import type {
  CompanyRequest,
  EmployeeRequest,
  ExpenseItemRequest,
  LeaseRequest,
} from "@/api/types";
import i18n from "@/i18n";
import { parsePercentage } from "@/lib/format";
import { amountOf } from "./useOnboardingState";
import {
  companyEmployeeKey,
  type CompanyCreatedIds,
  type CompanyEmployeeValues,
  type CompanyExpenseValues,
  type CompanyIdentityValues,
  type CompanyLeaseValues,
  type CompanyOnboardingDraft,
} from "./useCompanyOnboardingState";

/** Company identity limited to the real contract: no capital, RCS or VAT field. */
export function companyIdentityRequest(
  identity: CompanyIdentityValues,
  leaseId: number | null = null,
): CompanyRequest {
  return {
    name: identity.name.trim(),
    legalForm: identity.legalForm.trim(),
    siren: identity.siren.replace(/\D/g, ""),
    siret: identity.siret.replace(/\D/g, "") || null,
    address: identity.address.trim(),
    managerName: identity.managerName.trim(),
    leaseId,
    issuePlace: identity.issuePlace.trim(),
  };
}

export function companyLandlordRequest(
  lease: CompanyLeaseValues,
): LandlordRequest {
  return {
    name: lease.landlordName.trim(),
    address: lease.landlordAddress.trim() || null,
    phone: lease.landlordPhone.trim() || null,
    addressNote: null,
    issuePlace: null,
  };
}

/** Company lease: the company is the tenant, the landlord a natural person. */
export function companyLeaseRequest(
  lease: CompanyLeaseValues,
  landlordId: number,
  companyId: number,
): LeaseRequest {
  return {
    companyLease: true,
    companyId,
    landlordId,
    propertyAddress: lease.propertyAddress.trim(),
    totalArea: amountOf(lease.totalArea),
    businessArea: amountOf(lease.businessArea),
    rentExclCharges: amountOf(lease.rentExclCharges),
    charges: amountOf(lease.charges),
  };
}

export function companyExpenseItemRequest(
  companyId: number,
  leaseId: number,
  expense: CompanyExpenseValues,
  sortOrder: number,
): ExpenseItemRequest {
  return {
    companyId,
    leaseId,
    code: expense.code,
    label: expense.label,
    supplier: "",
    proRataPct: parsePercentage(expense.proRataPct) ?? "0",
    periodicity: expense.periodicity,
    active: true,
    sortOrder,
    multipleLinesAllowed: false,
  };
}

export function companyEmployeeRequest(
  companyId: number,
  employee: CompanyEmployeeValues,
): EmployeeRequest {
  return {
    companyId,
    firstName: employee.firstName.trim(),
    lastName: employee.lastName.trim(),
    email: employee.email.trim() || null,
    address: employee.address.trim() || null,
    title: employee.title,
    issuePlace: employee.issuePlace.trim() || null,
  };
}

export interface FinalizeCompanyOnboardingOptions {
  draft: CompanyOnboardingDraft;
  created: CompanyCreatedIds;
  markCreated: (patch: Partial<CompanyCreatedIds>) => void;
}

/**
 * Creates the landlord, the company, its lease, the selected expense items and
 * the employees, then links the lease to the company. Every created id is
 * persisted so a retried finalize never duplicates a row.
 */
export async function finalizeCompanyOnboarding({
  draft,
  created,
  markCreated,
}: FinalizeCompanyOnboardingOptions): Promise<void> {
  const missingId = () => new Error(i18n.t("onboarding.company.errors.save"));
  let landlordId = created.landlordId;
  let companyId = created.companyId;
  let leaseId = created.leaseId;

  if (landlordId === undefined) {
    const landlord = await api.landlords.create(
      companyLandlordRequest(draft.lease),
    );
    if (landlord.id === undefined) throw missingId();
    landlordId = landlord.id;
    markCreated({ landlordId });
  }

  if (companyId === undefined) {
    const company = await api.companies.create(
      companyIdentityRequest(draft.identity),
    );
    if (company.id === undefined) throw missingId();
    companyId = company.id;
    markCreated({ companyId });
  }

  if (leaseId === undefined) {
    const lease = await api.leases.create(
      companyLeaseRequest(draft.lease, landlordId, companyId),
    );
    if (lease.id === undefined) throw missingId();
    leaseId = lease.id;
    markCreated({ leaseId });
  }

  await api.companies.update(
    companyId,
    companyIdentityRequest(draft.identity, leaseId),
  );

  const expenseCodes = new Set(created.expenseCodes);
  let sortOrder = 10;
  for (const expense of draft.expenses) {
    if (expense.selected && !expenseCodes.has(expense.code)) {
      await api.expenseItems.create(
        companyExpenseItemRequest(companyId, leaseId, expense, sortOrder),
      );
      expenseCodes.add(expense.code);
      markCreated({ expenseCodes: [...expenseCodes] });
    }
    sortOrder += 10;
  }

  const employeeKeys = new Set(created.employeeKeys);
  for (const employee of draft.employees) {
    const key = companyEmployeeKey(employee);
    if (key === "" || employeeKeys.has(key)) continue;
    await api.employees.create(
      companyId,
      companyEmployeeRequest(companyId, employee),
    );
    employeeKeys.add(key);
    markCreated({ employeeKeys: [...employeeKeys] });
  }
}
