import { describe, expect, it } from "vitest";
import expenseStatementSource from "./GenerateExpenseStatementPage.tsx?raw";
import rentReceiptSource from "./GenerateRentReceiptPage.tsx?raw";

/**
 * Project rule: query invalidation goes through the `queryKeys` constants, never a
 * string literal. A literal such as `["notes"]` / `["quittances"]` silently matches
 * nothing, so the active-version cache stays stale after a generation.
 */
const PAGES = [
  [
    "GenerateExpenseStatementPage.tsx",
    expenseStatementSource,
    "queryKeys.statementsAll",
  ],
  [
    "GenerateRentReceiptPage.tsx",
    rentReceiptSource,
    "queryKeys.rentReceiptsAll",
  ],
] as const;

describe("generation pages invalidation keys", () => {
  it.each(PAGES)(
    "%s invalidates through the queryKeys prefix and never a literal key",
    (_page, source, expectedKey) => {
      const literalInvalidations =
        source.match(/invalidateQueries\(\{[^}]*queryKey:\s*\[/g) ?? [];
      expect(literalInvalidations).toEqual([]);

      const invalidation = source.match(
        /invalidateQueries\(\{\s*queryKey:\s*(queryKeys\.\w+),?\s*\}\)/,
      );
      expect(invalidation?.[1]).toBe(expectedKey);
    },
  );
});
