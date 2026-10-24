import type { RentReceiptRequest } from "@/api/types";
import { parseAmount } from "@/lib/format";
import type { RentReceiptFormValues } from "@/lib/validation";

export function requestFromValues(
  values: RentReceiptFormValues,
  templateId: number | null,
  signatureId: number | null,
  companyId: number | null = null,
): RentReceiptRequest {
  const request: RentReceiptRequest = {
    month: values.month,
    landlordId: Number(values.landlordId),
    tenantId: Number(values.tenantId),
    periodStart: values.periodStart,
    periodEnd: values.periodEnd,
    rentExclCharges: parseAmount(values.rentExclCharges) ?? "",
    charges: parseAmount(values.charges) ?? "",
  };
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
  return request;
}
