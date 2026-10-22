const WHITESPACE = /[\s\u00a0\u202f]/g;

const EURO_NUMBER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DECIMAL_NUMBER = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const MONTH_NAMES = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

function cleanNumber(raw: string): string {
  return raw
    .trim()
    .replace(WHITESPACE, "")
    .replace(/[€%]/g, "")
    .replace(",", ".");
}

/**
 * Normalizes a user-entered amount into a two-decimal string.
 * Returns null when the input is not a positive or zero amount with at most two decimals.
 */
export function parseAmount(raw: string): string | null {
  if (!raw || raw.trim() === "") {
    return null;
  }
  const value = cleanNumber(raw);
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }
  const [integer, decimals = ""] = value.split(".");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
  return `${normalizedInteger}.${(decimals + "00").slice(0, 2)}`;
}

/**
 * Normalizes a percentage (0 to 100, at most two decimals).
 */
export function parsePercentage(raw: string): string | null {
  if (!raw || raw.trim() === "") {
    return null;
  }
  const value = cleanNumber(raw);
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    return null;
  }
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 100) {
    return null;
  }
  const [integer, decimals] = value.split(".");
  if (!decimals) {
    return integer.replace(/^0+(?=\d)/, "");
  }
  const cleanDecimals = decimals.replace(/0+$/, "");
  const normalizedInteger = integer.replace(/^0+(?=\d)/, "");
  return cleanDecimals === ""
    ? normalizedInteger
    : `${normalizedInteger}.${cleanDecimals}`;
}

export function formatEUR(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "—";
  }
  return EURO_NUMBER.format(numberValue);
}

export function formatPercentage(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    return "—";
  }
  return `${DECIMAL_NUMBER.format(numberValue)} %`;
}

export function parseDateIso(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null;
  }
  return date;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseDateIso(value);
  return date ? DATE_FORMATTER.format(date) : "—";
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME_FORMATTER.format(date);
}

export function formatMonth(month: string | null | undefined): string {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return "—";
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1);
  const labelText = MONTH_NAMES.format(date);
  return labelText.charAt(0).toUpperCase() + labelText.slice(1);
}

export function formatPeriod(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) {
    return "—";
  }
  return `du ${formatDate(start)} au ${formatDate(end)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} o`;
  }
  if (bytes < 1024 * 1024) {
    return `${DECIMAL_NUMBER.format(bytes / 1024)} Ko`;
  }
  return `${DECIMAL_NUMBER.format(bytes / (1024 * 1024))} Mo`;
}

/**
 * Display-only estimate: the backend remains the single source of truth.
 */
export function estimatedRetainedAmount(
  amountInclVat: string | null | undefined,
  proRataPct: string | null | undefined,
): string {
  const amount = amountInclVat
    ? Number(parseAmount(amountInclVat) ?? "")
    : Number.NaN;
  const percentage = proRataPct
    ? Number(parsePercentage(proRataPct) ?? "")
    : Number.NaN;
  if (!Number.isFinite(amount) || !Number.isFinite(percentage)) {
    return "—";
  }
  const cents = Math.round(amount * 100);
  const hundredthsPct = Math.round(percentage * 100);
  const retained = Math.round((cents * hundredthsPct) / 10_000);
  return formatEUR(retained / 100);
}

export function initials(name: string | null | undefined): string {
  if (!name) {
    return "FO";
  }
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "FO";
}
