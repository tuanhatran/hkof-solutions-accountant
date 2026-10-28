import type { RentReceiptRequest } from "@/api/types";
import { parseAmount } from "@/lib/format";
import { parseTenantKey, type RentReceiptFormValues } from "@/lib/validation";

export function requestFromValues(
  values: RentReceiptFormValues,
  templateId: number | null,
  signatureId: number | null,
  companyId: number | null = null,
): RentReceiptRequest {
  const { tenantId, tenantCompanyId } = parseTenantKey(values.tenantKey);
  const request: RentReceiptRequest = {
    month: values.month,
    landlordId: Number(values.landlordId),
    periodStart: values.periodStart,
    periodEnd: values.periodEnd,
    rentExclCharges: parseAmount(values.rentExclCharges) ?? "",
    charges: parseAmount(values.charges) ?? "",
  };
  if (tenantCompanyId !== null) {
    request.tenantCompanyId = tenantCompanyId;
  } else if (tenantId !== null) {
    request.tenantId = tenantId;
  }
  if (companyId !== null) {
    request.companyId = companyId;
  }
  if (values.paymentDate) {
    request.paymentDate = values.paymentDate;
  }
  if (values.issueDate) {
    request.issueDate = values.issueDate;
  }
  if (templateId !== null) {
    request.templateId = templateId;
  }
  if (signatureId !== null) {
    request.signatureId = signatureId;
  }
  const additionalCharges = (values.additionalCharges ?? [])
    .map((charge) => ({
      label: charge.label.trim(),
      amount: parseAmount(charge.amount) ?? "",
    }))
    .filter((charge) => charge.label !== "" && charge.amount !== "");
  if (additionalCharges.length > 0) {
    request.additionalCharges = additionalCharges;
  }
  return request;
}
