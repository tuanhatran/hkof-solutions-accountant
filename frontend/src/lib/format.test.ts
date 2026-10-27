import { describe, expect, it } from "vitest";
import i18n from "@/i18n";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatEUR,
  formatMonth,
  formatPercentage,
  formatPeriod,
  estimatedRetainedAmount,
  initials,
  isEuroCurrency,
  parseAmount,
  parseDateIso,
  parsePercentage,
} from "./format";

function normalizeSpaces(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

describe("parseAmount", () => {
  it("accepts French and English number formats", () => {
    expect(parseAmount("1 234,56")).toBe("1234.56");
    expect(parseAmount("80,5")).toBe("80.50");
    expect(parseAmount("80.50")).toBe("80.50");
    expect(parseAmount("0")).toBe("0.00");
  });

  it("rejects negative, empty or over two-decimal amounts", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-12,00")).toBeNull();
    expect(parseAmount("12,345")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("parsePercentage", () => {
  it("strips the symbol and spaces and converts the comma", () => {
    expect(parsePercentage("35,71 %")).toBe("35.71");
    expect(parsePercentage("50%")).toBe("50");
    expect(parsePercentage("100,00")).toBe("100");
    expect(parsePercentage("0")).toBe("0");
  });

  it("clamps the pro-rata between 0 and 100", () => {
    expect(parsePercentage("100,01")).toBeNull();
    expect(parsePercentage("101")).toBeNull();
    expect(parsePercentage("-1")).toBeNull();
    expect(parsePercentage("12,345")).toBeNull();
  });
});

describe("French formatting", () => {
  it("formats amounts in euros with two decimals", () => {
    expect(normalizeSpaces(formatEUR("1234.5"))).toBe("1 234,50 €");
    expect(normalizeSpaces(formatEUR(0))).toBe("0,00 €");
    expect(formatEUR(null)).toBe("—");
    expect(formatEUR(undefined)).toBe("—");
    expect(formatEUR("")).toBe("—");
  });

  it("formats months in French", () => {
    expect(formatMonth("2026-10")).toBe("Octobre 2026");
    expect(formatMonth("2026-01")).toBe("Janvier 2026");
    expect(formatMonth("invalide")).toBe("—");
  });

  it("formats months in English from the current language", async () => {
    await i18n.changeLanguage("en");

    expect(formatMonth("2026-10")).toBe("October 2026");
    expect(formatMonth("2026-01")).toBe("January 2026");
    expect(formatMonth("invalide")).toBe("—");
  });
});

describe("estimatedRetainedAmount", () => {
  it("applies cent rounding without authoritative floating point", () => {
    expect(normalizeSpaces(estimatedRetainedAmount("120,00", "35,71"))).toBe(
      "42,85 €",
    );
    expect(normalizeSpaces(estimatedRetainedAmount("950,00", "100"))).toBe(
      "950,00 €",
    );
    expect(estimatedRetainedAmount("", "35,71")).toBe("—");
    expect(estimatedRetainedAmount("120,00", "")).toBe("—");
    expect(estimatedRetainedAmount(undefined, undefined)).toBe("—");
  });
});

describe("isEuroCurrency", () => {
  it("accepts every euro spelling with spaces or case variations", () => {
    expect(isEuroCurrency("EUR")).toBe(true);
    expect(isEuroCurrency("€")).toBe(true);
    expect(isEuroCurrency("euro")).toBe(true);
    expect(isEuroCurrency(" euros ")).toBe(true);
    expect(isEuroCurrency(" Eur ")).toBe(true);
  });

  it("treats a missing currency as euro", () => {
    expect(isEuroCurrency(null)).toBe(true);
    expect(isEuroCurrency(undefined)).toBe(true);
    expect(isEuroCurrency("")).toBe(true);
    expect(isEuroCurrency("   ")).toBe(true);
  });

  it("rejects a genuinely foreign currency", () => {
    expect(isEuroCurrency("USD")).toBe(false);
    expect(isEuroCurrency("CHF")).toBe(false);
    expect(isEuroCurrency("usd")).toBe(false);
  });
});

describe("formatPercentage", () => {
  it("formats percentages in French with up to two decimals", () => {
    expect(normalizeSpaces(formatPercentage("35.71"))).toBe("35,71 %");
    expect(normalizeSpaces(formatPercentage(12.5))).toBe("12,5 %");
    expect(normalizeSpaces(formatPercentage("100"))).toBe("100 %");
  });

  it("falls back to a dash for missing or unusable values", () => {
    expect(formatPercentage(null)).toBe("—");
    expect(formatPercentage(undefined)).toBe("—");
    expect(formatPercentage("")).toBe("—");
    expect(formatPercentage("abc")).toBe("—");
  });
});

describe("date formatting", () => {
  it("parses an ISO date and rejects impossible or malformed values", () => {
    expect(parseDateIso("2026-10-24")?.getDate()).toBe(24);
    expect(parseDateIso("2026-02-31")).toBeNull();
    expect(parseDateIso("24/10/2026")).toBeNull();
    expect(parseDateIso("")).toBeNull();
    expect(parseDateIso(null)).toBeNull();
  });

  it("formats dates and date-times in French", () => {
    expect(formatDate("2026-10-24")).toBe("24/10/2026");
    expect(formatDate("invalide")).toBe("—");
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime("2026-10-24T08:30:00Z")).toMatch(
      /^24\/10\/2026 \d{2}:\d{2}$/,
    );
    expect(formatDateTime("invalide")).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formats periods only when both bounds are valid", () => {
    expect(formatPeriod("2026-10-01", "2026-10-31")).toBe(
      "du 01/10/2026 au 31/10/2026",
    );
    expect(formatPeriod("2026-10-01", null)).toBe("—");
    expect(formatPeriod(undefined, "2026-10-31")).toBe("—");
  });

  it("formats periods in English from the current language", async () => {
    await i18n.changeLanguage("en");

    expect(formatPeriod("2026-10-01", "2026-10-31")).toBe(
      "from 01/10/2026 to 31/10/2026",
    );
    expect(formatPeriod("2026-10-01", null)).toBe("—");

    await i18n.changeLanguage("fr");
    expect(formatPeriod("2026-10-01", "2026-10-31")).toBe(
      "du 01/10/2026 au 31/10/2026",
    );
  });

  it("formats byte sizes in French units", () => {
    expect(formatBytes(512)).toBe("512 o");
    expect(normalizeSpaces(formatBytes(2048))).toBe("2 Ko");
    expect(normalizeSpaces(formatBytes(2 * 1024 * 1024))).toBe("2 Mo");
  });

  it("formats byte sizes in English units from the current language", async () => {
    await i18n.changeLanguage("en");

    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2 MB");
  });
});

describe("initials", () => {
  it("builds up to two uppercase initials and falls back to FO", () => {
    expect(initials("Camille Martin")).toBe("CM");
    expect(initials("  camille   martin  ")).toBe("CM");
    expect(initials("Camille")).toBe("C");
    expect(initials("")).toBe("FO");
    expect(initials("   ")).toBe("FO");
    expect(initials(null)).toBe("FO");
  });
});
