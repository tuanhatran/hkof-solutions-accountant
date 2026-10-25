import type { LeaseDto } from "@/api/types";
import type { LeaseFormValues } from "@/lib/validation";
import { decimalFormatter } from "./settingsMoney";

/**
 * Initial React Hook Form values of the lease modal. With no item, a new lease
 * starts empty, except when a company is preset: the "Bail société" box is then
 * checked and the company is preselected as tenant (both stay editable). An
 * existing item always wins over the preset.
 */
export function buildLeaseDefaults(
  item: LeaseDto | null,
  presetCompanyId: number | null,
): LeaseFormValues {
  const companyLease = item
    ? (item.companyLease ?? false)
    : presetCompanyId !== null;
  return {
    companyLease,
    landlordId: item?.landlordId === undefined ? "" : String(item.landlordId),
    tenantId:
      companyLease || item?.tenantId === undefined || item.tenantId === null
        ? ""
        : String(item.tenantId),
    companyId:
      !companyLease || item?.companyId === undefined || item.companyId === null
        ? presetCompanyId === null
          ? ""
          : String(presetCompanyId)
        : String(item.companyId),
    propertyAddress: item?.propertyAddress ?? "",
    rentExclCharges: decimalFormatter(item?.rentExclCharges),
    charges: decimalFormatter(item?.charges),
    totalArea: decimalFormatter(item?.totalArea),
    businessArea: decimalFormatter(item?.businessArea),
  };
}
