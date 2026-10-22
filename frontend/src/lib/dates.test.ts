import { describe, expect, it } from "vitest";
import {
  todayDate,
  durationInDays,
  isValidDate,
  isValidMonth,
  daysInMonth,
  currentMonth,
  monthOfDate,
  periodInOrder,
  periodOfMonth,
} from "./dates";

describe("month", () => {
  it("validates the YYYY-MM format", () => {
    expect(isValidMonth("2026-10")).toBe(true);
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-1")).toBe(false);
  });

  it("handles 28, 29, 30 and 31 day months", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
    expect(daysInMonth("2026-99")).toBe(0);
  });

  it("builds the full month period, leap years included", () => {
    expect(periodOfMonth("2026-10")).toEqual({
      start: "2026-10-01",
      end: "2026-10-31",
    });
    expect(periodOfMonth("2024-02")).toEqual({
      start: "2024-02-01",
      end: "2024-02-29",
    });
    expect(periodOfMonth("2026-02")).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });

  it("computes the current month without a time zone offset", () => {
    expect(currentMonth(new Date(2026, 9, 22))).toBe("2026-10");
    expect(todayDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(monthOfDate("2026-10-22")).toBe("2026-10");
  });
});

describe("dates", () => {
  it("rejects non-existent dates", () => {
    expect(isValidDate("2026-10-22")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("22/10/2026")).toBe(false);
  });

  it("checks the period order", () => {
    expect(periodInOrder("2026-10-01", "2026-10-31")).toBe(true);
    expect(periodInOrder("2026-10-31", "2026-10-01")).toBe(false);
  });

  it("counts days inclusively", () => {
    expect(durationInDays("2026-10-01", "2026-10-31")).toBe(31);
    expect(durationInDays("2026-09-01", "2026-10-31")).toBe(61);
    expect(durationInDays("2026-10-31", "2026-10-01")).toBe(0);
  });
});
