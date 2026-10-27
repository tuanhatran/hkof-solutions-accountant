import type { LeaseDto, StatementDto, RentReceiptDto } from "@/api/types";
import i18n from "@/i18n";
import { matchesLease } from "@/lib/leaseReceipts";

/** Documents of one lease address inside a month, never mixed. */
export interface AddressGroup {
  addressKey: string;
  addressLabel: string;
  rentReceipts: RentReceiptDto[];
  statements: StatementDto[];
}

/** One month card: newest first, then its address rows sorted A→Z. */
export interface MonthGroup {
  month: string;
  addresses: AddressGroup[];
}

export const UNKNOWN_ADDRESS_KEY = "inconnue";

/** Localized unknown-address label, resolved at call time so a language switch applies. */
export function unknownAddressLabel(language?: string): string {
  return i18n.t("history.address.unknown", { lng: language });
}

/** Preferred document of a list: the active version, else the first one. */
export function current<T extends { status?: string }>(
  documents: T[],
): T | null {
  return (
    documents.find((document) => document.status === "ACTIVE") ??
    documents[0] ??
    null
  );
}

/** Rent receipts sorted from the most recent to the oldest. */
export function sortRentReceiptsDesc(
  documents: RentReceiptDto[],
): RentReceiptDto[] {
  return [...documents].sort((left, right) => {
    const byDate = (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
    return byDate !== 0 ? byDate : (right.id ?? 0) - (left.id ?? 0);
  });
}

/** Latest receipt of a month, whatever landlord+tenant pairs coexist. */
export function latestReceipt(
  documents: RentReceiptDto[],
): RentReceiptDto | null {
  return sortRentReceiptsDesc(documents)[0] ?? null;
}

/** Landlord → tenant label of a rent receipt. */
export function pairLabel(document: RentReceiptDto): string {
  const landlord =
    document.landlordName ?? i18n.t("history.address.unknownLandlord");
  const tenant = document.tenantName ?? i18n.t("history.address.unknownTenant");
  return `${landlord} → ${tenant}`;
}

/**
 * Lease owning a history document, whatever its company: a statement names it
 * through `leaseId`, a receipt through the lowest-id lease matching its
 * landlord+tenant pair.
 */
export function resolveLeaseForDocument(
  document: RentReceiptDto | StatementDto,
  leases: LeaseDto[],
): LeaseDto | null {
  const leaseId = (document as StatementDto).leaseId;
  if (typeof leaseId === "number") {
    return leases.find((lease) => lease.id === leaseId) ?? null;
  }
  const receipt = document as RentReceiptDto;
  let lowest: LeaseDto | null = null;
  for (const lease of leases) {
    if (!matchesLease(receipt, lease)) {
      continue;
    }
    if (lowest === null || (lease.id ?? 0) < (lowest.id ?? 0)) {
      lowest = lease;
    }
  }
  return lowest;
}

/** Address row of a document; documents without a lease stay visible. */
function addressOf(
  document: RentReceiptDto | StatementDto,
  leases: LeaseDto[],
  language?: string,
): { addressKey: string; addressLabel: string } {
  const lease = resolveLeaseForDocument(document, leases);
  const addressId = lease?.addressId;
  const propertyAddress = lease?.propertyAddress?.trim();
  if (addressId === undefined || addressId === null) {
    return {
      addressKey: UNKNOWN_ADDRESS_KEY,
      addressLabel: unknownAddressLabel(language),
    };
  }
  return {
    addressKey: `address-${addressId}`,
    addressLabel: propertyAddress
      ? propertyAddress
      : unknownAddressLabel(language),
  };
}

/** A→Z on the label, the unknown address row always last. */
function compareAddresses(left: AddressGroup, right: AddressGroup): number {
  const leftUnknown = left.addressKey === UNKNOWN_ADDRESS_KEY;
  const rightUnknown = right.addressKey === UNKNOWN_ADDRESS_KEY;
  if (leftUnknown !== rightUnknown) {
    return leftUnknown ? 1 : -1;
  }
  const byLabel = left.addressLabel.localeCompare(right.addressLabel, "fr", {
    sensitivity: "base",
  });
  return byLabel !== 0
    ? byLabel
    : left.addressKey.localeCompare(right.addressKey);
}

/**
 * History grouping across every company: one card per month (newest first),
 * one row per lease address inside it (A→Z, unknown last). A document keeps
 * exactly one address row, so two addresses of the same month never share a
 * row.
 */
export function groupHistoryByMonthAndAddress(
  rentReceipts: RentReceiptDto[],
  statements: StatementDto[],
  leases: LeaseDto[],
  language?: string,
): MonthGroup[] {
  const byMonth = new Map<string, Map<string, AddressGroup>>();

  function rowOf(document: RentReceiptDto | StatementDto): {
    month: string;
    row: AddressGroup;
  } | null {
    if (!document.month) {
      return null;
    }
    const { addressKey, addressLabel } = addressOf(document, leases, language);
    const rows = byMonth.get(document.month) ?? new Map<string, AddressGroup>();
    const row = rows.get(addressKey) ?? {
      addressKey,
      addressLabel,
      rentReceipts: [],
      statements: [],
    };
    rows.set(addressKey, row);
    byMonth.set(document.month, rows);
    return { month: document.month, row };
  }

  for (const receipt of rentReceipts) {
    rowOf(receipt)?.row.rentReceipts.push(receipt);
  }
  for (const statement of statements) {
    rowOf(statement)?.row.statements.push(statement);
  }

  return [...byMonth.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([month, rows]) => ({
      month,
      addresses: [...rows.values()].sort(compareAddresses),
    }));
}
