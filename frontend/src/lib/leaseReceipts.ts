import type { LeaseDto, RentReceiptDto } from "@/api/types";

/**
 * A receipt has no leaseId: a natural lease owns the receipts of the same
 * landlord+tenant pair without a company tenant, a company lease owns the
 * receipts whose tenant company is its own company.
 */
export function matchesLease(
  receipt: RentReceiptDto,
  lease: LeaseDto,
): boolean {
  if (receipt.landlordId !== lease.landlordId) {
    return false;
  }
  if (lease.companyLease) {
    return (
      lease.companyId !== undefined &&
      lease.companyId !== null &&
      receipt.tenantCompanyId === lease.companyId
    );
  }
  return (
    (receipt.tenantId ?? null) === (lease.tenantId ?? null) &&
    (receipt.tenantCompanyId ?? null) === null
  );
}

/**
 * Latest ACTIVE receipt of one lease for one month: highest `version`, then
 * highest `id`. Receipts of another lease, another month or an archived
 * version are never returned.
 */
export function latestReceiptForMonth(
  receipts: RentReceiptDto[] | undefined,
  lease: LeaseDto,
  month: string,
): RentReceiptDto | null {
  let best: RentReceiptDto | null = null;
  for (const candidate of receipts ?? []) {
    if (
      candidate.status !== "ACTIVE" ||
      candidate.month !== month ||
      !matchesLease(candidate, lease)
    ) {
      continue;
    }
    if (best === null) {
      best = candidate;
      continue;
    }
    const byVersion = (candidate.version ?? 1) - (best.version ?? 1);
    if (
      byVersion > 0 ||
      (byVersion === 0 && (candidate.id ?? 0) > (best.id ?? 0))
    ) {
      best = candidate;
    }
  }
  return best;
}
