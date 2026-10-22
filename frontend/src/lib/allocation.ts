import { durationInDays, daysInMonth } from "./dates";
import { formatEUR, estimatedRetainedAmount, parseAmount } from "./format";

export interface AllocationEstimate {
  monthDays: number;
  totalDays: number;
  monthAmount: string;
  retainedAmount: string;
}

/**
 * Local estimate to help data entry: the reference calculation is performed by the backend.
 */
export function estimateAllocation(
  amountInclVat: string,
  proRataPct: string,
  start: string,
  end: string,
  month: string,
): AllocationEstimate | null {
  if (!start || !end || !month) {
    return null;
  }
  const amount = parseAmount(amountInclVat);
  if (amount === null) {
    return null;
  }
  const totalDays = durationInDays(start, end);
  if (totalDays === 0) {
    return null;
  }
  const lastDay = String(daysInMonth(month)).padStart(2, "0");
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${lastDay}`;
  const overlapStart = start > monthStart ? start : monthStart;
  const overlapEnd = end < monthEnd ? end : monthEnd;
  const monthDays =
    overlapStart <= overlapEnd ? durationInDays(overlapStart, overlapEnd) : 0;
  const cents = Math.round(Number(amount) * 100);
  const monthCents = Math.round((cents * monthDays) / totalDays);
  const monthAmount = (monthCents / 100).toFixed(2);
  return {
    monthDays,
    totalDays,
    monthAmount: formatEUR(monthAmount),
    retainedAmount: estimatedRetainedAmount(monthAmount, proRataPct),
  };
}
