import { parseAmount } from "@/lib/format";

export function decimalFormatter(value: string | undefined): string {
  return value ? value.replace(".", ",") : "";
}

export function cents(value: string): number {
  const normalized = parseAmount(value);
  return normalized === null ? 0 : Math.round(Number(normalized) * 100);
}
