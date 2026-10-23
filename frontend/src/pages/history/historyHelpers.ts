import type { StatementDto, RentReceiptDto } from "@/api/types";

export interface MonthGroup {
  month: string;
  rentReceipts: RentReceiptDto[];
  statements: StatementDto[];
}

/** Preferred document of a list: the active version, else the first one. */
export function current<T extends { status?: string }>(documents: T[]): T | null {
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
export function latestReceipt(documents: RentReceiptDto[]): RentReceiptDto | null {
  return sortRentReceiptsDesc(documents)[0] ?? null;
}

/** Landlord → tenant label of a rent receipt. */
export function pairLabel(document: RentReceiptDto): string {
  return `${document.landlordName ?? "Bailleur inconnu"} → ${
    document.tenantName ?? "Locataire inconnu"
  }`;
}
