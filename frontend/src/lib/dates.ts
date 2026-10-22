const VALID_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function currentMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isValidMonth(month: string): boolean {
  return VALID_MONTH.test(month);
}

export function daysInMonth(month: string): number {
  if (!isValidMonth(month)) {
    return 0;
  }
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

export function periodOfMonth(month: string): { start: string; end: string } {
  if (!isValidMonth(month)) {
    return { start: "", end: "" };
  }
  const days = daysInMonth(month);
  return {
    start: `${month}-01`,
    end: `${month}-${String(days).padStart(2, "0")}`,
  };
}

export function todayDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function monthOfDate(date: string): string {
  return date.slice(0, 7);
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const [year, month, day] = date.split("-").map(Number);
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

export function periodInOrder(start: string, end: string): boolean {
  return isValidDate(start) && isValidDate(end) && start <= end;
}

export function durationInDays(start: string, end: string): number {
  if (!isValidDate(start) || !isValidDate(end) || end < start) {
    return 0;
  }
  const [yearStart, startMonth, dayStart] = start.split("-").map(Number);
  const [yearEnd, endMonth, dayEnd] = end.split("-").map(Number);
  const millis =
    Date.UTC(yearEnd, endMonth - 1, dayEnd) -
    Date.UTC(yearStart, startMonth - 1, dayStart);
  return Math.round(millis / 86_400_000) + 1;
}
